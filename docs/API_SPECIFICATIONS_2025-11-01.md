# API Specifications

**Guardian Flow v6.1.0**  
**Date:** November 1, 2025

---

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [API Gateway](#api-gateway)
4. [Agent Service APIs](#agent-service-apis)
5. [Core Operations APIs](#core-operations-apis)
6. [Compliance APIs](#compliance-apis)
7. [Financial APIs](#financial-apis)
8. [Fraud Detection APIs](#fraud-detection-apis)
9. [Forecasting APIs](#forecasting-apis)
10. [Integration APIs](#integration-apis)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)

---

## API Overview

Guardian Flow provides a comprehensive REST API for all platform operations. The API is designed with the following principles:

### Design Principles

- **RESTful**: Standard HTTP methods (GET, POST, PUT, DELETE)
- **JSON**: All requests and responses use JSON
- **Stateless**: No server-side session management
- **Versioned**: API versioning for backward compatibility
- **Idempotent**: Safe retry behavior
- **Documented**: OpenAPI/Swagger specifications

### Base URLs

**Production**
```
https://blvrfzymeerefsdwqhoh.supabase.co/functions/v1
```

**Development**
```
http://localhost:54321/functions/v1
```

### API Versioning

Current version: **v1**

Version is included in the URL path:
```
/functions/v1/{function-name}
```

---

## Authentication

### JWT Token Authentication

All API requests require a valid JWT token in the Authorization header.

**Request Header**
```http
Authorization: Bearer {jwt_token}
```

**Token Structure**
```json
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "role": "authenticated",
  "aud": "authenticated",
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Obtaining Tokens

**Sign Up**
```typescript
POST /auth/v1/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password",
  "data": {
    "full_name": "John Doe"
  }
}
```

**Sign In**
```typescript
POST /auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### Multi-Factor Authentication (MFA)

**Request MFA**
```typescript
POST /functions/v1/request-mfa
Authorization: Bearer {jwt_token}

{
  "action": "delete_work_order",
  "context": {
    "work_order_id": "wo_uuid"
  }
}
```

**Verify MFA**
```typescript
POST /functions/v1/verify-mfa
Authorization: Bearer {jwt_token}

{
  "code": "123456",
  "mfa_request_id": "mfa_uuid"
}
```

---

## API Gateway

### Gateway Endpoint

**URL**: `/functions/v1/api-gateway`

The API Gateway routes all platform requests, providing:
- Authentication verification
- Rate limiting
- Request correlation
- Logging and telemetry
- Error handling

### Gateway Request Format

```typescript
POST /functions/v1/api-gateway
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "service": "ops",
  "action": "create_work_order",
  "payload": {
    "title": "Repair HVAC Unit",
    "priority": "high",
    "customer_id": "customer_uuid"
  }
}
```

### Gateway Response Format

**Success Response**
```json
{
  "success": true,
  "data": {
    "work_order_id": "wo_uuid",
    "wo_number": "WO-2025-0001",
    "status": "draft"
  },
  "correlation_id": "corr_uuid"
}
```

**Error Response**
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions",
    "details": "User lacks 'work_orders:create' permission"
  },
  "correlation_id": "corr_uuid"
}
```

---

## Agent Service APIs

### Operations Agent

**Service**: `ops`

**Actions**:
- `create_work_order`: Create new work order
- `update_work_order`: Update existing work order
- `assign_technician`: Assign technician to work order
- `complete_work_order`: Mark work order complete
- `schedule_appointment`: Schedule work order

**Example: Create Work Order**
```typescript
POST /functions/v1/api-gateway
{
  "service": "ops",
  "action": "create_work_order",
  "payload": {
    "title": "HVAC Maintenance",
    "description": "Annual HVAC system check",
    "customer_id": "customer_uuid",
    "equipment_id": "equipment_uuid",
    "priority": "medium",
    "scheduled_date": "2025-11-15T10:00:00Z"
  }
}
```

### Fraud Detection Agent

**Service**: `fraud`

**Actions**:
- `detect_forgery`: Analyze document for forgery
- `check_anomaly`: Check for anomalous patterns
- `calculate_risk_score`: Calculate fraud risk score
- `submit_feedback`: Submit fraud detection feedback

**Example: Detect Forgery**
```typescript
POST /functions/v1/api-gateway
{
  "service": "fraud",
  "action": "detect_forgery",
  "payload": {
    "image_url": "https://storage.../document.jpg",
    "document_type": "invoice"
  }
}
```

### Finance Agent

**Service**: `finance`

**Actions**:
- `calculate_penalties`: Calculate SLA penalties
- `generate_invoice`: Generate invoice
- `process_payment`: Process payment
- `create_dispute`: Create billing dispute

**Example: Calculate Penalties**
```typescript
POST /functions/v1/api-gateway
{
  "service": "finance",
  "action": "calculate_penalties",
  "payload": {
    "work_order_id": "wo_uuid",
    "actual_completion": "2025-11-20T15:00:00Z",
    "sla_deadline": "2025-11-20T12:00:00Z"
  }
}
```

### Forecast Agent

**Service**: `forecast"

**Actions**:
- `get_forecast`: Get demand forecast
- `get_hierarchy`: Get geographic hierarchy
- `trigger_forecast`: Manually trigger forecast generation
- `get_metrics`: Get forecast accuracy metrics

**Example: Get Forecast**
```typescript
POST /functions/v1/api-gateway
{
  "service": "forecast",
  "action": "get_forecast",
  "payload": {
    "level": "city",
    "location_id": "city_uuid",
    "product_id": "product_uuid",
    "horizon_days": 30
  }
}
```

---

## Core Operations APIs

### Work Orders

**Create Work Order**
```typescript
POST /functions/v1/create-work-order
Authorization: Bearer {jwt_token}

{
  "title": "Repair broken pump",
  "description": "Customer reports pump failure",
  "customer_id": "customer_uuid",
  "equipment_id": "equipment_uuid",
  "priority": "high",
  "scheduled_date": "2025-11-15T10:00:00Z"
}
```

**Response**
```json
{
  "id": "wo_uuid",
  "wo_number": "WO-2025-0001",
  "status": "draft",
  "created_at": "2025-11-01T10:00:00Z"
}
```

**Update Work Order**
```typescript
PUT /functions/v1/update-work-order
Authorization: Bearer {jwt_token}

{
  "work_order_id": "wo_uuid",
  "status": "in_progress",
  "assigned_technician_id": "tech_uuid"
}
```

**Complete Work Order**
```typescript
POST /functions/v1/complete-work-order
Authorization: Bearer {jwt_token}

{
  "work_order_id": "wo_uuid",
  "completion_notes": "Replaced pump, tested system",
  "photos": ["url1", "url2"],
  "parts_used": [
    { "part_id": "part_uuid", "quantity": 1 }
  ]
}
```

### Customers

**Create Customer**
```typescript
POST /functions/v1/customer-create
Authorization: Bearer {jwt_token}

{
  "name": "Acme Corporation",
  "email": "contact@acme.com",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "USA"
  }
}
```

**Book Service (Customer Portal)**
```typescript
POST /functions/v1/customer-book-service

{
  "customer_id": "customer_uuid",
  "service_type": "maintenance",
  "preferred_date": "2025-11-15",
  "description": "Annual HVAC check"
}
```

### Equipment

**Register Equipment**
```typescript
POST /functions/v1/equipment-register
Authorization: Bearer {jwt_token}

{
  "serial_number": "HVAC-12345",
  "model": "HV-3000",
  "manufacturer": "CoolAir Inc",
  "customer_id": "customer_uuid",
  "installation_date": "2023-01-15",
  "warranty_expiry": "2026-01-15"
}
```

### Inventory

**Check Inventory**
```typescript
POST /functions/v1/check-inventory
Authorization: Bearer {jwt_token}

{
  "part_number": "PUMP-500",
  "location": "warehouse_a"
}
```

**Response**
```json
{
  "available": true,
  "quantity": 15,
  "location": "warehouse_a",
  "reorder_point": 5
}
```

---

## Compliance APIs

### Audit Logs

**Query Audit Logs** (via database, not direct API)
```sql
SELECT * FROM audit_logs
WHERE action = 'work_order_delete'
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Access Control

**Grant Temporary Access**
```typescript
POST /functions/v1/grant-temporary-access
Authorization: Bearer {jwt_token}

{
  "user_id": "user_uuid",
  "permission": "work_orders:delete",
  "duration_minutes": 30,
  "justification": "Emergency deletion required"
}
```

**Approve Override Request**
```typescript
POST /functions/v1/approve-override-request
Authorization: Bearer {jwt_token}

{
  "request_id": "request_uuid",
  "approval_notes": "Approved for emergency maintenance"
}
```

### Evidence Collection

**Collect Compliance Evidence**
```typescript
POST /functions/v1/compliance-evidence-collector
Authorization: Bearer {jwt_token}

{
  "evidence_type": "audit_log_export",
  "date_range": {
    "start": "2025-10-01",
    "end": "2025-10-31"
  }
}
```

### Security Incidents

**Record Security Incident**
```typescript
POST /functions/v1/record-security-incident
Authorization: Bearer {jwt_token}

{
  "incident_type": "unauthorized_access_attempt",
  "severity": "high",
  "description": "Multiple failed login attempts detected",
  "affected_resource": "admin_console"
}
```

---

## Financial APIs

### Penalties

**Calculate Penalties**
```typescript
POST /functions/v1/calculate-penalties
Authorization: Bearer {jwt_token}

{
  "work_order_id": "wo_uuid"
}
```

**Response**
```json
{
  "total_penalty": 250.00,
  "currency": "USD",
  "breakdown": [
    {
      "rule": "SLA Breach - 3 hours late",
      "amount": 250.00
    }
  ]
}
```

**Apply Penalties**
```typescript
POST /functions/v1/apply-penalties
Authorization: Bearer {jwt_token}

{
  "work_order_id": "wo_uuid",
  "penalty_amount": 250.00,
  "notes": "Applied for SLA breach"
}
```

### Invoicing

**Generate Invoice**
```typescript
POST /functions/v1/generate-invoice
Authorization: Bearer {jwt_token}

{
  "work_order_ids": ["wo_uuid1", "wo_uuid2"],
  "customer_id": "customer_uuid",
  "due_date": "2025-11-30"
}
```

### Payments

**Process Payment**
```typescript
POST /functions/v1/process-payment
Authorization: Bearer {jwt_token}

{
  "invoice_id": "invoice_uuid",
  "amount": 1500.00,
  "payment_method": "credit_card",
  "payment_reference": "stripe_pi_123"
}
```

### Disputes

**Create Dispute**
```typescript
POST /functions/v1/dispute-manager
Authorization: Bearer {jwt_token}

{
  "action": "create",
  "invoice_id": "invoice_uuid",
  "dispute_reason": "Service not completed as specified",
  "requested_adjustment": 500.00
}
```

---

## Fraud Detection APIs

### Forgery Detection

**Detect Image Forgery**
```typescript
POST /functions/v1/detect-image-forgery
Authorization: Bearer {jwt_token}

{
  "image_url": "https://storage.../photo.jpg",
  "document_type": "work_order_completion"
}
```

**Response**
```json
{
  "is_forged": false,
  "confidence": 0.95,
  "analysis": {
    "ela_score": 0.12,
    "noise_analysis": "consistent",
    "metadata_check": "valid"
  },
  "recommendation": "accept"
}
```

**Process Batch**
```typescript
POST /functions/v1/process-forgery-batch
Authorization: Bearer {jwt_token}

{
  "image_urls": [
    "https://storage.../photo1.jpg",
    "https://storage.../photo2.jpg"
  ],
  "batch_id": "batch_uuid"
}
```

**Submit Feedback**
```typescript
POST /functions/v1/submit-forgery-feedback
Authorization: Bearer {jwt_token}

{
  "prediction_id": "pred_uuid",
  "actual_label": "genuine",
  "notes": "Manual review confirmed authenticity"
}
```

### Anomaly Detection

**Detect Anomalies**
```typescript
POST /functions/v1/anomaly-detection
Authorization: Bearer {jwt_token}

{
  "entity_type": "work_order",
  "entity_id": "wo_uuid",
  "check_patterns": ["duration", "cost", "frequency"]
}
```

---

## Forecasting APIs

### Generate Forecast

**Trigger Forecast Generation**
```typescript
POST /functions/v1/generate-forecast
Authorization: Bearer {jwt_token}

{
  "location_ids": ["city_uuid1", "city_uuid2"],
  "product_ids": ["product_uuid1"],
  "horizon_days": 30
}
```

**Run Forecast Now (Manual)**
```typescript
POST /functions/v1/run-forecast-now
Authorization: Bearer {jwt_token}

{
  "force_refresh": true
}
```

### Forecast Status

**Get Forecast Status**
```typescript
GET /functions/v1/forecast-status?location_id={uuid}&product_id={uuid}
Authorization: Bearer {jwt_token}
```

**Response**
```json
{
  "status": "completed",
  "last_run": "2025-11-01T06:00:00Z",
  "next_run": "2025-11-02T06:00:00Z",
  "accuracy_metrics": {
    "mape": 8.5,
    "rmse": 12.3
  }
}
```

### Forecast Metrics

**Get Forecast Metrics**
```typescript
GET /functions/v1/get-forecast-metrics
Authorization: Bearer {jwt_token}
```

**Response**
```json
{
  "overall_accuracy": 91.5,
  "by_level": {
    "country": 95.2,
    "state": 93.1,
    "city": 89.7
  },
  "by_product": [
    {
      "product_id": "uuid",
      "product_name": "HVAC Service",
      "mape": 7.2
    }
  ]
}
```

### Reconciliation

**Reconcile Forecasts**
```typescript
POST /functions/v1/reconcile-forecast
Authorization: Bearer {jwt_token}

{
  "forecast_date": "2025-11-15",
  "algorithm": "mint"
}
```

---

## Integration APIs

### Webhooks

**Create Webhook**
```typescript
POST /functions/v1/webhook-create
Authorization: Bearer {jwt_token}

{
  "url": "https://example.com/webhook",
  "events": ["work_order.created", "work_order.completed"],
  "secret": "webhook_secret_key"
}
```

**Trigger Webhook (Internal)**
```typescript
POST /functions/v1/webhook-trigger

{
  "event": "work_order.created",
  "data": {
    "work_order_id": "wo_uuid",
    "wo_number": "WO-2025-0001"
  }
}
```

### Document Upload

**Upload Document**
```typescript
POST /functions/v1/document-upload
Authorization: Bearer {jwt_token}
Content-Type: multipart/form-data

{
  "file": <binary>,
  "document_type": "invoice",
  "work_order_id": "wo_uuid"
}
```

### Notifications

**Send Notification**
```typescript
POST /functions/v1/notification-send
Authorization: Bearer {jwt_token}

{
  "user_id": "user_uuid",
  "type": "work_order_assigned",
  "priority": "high",
  "message": "New work order assigned: WO-2025-0001"
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional context or troubleshooting info",
    "field": "fieldName"
  },
  "correlation_id": "corr_uuid"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `PERMISSION_DENIED` | 403 | User lacks required permission |
| `NOT_FOUND` | 404 | Requested resource not found |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Error Examples

**Validation Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": "Field 'email' must be a valid email address",
    "field": "email"
  }
}
```

**Permission Denied**
```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions",
    "details": "User lacks 'work_orders:delete' permission"
  }
}
```

---

## Rate Limiting

### Rate Limit Policy

**Default Limits**
- **Anonymous**: 10 requests per minute
- **Authenticated**: 100 requests per minute
- **Admin**: 1000 requests per minute

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1635724800
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": "Maximum 100 requests per minute allowed"
  }
}
```

---

## Pagination

### Query Parameters

```http
GET /api/endpoint?page=2&per_page=50&sort=created_at&order=desc
```

### Response Format

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "per_page": 50,
    "total": 250,
    "total_pages": 5
  }
}
```

---

## Conclusion

Guardian Flow's API provides comprehensive access to all platform functionality with:
- **Consistency**: Standardized request/response formats
- **Security**: JWT authentication, RBAC authorization
- **Reliability**: Error handling, rate limiting, idempotency
- **Observability**: Correlation IDs, detailed logging
- **Documentation**: Complete specs with examples

For additional support, refer to the Developer Console or contact the API team.
