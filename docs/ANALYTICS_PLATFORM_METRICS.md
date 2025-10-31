# Guardian Flow Analytics Platform Metrics
## Real-Time Operational Intelligence & Performance Monitoring

**Version:** 1.0  
**Date:** 2025-10-31

---

## Overview

This document defines the comprehensive metrics, KPIs, and monitoring framework for the Guardian Flow Analytics Platform. These metrics support real-time operational intelligence, SLA breach prediction, fraud detection, financial reconciliation, and forecast accuracy tracking.

---

## 1. SLA Performance Metrics

### Core SLA Metrics

```sql
-- Real-time SLA performance view
CREATE OR REPLACE VIEW v_sla_performance AS
SELECT
  wo.tenant_id,
  wo.industry_type,
  DATE_TRUNC('hour', wo.created_at) as time_bucket,
  COUNT(*) as total_work_orders,
  COUNT(*) FILTER (WHERE wo.status = 'completed') as completed_orders,
  COUNT(*) FILTER (WHERE 
    wo.completed_at IS NOT NULL AND
    EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at))/60 <= wo.sla_target_minutes
  ) as sla_met_count,
  AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at))/60) as avg_completion_minutes,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at))/60) as median_completion_minutes,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (wo.completed_at - wo.created_at))/60) as p95_completion_minutes,
  COUNT(*) FILTER (WHERE 
    wo.status IN ('pending', 'assigned', 'in_progress') AND
    EXTRACT(EPOCH FROM (NOW() - wo.created_at))/60 > wo.sla_target_minutes * 0.8
  ) as at_risk_count
FROM work_orders wo
WHERE wo.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY wo.tenant_id, wo.industry_type, DATE_TRUNC('hour', wo.created_at);
```

**Key Metrics:**
- **SLA Compliance Rate:** `(sla_met_count / completed_orders) * 100`
- **Average Completion Time:** Minutes from creation to completion
- **P95 Completion Time:** 95th percentile completion time
- **At-Risk Orders:** Orders at 80%+ of SLA target time
- **Breach Prediction Score:** ML model output (0-1 probability)

### Industry Benchmarks

| Industry | Target SLA Compliance | Target Avg Time | Target P95 |
|----------|----------------------|----------------|------------|
| Healthcare | 98% | 45 min | 75 min |
| Utilities | 95% | 120 min | 240 min |
| Insurance | 92% | 180 min | 360 min |
| Logistics | 96% | 60 min | 120 min |
| Field Service | 94% | 90 min | 180 min |

---

## 2. Forecast Accuracy Metrics

### Forecast Performance

```sql
-- Forecast accuracy by geography and product
CREATE OR REPLACE VIEW v_forecast_accuracy AS
SELECT
  fo.tenant_id,
  fo.forecast_type,
  fo.geography_level,
  fo.product_id,
  DATE_TRUNC('week', fo.forecast_date) as week_start,
  COUNT(*) as forecast_count,
  AVG(ABS(fo.actual_value - fo.forecast_value) / NULLIF(fo.actual_value, 0)) as mape,
  AVG(POWER(fo.actual_value - fo.forecast_value, 2)) as mse,
  SQRT(AVG(POWER(fo.actual_value - fo.forecast_value, 2))) as rmse,
  CORR(fo.actual_value, fo.forecast_value) as correlation
FROM forecast_outputs fo
WHERE fo.actual_value IS NOT NULL
  AND fo.forecast_date >= NOW() - INTERVAL '90 days'
GROUP BY 
  fo.tenant_id, 
  fo.forecast_type, 
  fo.geography_level, 
  fo.product_id, 
  DATE_TRUNC('week', fo.forecast_date);
```

**Key Metrics:**
- **MAPE (Mean Absolute Percentage Error):** Average % deviation from actuals
- **RMSE (Root Mean Squared Error):** Measure of prediction variance
- **Correlation:** How well forecasts track actuals (-1 to 1)
- **Bias:** Tendency to over/under-predict `AVG(forecast - actual)`

