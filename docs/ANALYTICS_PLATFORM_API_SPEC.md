# Enterprise Analytics Platform - API Specification v1.0

## Base URL

```
Production: https://analytics.guardianflow.io/api/v1
Staging: https://analytics-staging.guardianflow.io/api/v1
Development: https://analytics-dev.guardianflow.io/api/v1
```

## Authentication

### API Key Authentication

All API requests require authentication via API key in the Authorization header:

```http
Authorization: Bearer <your_api_key>
```

### OAuth 2.0

For third-party integrations, OAuth 2.0 is supported:

**Authorization Endpoint:**
```
GET /oauth/authorize
  ?client_id={client_id}
  &redirect_uri={redirect_uri}
  &scope={scopes}
  &state={random_state}
```

**Token Endpoint:**
```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={authorization_code}
&client_id={client_id}
&client_secret={client_secret}
&redirect_uri={redirect_uri}
```

**Supported Scopes:**
- `workspaces:read` - Read workspace information
- `workspaces:write` - Create and modify workspaces
- `datasources:read` - Read data source configurations
- `datasources:write` - Create and modify data sources
- `pipelines:read` - Read pipeline configurations
- `pipelines:write` - Create, modify, and execute pipelines
- `models:read` - Read ML model information
- `models:write` - Train and deploy ML models
- `dashboards:read` - Read dashboards
- `dashboards:write` - Create and modify dashboards
- `admin:full` - Full administrative access

## Rate Limiting

**Rate Limits by Tier:**
- Free: 100 requests/hour
- Standard: 1,000 requests/hour
- Premium: 10,000 requests/hour
- Enterprise: Custom limits

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1635724800
```

**Rate Limit Exceeded Response:**
```json
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 3600 seconds.",
    "details": {
      "limit": 1000,
      "reset_at": "2025-11-01T12:00:00Z"
    }
  }
}
```

## Common Headers

**Request Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
X-Request-ID: <uuid> (optional, for request tracking)
X-Tenant-ID: <tenant_id> (for multi-tenant scenarios)
```

**Response Headers:**
```http
Content-Type: application/json
X-Request-ID: <uuid>
X-Response-Time: 123ms
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context",
      "validation_errors": []
    },
    "request_id": "req_abc123",
    "timestamp": "2025-11-01T10:00:00Z"
  }
}
```

**Common Error Codes:**
- `INVALID_REQUEST` (400) - Malformed request
- `UNAUTHORIZED` (401) - Missing or invalid authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource conflict (e.g., duplicate name)
- `VALIDATION_ERROR` (422) - Request validation failed
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests
- `INTERNAL_ERROR` (500) - Server error
- `SERVICE_UNAVAILABLE` (503) - Service temporarily unavailable

## API Endpoints

### Workspaces

#### Create Workspace

```http
POST /workspaces
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Analytics Workspace",
  "description": "Primary analytics environment for Q4 2025",
  "settings": {
    "data_retention_days": 90,
    "enable_auto_scaling": true,
    "max_query_timeout_seconds": 300,
    "default_timezone": "America/New_York"
  },
  "tags": ["production", "finance"]
}
```

**Response (201 Created):**
```json
{
  "id": "ws_7j3k9m2n4p",
  "name": "Analytics Workspace",
  "description": "Primary analytics environment for Q4 2025",
  "status": "active",
  "settings": {
    "data_retention_days": 90,
    "enable_auto_scaling": true,
    "max_query_timeout_seconds": 300,
    "default_timezone": "America/New_York"
  },
  "tags": ["production", "finance"],
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-01T10:00:00Z",
  "created_by": "user_abc123"
}
```

#### List Workspaces

```http
GET /workspaces?page=1&limit=20&status=active&tags=production
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "ws_7j3k9m2n4p",
      "name": "Analytics Workspace",
      "description": "Primary analytics environment",
      "status": "active",
      "members_count": 15,
      "data_sources_count": 5,
      "pipelines_count": 12,
      "created_at": "2025-11-01T10:00:00Z",
      "tags": ["production", "finance"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_pages": 3,
    "total_items": 42
  }
}
```

