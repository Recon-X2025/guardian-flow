# Guardian Flow API Documentation

**Version:** 6.0  
**Last Updated:** October 2025

---

## Getting Started

Guardian Flow provides REST APIs for building on top of our field service intelligence platform. Access powerful agents for operations, fraud detection, finance, and forecasting through a unified API gateway.

### Quick Start

1. **Get API Credentials**
   - Sign up at `/developer` to create a sandbox tenant
   - Or contact sales for production access
   - Receive your `tenant_id` and `api_key`

2. **Make Your First Call**
```bash
curl -X POST https://api.guardianflow.ai/api/gateway \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "service": "ops",
    "action": "list_work_orders",
    "data": { "limit": 10 }
  }'
```

3. **View Usage**
   - Navigate to `/developer-console`
   - Monitor API calls, rate limits, and billing

---

## Authentication

All API requests require two headers:

```
x-api-key: {YOUR_API_KEY}
x-tenant-id: {YOUR_TENANT_UUID}
```

API keys can be:
- Generated via Developer Console (`/developer-console`)
- Obtained through sandbox creation (`/developer`)
- Provided by Guardian Flow sales team

---

## Rate Limits

| Tier | Daily Limit | Cost |
|------|-------------|------|
| Sandbox | 500 calls | Free |
| Standard | 1,000 calls | ₹0.25/call |
| Premium | 5,000 calls | ₹0.20/call |
| Enterprise | Custom | Negotiated |

**429 Response** when limit exceeded:
```json
{
  "error": "Rate limit exceeded. Daily limit: 1000",
  "current_usage": 1247,
  "correlation_id": "uuid"
}
```

---

## API Gateway

**Endpoint**: `POST /api/gateway`

Single entry point for all agent services.

### Request Format

```json
{
  "service": "ops|fraud|finance|forecast",
  "action": "action_name",
  "data": { /* parameters */ }
}
```

### Response Format

**Success (2xx)**:
```json
{
  "success": true,
  "data": { /* result */ },
  "correlation_id": "uuid",
  "response_time_ms": 150
}
```

**Error (4xx/5xx)**:
```json
{
  "success": false,
  "error": "Error message",
  "correlation_id": "uuid"
}
```

---

## Operations API

**Service**: `"ops"`

Manage work order lifecycle.

### Actions

#### `create_work_order`

Create a new work order.

**Request**:
```json
{
  "service": "ops",
  "action": "create_work_order",
  "data": {
    "customer_id": "uuid",
    "technician_id": "uuid",
    "issue_description": "string",
    "priority": "low|medium|high"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "wo_number": "WO-2025-0123",
    "status": "draft",
    "created_at": "2025-10-09T10:30:00Z"
  }
}
```

---

#### `list_work_orders`

List work orders with optional filters.

**Request**:
```json
{
  "service": "ops",
  "action": "list_work_orders",
  "data": {
    "status": "draft|pending_validation|released|in_progress|completed",
    "priority": "low|medium|high",
    "technician_id": "uuid",
    "limit": 50
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "work_orders": [ /* array of work orders */ ],
    "total": 123
  }
}
```

---

#### `release_work_order`

Release work order to the field after prechecks.

**Request**:
```json
{
  "service": "ops",
  "action": "release_work_order",
  "work_order_id": "uuid"
}
```

---

#### `run_precheck`

Execute validation checks (inventory, warranty, photos).

**Request**:
```json
{
  "service": "ops",
  "action": "run_precheck",
  "work_order_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "can_release": true,
    "inventory_passed": true,
    "warranty_passed": true,
    "photo_passed": false,
    "details": { /* check results */ }
  }
}
```

---

## Fraud Detection API

**Service**: `"fraud"`

Detect anomalies and manage investigations.

### Actions

#### `get_fraud_score`

Calculate fraud risk score for a work order.

**Request**:
```json
{
  "service": "fraud",
  "action": "get_fraud_score",
  "resource_type": "work_order",
  "resource_id": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "confidence_score": 0.75,
    "risk_factors": [
      "Photo anomalies detected",
      "Unusually fast completion",
      "High value transaction"
    ]
  }
}
```

---

#### `validate_photos`

Validate photo compliance for a work order stage.

**Request**:
```json
{
  "service": "fraud",
  "action": "validate_photos",
  "resource_id": "work_order_uuid",
  "data": {
    "stage": "before|during|after"
  }
}
```

