# Guardian Flow Analytics Integration Guide

## Overview
Guardian Flow provides seamless integrations with leading business intelligence and analytics platforms, enabling customers to gain deep insights into their field service operations across SLA performance, financial metrics, forecasting accuracy, fraud detection, and workforce optimization.

---

## Supported Platforms

### 1. **PowerBI Integration**
**Status:** Production Ready

#### Connection Methods:
1. **Direct Query (Recommended)**
   - Use Guardian Flow REST API with API Key authentication
   - Real-time data access with automatic refresh
   - Tenant-isolated queries with RBAC enforcement

2. **Data Export**
   - Schedule automated exports (daily/weekly/monthly)
   - CSV or JSON format support
   - Incremental data refresh

#### Setup Instructions:

**Step 1: Generate API Key**
```bash
# In Guardian Flow Settings -> API Keys
# Generate new API key with "analytics_read" permission
```

**Step 2: PowerBI Configuration**
```powerquery
let
    Source = Json.Document(Web.Contents(
        "https://your-guardian-flow.com/api/analytics-export",
        [
            Headers=[
                #"x-api-key"="YOUR_API_KEY",
                #"Content-Type"="application/json"
            ],
            Content=Text.ToBinary("{
                ""dataset"": ""sla_metrics"",
                ""format"": ""json"",
                ""filters"": {
                    ""start_date"": ""2025-01-01""
                }
            }")
        ]
    ))
in
    Source
```

**Step 3: Data Refresh Schedule**
- Configure automatic refresh: Data -> Schedule Refresh
- Recommended: Every 6 hours for operational metrics
- Daily for financial and forecast data

#### Available Datasets:
- `sla_metrics` - Work order completion times, SLA compliance
- `financial_data` - Invoices, revenue, penalties
- `forecast_accuracy` - Demand forecasts vs actuals
- `fraud_analytics` - Fraud alerts and investigations
- `operational_metrics` - Work order status, technician utilization
- `workforce_analytics` - Technician performance, skills

---

### 2. **Tableau Integration**
**Status:** Production Ready

#### Connection Methods:
1. **Web Data Connector (WDC)**
2. **REST API with OAuth**
3. **Scheduled CSV Imports**

#### Setup Instructions:

**Step 1: Install Guardian Flow WDC**
```html
<!-- Tableau WDC URL -->
https://your-guardian-flow.com/tableau-connector
```

**Step 2: Tableau Configuration**
1. Open Tableau Desktop/Server
2. Connect to Data -> Web Data Connector
3. Enter WDC URL and API Key
4. Select datasets to import

**Step 3: Create Calculated Fields**
```sql
-- SLA Compliance Rate
SUM(IF [SLA_Met] = TRUE THEN 1 ELSE 0 END) / COUNT([Work_Order])

-- Average Resolution Time (Hours)
DATEDIFF('hour', [Created_At], [Completed_At])

-- Penalty Impact
SUM([Penalty_Amount]) / SUM([Revenue])
```

---

### 3. **Looker (Google Cloud) Integration**
**Status:** Production Ready

#### Connection Methods:
1. **LookML Model** (Direct SQL)
2. **REST API with Service Account**

#### Setup Instructions:

**Step 1: Create Looker Connection**
```yaml
# connections/guardian_flow.yaml
name: guardian_flow
type: rest_api
url: https://your-guardian-flow.com/api
auth:
  type: api_key
  key_name: x-api-key
  key_value: YOUR_API_KEY
```

**Step 2: Define LookML Model**
```lookml
# models/guardian_flow.model.lkml
connection: "guardian_flow"

explore: work_orders {
  label: "Work Orders"
  
  dimension: wo_number {
    type: string
    sql: ${TABLE}.wo_number ;;
  }
  
  dimension: status {
    type: string
    sql: ${TABLE}.status ;;
  }
  
  measure: count {
    type: count
    drill_fields: [wo_number, status, created_at]
  }
  
  measure: avg_resolution_time {
    type: average
    sql: EXTRACT(EPOCH FROM (${TABLE}.completed_at - ${TABLE}.created_at))/3600 ;;
    value_format: "0.00"
  }
}
```

---

### 4. **Microsoft Excel Integration**
**Status:** Production Ready

#### Connection Methods:
1. **Power Query**
2. **Power Pivot**
3. **Manual CSV Import**

#### Setup Instructions:

**Step 1: Power Query Setup**
```excel
' Data -> Get Data -> From Web
' Advanced:
' URL: https://your-guardian-flow.com/api/analytics-export
' HTTP Headers:
'   x-api-key: YOUR_API_KEY
'   Content-Type: application/json
```

**Step 2: Create Power Query Function**
```powerquery
(dataset as text, start_date as date) =>
let
    Source = Json.Document(Web.Contents(
        "https://your-guardian-flow.com/api/analytics-export",
        [
            Headers=[
                #"x-api-key"="YOUR_API_KEY"
            ],
            Content=Text.ToBinary(
                Text.Format(
                    "{""dataset"":""#[dataset]"",""filters"":{""start_date"":""#[start_date]""}}",
                    [dataset=dataset, start_date=Date.ToText(start_date, "yyyy-MM-dd")]
                )
            )
        ]
    )),
    Data = Source[data]
in
    Data
```

**Step 3: Refresh Data**
- Data -> Refresh All (Ctrl+Alt+F5)
- Set up automatic refresh on file open

#### Sample Pivot Tables:
- **SLA Dashboard:** Work orders by status, SLA compliance %
- **Financial Summary:** Revenue vs penalties by month
- **Technician Performance:** Avg resolution time, work orders completed

