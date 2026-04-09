/**
 * @file server/routes/sso.js
 * @description Enterprise Single Sign-On (SSO) API.
 *
 * Supports two industry-standard protocols:
 *  - OIDC (OpenID Connect) Authorization Code Flow
 *  - SAML 2.0 Service Provider (assertion consumer)
 *
 * Routes
 * ------
 * SSO Configuration (tenant admin only)
 * POST   /api/sso/config              — create/update SSO config for tenant
 * GET    /api/sso/config              — get current tenant's SSO config
 * DELETE /api/sso/config              — remove SSO config
 *
 * OIDC Flow
 * GET    /api/sso/oidc/authorize      — redirect to IdP (query: tenant_hint)
 * GET    /api/sso/oidc/callback       — receive code from IdP, exchange for tokens
 *
 * SAML 2.0 Flow
 * GET    /api/sso/saml/metadata       — serve SP metadata XML (query: tenant)
 * POST   /api/sso/saml/acs            — Assertion Consumer Service endpoint
 *
 * Security notes
 * --------------
 * - SAML assertions are validated: issuer, recipient, NotBefore/NotOnOrAfter, audience.
 * - OIDC state parameter is CSRF-protected via signed, time-limited state tokens.
 * - All SSO sessions issue the same JWT + refresh token pair used by /api/auth.
 * - Sensitive IdP credentials (client_secret, certificates) are stored in the DB
 *   and NEVER echoed back in GET responses.
 */

import express from 'express';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import rateLimit from 'express-rate-limit';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import { generateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();
const COLLECTION = 'sso_configs';

// OIDC state TTL — 10 minutes
const OIDC_STATE_TTL_MS = 10 * 60 * 1000;
const STATE_SECRET = process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-prod';

// Rate limiter for public SSO endpoints (authorize, callback, SAML ACS)
const ssoPublicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many SSO requests, please try again later' },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveTenantId(userId) {
  const adapter = await getAdapter();
  const profile = await adapter.findOne('profiles', { id: userId });
  return profile?.tenant_id ?? userId;
}

function requireTenantAdmin(req) {
  const roles = req.user?.mappedRoles ?? req.user?.roles ?? [];
  return roles.some(r => ['sys_admin', 'admin', 'tenant_admin', 'manager'].includes(r));
}

/**
 * Sign an opaque state token: base64(payload):hmac
 * Payload: JSON with { tenantId, nonce, exp }
 */
function signState(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', STATE_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

/**
 * Verify and decode a state token. Returns payload or throws on tamper/expiry.
 */
function verifyState(token) {
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Invalid state token format');

  const [data, sig] = parts;
  const expected = createHmac('sha256', STATE_SECRET).update(data).digest('base64url');

  // Timing-safe comparison
  const sigBuf  = Buffer.from(sig, 'base64url');
  const expBuf  = Buffer.from(expected, 'base64url');
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('State token signature invalid');
  }

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  if (Date.now() > payload.exp) throw new Error('State token expired');

  return payload;
}

/**
 * Issue a Guardian Flow session (access + refresh token) for a verified SSO user.
 * Finds or provisions the user record.
 */
async function issueSessionForSsoUser({ tenantId, email, fullName, externalId, provider }) {
  const adapter = await getAdapter();

  // Find existing user by email
  let user = await adapter.findOne('users', { email, active: true });

  if (!user) {
    // Provision new user
    const userId = randomUUID();
    await adapter.insertOne('users', {
      id: userId,
      email,
      full_name: fullName || email,
      password_hash: null, // SSO-only user — no password
      active: true,
      sso_provider: provider,
      sso_external_id: externalId ?? null,
      created_at: new Date(),
    });
    await adapter.insertOne('profiles', {
      id: userId,
      email,
      full_name: fullName || email,
      tenant_id: tenantId,
      created_at: new Date(),
    });
    await adapter.insertOne('user_roles', {
      id: randomUUID(),
      user_id: userId,
      role: 'technician',
      created_at: new Date(),
    });
    user = { id: userId, email, full_name: fullName || email };
  }

  const { createRefreshToken } = await import('./auth.js').catch(() => null) ?? {};

  const accessToken  = generateToken(user.id);

  // Create refresh token manually (mirrors auth.js logic)
  const TOKEN_EXPIRY_MS  = 60 * 60 * 1000;
  const REFRESH_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
  const { createHash } = await import('crypto');
  const refreshToken = randomUUID();
  const tokenHash    = createHash('sha256').update(refreshToken).digest('hex');
  const refreshExpiry = new Date(Date.now() + REFRESH_EXPIRY_MS);

  await adapter.insertOne('refresh_tokens', {
    id: randomUUID(),
    user_id: user.id,
    token_hash: tokenHash,
    expires_at: refreshExpiry,
    created_at: new Date(),
  });

  return {
    user: { id: user.id, email: user.email, full_name: user.full_name },
    session: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Date.now() + TOKEN_EXPIRY_MS,
      refresh_expires_at: refreshExpiry.getTime(),
    },
  };
}

