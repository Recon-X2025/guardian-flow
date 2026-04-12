# GuardianFlow JavaScript SDK

## Installation

```bash
npm install guardianflow-sdk
# or use directly:
const { GuardianFlowSDK } = require('./sdk/js/guardianflow-sdk');
```

## Quickstart

### Authentication

```js
const { GuardianFlowSDK } = require('./sdk/js/guardianflow-sdk');

const sdk = new GuardianFlowSDK({
  baseUrl: 'https://your-guardianflow.example.com',
  tenantId: 'your-tenant-id',
});

await sdk.authenticate('admin@example.com', 'password');
```

### List Work Orders

```js
const { workOrders } = await sdk.listWorkOrders({ status: 'open' });
console.log(workOrders);
```

### Create a Work Order

```js
const wo = await sdk.createWorkOrder({
  title: 'Fix HVAC unit #42',
  priority: 'high',
  asset_id: 'asset-uuid',
});
console.log('Created:', wo.id);
```

### IoT Device & Readings

```js
// Register device
const device = await sdk.registerDevice({ name: 'Sensor-A1', type: 'temperature' });

// Ingest a reading
await sdk.ingestReading(device.device_id, 'temperature', 72.5);
```

### NLP Query

```js
const result = await sdk.nlpQuery('Show me all overdue work orders in Zone 3');
console.log(result.answer);
```

## API Reference

See `types.d.ts` for full TypeScript type definitions.

## Rate Limiting

The SDK automatically retries on `429 Too Many Requests` with exponential backoff (up to 3 retries).