#### Get Workspace

```http
GET /workspaces/{workspace_id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "ws_7j3k9m2n4p",
  "name": "Analytics Workspace",
  "description": "Primary analytics environment",
  "status": "active",
  "settings": {
    "data_retention_days": 90,
    "enable_auto_scaling": true,
    "max_query_timeout_seconds": 300,
    "default_timezone": "America/New_York"
  },
  "members": [
    {
      "user_id": "user_abc123",
      "email": "john@example.com",
      "role": "admin",
      "joined_at": "2025-11-01T10:00:00Z"
    }
  ],
  "usage": {
    "storage_gb": 125.5,
    "queries_executed_today": 1523,
    "api_requests_today": 5432
  },
  "created_at": "2025-11-01T10:00:00Z",
  "updated_at": "2025-11-01T10:00:00Z"
}
```

#### Update Workspace

```http
PATCH /workspaces/{workspace_id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Updated Workspace Name",
  "settings": {
    "data_retention_days": 120
  }
}
```

**Response (200 OK):**
```json
{
  "id": "ws_7j3k9m2n4p",
  "name": "Updated Workspace Name",
  "settings": {
    "data_retention_days": 120,
    "enable_auto_scaling": true,
    "max_query_timeout_seconds": 300
  },
  "updated_at": "2025-11-01T11:00:00Z"
}
```

#### Delete Workspace

```http
DELETE /workspaces/{workspace_id}
Authorization: Bearer <token>
```

**Response (204 No Content)**

### Data Sources

#### Create Data Source

```http
POST /data-sources
Content-Type: application/json
Authorization: Bearer <token>

{
  "workspace_id": "ws_7j3k9m2n4p",
  "type": "mongodb",
  "name": "Production Database",
  "description": "Main production MongoDB Atlas instance",
  "config": {
    "connection_uri": "mongodb+srv://user:password@cluster0.example.mongodb.net/",
    "database": "analytics_prod",
    "ssl": {
      "enabled": true
    },
    "connection_pool": {
      "min": 2,
      "max": 10
    }
  },
  "sync_schedule": "0 */6 * * *",
  "tags": ["production", "postgresql"]
}
```

**Response (201 Created):**
```json
{
  "id": "ds_8k4l0n3p5q",
  "workspace_id": "ws_7j3k9m2n4p",
  "type": "mongodb",
  "name": "Production Database",
  "description": "Main production MongoDB Atlas instance",
  "status": "connected",
  "config": {
    "connection_uri": "mongodb+srv://user:password@cluster0.example.mongodb.net/",
    "database": "analytics_prod",
    "ssl": {
      "enabled": true
    }
  },
  "sync_schedule": "0 */6 * * *",
  "last_sync_at": "2025-11-01T10:00:00Z",
  "last_sync_status": "success",
  "created_at": "2025-11-01T09:00:00Z",
  "tags": ["production", "postgresql"]
}
```

#### Test Data Source Connection

```http
POST /data-sources/{data_source_id}/test
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "status": "success",
  "latency_ms": 45,
  "message": "Connection successful",
  "details": {
    "server_version": "MongoDB 7.0",
    "accessible_databases": ["analytics_prod"],
    "collection_count": 42
  }
}
```

#### Sync Data Source

```http
POST /data-sources/{data_source_id}/sync
Authorization: Bearer <token>
```

**Response (202 Accepted):**
```json
{
  "sync_job_id": "sync_9m5n1p4r6s",
  "status": "running",
  "started_at": "2025-11-01T10:05:00Z",
  "estimated_completion": "2025-11-01T10:10:00Z"
}
```

### Pipelines

#### Create Pipeline