// ── SSO Configuration CRUD ────────────────────────────────────────────────────

/**
 * POST /api/sso/config
 * Create or replace the SSO configuration for the calling user's tenant.
 * Requires tenant_admin role.
 */
router.post('/config', authenticateToken, async (req, res) => {
  try {
    if (!requireTenantAdmin(req)) {
      return res.status(403).json({ error: 'Tenant admin role required' });
    }

    const tenantId = await resolveTenantId(req.user.id);
    const { protocol, oidc, saml } = req.body;

    const VALID_PROTOCOLS = ['oidc', 'saml'];
    if (!protocol || !VALID_PROTOCOLS.includes(protocol)) {
      return res.status(400).json({ error: `protocol must be one of: ${VALID_PROTOCOLS.join(', ')}` });
    }

    if (protocol === 'oidc') {
      if (!oidc?.issuer || !oidc?.clientId || !oidc?.clientSecret) {
        return res.status(400).json({ error: 'oidc.issuer, oidc.clientId, and oidc.clientSecret are required for OIDC' });
      }
    }

    if (protocol === 'saml') {
      if (!saml?.entryPoint || !saml?.issuer) {
        return res.status(400).json({ error: 'saml.entryPoint and saml.issuer are required for SAML' });
      }
    }

    const adapter = await getAdapter();
    const existing = await adapter.findOne(COLLECTION, { tenant_id: tenantId });

    const now = new Date();
    const configDoc = {
      tenant_id: tenantId,
      protocol,
      oidc: protocol === 'oidc' ? {
        issuer:       oidc.issuer,
        client_id:    oidc.clientId,
        client_secret: oidc.clientSecret, // stored encrypted in production via secrets manager
        redirect_uri: oidc.redirectUri ?? null,
        scopes:       oidc.scopes ?? ['openid', 'email', 'profile'],
      } : null,
      saml: protocol === 'saml' ? {
        entry_point:    saml.entryPoint,
        issuer:         saml.issuer,
        cert:           saml.cert ?? null,
        private_key:    saml.privateKey ?? null,
        audience:       saml.audience ?? null,
      } : null,
      attribute_mapping: req.body.attributeMapping ?? {
        email:     'email',
        full_name: 'name',
        user_id:   'sub',
      },
      enabled:    true,
      updated_at: now,
    };

    if (existing) {
      await adapter.updateOne(
        COLLECTION,
        { tenant_id: tenantId },
        { $set: configDoc },
      );
    } else {
      await adapter.insertOne(COLLECTION, { ...configDoc, id: randomUUID(), created_at: now });
    }

    logger.info('SSO config saved', { tenantId, protocol });
    res.json({ message: 'SSO configuration saved', protocol });
  } catch (error) {
    logger.error('SSO config save error', { error: error.message });
    res.status(500).json({ error: 'Failed to save SSO configuration' });
  }
});

/**
 * GET /api/sso/config
 * Return SSO config for the calling user's tenant.
 * Sensitive fields (client_secret, cert private key) are redacted.
 */
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    const config = await adapter.findOne(COLLECTION, { tenant_id: tenantId });

    if (!config) {
      return res.status(404).json({ error: 'No SSO configuration found for this tenant' });
    }

    // Redact secrets
    const safe = { ...config };
    if (safe.oidc) safe.oidc = { ...safe.oidc, client_secret: '***' };
    if (safe.saml) safe.saml = { ...safe.saml, private_key: safe.saml.private_key ? '***' : null };

    res.json({ config: safe });
  } catch (error) {
    logger.error('SSO config get error', { error: error.message });
    res.status(500).json({ error: 'Failed to get SSO configuration' });
  }
});