### Accuracy Targets by Forecast Type

| Forecast Type | Target MAPE | Target Correlation | Target Bias |
|---------------|-------------|-------------------|-------------|
| Repair Volume | <15% | >0.85 | ±5% |
| Engineer Availability | <10% | >0.90 | ±3% |
| Financial (Revenue) | <12% | >0.88 | ±4% |
| Financial (Cost) | <18% | >0.82 | ±6% |

---

## 3. Fraud Detection Metrics

### Fraud Analytics

```sql
-- Fraud detection performance
CREATE OR REPLACE VIEW v_fraud_analytics AS
SELECT
  fa.tenant_id,
  DATE_TRUNC('day', fa.created_at) as date,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE fa.confidence_score >= 0.8) as high_confidence_alerts,
  COUNT(*) FILTER (WHERE fa.status = 'confirmed_fraud') as confirmed_fraud,
  COUNT(*) FILTER (WHERE fa.status = 'false_positive') as false_positives,
  AVG(fa.confidence_score) as avg_confidence,
  SUM(fa.estimated_loss) as total_estimated_loss,
  SUM(fa.estimated_loss) FILTER (WHERE fa.status = 'confirmed_fraud') as actual_fraud_loss,
  SUM(fa.estimated_loss) FILTER (WHERE fa.status = 'prevented') as prevented_loss
FROM fraud_alerts fa
WHERE fa.created_at >= NOW() - INTERVAL '30 days'
GROUP BY fa.tenant_id, DATE_TRUNC('day', fa.created_at);
```

**Key Metrics:**
- **Precision:** `confirmed_fraud / (confirmed_fraud + false_positives)`
- **Recall:** Detected fraud / Total actual fraud (requires ground truth)
- **False Positive Rate:** `false_positives / total_alerts`
- **Fraud Prevention Rate:** `prevented_loss / (prevented_loss + actual_fraud_loss)`
- **Average Investigation Time:** Time from alert to resolution

### Fraud Type Distribution

| Fraud Type | Avg Confidence | False Positive Rate | Avg Loss |
|------------|----------------|---------------------|----------|
| Photo Forgery | 0.87 | 8% | $450 |
| Duplicate Claims | 0.92 | 5% | $850 |
| Time Manipulation | 0.83 | 12% | $320 |
| Ghost Technician | 0.95 | 3% | $1,200 |
| Parts Inflation | 0.79 | 15% | $600 |

---

## 4. Financial Reconciliation Metrics

### Financial Performance

```sql
-- Financial reconciliation summary
CREATE OR REPLACE VIEW v_financial_reconciliation AS
SELECT
  i.tenant_id,
  DATE_TRUNC('month', i.issue_date) as month,
  COUNT(DISTINCT i.id) as invoice_count,
  SUM(i.amount) as total_revenue,
  SUM(i.amount) FILTER (WHERE i.status = 'paid') as collected_revenue,
  SUM(i.amount) FILTER (WHERE i.status = 'overdue') as overdue_revenue,
  SUM(ap.amount) as total_penalties,
  COUNT(DISTINCT ap.id) as penalty_count,
  AVG(EXTRACT(EPOCH FROM (i.paid_at - i.issue_date))/86400) as avg_days_to_payment
FROM invoices i
LEFT JOIN applied_penalties ap ON ap.invoice_id = i.id
WHERE i.issue_date >= NOW() - INTERVAL '12 months'
GROUP BY i.tenant_id, DATE_TRUNC('month', i.issue_date);
```

**Key Metrics:**
- **Collection Rate:** `(collected_revenue / total_revenue) * 100`
- **Average Days to Payment:** Time from invoice to payment
- **Penalty Rate:** `(total_penalties / total_revenue) * 100`
- **Overdue Rate:** `(overdue_revenue / total_revenue) * 100`
- **Revenue Per Work Order:** `total_revenue / completed_work_orders`

