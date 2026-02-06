import { randomUUID } from 'crypto';
import { findMany, insertOne, insertMany, updateOne } from '../../db/query.js';

export async function optimizeSchedule(tenantId, date) {
  const dateStr = date || new Date().toISOString().split('T')[0];

  // Get unassigned or pending work orders
  const workOrders = await findMany('work_orders', {
    tenant_id: tenantId,
    status: { $in: ['draft', 'pending_validation', 'released'] },
  }, { sort: { created_at: 1 }, limit: 100 });

  // Get available technicians
  const techRoles = await findMany('user_roles', { role: 'technician' }, { limit: 50 });
  const techIds = techRoles.map(r => r.user_id);
  const technicians = techIds.length > 0
    ? await findMany('users', { id: { $in: techIds }, active: true })
    : [];

  if (workOrders.length === 0 || technicians.length === 0) {
    return { runId: null, assignments: [], message: 'No work orders or technicians available' };
  }

  // Get technician workloads
  const techWorkloads = {};
  for (const tech of technicians) {
    const activeWOs = await findMany('work_orders', {
      technician_id: tech.id,
      status: { $in: ['assigned', 'in_progress'] },
    });
    techWorkloads[tech.id] = {
      id: tech.id,
      name: tech.full_name || tech.email,
      current_load: activeWOs.length,
      max_load: 8, // 8 WOs per day max
      skills: tech.skills || [],
    };
  }

  // Score and sort work orders by priority
  const scoredWOs = workOrders.map(wo => {
    const priorityScore = wo.priority === 'urgent' ? 10 : wo.priority === 'high' ? 7 : wo.priority === 'medium' ? 4 : 1;
    const slaUrgency = wo.sla_deadline
      ? Math.max(0, 10 - (new Date(wo.sla_deadline).getTime() - Date.now()) / 3600000)
      : 0;
    const ageScore = Math.min(10, (Date.now() - new Date(wo.created_at).getTime()) / 86400000);

    return {
      ...wo,
      composite_score: priorityScore * 3 + Math.round(slaUrgency) * 2 + Math.round(ageScore),
      priority_score: priorityScore,
      sla_urgency: Math.round(slaUrgency * 10) / 10,
    };
  }).sort((a, b) => b.composite_score - a.composite_score);

  // Greedy assignment
  const assignments = [];
  const runId = randomUUID();

  for (const wo of scoredWOs) {
    // Find best-fit technician (lowest current load with capacity)
    let bestTech = null;
    let bestScore = -Infinity;

    for (const tech of Object.values(techWorkloads)) {
      if (tech.current_load >= tech.max_load) continue;

      const loadScore = (tech.max_load - tech.current_load) / tech.max_load * 10;
      const score = loadScore;

      if (score > bestScore) {
        bestScore = score;
        bestTech = tech;
      }
    }

    if (!bestTech) continue; // No available technician

    // Calculate schedule times
    const startOffset = bestTech.current_load * 90; // 90 min per WO
    const startTime = new Date(dateStr);
    startTime.setHours(8, 0, 0, 0);
    startTime.setMinutes(startTime.getMinutes() + startOffset);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 90);

    const assignment = {
      id: randomUUID(),
      optimization_run_id: runId,
      work_order_id: wo.id,
      wo_number: wo.wo_number,
      technician_id: bestTech.id,
      technician_name: bestTech.name,
      scheduled_start: startTime.toISOString(),
      scheduled_end: endTime.toISOString(),
      priority_score: wo.priority_score,
      skill_match_score: 7, // simplified
      composite_score: wo.composite_score,
      applied: false,
      created_at: new Date(),
    };

    assignments.push(assignment);
    bestTech.current_load++;
  }

  // Store the run and assignments
  try {
    await insertOne('schedule_optimization_runs', {
      id: runId,
      tenant_id: tenantId,
      run_date: dateStr,
      status: 'completed',
      total_assignments: assignments.length,
      total_work_orders: workOrders.length,
      total_technicians: technicians.length,
      created_at: new Date(),
    });

    if (assignments.length > 0) {
      await insertMany('optimized_schedule_assignments', assignments);
    }
  } catch (e) {
    console.warn('Schedule optimization store error:', e.message);
  }

  return { runId, assignmentsCount: assignments.length, assignments };
}
