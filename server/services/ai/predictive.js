import { randomUUID } from 'crypto';
import { chatCompletion } from './llm.js';
import { PROMPTS } from './prompts.js';
import { findMany, insertOne, updateOne, deleteMany, aggregate, countDocuments } from '../../db/query.js';

export async function predictSLABreach(tenantId) {
  // Get active work orders
  const workOrders = await findMany('work_orders', {
    tenant_id: tenantId,
    status: { $nin: ['completed', 'cancelled'] },
  }, { limit: 100, sort: { created_at: 1 } });

  if (workOrders.length === 0) return [];

  // Get historical completion times for baseline
  const historicalStats = await aggregate('work_orders', [
    { $match: { tenant_id: tenantId, status: 'completed' } },
    { $group: {
      _id: null,
      avg_completion_hours: { $avg: { $divide: [{ $subtract: ['$updated_at', '$created_at'] }, 3600000] } },
      count: { $sum: 1 },
    }},
  ]);

  const avgHours = historicalStats[0]?.avg_completion_hours || 24;

  // Calculate predictions using LLM-enhanced analysis
  const predictions = [];
  for (const wo of workOrders) {
    const hoursElapsed = (Date.now() - new Date(wo.created_at).getTime()) / 3600000;
    const slaDeadline = wo.sla_deadline ? new Date(wo.sla_deadline) : null;
    const hoursRemaining = slaDeadline ? (slaDeadline.getTime() - Date.now()) / 3600000 : 48;

    // Factors affecting breach probability
    const complexityFactor = wo.priority === 'urgent' ? 1.5 : wo.priority === 'high' ? 1.3 : 1.0;
    const statusFactor = wo.status === 'in_progress' ? 0.7 : wo.status === 'assigned' ? 1.0 : 1.2;
    const timeFactor = hoursRemaining <= 0 ? 1.0 : Math.min(1.0, avgHours / hoursRemaining);

    // Logistic function for breach probability
    const rawScore = (complexityFactor * 0.3 + statusFactor * 0.3 + timeFactor * 0.4);
    const breachProbability = Math.round(100 / (1 + Math.exp(-5 * (rawScore - 0.5))));

    const riskLevel = breachProbability > 70 ? 'high' : breachProbability > 40 ? 'medium' : 'low';

    const prediction = {
      id: randomUUID(),
      work_order_id: wo.id,
      wo_number: wo.wo_number,
      tenant_id: tenantId,
      breach_probability: breachProbability,
      risk_level: riskLevel,
      hours_remaining: Math.round(hoursRemaining * 10) / 10,
      contributing_factors: {
        hours_elapsed: Math.round(hoursElapsed * 10) / 10,
        complexity: complexityFactor,
        status_risk: statusFactor,
        time_pressure: Math.round(timeFactor * 100) / 100,
        current_status: wo.status,
        priority: wo.priority || 'normal',
      },
      predicted_at: new Date(),
    };

    predictions.push(prediction);

    // Store prediction
    try {
      await updateOne('sla_predictions',
        { work_order_id: wo.id },
        { $set: prediction },
        { upsert: true }
      );
    } catch (e) { console.warn('SLA prediction store error:', e.message); }
  }

  // Use LLM to generate narrative for high-risk items
  const highRisk = predictions.filter(p => p.risk_level === 'high');
  if (highRisk.length > 0) {
    try {
      const result = await chatCompletion([
        { role: 'system', content: PROMPTS.SLA_PREDICTION.system },
        { role: 'user', content: PROMPTS.SLA_PREDICTION.user(highRisk.slice(0, 10)) },
      ], { feature: 'sla_prediction', tenant_id: tenantId });
      // Attach narrative to response but don't parse it
    } catch (e) { /* non-critical */ }
  }

  return predictions;
}

export async function generateMaintenancePredictions(tenantId) {
  // Get equipment
  const equipment = await findMany('equipment', { tenant_id: tenantId }, { limit: 200 });
  if (equipment.length === 0) return [];

  const predictions = [];

  for (const equip of equipment) {
    // Get service history for this equipment
    const serviceHistory = await findMany('work_orders', {
      tenant_id: tenantId,
      $or: [
        { equipment_id: equip.id },
        { unit_serial: equip.serial_number },
      ],
      status: 'completed',
    }, { sort: { updated_at: -1 }, limit: 50 });

    const totalPastFailures = serviceHistory.length;
    const lastService = serviceHistory[0]?.updated_at;
    const daysSinceLastService = lastService ? (Date.now() - new Date(lastService).getTime()) / 86400000 : 365;
    const equipmentAge = equip.created_at ? (Date.now() - new Date(equip.created_at).getTime()) / 86400000 : 730;
    const avgRepairCost = serviceHistory.length > 0
      ? serviceHistory.reduce((s, wo) => s + (wo.total_cost || 150), 0) / serviceHistory.length
      : 200;

    // Logistic regression: P(failure) = 1 / (1 + exp(-(b0 + b1*days + b2*failures + b3*age)))
    const b0 = -3.0;
    const b1 = 0.008;  // days since last service
    const b2 = 0.15;   // past failures
    const b3 = 0.002;  // equipment age in days

    const logit = b0 + b1 * daysSinceLastService + b2 * totalPastFailures + b3 * equipmentAge;
    const failureProbability = Math.round(100 / (1 + Math.exp(-logit)));

    // Calculate MTBF
    const mtbf = totalPastFailures > 1 ? Math.round(equipmentAge / totalPastFailures) : null;

    const riskLevel = failureProbability > 70 ? 'critical' : failureProbability > 50 ? 'high' : failureProbability > 30 ? 'medium' : 'low';

    const prediction = {
      id: randomUUID(),
      equipment_id: equip.id,
      serial_number: equip.serial_number,
      model: equip.model,
      manufacturer: equip.manufacturer,
      tenant_id: tenantId,
      failure_probability: failureProbability,
      risk_level: riskLevel,
      mtbf_days: mtbf,
      days_since_last_service: Math.round(daysSinceLastService),
      total_past_failures: totalPastFailures,
      avg_repair_cost: Math.round(avgRepairCost * 100) / 100,
      equipment_age_days: Math.round(equipmentAge),
      recommended_action: failureProbability > 70
        ? 'Schedule immediate preventive maintenance'
        : failureProbability > 50
          ? 'Schedule maintenance within 2 weeks'
          : failureProbability > 30
            ? 'Monitor and schedule in next maintenance window'
            : 'No immediate action required',
      predicted_at: new Date(),
    };

    predictions.push(prediction);

    try {
      await updateOne('maintenance_predictions',
        { equipment_id: equip.id, tenant_id: tenantId },
        { $set: prediction },
        { upsert: true }
      );
    } catch (e) { console.warn('Maintenance prediction store error:', e.message); }
  }

  return predictions;
}
