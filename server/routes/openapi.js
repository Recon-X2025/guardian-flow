/**
 * @file server/routes/openapi.js
 * @description Serves OpenAPI 3.1 spec and Swagger UI for all Guardian Flow APIs.
 *
 * Routes
 * ──────
 *  GET /api/openapi.json  — machine-readable OpenAPI 3.1 JSON spec
 *  GET /api/docs          — Swagger UI (served from CDN — no static build needed)
 */

import express from 'express';

const router = express.Router();

// ── OpenAPI 3.1 spec ──────────────────────────────────────────────────────────

function buildSpec(req) {
  const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
  const host = req.headers['x-forwarded-host'] ?? req.get('host');
  const serverUrl = `${protocol}://${host}`;

  return {
    openapi: '3.1.0',
    info: {
      title: 'Guardian Flow API',
      version: '2.0.0',
      description: [
        'Enterprise Field Service Management Platform.',
        '',
        '**Authentication:** All endpoints (except `/api/auth/*`) require a `Bearer <jwt>` header.',
        '',
        '**Tenant isolation:** Every request is scoped to the authenticated user\'s tenant.',
      ].join('\n'),
      contact: { name: 'Guardian Flow Engineering', url: 'https://github.com/Recon-X2025/guardian-flow' },
      license: { name: 'Proprietary' },
    },
    servers: [{ url: serverUrl, description: 'Current server' }],
    tags: [
      { name: 'Auth',            description: 'Authentication & JWT issuance' },
      { name: 'Work Orders',     description: 'Field work order management' },
      { name: 'Schedule',        description: 'Technician scheduling' },
      { name: 'Assets',          description: 'Asset registry and health' },
      { name: 'CRM',             description: 'Customer relationship management' },
      { name: 'Finance',         description: 'Invoicing, payments, GL, budgeting' },
      { name: 'Revenue',         description: 'ASC 606 revenue recognition' },
      { name: 'Tax',             description: 'Tax calculation (Avalara / TaxJar / local)' },
      { name: 'AI',              description: 'LLM Copilot, embeddings, ML' },
      { name: 'Connectors',      description: 'ERP connectors (SAP, NetSuite, Salesforce, QuickBooks)' },
      { name: 'Org',             description: 'Organisation & tenant management' },
      { name: 'FlowSpace',       description: 'Immutable decision ledger' },
      { name: 'DEX',             description: 'Dynamic Execution Contexts' },
      { name: 'SSO',             description: 'Single Sign-On (SAML / OIDC)' },
      { name: 'IoT',             description: 'IoT telemetry ingestion' },
      { name: 'Analytics',       description: 'Event tracking & aggregates' },
      { name: 'GraphQL',         description: 'Read-heavy analytics GraphQL endpoint' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        Pagination: {
          type: 'object',
          properties: {
            limit: { type: 'integer', default: 50 },
            offset: { type: 'integer', default: 0 },
            total: { type: 'integer' },
          },
        },
        RevenueContract: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            customer_name: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            contract_date: { type: 'string', format: 'date' },
            currency: { type: 'string', example: 'USD' },
            total_amount: { type: 'number', example: 120000 },
            recognised_amount: { type: 'number', example: 40000 },
            deferred_amount: { type: 'number', example: 80000 },
            status: { type: 'string', enum: ['active', 'completed', 'cancelled'] },
          },
        },
        TaxCalculation: {
          type: 'object',
          properties: {
            tax_amount: { type: 'number', example: 87.50 },
            tax_rate: { type: 'number', example: 0.0875 },
            provider: { type: 'string', enum: ['avalara', 'taxjar', 'local'] },
            breakdown: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      // ── Auth ──────────────────────────────────────────────────────────────
      '/api/auth/register': {
        post: {
          tags: ['Auth'], summary: 'Register new user',
          security: [],
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8 }, name: { type: 'string' } } } } } },
          responses: { 201: { description: 'User created + JWT' }, 400: { description: 'Validation error' } },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'], summary: 'Authenticate and get JWT',
          security: [],
          requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
          responses: { 200: { description: 'JWT token' }, 401: { description: 'Invalid credentials' } },
        },
      },
      // ── Revenue ───────────────────────────────────────────────────────────
      '/api/revenue/contracts': {
        get: { tags: ['Revenue'], summary: 'List revenue contracts', parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'completed', 'cancelled'] } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }], responses: { 200: { description: 'Contracts list' } } },
        post: { tags: ['Revenue'], summary: 'Create revenue contract (auto-allocates transaction price)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['total_amount', 'performance_obligations'], properties: { customer_name: { type: 'string' }, description: { type: 'string' }, contract_date: { type: 'string', format: 'date' }, currency: { type: 'string', default: 'USD' }, total_amount: { type: 'number' }, performance_obligations: { type: 'array', items: { type: 'object', properties: { description: { type: 'string' }, delivery_type: { type: 'string', enum: ['over_time', 'point'] }, standalone_selling_price: { type: 'number' }, start_date: { type: 'string', format: 'date' }, end_date: { type: 'string', format: 'date' }, delivery_date: { type: 'string', format: 'date' } } } } } } } } }, responses: { 201: { description: 'Created contract with POBs and schedule' }, 400: { description: 'Validation error' } } },
      },
      '/api/revenue/contracts/{id}': {
        get: { tags: ['Revenue'], summary: 'Get contract detail', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Contract with POBs and schedules' }, 404: { description: 'Not found' } } },
        put: { tags: ['Revenue'], summary: 'Update contract metadata', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated contract' } } },
      },
      '/api/revenue/contracts/{id}/recognise': {
        post: { tags: ['Revenue'], summary: 'Run period-end recognition (creates journal lines)', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['period'], properties: { period: { type: 'string', pattern: '^\\d{4}-\\d{2}$', example: '2026-04' } } } } } }, responses: { 200: { description: 'Recognised schedule rows and journal lines' } } },
      },
      '/api/revenue/dashboard': {
        get: { tags: ['Revenue'], summary: 'Revenue recognition KPI dashboard', responses: { 200: { description: 'Dashboard metrics' } } },
      },
      // ── Tax ───────────────────────────────────────────────────────────────
      '/api/tax/calculate': {
        post: { tags: ['Tax'], summary: 'Calculate tax for a transaction', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['subtotal'], properties: { subtotal: { type: 'number' }, currency: { type: 'string', default: 'USD' }, destination: { type: 'object', properties: { line1: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' }, country: { type: 'string' }, zip: { type: 'string' } } }, line_items: { type: 'array', items: { type: 'object' } } } } } } }, responses: { 200: { description: 'Tax calculation result', content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxCalculation' } } } } } },
      },
      '/api/tax/validate': {
        post: { tags: ['Tax'], summary: 'Validate and normalise a shipping address', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'object', properties: { line1: { type: 'string' }, city: { type: 'string' }, state: { type: 'string' }, country: { type: 'string' }, zip: { type: 'string' } } } } } } } }, responses: { 200: { description: 'Validation result' } } },
      },
      '/api/tax/config': {
        get: { tags: ['Tax'], summary: 'Get active tax provider (no secrets exposed)', responses: { 200: { description: 'Provider config' } } },
      },
      // ── AI ────────────────────────────────────────────────────────────────
      '/api/ai/chat': {
        post: { tags: ['AI'], summary: 'LLM chat completion (SSE streaming)', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, context: { type: 'object' } } } } } }, responses: { 200: { description: 'Server-sent events stream of tokens' } } },
      },
      '/api/ai/embed': {
        post: { tags: ['AI'], summary: 'Embed text and perform vector search', responses: { 200: { description: 'Embedding + nearest neighbours' } } },
      },
      // ── Connectors ────────────────────────────────────────────────────────
      '/api/connectors': {
        get: { tags: ['Connectors'], summary: 'List configured connectors', responses: { 200: { description: 'Connector list' } } },
        post: { tags: ['Connectors'], summary: 'Register a new connector', requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['connector_type'], properties: { connector_type: { type: 'string', enum: ['salesforce', 'quickbooks', 'sap', 'netsuite', 'xero'] }, credentials: { type: 'object' } } } } } }, responses: { 201: { description: 'Connector created' } } },
      },
      '/api/connectors/sync': {
        post: { tags: ['Connectors'], summary: 'Trigger connector sync', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { connector_type: { type: 'string' }, direction: { type: 'string', enum: ['inbound', 'outbound'] }, entity: { type: 'string' } } } } } }, responses: { 200: { description: 'Sync result' } } },
      },
      // ── GraphQL ───────────────────────────────────────────────────────────
      '/api/graphql': {
        post: { tags: ['GraphQL'], summary: 'GraphQL endpoint (read-heavy analytics queries)', requestBody: { content: { 'application/json': { schema: { type: 'object', required: ['query'], properties: { query: { type: 'string', example: '{ revenueStats { total_recognised total_deferred } }' }, variables: { type: 'object' } } } } } }, responses: { 200: { description: 'GraphQL response' } } },
        get: { tags: ['GraphQL'], summary: 'GraphQL explorer (GraphiQL)', responses: { 200: { description: 'GraphiQL HTML interface' } } },
      },
    },
  };
}

// ── GET /api/openapi.json ─────────────────────────────────────────────────────

router.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(buildSpec(req));
});

// ── GET /api/docs ─────────────────────────────────────────────────────────────

router.get('/docs', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
  const host = req.headers['x-forwarded-host'] ?? req.get('host');
  const specUrl = `${protocol}://${host}/api/openapi.json`;

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Guardian Flow API Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        deepLinking: true,
        persistAuthorization: true,
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>`);
});

export default router;