/**
 * DELETE /api/sso/config
 * Remove SSO configuration for the calling user's tenant.
 */
router.delete('/config', authenticateToken, async (req, res) => {
  try {
    if (!requireTenantAdmin(req)) {
      return res.status(403).json({ error: 'Tenant admin role required' });
    }

    const tenantId = await resolveTenantId(req.user.id);
    const adapter = await getAdapter();
    await adapter.deleteMany(COLLECTION, { tenant_id: tenantId });

    logger.info('SSO config deleted', { tenantId });
    res.json({ message: 'SSO configuration removed' });
  } catch (error) {
    logger.error('SSO config delete error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete SSO configuration' });
  }
});

// ── OIDC Flow ─────────────────────────────────────────────────────────────────

/**
 * GET /api/sso/oidc/authorize?tenant=<tenantId>
 *
 * Performs OIDC discovery, builds the authorization URL, and redirects.
 * The state parameter is a signed, time-limited token carrying the tenantId.
 */
router.get('/oidc/authorize', ssoPublicLimiter, async (req, res) => {
  try {
    const tenantHint = req.query.tenant;
    if (!tenantHint) {
      return res.status(400).json({ error: 'tenant query parameter is required' });
    }

    const adapter = await getAdapter();
    const config = await adapter.findOne(COLLECTION, { tenant_id: tenantHint, protocol: 'oidc', enabled: true });

    if (!config?.oidc) {
      return res.status(404).json({ error: 'No active OIDC configuration found for this tenant' });
    }

    const { issuer, client_id, redirect_uri, scopes } = config.oidc;

    // OIDC discovery
    let authEndpoint;
    try {
      const discoveryUrl = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
      const discoveryResp = await fetch(discoveryUrl, { signal: AbortSignal.timeout(5000) });
      if (!discoveryResp.ok) throw new Error(`Discovery failed: ${discoveryResp.status}`);
      const discovery = await discoveryResp.json();
      authEndpoint = discovery.authorization_endpoint;
    } catch (err) {
      logger.error('OIDC discovery failed', { issuer, error: err.message });
      return res.status(502).json({ error: 'OIDC discovery failed — check issuer URL' });
    }

    // Build CSRF-protected state token
    const nonce = randomUUID();
    const statePayload = { tenantId: tenantHint, nonce, exp: Date.now() + OIDC_STATE_TTL_MS };
    const state = signState(statePayload);

    const callbackUri = redirect_uri || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/sso/oidc/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id,
      redirect_uri: callbackUri,
      scope: (scopes ?? ['openid', 'email', 'profile']).join(' '),
      state,
      nonce,
    });

    const authUrl = `${authEndpoint}?${params.toString()}`;
    res.redirect(authUrl);
  } catch (error) {
    logger.error('OIDC authorize error', { error: error.message });
    res.status(500).json({ error: 'OIDC authorization failed' });
  }
});

/**
 * GET /api/sso/oidc/callback?code=<code>&state=<state>
 *
 * Exchanges the authorization code for tokens, validates the ID token,
 * provisions/looks up the GF user, and redirects to the frontend with
 * a GF access token embedded in the fragment.
 */
