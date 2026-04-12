# Environment Configuration Template

**Purpose**: Template for setting up Guardian Flow environment variables  
**Target**: Buyer deployment team  
**Format**: Environment variable definitions (non-secret values only)

---

## Required Environment Variables

### Application Configuration

```bash
# Frontend API URL
VITE_API_URL=http://localhost:3001
```

### Backend Secrets (Required)

These must be configured via environment variables or a `.env` file:

```bash
# Internal API Security
INTERNAL_API_SECRET=<generate-secure-random-string>

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### Optional AI Integrations (Phase 2)

If using external AI models:

```bash
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

### Step 1: Access Project Environment Configuration

1. Open your Guardian Flow project
2. Locate your `.env` file or deployment environment settings
3. Set the required environment variables

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

#### MongoDB Atlas Connection

Ensure your MongoDB Atlas connection string is configured:
- `MONGODB_URI`

**Verification**: Check that the connection string is set and the cluster is accessible

### Step 3: Optional AI Configuration

If you want to use external AI models:

#### GOOGLE_GEMINI_API_KEY (Optional)

```bash
Name: GOOGLE_GEMINI_API_KEY
Value: <your-key-from-google-cloud>
```

1. Visit [Google AI Studio](https://makersuite.google.com/)
2. Create a new API key
3. Copy and paste into your `.env` file

#### OPENAI_API_KEY (Optional)

```bash
Name: OPENAI_API_KEY
Value: <your-key-from-openai>
```

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Copy and paste into your `.env` file

### Step 4: Stripe Configuration (Phase 2)

For production billing features:

1. Create [Stripe account](https://dashboard.stripe.com/register)
2. Get **test mode** keys:
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)
3. Add to your `.env` file:
   ```bash
   STRIPE_API_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

---

## Environment-Specific Settings

### Development Environment

```bash
# Frontend
VITE_API_URL=http://localhost:3001

# Backend
MONGODB_URI=mongodb+srv://<user>:<pass>@dev-cluster.mongodb.net/guardianflow_dev
INTERNAL_API_SECRET=<dev-secret>
```

### Staging Environment

```bash
# Use separate MongoDB Atlas cluster for staging
VITE_API_URL=https://staging-api.guardianflow.ai
MONGODB_URI=mongodb+srv://<user>:<pass>@staging-cluster.mongodb.net/guardianflow_staging

INTERNAL_API_SECRET=<staging-secret>
```

### Production Environment

```bash
# Production MongoDB Atlas cluster
VITE_API_URL=https://api.guardianflow.ai
MONGODB_URI=mongodb+srv://<user>:<pass>@prod-cluster.mongodb.net/guardianflow_prod

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

- ✅ Only grant environment secrets access to DevOps team
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

- [ ] Project builds successfully
- [ ] Frontend loads without console errors
- [ ] Server routes deploy without failures
- [ ] API Gateway returns 200 OK on health check
- [ ] MongoDB Atlas connection works (check auth)
- [ ] Internal API calls succeed (check logs)
- [ ] (Optional) AI models respond to test requests
- [ ] (Optional) Stripe test payment succeeds

---

## Troubleshooting

### Common Issues

#### 1. "Missing required environment variable"

**Symptom**: Build fails with missing variable error

**Solution**:
- Check your `.env` file or deployment environment settings
- Ensure all required secrets are set
- Re-deploy after adding secrets

#### 2. "CORS error when calling API"

**Symptom**: Browser shows CORS policy error

**Solution**:
- Verify `VITE_API_URL` matches deployed backend
- Check Express.js CORS middleware configuration
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
- **Documentation**: [Guardian Flow Docs](docs/ARCHITECTURE.md)
- **Email**: support@guardianflow.ai

---

*Template Version: 1.0*  
*Last Updated: April 2026*  
*Compatible with: Guardian Flow v6.1*