### Penalty Breakdown

| Penalty Type | Avg Amount | Frequency | Recovery Rate |
|--------------|-----------|-----------|---------------|
| SLA Breach | $125 | 8% of WOs | 92% |
| Parts Not Utilized | $45 | 3% of WOs | 88% |
| Skill Mismatch | $60 | 2% of WOs | 95% |
| Capacity Violation | $200 | 1% of WOs | 78% |

---

## 5. Operational Metrics

### Work Order Performance

```sql
-- Operational efficiency metrics
CREATE OR REPLACE VIEW v_operational_metrics AS
SELECT
  wo.tenant_id,
  wo.industry_type,
  DATE_TRUNC('day', wo.created_at) as date,
  COUNT(*) as total_work_orders,
  COUNT(*) FILTER (WHERE wo.status = 'completed') as completed,
  COUNT(*) FILTER (WHERE wo.status = 'cancelled') as cancelled,
  COUNT(*) FILTER (WHERE wo.status IN ('pending', 'assigned')) as in_queue,
  COUNT(*) FILTER (WHERE wo.status = 'in_progress') as in_progress,
  AVG(EXTRACT(EPOCH FROM (wo.assigned_at - wo.created_at))/60) as avg_time_to_assignment,
  AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.assigned_at))/60) as avg_time_to_complete,
  COUNT(DISTINCT wo.technician_id) as active_technicians,
  COUNT(*) FILTER (WHERE wo.first_time_fix = true) as first_time_fix_count
FROM work_orders wo
WHERE wo.created_at >= NOW() - INTERVAL '7 days'
GROUP BY wo.tenant_id, wo.industry_type, DATE_TRUNC('day', wo.created_at);
```

**Key Metrics:**
- **Completion Rate:** `(completed / total_work_orders) * 100`
- **Cancellation Rate:** `(cancelled / total_work_orders) * 100`
- **Average Time to Assignment:** Minutes from creation to technician assignment
- **Average Time to Complete:** Minutes from assignment to completion
- **First Time Fix Rate:** `(first_time_fix_count / completed) * 100`
- **Technician Utilization:** `completed / active_technicians`

---

## 6. Workforce Analytics

### Technician Performance

```sql
-- Technician performance metrics
CREATE OR REPLACE VIEW v_workforce_analytics AS
SELECT
  t.tenant_id,
  t.id as technician_id,
  t.name as technician_name,
  COUNT(wo.id) as total_jobs,
  COUNT(wo.id) FILTER (WHERE wo.status = 'completed') as completed_jobs,
  COUNT(wo.id) FILTER (WHERE wo.first_time_fix = true) as first_time_fixes,
  AVG(EXTRACT(EPOCH FROM (wo.completed_at - wo.assigned_at))/60) as avg_job_duration,
  SUM(i.amount) FILTER (WHERE i.status = 'paid') as revenue_generated,
  SUM(ap.amount) as penalties_incurred,
  AVG(cf.rating) as avg_customer_rating
FROM technicians t
LEFT JOIN work_orders wo ON wo.technician_id = t.id
LEFT JOIN invoices i ON i.work_order_id = wo.id
LEFT JOIN applied_penalties ap ON ap.work_order_id = wo.id
LEFT JOIN customer_feedback cf ON cf.work_order_id = wo.id
WHERE wo.created_at >= NOW() - INTERVAL '30 days'
GROUP BY t.tenant_id, t.id, t.name;
```

**Key Metrics:**
- **Completion Rate:** `(completed_jobs / total_jobs) * 100`
- **First Time Fix Rate:** `(first_time_fixes / completed_jobs) * 100`
- **Average Job Duration:** Minutes per completed job
- **Revenue Per Technician:** Total revenue generated
- **Penalty Rate:** `(penalties_incurred / revenue_generated) * 100`
- **Customer Satisfaction:** Average rating (1-5 scale)

---