```http
POST /pipelines
Content-Type: application/json
Authorization: Bearer <token>

{
  "workspace_id": "ws_7j3k9m2n4p",
  "name": "Daily ETL Pipeline",
  "description": "Extract, transform, and load daily sales data",
  "source_id": "ds_8k4l0n3p5q",
  "destination_id": "ds_9m5n1p4r6s",
  "transformations": [
    {
      "type": "aggregation",
      "name": "Filter Recent Data",
      "pipeline": [
        {
          "$match": {
            "created_at": { "$gte": { "$subtract": [new Date(), 86400000] } }
          }
        }
      ]
    },
    {
      "type": "python",
      "name": "Calculate Metrics",
      "code": "def transform(df):\n    df['revenue'] = df['quantity'] * df['price']\n    return df"
    }
  ],
  "schedule": {
    "type": "cron",
    "expression": "0 2 * * *",
    "timezone": "America/New_York"
  },
  "error_handling": {
    "retry_count": 3,
    "retry_delay_seconds": 300,
    "on_failure": "alert"
  },
  "notifications": {
    "on_success": ["email:team@example.com"],
    "on_failure": ["email:ops@example.com", "slack:#alerts"]
  }
}
```

**Response (201 Created):**
```json
{
  "id": "pipe_0o6p2r5t7u",
  "workspace_id": "ws_7j3k9m2n4p",
  "name": "Daily ETL Pipeline",
  "status": "scheduled",
  "schedule": {
    "type": "cron",
    "expression": "0 2 * * *",
    "timezone": "America/New_York",
    "next_run": "2025-11-02T02:00:00Z"
  },
  "created_at": "2025-11-01T10:00:00Z"
}
```

#### Execute Pipeline

```http
POST /pipelines/{pipeline_id}/execute
Authorization: Bearer <token>

{
  "parameters": {
    "start_date": "2025-10-01",
    "end_date": "2025-10-31"
  },
  "dry_run": false
}
```

**Response (202 Accepted):**
```json
{
  "execution_id": "exec_1p7q3s6u8v",
  "pipeline_id": "pipe_0o6p2r5t7u",
  "status": "running",
  "started_at": "2025-11-01T10:10:00Z",
  "estimated_completion": "2025-11-01T10:20:00Z",
  "logs_url": "/pipelines/pipe_0o6p2r5t7u/executions/exec_1p7q3s6u8v/logs"
}
```

#### Get Pipeline Execution

```http
GET /pipelines/{pipeline_id}/executions/{execution_id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "execution_id": "exec_1p7q3s6u8v",
  "pipeline_id": "pipe_0o6p2r5t7u",
  "status": "completed",
  "started_at": "2025-11-01T10:10:00Z",
  "completed_at": "2025-11-01T10:15:32Z",
  "duration_seconds": 332,
  "metrics": {
    "rows_read": 125430,
    "rows_written": 125430,
    "bytes_processed": 52428800,
    "errors": 0
  },
  "transformations": [
    {
      "name": "Filter Recent Data",
      "status": "completed",
      "duration_seconds": 45,
      "rows_processed": 125430
    },
    {
      "name": "Calculate Metrics",
      "status": "completed",
      "duration_seconds": 287,
      "rows_processed": 125430
    }
  ]
}
```

### ML Models

#### Train Model

```http
POST /ml/models/train
Content-Type: application/json
Authorization: Bearer <token>

{
  "workspace_id": "ws_7j3k9m2n4p",
  "name": "Customer Churn Prediction",
  "description": "Random Forest model to predict customer churn",
  "algorithm": "random_forest",
  "framework": "scikit-learn",
  "dataset": {
    "source_id": "ds_8k4l0n3p5q",
    "query": { "created_at": { "$gt": "2025-01-01" } },
    "collection": "customer_features",
    "features": ["age", "tenure_days", "purchase_count", "last_login_days"],
    "target": "churned",
    "split": {
      "train": 0.7,
      "validation": 0.15,
      "test": 0.15
    }
  },
  "hyperparameters": {
    "n_estimators": 100,
    "max_depth": 10,
    "min_samples_split": 2,
    "random_state": 42
  },
  "training_config": {
    "compute": {
      "instance_type": "cpu-4-16gb",
      "timeout_minutes": 60
    },
    "early_stopping": {
      "enabled": true,
      "patience": 10,
      "min_delta": 0.001
    }
  }
}
```

