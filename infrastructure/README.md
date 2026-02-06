# Guardian Flow — Infrastructure & Deployment

## Quick Start (Docker Compose)

```bash
# Development — starts the backend server (MongoDB Atlas is used remotely)
docker compose up server

# Production (requires .env with credentials)
cp .env.production.example .env
# Edit .env with real values (including MONGODB_URI)
docker compose up -d
```

## Production Deployment (AWS)

### Prerequisites
- AWS CLI configured
- Terraform >= 1.0
- ACM certificate for your domain
- ECR repository with app image
- MongoDB Atlas cluster provisioned with connection URI

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
     -var="frontend_url=https://your-domain.com" \
     -var="mongodb_uri=mongodb+srv://user:pass@cluster.mongodb.net/guardianflow?retryWrites=true&w=majority"
   terraform apply
   ```

3. **Get outputs:**
   ```bash
   terraform output alb_dns_name  # Point your DNS here
   ```

### What Gets Created
- VPC with public/private subnets
- ECS Fargate cluster (2 instances by default)
- Application Load Balancer with HTTPS
- Secrets Manager for credentials (MONGODB_URI, JWT_SECRET)
- CloudWatch log group
- CloudFront CDN distribution

> **Note:** MongoDB Atlas is a fully managed cloud database and is *not* provisioned by this Terraform configuration. Manage your Atlas cluster, network peering / PrivateLink, and backup policies through the MongoDB Atlas console or the `mongodbatlas` Terraform provider.

## Database Backups

MongoDB Atlas provides automated continuous backups with point-in-time restore. Configure backup policies (snapshot schedule, retention period) through the Atlas console or API.

### On-Demand Snapshots

Use the Atlas CLI or console to create on-demand snapshots:
```bash
atlas backups snapshots create <clusterName> --desc "manual backup"
```

### Restore

Restore from the Atlas console or CLI:
```bash
atlas backups restores start automated --clusterName <clusterName> --snapshotId <id> --targetClusterName <clusterName>
```

## Secrets Management

### Environment Variables (Default)
Set values in `.env` file. Required in production:
- `JWT_SECRET` (64+ chars)
- `MONGODB_URI` (MongoDB Atlas connection string)
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