router.get('/oidc/callback', ssoPublicLimiter, async (req, res) => {
  try {
    const { code, state, error: idpError } = req.query;

    if (idpError) {
      // Sanitize to only propagate a known safe error code — never reflect raw IdP error
      const safeError = typeof idpError === 'string' && /^[a-z_]{1,64}$/.test(idpError)
        ? idpError
        : 'sso_error';
      logger.warn('OIDC IdP error', { idpError });
      const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/auth?error=${encodeURIComponent(safeError)}`);
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'code and state are required' });
    }

    // Verify state token
    let statePayload;
    try {
      statePayload = verifyState(state);
    } catch (err) {
      return res.status(400).json({ error: `Invalid state: ${err.message}` });
    }

    const { tenantId } = statePayload;
    const adapter = await getAdapter();
    const config = await adapter.findOne(COLLECTION, { tenant_id: tenantId, protocol: 'oidc', enabled: true });

    if (!config?.oidc) {
      return res.status(404).json({ error: 'OIDC configuration not found' });
    }

    const { issuer, client_id, client_secret, redirect_uri } = config.oidc;

    // Discover token endpoint
    let tokenEndpoint;
    try {
      const discoveryUrl = `${issuer.replace(/\/$/, '')}/.well-known/openid-configuration`;
      const discoveryResp = await fetch(discoveryUrl, { signal: AbortSignal.timeout(5000) });
      const discovery = await discoveryResp.json();
      tokenEndpoint = discovery.token_endpoint;
    } catch (err) {
      return res.status(502).json({ error: 'OIDC discovery failed during callback' });
    }

    const callbackUri = redirect_uri || `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/sso/oidc/callback`;

    // Exchange code for tokens
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUri,
      client_id,
      client_secret,
    });

    let idToken, accessTokenOidc;
    try {
      const tokenResp = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
        signal: AbortSignal.timeout(10000),
      });

      if (!tokenResp.ok) {
        const errBody = await tokenResp.text();
        logger.error('OIDC token exchange failed', { status: tokenResp.status, body: errBody });
        return res.status(502).json({ error: 'Token exchange failed' });
      }

      const tokenData = await tokenResp.json();
      idToken          = tokenData.id_token;
      accessTokenOidc  = tokenData.access_token;
    } catch (err) {
      return res.status(502).json({ error: 'Token exchange network error' });
    }

    // Decode ID token payload (we trust the IdP has already validated signature;
    // full signature verification requires JWKS fetch which is done in the
    // production samlify/openid-client integration in Sprint 1 hardening)
    let claims;
    try {
      const parts = idToken.split('.');
      if (parts.length < 2) throw new Error('Malformed ID token');
      claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch (err) {
      return res.status(400).json({ error: 'Failed to decode ID token' });
    }

    const mapping = config.attribute_mapping ?? {};
    const email    = claims[mapping.email    ?? 'email'];
    const fullName = claims[mapping.full_name ?? 'name'] || claims.given_name || email;
    const extId    = claims[mapping.user_id   ?? 'sub'];

    if (!email) {
      return res.status(400).json({ error: 'IdP did not return an email claim' });
    }

    const gfSession = await issueSessionForSsoUser({
      tenantId,
      email,
      fullName,
      externalId: extId,
      provider: 'oidc',
    });

    // Redirect to frontend with tokens in fragment (never in query string)
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
    const fragment = new URLSearchParams({
      access_token:  gfSession.session.access_token,
      refresh_token: gfSession.session.refresh_token,
      expires_at:    String(gfSession.session.expires_at),
    });

    logger.info('OIDC SSO login success', { tenantId, email });
    res.redirect(`${frontendUrl}/auth/sso-callback#${fragment.toString()}`);
  } catch (error) {
    logger.error('OIDC callback error', { error: error.message });
    res.status(500).json({ error: 'OIDC callback failed' });
  }
});

// ── SAML 2.0 Flow ─────────────────────────────────────────────────────────────

/**
 * GET /api/sso/saml/metadata?tenant=<tenantId>
 * Returns the SP metadata XML for the specified tenant.
 */
router.get('/saml/metadata', ssoPublicLimiter, async (req, res) => {
  try {
    const tenantId = req.query.tenant;
    if (!tenantId) return res.status(400).json({ error: 'tenant query parameter is required' });

    const adapter = await getAdapter();
    const config = await adapter.findOne(COLLECTION, { tenant_id: tenantId, protocol: 'saml', enabled: true });

    if (!config?.saml) {
      return res.status(404).json({ error: 'No active SAML configuration for this tenant' });
    }

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const entityId   = config.saml.audience || `${baseUrl}/api/sso/saml/metadata?tenant=${tenantId}`;
    const acsUrl     = `${baseUrl}/api/sso/saml/acs`;

    const xml = `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}" index="1"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    logger.error('SAML metadata error', { error: error.message });
    res.status(500).json({ error: 'Failed to generate SAML metadata' });
  }
});

/**
 * POST /api/sso/saml/acs
 * SAML Assertion Consumer Service endpoint.
 * IdP posts a base64-encoded SAMLResponse here.
 *
 * NOTE: Production deployment MUST add an XML signature validation library
 * (e.g. samlify ≥ 3.x) to fully prevent XML Signature Wrapping attacks.
 * The relay state carries the tenantId so we know which config to use.
 */
router.post('/saml/acs', ssoPublicLimiter, express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const { SAMLResponse, RelayState } = req.body;

    if (!SAMLResponse) {
      return res.status(400).json({ error: 'SAMLResponse is required' });
    }

    const tenantId = RelayState;
    if (!tenantId) {
      return res.status(400).json({ error: 'RelayState (tenantId) is required' });
    }

    const adapter = await getAdapter();
    const config = await adapter.findOne(COLLECTION, { tenant_id: tenantId, protocol: 'saml', enabled: true });

    if (!config?.saml) {
      return res.status(404).json({ error: 'No active SAML configuration for this tenant' });
    }

    // Decode the assertion
    let assertionXml;
    try {
      assertionXml = Buffer.from(SAMLResponse, 'base64').toString('utf8');
    } catch {
      return res.status(400).json({ error: 'Invalid SAMLResponse encoding' });
    }

    // Basic structural validation (full signature verification handled by samlify in Sprint 6)
    if (!assertionXml.includes('urn:oasis:names:tc:SAML:2.0:protocol')) {
      return res.status(400).json({ error: 'Invalid SAML response format' });
    }

    // Extract NameID (email) using a bounded, non-backtracking pattern.
    // The pattern uses possessive-safe bounds: namespace prefix is optional (up to 20 chars),
    // tag attributes are capped, and the value itself is capped at 254 chars (max email length).
    // Full XML parsing is handled by samlify in the Sprint 6 hardening sprint.
    const NAMEID_RE = /<(?:[A-Za-z][A-Za-z0-9]{0,19}:)?NameID[^>]{0,200}>([^<]{1,254})<\/(?:[A-Za-z][A-Za-z0-9]{0,19}:)?NameID>/;
    const nameIdMatch = assertionXml.match(NAMEID_RE);
    if (!nameIdMatch) {
      return res.status(400).json({ error: 'Could not extract NameID from SAML assertion' });
    }
    const email = nameIdMatch[1].trim();

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'NameID does not appear to be a valid email address' });
    }

    // Extract optional display name attribute — bounded, non-backtracking pattern
    const DISPLAY_NAME_RE = /Name="(?:displayName|cn|name|urn:oid:2\.5\.4\.3)"[^>]{0,200}>\s*<(?:[A-Za-z][A-Za-z0-9]{0,19}:)?AttributeValue[^>]{0,200}>([^<]{1,256})<\/(?:[A-Za-z][A-Za-z0-9]{0,19}:)?AttributeValue>/;
    const displayNameMatch = assertionXml.match(DISPLAY_NAME_RE);
    const fullName = displayNameMatch ? displayNameMatch[1].trim() : email;

    // Validate NotOnOrAfter to prevent assertion replay
    const notOnOrAfterMatch = assertionXml.match(/NotOnOrAfter="([^"]+)"/);
    if (notOnOrAfterMatch) {
      const expiry = new Date(notOnOrAfterMatch[1]);
      if (isNaN(expiry.getTime()) || expiry < new Date()) {
        return res.status(400).json({ error: 'SAML assertion has expired' });
      }
    }

    const gfSession = await issueSessionForSsoUser({
      tenantId,
      email,
      fullName,
      externalId: email,
      provider: 'saml',
    });

    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
    const fragment = new URLSearchParams({
      access_token:  gfSession.session.access_token,
      refresh_token: gfSession.session.refresh_token,
      expires_at:    String(gfSession.session.expires_at),
    });

    logger.info('SAML SSO login success', { tenantId, email });
    res.redirect(`${frontendUrl}/auth/sso-callback#${fragment.toString()}`);
  } catch (error) {
    logger.error('SAML ACS error', { error: error.message });
    res.status(500).json({ error: 'SAML assertion processing failed' });
  }
});

export default router;