---

#### `get_fraud_alerts`

List fraud alerts with filters.

**Request**:
```json
{
  "service": "fraud",
  "action": "get_fraud_alerts",
  "data": {
    "status": "open|investigating|resolved",
    "severity": "low|medium|high|critical",
    "limit": 50
  }
}
```

---

## Finance API

**Service**: `"finance"`

Handle penalties, invoices, and billing.

### Actions

#### `calculate_penalties`

Calculate penalties for a work order.

**Request**:
```json
{
  "service": "finance",
  "action": "calculate_penalties",
  "data": {
    "work_order_id": "uuid"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total_penalties": 350.00,
    "penalties": [
      {
        "penalty_code": "LATE_ARRIVAL",
        "amount": 200.00,
        "reason": "Arrived 2 hours late"
      }
    ]
  }
}
```

---

#### `get_billing_summary`

Get billing summary for a period.

**Request**:
```json
{
  "service": "finance",
  "action": "get_billing_summary",
  "data": {
    "start_date": "2025-10-01",
    "end_date": "2025-10-31"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "period": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-31"
    },
    "invoices": {
      "total": 45,
      "draft": 5,
      "sent": 10,
      "paid": 30,
      "total_amount": 125000.00
    },
    "penalties": {
      "total": 12,
      "disputed": 2,
      "total_amount": 6500.00
    }
  }
}
```

---

## Forecast API

**Service**: `"forecast"`

Access hierarchical demand forecasts.

### Actions

#### `get_forecasts`

Query forecasts with filters.

**Request**:
```json
{
  "service": "forecast",
  "action": "get_forecasts",
  "data": {
    "geography_level": "country|region|state|district|city|pin_code",
    "geography_key": "San Jose",
    "product_id": "uuid",
    "forecast_type": "volume|spend_revenue|repair_volume",
    "from_date": "2025-10-09",
    "to_date": "2025-10-16",
    "limit": 100,
    "group_by_hierarchy": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "forecasts": [
      {
        "target_date": "2025-10-09",
        "value": 45.2,
        "confidence_upper": 50.0,
        "confidence_lower": 40.0,
        "geography_level": "city",
        "geography_key": "San Jose"
      }
    ],
    "total": 7
  }
}
```

---

#### `get_forecast_metrics`

Get forecast accuracy metrics.

**Request**:
```json
{
  "service": "forecast",
  "action": "get_forecast_metrics",
  "data": {
    "geography_level": "region"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid request format |
| 401 | Unauthorized - Invalid or missing API key |
| 403 | Forbidden - API key revoked or expired |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Contact support |

---

## Best Practices

### Correlation IDs

Every response includes a `correlation_id`. Save this for debugging:

```json
{
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

Quote this ID when contacting support.

### Rate Limit Management

Monitor usage via Developer Console to avoid 429 errors:
- Track daily call counts
- Set alerts at 80% threshold
- Upgrade tier if consistently hitting limits

### Error Handling

Always handle errors gracefully:

```javascript
try {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'x-tenant-id': TENANT_ID,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 429) {
    // Rate limit - implement backoff
    await delay(60000); // Wait 1 minute
    return retry();
  }

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error.correlation_id);
    throw new Error(error.error);
  }

  return await response.json();
} catch (error) {
  // Handle network errors
  console.error('Request failed:', error);
}
```

---

## Sandbox Environment

### Create Sandbox

**Endpoint**: `POST /api/functions/create-sandbox-tenant`

No authentication required.

**Request**:
```json
{
  "email": "developer@company.com",
  "name": "John Developer"
}
```

**Response**:
```json
{
  "success": true,
  "tenant_id": "uuid",
  "api_key": "your-sandbox-key",
  "expires_at": "2025-10-16T00:00:00Z"
}
```

### Sandbox Features

- **Duration**: 7 days
- **Rate Limit**: 500 calls/day
- **Demo Data**: 10 pre-loaded work orders
- **Full API Access**: All endpoints available
- **Auto-Cleanup**: Expires after 7 days

---

## Support

- **Developer Portal**: `/developer-console`
- **Status Page**: Coming soon
- **Email**: api-support@guardianflow.dev
- **Documentation**: `/product-specs`

---

**© 2025 Guardian Flow. All rights reserved.**