## 7. API & Platform Metrics

### API Performance

```sql
-- API usage and performance
CREATE OR REPLACE VIEW v_api_metrics AS
SELECT
  aum.partner_id,
  DATE_TRUNC('hour', aum.timestamp) as hour,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE aum.status_code < 400) as successful_requests,
  COUNT(*) FILTER (WHERE aum.status_code >= 400 AND aum.status_code < 500) as client_errors,
  COUNT(*) FILTER (WHERE aum.status_code >= 500) as server_errors,
  AVG(aum.response_time_ms) as avg_response_time,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY aum.response_time_ms) as p50_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY aum.response_time_ms) as p95_response_time,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY aum.response_time_ms) as p99_response_time,
  SUM(aum.cost) as total_cost
FROM api_usage_metrics aum
WHERE aum.timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY aum.partner_id, DATE_TRUNC('hour', aum.timestamp);
```

**Key Metrics:**
- **Success Rate:** `(successful_requests / total_requests) * 100`
- **Error Rate:** `((client_errors + server_errors) / total_requests) * 100`
- **P95 Latency:** 95th percentile response time (target: <200ms)
- **P99 Latency:** 99th percentile response time (target: <500ms)
- **Throughput:** Requests per second
- **Cost Per Request:** `total_cost / total_requests`

### Platform Health

```sql
-- System health indicators
CREATE OR REPLACE VIEW v_platform_health AS
SELECT
  DATE_TRUNC('minute', sm.recorded_at) as timestamp,
  sm.metric_name,
  AVG(sm.metric_value) as avg_value,
  MAX(sm.metric_value) as max_value,
  MIN(sm.metric_value) as min_value,
  STDDEV(sm.metric_value) as stddev_value
FROM system_metrics sm
WHERE sm.recorded_at >= NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', sm.recorded_at), sm.metric_name;
```

**Key System Metrics:**
- **Database Connection Pool:** Active connections, queue depth
- **Edge Function Execution Time:** Avg, p95, p99 per function
- **Memory Usage:** Per edge function and overall
- **Error Rate:** Errors per minute by function
- **Uptime:** Percentage of time services are available

---

## 8. Analytics Export Metrics

### Data Export Performance

```sql
-- Analytics export tracking
CREATE OR REPLACE VIEW v_analytics_exports AS
SELECT
  ae.tenant_id,
  ae.dataset_type,
  ae.export_format,
  DATE_TRUNC('day', ae.exported_at) as date,
  COUNT(*) as export_count,
  AVG(ae.record_count) as avg_records_exported,
  SUM(ae.record_count) as total_records_exported,
  AVG(EXTRACT(EPOCH FROM (ae.completed_at - ae.exported_at))) as avg_export_duration_seconds
FROM analytics_exports ae
WHERE ae.exported_at >= NOW() - INTERVAL '30 days'
  AND ae.status = 'completed'
GROUP BY ae.tenant_id, ae.dataset_type, ae.export_format, DATE_TRUNC('day', ae.exported_at);
```

**Key Metrics:**
- **Export Volume:** Total records exported per day
- **Export Latency:** Time to complete export
- **Popular Datasets:** Most frequently exported datasets
- **BI Integration Usage:** Breakdown by PowerBI, Tableau, Looker, etc.

---

## 9. Alerting & Thresholds

### Critical Alerts

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|------------------|-------------------|--------|
| SLA Breach Rate | >5% | >10% | Alert Ops Manager |
| API Error Rate | >1% | >5% | Page On-Call Engineer |
| Forecast MAPE | >20% | >30% | Retrain Models |
| Fraud False Positive Rate | >15% | >25% | Tune Detection Rules |
| P95 API Latency | >200ms | >500ms | Scale Infrastructure |
| Database CPU | >70% | >90% | Add Read Replicas |
| Collection Rate | <85% | <75% | Alert Finance Team |

### Anomaly Detection