**Response (202 Accepted):**
```json
{
  "training_job_id": "train_2q8r4t7v9w",
  "model_id": "model_3r9s5u8w0x",
  "status": "queued",
  "created_at": "2025-11-01T10:20:00Z",
  "estimated_duration_minutes": 15,
  "logs_url": "/ml/models/model_3r9s5u8w0x/training/train_2q8r4t7v9w/logs"
}
```

#### Get Model Training Status

```http
GET /ml/models/{model_id}/training/{training_job_id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "training_job_id": "train_2q8r4t7v9w",
  "model_id": "model_3r9s5u8w0x",
  "status": "completed",
  "started_at": "2025-11-01T10:20:00Z",
  "completed_at": "2025-11-01T10:32:15Z",
  "duration_minutes": 12.25,
  "metrics": {
    "train": {
      "accuracy": 0.9234,
      "precision": 0.9156,
      "recall": 0.9312,
      "f1_score": 0.9233
    },
    "validation": {
      "accuracy": 0.9012,
      "precision": 0.8934,
      "recall": 0.9089,
      "f1_score": 0.9011
    },
    "test": {
      "accuracy": 0.8987,
      "precision": 0.8901,
      "recall": 0.9067,
      "f1_score": 0.8983
    }
  },
  "artifacts": {
    "model_file": "s3://models/model_3r9s5u8w0x/model.pkl",
    "feature_importance": "s3://models/model_3r9s5u8w0x/feature_importance.json",
    "confusion_matrix": "s3://models/model_3r9s5u8w0x/confusion_matrix.png"
  }
}
```

#### Deploy Model

```http
POST /ml/models/{model_id}/deploy
Content-Type: application/json
Authorization: Bearer <token>

{
  "environment": "production",
  "version": "v1.0.0",
  "deployment_strategy": {
    "type": "blue_green",
    "traffic_split": {
      "v0.9.0": 10,
      "v1.0.0": 90
    }
  },
  "scaling": {
    "min_replicas": 2,
    "max_replicas": 10,
    "target_cpu_utilization": 70,
    "auto_scaling": true
  },
  "monitoring": {
    "enable_prediction_logging": true,
    "sample_rate": 0.1,
    "drift_detection": true
  }
}
```

**Response (201 Created):**
```json
{
  "deployment_id": "deploy_4s0t6v9x1y",
  "model_id": "model_3r9s5u8w0x",
  "version": "v1.0.0",
  "status": "deploying",
  "endpoint": "https://api.analytics.example.com/v1/predict/deploy_4s0t6v9x1y",
  "created_at": "2025-11-01T10:35:00Z",
  "estimated_ready_in_seconds": 60
}
```

#### Predict

```http
POST /ml/predict/{deployment_id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "instances": [
    {
      "age": 32,
      "tenure_days": 120,
      "purchase_count": 5,
      "last_login_days": 2
    },
    {
      "age": 45,
      "tenure_days": 730,
      "purchase_count": 23,
      "last_login_days": 1
    }
  ],
  "return_explanations": true
}
```

**Response (200 OK):**
```json
{
  "predictions": [
    {
      "churned": false,
      "confidence": 0.89,
      "explanation": {
        "top_features": [
          {"feature": "purchase_count", "importance": 0.45},
          {"feature": "tenure_days", "importance": 0.32}
        ]
      }
    },
    {
      "churned": false,
      "confidence": 0.95,
      "explanation": {
        "top_features": [
          {"feature": "tenure_days", "importance": 0.52},
          {"feature": "purchase_count", "importance": 0.38}
        ]
      }
    }
  ],
  "model_version": "v1.0.0",
  "latency_ms": 12,
  "request_id": "req_5t1u7w0y2z"
}
```

### Dashboards

#### Create Dashboard

