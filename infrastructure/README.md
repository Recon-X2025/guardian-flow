# Guardian Flow — Infrastructure & Deployment

## Quick Start (Docker Compose)

```bash
# Development
docker compose up postgres server

# Production (requires .env with credentials)
cp .env.production.example .env
# Edit .env with real values
docker compose up -d
```

## Production Deployment (AWS)

### Prerequisites
- AWS CLI configured
- Terraform >= 1.0
- ACM certificate for your domain
- ECR repository with app image

### Steps

1. **Build and push Docker image:**
   ```bash
   docker build -t guardian-flow .
   docker tag guardian-flow:latest <ECR_URL>:latest
   docker push <ECR_URL>:latest
   ```

2. **Deploy infrastructure:**
   ```bash
   cd infrastructure/terraform/aws
   terraform init
   terraform plan \
     -var="ecr_repository=<ECR_URL>" \
     -var="ssl_certificate_arn=<ACM_ARN>" \
     -var="frontend_url=https://your-domain.com"
   terraform apply
   ```

3. **Get outputs:**
   ```bash
   terraform output alb_dns_name  # Point your DNS here
   ```

### What Gets Created
- VPC with public/private subnets
- RDS PostgreSQL 14 with automated backups (7-day retention)
- ECS Fargate cluster (2 instances by default)
- Application Load Balancer with HTTPS
- Secrets Manager for credentials
- CloudWatch log group
- CloudFront CDN distribution

## Database Backups

### Docker Compose
Backups run automatically at 2 AM UTC via the `backup` service.

```bash
# Manual backup
docker compose exec backup /usr/local/bin/backup-database.sh

# Restore
docker compose exec backup /usr/local/bin/restore-database.sh /backups/<file>.sql.gz
```

### AWS
RDS automated backups with 7-day retention. Point-in-time recovery available.

## Secrets Management

### Environment Variables (Default)
Set values in `.env` file. Required in production:
- `JWT_SECRET` (64+ chars)
- `DB_PASSWORD` (16+ chars, non-default)
- `DB_USER` (non-default)
- `FRONTEND_URL`

### AWS Secrets Manager
```bash
export SECRETS_PROVIDER=aws
export AWS_SECRET_NAME=guardian-flow/production
node server/server.js
```

### GCP Secret Manager
```bash
export SECRETS_PROVIDER=gcp
export GCP_PROJECT_ID=your-project
node server/server.js
```

## SSL/TLS

### Self-signed (Development)
```bash
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

### Let's Encrypt (Production)
Use certbot or your cloud provider's certificate manager (ACM for AWS).

## Monitoring

- **Health check:** `GET /api/health` — database status, uptime, version
- **Metrics:** `GET /metrics` — Prometheus-compatible text format
- **Metrics JSON:** `GET /metrics/json` — JSON format for dashboards

## Environment Variables Reference

See `.env.production.example` for the full list.