```sql
-- Statistical anomaly detection (3-sigma rule)
CREATE OR REPLACE FUNCTION detect_anomalies(
  metric_name text,
  lookback_interval interval DEFAULT '7 days'
) RETURNS TABLE (
  timestamp timestamptz,
  value decimal,
  is_anomaly boolean,
  z_score decimal
) AS $$
  WITH stats AS (
    SELECT
      AVG(metric_value) as mean,
      STDDEV(metric_value) as stddev
    FROM system_metrics
    WHERE metric_name = $1
      AND recorded_at >= NOW() - lookback_interval
  )
  SELECT
    sm.recorded_at as timestamp,
    sm.metric_value as value,
    ABS((sm.metric_value - s.mean) / NULLIF(s.stddev, 0)) > 3 as is_anomaly,
    (sm.metric_value - s.mean) / NULLIF(s.stddev, 0) as z_score
  FROM system_metrics sm
  CROSS JOIN stats s
  WHERE sm.metric_name = $1
    AND sm.recorded_at >= NOW() - INTERVAL '1 hour'
  ORDER BY sm.recorded_at DESC;
$$ LANGUAGE sql;
```

---

## 10. Dashboards & Visualization

### Executive Dashboard (Daily)

**KPIs:**
- Total Revenue (MTD, YTD)
- Active Customers & Work Orders
- SLA Compliance Rate (Current vs. Target)
- Forecast Accuracy (Rolling 30 days)
- Platform Uptime (99.9% target)

### Operations Dashboard (Hourly)

**Widgets:**
- Work Orders by Status (Queue, In Progress, Completed)
- SLA Breach Risk Heatmap
- Technician Utilization Map
- At-Risk Work Orders Table
- Average Time to Assignment Trend

### Finance Dashboard (Daily/Monthly)

**Charts:**
- Revenue vs. Target (MTD)
- Collection Rate Trend
- Penalty Breakdown (By Type)
- Overdue Invoices Aging
- Revenue Per Work Order

### Fraud Investigation Dashboard (Real-Time)

**Panels:**
- High-Confidence Alerts Queue
- Investigation Status Pipeline
- Fraud Type Distribution
- Estimated vs. Prevented Loss
- False Positive Rate Trend

### Forecast Accuracy Dashboard (Weekly)

**Visualizations:**
- MAPE by Geography Level
- Forecast vs. Actuals (Line Chart)
- Model Performance Comparison
- Bias Analysis (Over/Under Prediction)
- Confidence Interval Coverage

---

## 11. Report Automation

### Scheduled Reports

| Report | Frequency | Recipients | Format |
|--------|-----------|------------|--------|
| Executive Summary | Daily (8am) | C-Suite | PDF |
| SLA Performance | Daily (6am) | Ops Managers | Email + Dashboard |
| Fraud Investigation | Real-time | Fraud Team | Slack Alert |
| Financial Reconciliation | Weekly (Monday 9am) | Finance Team | Excel |
| Forecast Accuracy | Weekly (Friday 5pm) | Data Science Team | PDF |
| API Usage | Monthly (1st) | Partner Success | CSV |

### Custom Reports

Users can create custom reports via Analytics Portal:
- Drag-and-drop widget builder
- Scheduled delivery (email, Slack, webhook)
- Export to PDF, Excel, CSV
- Shareable dashboard links

---

## Conclusion

This comprehensive metrics framework provides Guardian Flow with real-time operational intelligence across all key dimensions: SLA performance, forecasting, fraud detection, financial reconciliation, workforce analytics, and platform health.

**Next Steps:**
1. ✅ Implement real-time metric collection pipelines
2. ✅ Build Grafana dashboards for each metric category
3. ✅ Set up alerting rules with PagerDuty integration
4. ✅ Create automated report generation
5. ✅ Train users on analytics platform usage

---

**Document Owner:** Analytics Platform Team  
**Last Updated:** 2025-10-31  
**Next Review:** 2025-12-01
