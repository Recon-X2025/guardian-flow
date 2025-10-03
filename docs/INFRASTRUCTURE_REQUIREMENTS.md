# Infrastructure Requirements & Deployment Guide

## Overview
This document outlines the external infrastructure required to fully deploy ReconX Guardian Flow in a production environment. These components are beyond Lovable's scope and require cloud provider accounts.

---

## Required Cloud Services

### 1. Managed PostgreSQL Database
**Options:**
- AWS RDS Aurora PostgreSQL (recommended)
- Google Cloud SQL for PostgreSQL
- Azure Database for PostgreSQL
- Self-hosted Supabase (includes Postgres + Auth + Storage)

**Specifications:**
- Version: PostgreSQL 15+
- Storage: 100GB minimum, auto-scaling enabled
- Instance: db.r6g.xlarge (4 vCPU, 32GB RAM) or equivalent
- Backups: Daily automated backups with 30-day retention
- HA: Multi-AZ deployment for production

**Why Needed:**
Lovable Cloud provides Supabase, but for production scale or self-hosting, managed Postgres is required.

---

### 2. Object Storage
**Options:**
- AWS S3 (recommended)
- Google Cloud Storage
- Azure Blob Storage

**Buckets Required:**
- `attachments`: Photo uploads from technicians
- `service-orders`: Generated PDF service orders
- `templates`: SO template versions
- `backups`: Database and configuration backups

**Configuration:**
- Lifecycle policies: Move old attachments to Glacier/Archive after 90 days
- CORS: Enable for client-side uploads
- Encryption: Enable at-rest encryption (S3: SSE-S3 or KMS)

---

### 3. GPU Inference Pool (Photo Validation CV)
**Specifications:**
- **Kubernetes Cluster** with GPU node pool
- Node type: AWS `g4dn.xlarge` (NVIDIA T4 GPU) or equivalent
- Min nodes: 2, Max nodes: 10 (autoscaling)
- GPU drivers: NVIDIA CUDA 11.8+
- Container runtime: Docker with NVIDIA runtime

**CV Model Deployment:**
- Deploy tamper detection model (e.g., ManTraNet, TruFor)
- Deploy duplicate detection model (perceptual hashing)
- Use Kubeflow or TorchServe for model serving
- API endpoint: `POST /validate-image` (returns tamper_score, duplicate_score)

**Job Queue:**
- AWS SQS or RabbitMQ for async photo validation jobs
- Worker pods scale based on queue depth

**Why Needed:**
Real-time CV inference requires GPU compute unavailable in Lovable Cloud.

---

### 4. Vector Database (Fraud Detection)
**Options:**
- Pinecone (managed, recommended for simplicity)
- Weaviate (open-source, self-hosted)
- pgvector (Postgres extension, simpler but less scalable)

**Configuration:**
- Index: `fraud-embeddings` (384 dimensions, cosine similarity)
- Data: Fraud alert embeddings for similarity search
- Reindexing: Daily cron job to update embeddings

**Why Needed:**
Duplicate fraud detection and anomaly clustering require vector similarity search.

---

### 5. Redis (Caching & Session Management)
**Specifications:**
- AWS ElastiCache Redis 7.x or equivalent
- Instance: cache.r6g.large (2 vCPU, 13GB RAM)
- Cluster mode: Disabled (single shard sufficient)

**Use Cases:**
- Session caching for auth/me endpoint
- Rate limiting counters
- MFA token temporary storage (instead of DB)

---

### 6. Kubernetes Cluster (Edge Functions & Services)
**Specifications:**
- Control plane: Managed (EKS, GKE, AKS)
- Worker nodes: 3x `t3.xlarge` (4 vCPU, 16GB RAM)
- Namespaces: `production`, `staging`, `dev`

**Workloads:**
- Edge functions (Supabase functions or custom API)
- CV inference service
- Job workers (penalty calculation, SO generation)

**Why Needed:**
Lovable Cloud hosts edge functions, but production scale requires dedicated infrastructure.

---

### 7. Secrets Manager
**Options:**
- AWS Secrets Manager (recommended)
- HashiCorp Vault
- Azure Key Vault

**Secrets to Store:**
- Database credentials
- Object storage access keys
- Lovable AI API key
- Stripe API keys (if used)
- Third-party API keys

---

### 8. Monitoring & Observability Stack
**Components:**
- **Prometheus**: Metrics collection
- **Grafana**: Dashboards for precheck latencies, photo compliance, SaPOS acceptance
- **Jaeger**: Distributed tracing with correlation IDs
- **Sentry**: Exception tracking

**Deployment:**
- Helm charts: `prometheus-operator`, `grafana`, `jaeger-operator`
- Retention: 30 days metrics, 7 days traces

---

## Terraform Modules

### Directory Structure
```
terraform/
├── modules/
│   ├── postgres/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── storage/
│   ├── kubernetes/
│   ├── gpu-nodes/
│   ├── redis/
│   ├── secrets-manager/
│   └── monitoring/
├── environments/
│   ├── staging/
│   │   └── main.tf
│   └── production/
│       └── main.tf
└── README.md
```

### Example: Postgres Module
```hcl
# terraform/modules/postgres/main.tf
resource "aws_db_instance" "reconx_postgres" {
  identifier             = "reconx-${var.environment}"
  engine                 = "postgres"
  engine_version         = "15.4"
  instance_class         = var.instance_class
  allocated_storage      = 100
  storage_encrypted      = true
  multi_az               = var.environment == "production"
  backup_retention_period = 30
  
  db_name  = "reconx_guardian"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [var.security_group_id]
  db_subnet_group_name   = var.subnet_group_name
  
  tags = {
    Environment = var.environment
    Project     = "ReconX Guardian Flow"
  }
}

output "postgres_endpoint" {
  value = aws_db_instance.reconx_postgres.endpoint
}
```