---

### 5. **Google Data Studio Integration**
**Status:** Production Ready

#### Connection Methods:
1. **Community Connector** (Recommended)
2. **Google Sheets Bridge**
3. **BigQuery Export**

#### Setup Instructions:

**Step 1: Install Guardian Flow Connector**
```
Data Studio -> Create -> Data Source
-> Search "Guardian Flow" in Community Connectors
-> Authorize and enter API Key
```

**Step 2: Configure Data Source**
```json
{
  "endpoint": "https://your-guardian-flow.com/api/analytics-export",
  "api_key": "YOUR_API_KEY",
  "dataset": "sla_metrics",
  "refresh_interval": "6h"
}
```

**Step 3: Create Dashboard**
- Pre-built templates available in Guardian Flow marketplace
- Drag-and-drop widgets for:
  - SLA compliance trends
  - Financial KPIs
  - Forecast vs actual charts
  - Fraud detection alerts
  - Workforce utilization heatmaps

---

## API Reference

### Authentication
All API requests require authentication via API Key or JWT token:

```bash
# API Key (recommended for BI tools)
curl -H "x-api-key: YOUR_API_KEY" \
  https://your-guardian-flow.com/api/analytics-export

# JWT Token (for user-based access)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-guardian-flow.com/api/analytics-export
```

### Available Endpoints

#### 1. Export Analytics Data
```http
POST /api/analytics-export
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "dataset": "sla_metrics",
  "format": "json|csv",
  "filters": {
    "start_date": "2025-01-01",
    "end_date": "2025-10-31",
    "status": ["completed", "in_progress"]
  }
}
```

**Response:**
```json
{
  "data": [...],
  "metadata": {
    "total_records": 1500,
    "export_timestamp": "2025-10-31T12:00:00Z",
    "correlation_id": "abc-123"
  }
}
```

#### 2. Get Dataset Schema
```http
GET /api/analytics-schema?dataset=sla_metrics
x-api-key: YOUR_API_KEY
```

**Response:**
```json
{
  "dataset": "sla_metrics",
  "fields": [
    {
      "name": "work_order",
      "type": "string",
      "description": "Work order number"
    },
    {
      "name": "created_at",
      "type": "timestamp",
      "description": "Work order creation time"
    },
    {
      "name": "sla_met",
      "type": "boolean",
      "description": "Whether SLA was met"
    }
  ]
}
```

---

## Security & Compliance

### Data Security
- **Encryption in Transit:** TLS 1.3 for all API communications
- **Encryption at Rest:** AES-256 for stored exports
- **Tenant Isolation:** Automatic filtering by tenant_id
- **RBAC Enforcement:** Permission checks on every API call

### Audit Logging
All analytics exports are logged:
```sql
SELECT * FROM analytics_exports
WHERE tenant_id = 'your-tenant-id'
ORDER BY created_at DESC;
```

### Rate Limiting
- **Standard Tier:** 1000 requests/day
- **Professional:** 10,000 requests/day
- **Enterprise:** Unlimited

### Compliance
- ✅ SOC 2 Type II certified
- ✅ ISO 27001 compliant
- ✅ GDPR compliant data handling
- ✅ HIPAA-ready (on request)

---

## Sample Dashboards

### PowerBI: SLA Monitoring Dashboard
**Metrics:**
- SLA compliance rate (gauge)
- Work orders by status (stacked bar)
- Average resolution time trend (line chart)
- Technician performance leaderboard (table)

### Tableau: Financial Analytics
**Metrics:**
- Monthly revenue vs target (combo chart)
- Penalty impact analysis (waterfall)
- Customer payment status (pie chart)
- Invoice aging report (table)

### Looker: Forecast Accuracy
**Metrics:**
- Forecast vs actual demand (dual axis)
- Geographic forecast heatmap
- Model accuracy scores (scorecard)
- Forecast error distribution (histogram)

---

## Troubleshooting

### Common Issues

**1. "Invalid API Key" Error**
- Verify API key is active in Settings -> API Keys
- Check key has `analytics_read` permission
- Ensure key hasn't expired

**2. "No Data Returned"**
- Check date range filters
- Verify tenant has data for requested dataset
- Review tenant isolation policies for user role

**3. "Rate Limit Exceeded"**
- Upgrade to higher tier or contact support
- Implement caching in BI tool
- Schedule refreshes during off-peak hours

**4. "Connection Timeout"**
- Large datasets may take 60+ seconds
- Use pagination for datasets >10,000 records
- Consider scheduled exports instead of real-time

---

## Support & Resources

### Documentation
- API Reference: https://docs.guardian-flow.com/api
- Video Tutorials: https://guardian-flow.com/tutorials
- Sample Queries: https://github.com/guardian-flow/analytics-samples

### Community
- Slack Channel: #analytics-integrations
- Forum: https://community.guardian-flow.com
- Office Hours: Tuesdays 2-3pm PT

### Professional Services
For custom integrations, advanced analytics, or embedded solutions:
- Email: analytics@guardian-flow.com
- Schedule consultation: https://guardian-flow.com/consult

---

## Roadmap

### Q1 2026
- [ ] Qlik Sense connector
- [ ] Amazon QuickSight integration
- [ ] Real-time streaming via WebSockets

### Q2 2026
- [ ] Embedded analytics SDK
- [ ] White-label dashboard templates
- [ ] Custom KPI builder

### Q3 2026
- [ ] AI-powered insights engine
- [ ] Natural language queries
- [ ] Predictive analytics library

---

**Last Updated:** October 31, 2025
**Version:** 1.0.0