```http
POST /dashboards
Content-Type: application/json
Authorization: Bearer <token>

{
  "workspace_id": "ws_7j3k9m2n4p",
  "name": "Executive Overview",
  "description": "High-level KPIs for leadership team",
  "layout": {
    "columns": 12,
    "row_height": 50
  },
  "widgets": [
    {
      "id": "widget_1",
      "type": "metric",
      "title": "Total Revenue",
      "data_source_id": "ds_8k4l0n3p5q",
      "query": { "created_at": { "$gte": { "$subtract": [new Date(), 2592000000] } } },
      "aggregation": [{ "$group": { "_id": null, "total": { "$sum": "$amount" } } }],
      "visualization": {
        "type": "number",
        "format": "currency",
        "currency": "USD",
        "comparison": {
          "enabled": true,
          "period": "previous_period"
        }
      },
      "position": {"x": 0, "y": 0, "w": 3, "h": 2}
    },
    {
      "id": "widget_2",
      "type": "chart",
      "title": "Revenue Trend",
      "data_source_id": "ds_8k4l0n3p5q",
      "aggregation": [
        { "$match": { "created_at": { "$gte": { "$subtract": [new Date(), 7776000000] } } } },
        { "$group": { "_id": { "$dateToString": { "format": "%Y-%m-%d", "date": "$created_at" } }, "revenue": { "$sum": "$amount" } } },
        { "$sort": { "_id": 1 } }
      ],
      "visualization": {
        "type": "line",
        "x_axis": "date",
        "y_axis": "revenue",
        "color_scheme": "blue"
      },
      "position": {"x": 3, "y": 0, "w": 9, "h": 4}
    }
  ],
  "filters": [
    {
      "id": "filter_date_range",
      "type": "date_range",
      "label": "Date Range",
      "default": "last_30_days"
    }
  ],
  "refresh_interval_seconds": 300,
  "sharing": {
    "public": false,
    "password_protected": false
  }
}
```

**Response (201 Created):**
```json
{
  "id": "dash_6u2v8x1z3a",
  "workspace_id": "ws_7j3k9m2n4p",
  "name": "Executive Overview",
  "shareable_link": "https://analytics.example.com/dashboards/dash_6u2v8x1z3a",
  "embed_url": "https://analytics.example.com/embed/dashboards/dash_6u2v8x1z3a",
  "created_at": "2025-11-01T10:40:00Z",
  "updated_at": "2025-11-01T10:40:00Z"
}
```

#### Execute Query

```http
POST /queries/execute
Content-Type: application/json
Authorization: Bearer <token>

{
  "workspace_id": "ws_7j3k9m2n4p",
  "data_source_id": "ds_8k4l0n3p5q",
  "collection": "orders",
  "aggregation": [
    { "$match": { "created_at": { "$gte": "2025-10-01" } } },
    { "$group": { "_id": "$customer_id", "total_spend": { "$sum": "$amount" } } },
    { "$sort": { "total_spend": -1 } },
    { "$limit": 10 }
  ],
  "parameters": {
    "start_date": "2025-10-01"
  },
  "options": {
    "timeout_seconds": 30,
    "cache_enabled": true,
    "cache_ttl_seconds": 3600
  }
}
```

**Response (200 OK):**
```json
{
  "columns": [
    {"name": "customer_id", "type": "integer"},
    {"name": "total_spend", "type": "decimal"}
  ],
  "data": [
    [1001, 5432.50],
    [1025, 4321.00],
    [1045, 3210.75]
  ],
  "row_count": 10,
  "execution_time_ms": 123,
  "cached": false,
  "query_id": "query_7v3w9y2a4b"
}
```

### Data Quality

#### Create Quality Rule

```http
POST /data-quality/rules
Content-Type: application/json
Authorization: Bearer <token>

{
  "workspace_id": "ws_7j3k9m2n4p",
  "data_source_id": "ds_8k4l0n3p5q",
  "name": "Email Validation",
  "description": "Ensure all emails are valid format",
  "collection": "customers",
  "field": "email",
  "rule_type": "regex",
  "rule_config": {
    "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
  },
  "severity": "high",
  "schedule": "0 */4 * * *",
  "notifications": {
    "on_violation": ["email:data-team@example.com"]
  }
}
```