### Example: GPU Node Pool
```hcl
# terraform/modules/gpu-nodes/main.tf
resource "aws_eks_node_group" "gpu_nodes" {
  cluster_name    = var.cluster_name
  node_group_name = "gpu-inference"
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.subnet_ids
  
  instance_types = ["g4dn.xlarge"]
  
  scaling_config {
    desired_size = 2
    max_size     = 10
    min_size     = 2
  }
  
  labels = {
    workload = "gpu-inference"
  }
  
  taints {
    key    = "nvidia.com/gpu"
    value  = "present"
    effect = "NoSchedule"
  }
}
```

---

## Deployment Steps

### Phase 1: Core Infrastructure (Week 1-2)
1. Set up AWS/Azure/GCP account
2. Configure Terraform backend (S3 + DynamoDB for state)
3. Deploy VPC and networking
4. Provision managed Postgres
5. Set up object storage buckets
6. Deploy Redis cluster
7. Create secrets in Secrets Manager

### Phase 2: Kubernetes & Compute (Week 2-3)
1. Create EKS/GKE/AKS cluster
2. Deploy GPU node pool
3. Install NGINX Ingress Controller
4. Deploy cert-manager for TLS
5. Set up cluster autoscaler

### Phase 3: Application Services (Week 3-4)
1. Deploy edge functions to Kubernetes
2. Deploy CV inference service
3. Set up job queues (SQS/RabbitMQ)
4. Deploy vector DB (Pinecone or Weaviate)
5. Migrate database from Lovable Cloud
6. Configure DNS and load balancers

### Phase 4: Observability & Monitoring (Week 4)
1. Deploy Prometheus Operator
2. Install Grafana with dashboards
3. Set up Jaeger for tracing
4. Integrate Sentry for error tracking
5. Configure alerting rules

### Phase 5: Testing & Validation (Week 5)
1. Run smoke tests on staging
2. Execute full Playwright test suite
3. Load test critical endpoints
4. Validate RBAC and tenant isolation
5. Test MFA and override flows

### Phase 6: Production Cutover (Week 6)
1. Deploy to production environment
2. Migrate production data
3. Update DNS records
4. Monitor metrics and logs
5. Run final validation tests

---

## Cost Estimates (AWS, Monthly)

| Service | Specification | Estimated Cost |
|---------|--------------|----------------|
| RDS Aurora PostgreSQL | db.r6g.xlarge, 100GB | $400 |
| S3 Storage | 500GB with Glacier | $25 |
| GPU Nodes (EKS) | 2x g4dn.xlarge (avg) | $600 |
| ElastiCache Redis | cache.r6g.large | $180 |
| EKS Cluster | Control plane + 3 workers | $250 |
| Vector DB (Pinecone) | Standard plan | $70 |
| Monitoring Stack | Grafana Cloud + Sentry | $100 |
| **Total** | | **~$1,625/month** |

*Note: Costs scale with usage (autoscaling GPU nodes, storage growth)*

---

## Security Considerations

### Network Security
- Deploy in private VPC subnets
- Use security groups to restrict traffic
- Enable VPC Flow Logs
- Use AWS WAF for edge functions

### Data Security
- Enable encryption at rest (S3, RDS, Redis)
- Use TLS 1.3 for all traffic
- Rotate secrets every 90 days
- Enable audit logging on all resources

### Compliance
- GDPR: Implement DSAR endpoints (data export/delete)
- SOC 2: Enable CloudTrail, GuardDuty
- Data residency: Deploy in appropriate AWS regions

---

## Disaster Recovery

### Backup Strategy
- **Database**: Daily automated backups, 30-day retention
- **Object Storage**: Cross-region replication to DR region
- **Secrets**: Replicate to secondary Secrets Manager in DR region

### RTO/RPO Targets
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours

### DR Runbook
1. Activate DR VPC and networking
2. Restore RDS from latest backup
3. Sync S3 from DR bucket
4. Deploy application services to DR region
5. Update DNS to DR load balancer

---

## DSAR & Data Residency

### DSAR Compliance
Implement these endpoints for GDPR compliance:

```typescript
// GET /api/v1/dsar/export/:tenantId
// Returns all tenant data in JSON format
export async function exportTenantData(tenantId: string) {
  const tables = [
    'profiles', 'tickets', 'work_orders', 'attachments',
    'sapos_offers', 'quotes', 'invoices', 'audit_logs'
  ];
  
  const exports = {};
  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select('*')
      .eq('tenant_id', tenantId);
    exports[table] = data;
  }
  
  // Log DSAR export request
  await logAuditEvent({
    action: 'dsar_export',
    resourceType: 'tenant',
    resourceId: tenantId
  });
  
  return exports;
}

// DELETE /api/v1/dsar/delete/:tenantId
// Permanently deletes all tenant data
export async function deleteTenantData(tenantId: string) {
  // Verify MFA before deletion
  // Delete from all tables in reverse FK order
  // Log deletion in separate compliance log
}
```

### Data Residency
- Deploy in EU regions for EU customers
- Deploy in US regions for US customers
- Use region-specific S3 buckets
- Configure Postgres read replicas in customer regions

---

## Next Steps

1. **Review this document** with DevOps/infrastructure team
2. **Estimate costs** for your expected scale
3. **Choose cloud provider** (AWS recommended for GPU availability)
4. **Set up Terraform** following provided modules
5. **Deploy staging environment** first
6. **Run validation tests** before production
7. **Plan production cutover** with minimal downtime

---

## Support Contacts

- **Infrastructure Questions**: DevOps team
- **Terraform Issues**: See Terraform documentation
- **Lovable Cloud Migration**: support@lovable.dev
- **Product Owner**: Karthik Iyer
