# Environment Configuration Template

**Purpose**: Template for setting up ReconX Guardian Flow environment variables  
**Target**: Buyer deployment team  
**Format**: Environment variable definitions (non-secret values only)

---

## Required Environment Variables

### Lovable Cloud (Auto-Configured)

These are automatically set by Lovable Cloud and should **NOT** be manually edited:

```bash
# Supabase Connection (Auto-configured by Lovable)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```

### Backend Secrets (Required)

These must be configured via Lovable Project Settings → Secrets:

```bash
# Internal API Security
INTERNAL_API_SECRET=<generate-secure-random-string>

# Supabase Backend Keys (Auto-set by Lovable Cloud)
SUPABASE_URL=<same-as-VITE_SUPABASE_URL>
SUPABASE_ANON_KEY=<same-as-VITE_SUPABASE_PUBLISHABLE_KEY>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase>
SUPABASE_DB_URL=<postgres-connection-string>
```

### Optional AI Integrations (Phase 2)

If using external AI models (beyond Lovable AI):

```bash
# Lovable AI (Included with Lovable Cloud)
LOVABLE_API_KEY=<auto-configured>

# Google Gemini (Optional)
GOOGLE_GEMINI_API_KEY=<your-gemini-key>

# OpenAI (Optional)
OPENAI_API_KEY=<your-openai-key>
```

### Optional Payment Gateway (Phase 2)

For Stripe integration:

```bash
# Stripe Test Mode
STRIPE_API_KEY=<stripe-test-publishable-key>
STRIPE_SECRET_KEY=<stripe-test-secret-key>

# Stripe Production (when ready)
STRIPE_API_KEY_PROD=<stripe-prod-publishable-key>
STRIPE_SECRET_KEY_PROD=<stripe-prod-secret-key>
```

---

## Configuration Steps

### Step 1: Access Lovable Project Settings

1. Open your ReconX project in Lovable
2. Click **Settings** (top-right)
3. Navigate to **Secrets** tab

### Step 2: Configure Required Secrets

Add the following secrets (one at a time):

#### INTERNAL_API_SECRET

```bash
# Generate a secure random string (recommended: 32+ characters)
# Example generation methods:
# - Node.js: crypto.randomBytes(32).toString('hex')
# - OpenSSL: openssl rand -hex 32
# - Online: https://www.random.org/strings/

Name: INTERNAL_API_SECRET
Value: <your-generated-secret>
```

**Purpose**: Secures internal agent-to-agent API calls

#### Supabase Keys (Auto-Configured)

These are automatically set by Lovable Cloud:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

**Verification**: Check that these exist in your Secrets tab

### Step 3: Optional AI Configuration

If you want to use external AI models (beyond Lovable AI):

#### GOOGLE_GEMINI_API_KEY (Optional)

```bash
Name: GOOGLE_GEMINI_API_KEY
Value: <your-key-from-google-cloud>
```

1. Visit [Google AI Studio](https://makersuite.google.com/)
2. Create a new API key
3. Copy and paste into Lovable Secrets

#### OPENAI_API_KEY (Optional)

```bash
Name: OPENAI_API_KEY
Value: <your-key-from-openai>
```

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Copy and paste into Lovable Secrets

### Step 4: Stripe Configuration (Phase 2)

For production billing features:

1. Create [Stripe account](https://dashboard.stripe.com/register)
2. Get **test mode** keys:
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)
3. Add to Lovable Secrets:
   ```bash
   STRIPE_API_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

---

## Environment-Specific Settings

### Development Environment

```bash
# Frontend (Vite automatically prefixes with VITE_)
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<dev-anon-key>

# Backend (Edge Functions)
INTERNAL_API_SECRET=<dev-secret>
```

### Staging Environment

```bash
# Use separate Supabase project for staging
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<staging-anon-key>

INTERNAL_API_SECRET=<staging-secret>
```

### Production Environment

```bash
# Production Supabase project
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<prod-anon-key>

INTERNAL_API_SECRET=<prod-secret-strong>

# Enable production features
STRIPE_API_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

---

## Security Best Practices

### 1. Secret Rotation

- **INTERNAL_API_SECRET**: Rotate every 90 days
- **STRIPE_SECRET_KEY**: Rotate annually or on breach
- **AI API Keys**: Monitor usage, rotate on anomaly

### 2. Access Control

- ✅ Only grant Lovable Secrets access to DevOps team
- ✅ Never commit secrets to git
- ✅ Use different secrets per environment
- ✅ Audit secret access logs monthly

### 3. Key Strength

| Secret | Min Length | Complexity |
|--------|-----------|------------|
| INTERNAL_API_SECRET | 32 chars | Alphanumeric + symbols |
| STRIPE_SECRET_KEY | 32 chars | Provided by Stripe |
| AI API Keys | Varies | Provided by vendor |

---

## Verification Checklist

After configuration, verify:

- [ ] Lovable project builds successfully
- [ ] Frontend loads without console errors
- [ ] Edge functions deploy without failures
- [ ] API Gateway returns 200 OK on health check
- [ ] Supabase connection works (check auth)
- [ ] Internal API calls succeed (check logs)
- [ ] (Optional) AI models respond to test requests
- [ ] (Optional) Stripe test payment succeeds

---

## Troubleshooting

### Common Issues

#### 1. "Missing required environment variable"

**Symptom**: Build fails with missing variable error

**Solution**:
- Check Lovable Settings → Secrets
- Ensure all required secrets are set
- Re-deploy after adding secrets

#### 2. "CORS error when calling Edge Function"

**Symptom**: Browser shows CORS policy error

**Solution**:
- Verify `SUPABASE_URL` matches deployed project
- Check Edge Function CORS headers are set
- Clear browser cache and retry

#### 3. "Unauthorized: Invalid API key"

**Symptom**: API Gateway returns 401

**Solution**:
- Verify `INTERNAL_API_SECRET` is set correctly
- Check API key format (no extra spaces)
- Regenerate API key if compromised

---

## Contact & Support

For environment configuration issues:
- **Documentation**: [Lovable Docs](https://docs.lovable.dev/)
- **Community**: [Lovable Discord](https://discord.gg/lovable)
- **Email**: support@reconx.ai

---

*Template Version: 1.0*  
*Last Updated: October 2025*  
*Compatible with: ReconX v6.0*