**Response (201 Created):**
```json
{
  "id": "rule_8w4x0z3b5c",
  "name": "Email Validation",
  "status": "active",
  "created_at": "2025-11-01T10:45:00Z",
  "next_check": "2025-11-01T12:00:00Z"
}
```

#### Run Quality Check

```http
POST /data-quality/rules/{rule_id}/check
Authorization: Bearer <token>
```

**Response (202 Accepted):**
```json
{
  "check_id": "check_9x5y1a4c6d",
  "rule_id": "rule_8w4x0z3b5c",
  "status": "running",
  "started_at": "2025-11-01T10:50:00Z"
}
```

#### Get Quality Check Results

```http
GET /data-quality/checks/{check_id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "check_id": "check_9x5y1a4c6d",
  "rule_id": "rule_8w4x0z3b5c",
  "status": "completed",
  "started_at": "2025-11-01T10:50:00Z",
  "completed_at": "2025-11-01T10:50:45Z",
  "results": {
    "total_rows": 10000,
    "valid_rows": 9875,
    "invalid_rows": 125,
    "quality_score": 0.9875,
    "violations": [
      {
        "row_id": 42,
        "value": "invalid.email",
        "reason": "Does not match regex pattern"
      }
    ]
  }
}
```

### Audit Logs

#### Query Audit Logs

```http
GET /audit-logs?workspace_id=ws_7j3k9m2n4p&action=model.deploy&start_date=2025-10-01&end_date=2025-10-31&page=1&limit=50
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "audit_0y6z2b5d7e",
      "timestamp": "2025-11-01T10:35:00Z",
      "user_id": "user_abc123",
      "user_email": "john@example.com",
      "action": "model.deploy",
      "resource_type": "ml_model",
      "resource_id": "model_3r9s5u8w0x",
      "details": {
        "deployment_id": "deploy_4s0t6v9x1y",
        "version": "v1.0.0",
        "environment": "production"
      },
      "ip_address": "203.0.113.42",
      "user_agent": "Mozilla/5.0...",
      "status": "success"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_pages": 5,
    "total_items": 234
  }
}
```

### Compliance

#### Generate Compliance Report

```http
POST /compliance/reports
Content-Type: application/json
Authorization: Bearer <token>

{
  "workspace_id": "ws_7j3k9m2n4p",
  "framework": "soc2_type2",
  "period": {
    "start_date": "2025-01-01",
    "end_date": "2025-10-31"
  },
  "sections": [
    "access_controls",
    "data_encryption",
    "audit_logging",
    "incident_response"
  ]
}
```

**Response (202 Accepted):**
```json
{
  "report_id": "report_1z7a3c6e8f",
  "status": "generating",
  "started_at": "2025-11-01T11:00:00Z",
  "estimated_completion": "2025-11-01T11:05:00Z"
}
```

#### Get Compliance Report

```http
GET /compliance/reports/{report_id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "report_id": "report_1z7a3c6e8f",
  "status": "completed",
  "framework": "soc2_type2",
  "period": {
    "start_date": "2025-01-01",
    "end_date": "2025-10-31"
  },
  "summary": {
    "total_controls": 64,
    "compliant_controls": 62,
    "non_compliant_controls": 2,
    "compliance_score": 0.96875
  },
  "findings": [
    {
      "control_id": "CC6.1",
      "name": "Logical Access Controls",
      "status": "compliant",
      "evidence_count": 12
    },
    {
      "control_id": "CC7.2",
      "name": "System Monitoring",
      "status": "non_compliant",
      "gaps": ["Missing alerting for failed authentication attempts"],
      "remediation": "Configure alerts for 5+ failed login attempts"
    }
  ],
  "generated_at": "2025-11-01T11:04:32Z",
  "download_url": "https://api.analytics.example.com/v1/compliance/reports/report_1z7a3c6e8f/download"
}
```

## Webhooks

### Register Webhook

