# India Forecasting Intelligence System

## Overview

The India Forecasting Intelligence System is a comprehensive ML-based forecasting pipeline that generates synthetic operational data for India and produces multi-level forecasts for volume, shrinkage, spend, and revenue predictions.

## System Components

### 1. Data Seeding Engine
- **Purpose**: Generate realistic synthetic operational data for all of India
- **Coverage**: 
  - 37 Indian states and Union Territories
  - 222 partner hubs (6 per state)
  - 444-666 pin codes (2-3 per hub)
- **Time Period**: 12 months of historical data
- **Volume**: 120K-170K monthly work orders
- **Seasonality**: May-September shows 30% uplift
- **Product Mix**:
  - PCs: 54%
  - Printers: 33%
  - Accessories: 10%
  - Peripherals: 3%

### 2. Forecast Engine
- **Hierarchy Levels**: Country → Region → State → City → Partner Hub → Pin Code
- **Forecast Types**:
  - Volume forecasting
  - Engineer shrinkage predictions
  - Spend forecasting
  - Revenue projections
- **Horizon**: 6 months forward projection
- **Method**: Statistical forecasting with trend and seasonality analysis

### 3. Visualization Dashboard
- Interactive hierarchy drill-down
- Predicted vs actual comparison charts
- Confidence bands (upper/lower bounds)
- Filter capabilities by geography and product
- Real-time metrics display

## Getting Started

### Step 1: Seed India Data

Navigate to **Forecast Center** and click **"Seed India Data"**

This will:
1. Generate 12 months of synthetic work orders
2. Create complete geography hierarchy for India
3. Populate products across all regions
4. Log seed metadata in `seed_info` table

Expected outcome: ~1.8M-2M work order records

### Step 2: Generate Forecasts

Click **"Generate Forecasts"** to:
1. Analyze historical patterns
2. Train forecast models for each hierarchy level
3. Generate 6-month forward projections
4. Calculate confidence intervals

This process takes 30-60 seconds.

### Step 3: Explore Forecasts

Use the Geography Hierarchy filters to drill down:
- Start at Country level (India)
- Drill into Regions (North, South, East, West, Central, Northeast)
- Select specific States
- View City-level forecasts
- Analyze Hub and Pin Code predictions

## Database Schema

### New Tables

#### `seed_info`
Tracks data seeding operations:
- `total_records`: Number of work orders created
- `months_covered`: Historical period (12)
- `product_splits`: Distribution by product category
- `geography_coverage`: States, hubs, pin codes covered

#### `forecast_outputs` (enhanced)
Stores forecast predictions:
- `forecast_type`: volume | shrinkage | spend | revenue
- `geography_level`: country | region | state | city | partner_hub | pin_code
- `predicted_value`: Forecasted value
- `lower_bound`: Lower confidence bound
- `upper_bound`: Upper confidence bound
- `confidence`: Prediction confidence score

## Express.js Route Handlers

### `/seed-india-data`
Generates synthetic India operational data.

**Request:**
```json
{
  "tenant_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "total_records": 1800000,
  "months_covered": 12,
  "start_date": "2024-11-01",
  "end_date": "2025-10-31",
  "product_splits": [...],
  "geography_coverage": {...}
}
```

### `/run-forecast-now`
Manually triggers forecast generation.

**Request:**
```json
{
  "tenant_id": "uuid",
  "geography_levels": ["country", "region", "state", "city", "partner_hub", "pin_code"],
  "product_id": "uuid" // optional
}
```

**Response:**
```json
{
  "success": true,
  "jobs": [...],
  "correlation_id": "uuid"
}
```

### `/get-forecast-metrics`
Retrieves system status and accuracy metrics.

**Request:**
```json
{
  "tenant_id": "uuid"
}
```

**Response:**
```json
{
  "seed_info": {...},
  "models": {
    "total": 6,
    "average_accuracy": "85.50",
    "models": [...]
  },
  "queue": {
    "queued": 0,
    "processing": 2,
    "completed": 18,
    "failed": 0
  },
  "forecasts": {
    "total": 5400,
    "by_type": {...},
    "by_level": {...}
  },
  "system_status": {
    "data_seeded": true,
    "models_trained": true,
    "forecasts_generated": true,
    "ready": true
  }
}
```

## Automation

### Auto-Refresh (Planned)
The system is designed to:
- Auto-refresh forecasts every 30 days
- Detect seasonality pattern drift
- Retrain models when variance exceeds 10%
- Auto-trigger partial retraining for new products/hubs

Implementation: Set up cron job to call `/run-forecast-now` monthly.

## Performance Metrics

### Expected Metrics
- Seeding time: 60-120 seconds
- Forecast generation: 30-60 seconds
- Forecast accuracy: 75-85% (MAE/MAPE based)
- Data volume: 1.8M-2M work orders

### System Status Indicators
- **Data Seeded**: Confirms historical data exists
- **Models Trained**: Shows number of active models
- **Forecasts Generated**: Total forecast points created
- **Avg Model Accuracy**: Overall prediction quality

## Troubleshooting

### No Forecasts Displayed
1. Check that data has been seeded (System Status card)
2. Verify forecasts have been generated
3. Ensure geography filters are correctly selected
4. Check browser console for errors

### Seeding Failed
1. Check database connection
2. Verify sufficient storage space
3. Review Express.js route handler logs for errors
4. Ensure tenant_id is valid

### Low Forecast Accuracy
1. Increase historical data period (requires re-seeding)
2. Check for data quality issues
3. Verify seasonality patterns are correct
4. Consider adding external data sources

## Next Steps

### Phase 1: Current State ✅
- India data seeding
- Basic forecast generation
- Visualization dashboard
- System metrics

### Phase 2: Enhancements (Planned)
- Advanced ML models (Prophet + XGBoost)
- Real-time forecast updates
- Anomaly detection
- Automated retraining

### Phase 3: Production (Planned)
- Multi-country support
- API rate limiting
- Forecast versioning
- A/B testing framework

## Support

For issues or questions:
1. Check Express.js route handler logs via server console or PM2 logs
2. Review `agent_trace_logs` table for execution traces
3. Query `forecast_queue` for job status
4. Examine `events_log` for system events

## API Integration

The forecast system can be integrated with external systems:

```typescript
// Get forecasts programmatically
const { data } = await db
  .from('forecast_outputs')
  .select('*')
  .eq('geography_level', 'state')
  .eq('forecast_type', 'volume')
  .gte('target_date', '2025-11-01')
  .order('target_date');
```

## Security

- All Express.js route handlers require JWT authentication
- Application-level tenant isolation policies protect tenant data isolation
- Seed info accessible only to admins
- Forecast outputs filtered by tenant_id

---

**Version**: 1.0  
**Last Updated**: 2026-04-12  
**Status**: Production Ready
