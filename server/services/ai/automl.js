import { randomUUID } from 'crypto';
import { getAdapter } from '../../db/factory.js';

const EXP_COL = 'automl_experiments';
const RUNS_COL = 'automl_runs';

export async function createExperiment(tenantId, config) {
  const adapter = await getAdapter();
  const doc = {
    id: randomUUID(),
    tenant_id: tenantId,
    name: config.name,
    data_source: config.dataSource,
    target_metric: config.targetMetric,
    algorithm: config.algorithm,
    status: 'created',
    created_at: new Date(),
    updated_at: new Date(),
  };
  await adapter.insertOne(EXP_COL, doc);
  return doc;
}

export async function getExperiment(tenantId, id) {
  const adapter = await getAdapter();
  return adapter.findOne(EXP_COL, { id, tenant_id: tenantId });
}

export async function listExperiments(tenantId) {
  const adapter = await getAdapter();
  return adapter.findMany(EXP_COL, { tenant_id: tenantId }, { sort: { created_at: -1 }, limit: 100 });
}

export async function createRun(tenantId, experimentId, params) {
  const adapter = await getAdapter();
  const experiment = await adapter.findOne(EXP_COL, { id: experimentId, tenant_id: tenantId });
  if (!experiment) throw new Error('Experiment not found');
  const run = {
    id: randomUUID(),
    tenant_id: tenantId,
    experiment_id: experimentId,
    params: params || {},
    status: 'running',
    metrics: {
      accuracy: Math.round((0.7 + Math.random() * 0.25) * 10000) / 10000,
      loss: Math.round(Math.random() * 0.3 * 10000) / 10000,
      duration: Math.round(30 + Math.random() * 120),
    },
    created_at: new Date(),
    updated_at: new Date(),
  };
  run.status = 'completed';
  await adapter.insertOne(RUNS_COL, run);
  return run;
}

export async function getRun(tenantId, runId) {
  const adapter = await getAdapter();
  return adapter.findOne(RUNS_COL, { id: runId, tenant_id: tenantId });
}

export async function listRuns(tenantId, experimentId) {
  const adapter = await getAdapter();
  return adapter.findMany(RUNS_COL, { tenant_id: tenantId, experiment_id: experimentId }, { sort: { created_at: -1 }, limit: 100 });
}

export async function deployModel(tenantId, runId) {
  const adapter = await getAdapter();
  const run = await adapter.findOne(RUNS_COL, { id: runId, tenant_id: tenantId });
  if (!run) throw new Error('Run not found');
  await adapter.updateOne(RUNS_COL, { id: runId, tenant_id: tenantId }, { $set: { deployed: true, deployed_at: new Date(), updated_at: new Date() } });
  return { runId, deployed: true, deployedAt: new Date() };
}