```http
POST /webhooks
Content-Type: application/json
Authorization: Bearer <token>

{
  "workspace_id": "ws_7j3k9m2n4p",
  "url": "https://example.com/webhooks/analytics",
  "events": [
    "pipeline.execution.completed",
    "pipeline.execution.failed",
    "model.deployed",
    "data_quality.violation"
  ],
  "secret": "webhook_secret_for_signature_verification",
  "active": true
}
```

**Response (201 Created):**
```json
{
  "id": "webhook_2a8b4d7f9g",
  "url": "https://example.com/webhooks/analytics",
  "events": [
    "pipeline.execution.completed",
    "pipeline.execution.failed",
    "model.deployed",
    "data_quality.violation"
  ],
  "active": true,
  "created_at": "2025-11-01T11:10:00Z"
}
```

### Webhook Payload Format

All webhook events follow this structure:

```json
{
  "id": "event_3b9c5e8g0h",
  "type": "pipeline.execution.completed",
  "timestamp": "2025-11-01T10:15:32Z",
  "workspace_id": "ws_7j3k9m2n4p",
  "data": {
    "execution_id": "exec_1p7q3s6u8v",
    "pipeline_id": "pipe_0o6p2r5t7u",
    "pipeline_name": "Daily ETL Pipeline",
    "status": "completed",
    "duration_seconds": 332,
    "rows_processed": 125430
  }
}
```

**Signature Verification:**
```
X-Analytics-Signature: sha256=<hmac_signature>
X-Analytics-Timestamp: 1635724800
```

## SDK Examples

### Python

```python
from analytics_platform import Client

client = Client(api_key="your_api_key")

# Create workspace
workspace = client.workspaces.create(
    name="Analytics Workspace",
    settings={"data_retention_days": 90}
)

# Add data source
data_source = client.data_sources.create(
    workspace_id=workspace.id,
    type="mongodb",
    name="Production DB",
    config={
        "connection_uri": "mongodb+srv://user:password@cluster0.example.mongodb.net/",
        "database": "analytics"
    }
)

# Execute query
result = client.queries.execute(
    workspace_id=workspace.id,
    data_source_id=data_source.id,
    collection="users",
    query={},
    limit=10
)

print(result.data)
```

### JavaScript/TypeScript

```typescript
import { AnalyticsPlatformClient } from '@analytics-platform/sdk';

const client = new AnalyticsPlatformClient({
  apiKey: 'your_api_key'
});

// Create workspace
const workspace = await client.workspaces.create({
  name: 'Analytics Workspace',
  settings: { dataRetentionDays: 90 }
});

// Train ML model
const trainingJob = await client.ml.trainModel({
  workspaceId: workspace.id,
  name: 'Churn Prediction',
  algorithm: 'random_forest',
  dataset: {
    sourceId: 'ds_8k4l0n3p5q',
    features: ['age', 'tenure_days'],
    target: 'churned'
  }
});

console.log(`Training job started: ${trainingJob.id}`);
```

## Versioning

API versioning is handled via the URL path (`/api/v1/...`). When breaking changes are introduced, a new version will be released (`/api/v2/...`).

**Deprecation Policy:**
- Deprecated endpoints will continue to function for 12 months
- Deprecation notices will be sent via email and documented
- Response headers will include `X-API-Deprecated: true` for deprecated endpoints

## Security Constraints

### Input Validation
- Max request body size: 10 MB
- Query timeout: 30 seconds (configurable per workspace)
- NoSQL injection prevention via input validation
- XSS prevention via input sanitization

### Encryption
- TLS 1.3 for all API communication
- API keys encrypted at rest with AES-256
- Database credentials encrypted with AWS KMS

### Authorization
- Workspace-level access control
- Document-level security for data queries
- API audit logging for compliance
- IP whitelisting support (enterprise tier)

### Rate Limiting
- Implemented via sliding window algorithm
- Per-user and per-workspace limits
- Burst allowance for temporary spikes
- Custom limits for enterprise customers

## Support & Resources

- **API Status**: https://status.analytics.example.com
- **Documentation**: https://docs.analytics.example.com
- **Community Forum**: https://community.analytics.example.com
- **Support Email**: support@analytics.example.com
- **Developer Slack**: https://slack.analytics.example.com
