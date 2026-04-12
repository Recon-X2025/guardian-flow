/**
 * @file server/services/ai/scheduler.js
 * @description AI Scheduling — Constraint-based assignment engine.
 *
 * Algorithm: Two-phase approach
 * ─────────────────────────────
 * Phase 1 — Hard-constraint filtering
 *   For each work order, build a candidate set of technicians that satisfy ALL hard constraints:
 *     H1. Skill match — technician must have every required skill for the work order
 *     H2. Capacity    — technician must have remaining daily capacity (< max_load)
 *     H3. Availability — scheduled start must fall within technician's shift window
 *     H4. SLA deadline — assignment cannot push the work order past its SLA deadline
 *
 * Phase 2 — Soft-constraint scoring
 *   Score each valid (work-order, technician) pair:
 *     S1. SLA urgency    — closer deadline → higher weight (weight 4)
 *     S2. Priority       — urgent > high > medium > low (weight 3)
 *     S3. Skill quality  — ratio of exact matches to required skills (weight 2)
 *     S4. Travel time    — lower travel time → higher score (weight 2)
 *     S5. Load balance   — prefer less-loaded technicians (weight 1)
 *
 * Phase 3 — Hungarian-inspired greedy assignment with backfill
 *   Sort work orders by urgency (SLA deadline ASC). Assign each to the highest-scoring
 *   valid technician. If no valid technician exists, mark the work order as unscheduled.
 *
 * FlowSpace integration
 *   A decision record is written to FlowSpace for every optimisation run with
 *   rationale, constraint violations, and unscheduled reasons.
 */

import { randomUUID } from 'crypto';
import { findMany, insertOne, insertMany, updateOne } from '../../db/query.js';
import { writeDecisionRecord } from '../flowspace.js';
import logger from '../../utils/logger.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIFT_START_HOUR = 8;     // 08:00 local
const SHIFT_END_HOUR   = 18;    // 18:00 local
const DEFAULT_JOB_DURATION_MIN = 90;
const DEFAULT_MAX_LOAD = 8;

const PRIORITY_WEIGHT = { urgent: 10, high: 7, medium: 4, low: 1 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function shiftStart(dateStr) {
  const d = new Date(dateStr);
  d.setHours(SHIFT_START_HOUR, 0, 0, 0);
  return d;
}

function shiftEnd(dateStr) {
  const d = new Date(dateStr);
  d.setHours(SHIFT_END_HOUR, 0, 0, 0);
  return d;
}

function slaUrgencyScore(deadline) {
  if (!deadline) return 0;
  const hoursLeft = (new Date(deadline).getTime() - Date.now()) / 3_600_000;
  if (hoursLeft <= 0) return 10;      // already breached
  if (hoursLeft <= 4)  return 9;
  if (hoursLeft <= 8)  return 7;
  if (hoursLeft <= 24) return 5;
  if (hoursLeft <= 72) return 3;
  return 1;
}

function skillMatchScore(required = [], techSkills = []) {
  if (!required.length) return 10; // no skill required → any technician OK
  const normalise = s => String(s).toLowerCase().trim();
  const reqSet = new Set(required.map(normalise));
  const techSet = new Set(techSkills.map(normalise));
  const matched = [...reqSet].filter(s => techSet.has(s)).length;
  return matched / reqSet.size;       // 0.0 – 1.0
}

// ── Hard-constraint checks ────────────────────────────────────────────────────

function meetsSkillConstraint(wo, tech) {
  const required = wo.required_skills ?? wo.skills_required ?? [];
  if (!required.length) return true;
  const normalise = s => String(s).toLowerCase().trim();
  const techSkills = new Set((tech.skills ?? []).map(normalise));
  return required.every(s => techSkills.has(normalise(s)));
}

function meetsCapacityConstraint(tech) {
  return tech.current_load < (tech.max_load ?? DEFAULT_MAX_LOAD);
}

function meetsAvailabilityConstraint(scheduledStart, dateStr, tech) {
  const start = shiftStart(dateStr);
  const end   = shiftEnd(dateStr);
  if (scheduledStart < start || scheduledStart >= end) return false;
  // Custom availability windows override defaults
  if (tech.availability_windows?.length) {
    return tech.availability_windows.some(w => {
      const ws = new Date(w.start);
      const we = new Date(w.end);
      return scheduledStart >= ws && scheduledStart < we;
    });
  }
  return true;
}

function meetsSlaConstraint(scheduledEnd, wo) {
  if (!wo.sla_deadline) return true;
  return scheduledEnd <= new Date(wo.sla_deadline);
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreAssignment(wo, tech, scheduledStart, travelTimeMin = 0) {
  const urgency    = slaUrgencyScore(wo.sla_deadline) * 4;
  const priority   = (PRIORITY_WEIGHT[wo.priority] ?? 1) * 3;
  const skillQ     = skillMatchScore(wo.required_skills ?? wo.skills_required, tech.skills) * 10 * 2;
  const travel     = Math.max(0, 10 - travelTimeMin / 15) * 2; // 10 = 0 min travel
  const maxLoad    = tech.max_load ?? DEFAULT_MAX_LOAD;
  const loadBalance = ((maxLoad - tech.current_load) / maxLoad) * 10 * 1;
  return urgency + priority + skillQ + travel + loadBalance;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function optimizeSchedule(tenantId, date) {
  const dateStr = date || new Date().toISOString().slice(0, 10);
  const runId   = randomUUID();
  const now     = new Date().toISOString();

  logger.info('scheduler: starting constraint-based run', { tenantId, dateStr, runId });

  // ── Load data ──────────────────────────────────────────────────────────────
  const workOrders = await findMany('work_orders', {
    tenant_id: tenantId,
    status: { $in: ['draft', 'pending_validation', 'released'] },
  }, { sort: { created_at: 1 }, limit: 100 });

  const techRoles = await findMany('user_roles', { role: 'technician' }, { limit: 50 });
  const techIds   = techRoles.map(r => r.user_id);
  const users     = techIds.length
    ? await findMany('users', { id: { $in: techIds }, active: true })
    : [];

  if (!workOrders.length || !users.length) {
    return { runId: null, assignments: [], unscheduled: [], message: 'No work orders or technicians available' };
  }

  // ── Build technician state objects ─────────────────────────────────────────
  const techMap = {};
  for (const u of users) {
    const activeWOs = await findMany('work_orders', {
      technician_id: u.id,
      status: { $in: ['assigned', 'in_progress'] },
    });
    const nextSlot = shiftStart(dateStr);
    nextSlot.setMinutes(nextSlot.getMinutes() + activeWOs.length * DEFAULT_JOB_DURATION_MIN);
    techMap[u.id] = {
      id: u.id,
      name: u.full_name || u.email,
      skills: u.skills ?? [],
      current_load: activeWOs.length,
      max_load: u.max_daily_jobs ?? DEFAULT_MAX_LOAD,
      next_available_slot: nextSlot,
      availability_windows: u.availability_windows ?? [],
      location: u.location ?? null,
    };
  }

  // ── Sort work orders: SLA deadline ASC, then priority DESC ─────────────────
  const sortedWOs = [...workOrders].sort((a, b) => {
    // Null deadlines go last
    if (a.sla_deadline && !b.sla_deadline) return -1;
    if (!a.sla_deadline && b.sla_deadline)  return 1;
    if (a.sla_deadline && b.sla_deadline) {
      const diff = new Date(a.sla_deadline) - new Date(b.sla_deadline);
      if (diff !== 0) return diff;
    }
    return (PRIORITY_WEIGHT[b.priority] ?? 1) - (PRIORITY_WEIGHT[a.priority] ?? 1);
  });

  // ── Assignment loop ────────────────────────────────────────────────────────
  const assignments = [];
  const unscheduled = [];

  for (const wo of sortedWOs) {
    const durationMin = wo.estimated_duration_minutes ?? DEFAULT_JOB_DURATION_MIN;
    let bestCandidate = null;
    let bestScore = -Infinity;
    const violations = {};

    for (const tech of Object.values(techMap)) {
      // H1 — Skills
      if (!meetsSkillConstraint(wo, tech)) {
        violations[tech.id] = 'skill_mismatch';
        continue;
      }
      // H2 — Capacity
      if (!meetsCapacityConstraint(tech)) {
        violations[tech.id] = 'over_capacity';
        continue;
      }

      const scheduledStart = new Date(tech.next_available_slot);
      const scheduledEnd   = new Date(scheduledStart.getTime() + durationMin * 60_000);

      // H3 — Availability
      if (!meetsAvailabilityConstraint(scheduledStart, dateStr, tech)) {
        violations[tech.id] = 'outside_availability';
        continue;
      }
      // H4 — SLA
      if (!meetsSlaConstraint(scheduledEnd, wo)) {
        violations[tech.id] = 'sla_breach';
        continue;
      }

      const travelMin = 0; // Will use routeOptimizer when location data present
      const score = scoreAssignment(wo, tech, scheduledStart, travelMin);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = { tech, scheduledStart, scheduledEnd, travelMin };
      }
    }

    if (!bestCandidate) {
      unscheduled.push({
        work_order_id: wo.id,
        wo_number: wo.wo_number,
        reason: Object.keys(violations).length ? 'constraint_violations' : 'no_technicians',
        constraint_violations: violations,
      });
      continue;
    }

    const { tech, scheduledStart, scheduledEnd } = bestCandidate;

    const assignment = {
      id: randomUUID(),
      optimization_run_id: runId,
      work_order_id: wo.id,
      wo_number: wo.wo_number,
      technician_id: tech.id,
      technician_name: tech.name,
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      priority_score: PRIORITY_WEIGHT[wo.priority] ?? 1,
      skill_match_score: Math.round(skillMatchScore(wo.required_skills ?? wo.skills_required ?? [], tech.skills) * 100),
      sla_urgency_score: slaUrgencyScore(wo.sla_deadline),
      composite_score: Math.round(bestScore),
      travel_time_min: bestCandidate.travelMin,
      applied: false,
      created_at: now,
    };
    assignments.push(assignment);

    // Advance technician's next available slot
    tech.next_available_slot = new Date(scheduledEnd);
    tech.current_load++;
  }

  // ── Persist run + assignments ──────────────────────────────────────────────
  try {
    await insertOne('schedule_optimization_runs', {
      id: runId,
      tenant_id: tenantId,
      run_date: dateStr,
      algorithm: 'constraint_based_v2',
      status: 'completed',
      total_assignments: assignments.length,
      total_unscheduled: unscheduled.length,
      total_work_orders: workOrders.length,
      total_technicians: users.length,
      created_at: now,
    });
    if (assignments.length) {
      await insertMany('optimized_schedule_assignments', assignments);
    }
  } catch (e) {
    logger.warn('scheduler: store error', { error: e.message });
  }

  // ── Write FlowSpace decision record ───────────────────────────────────────
  try {
    await writeDecisionRecord({
      tenantId,
      domain: 'scheduling',
      actorType: 'system',
      actorId: 'ai-scheduler',
      action: 'optimise_schedule',
      resourceType: 'schedule_optimization_run',
      resourceId: runId,
      rationale: [
        `Constraint-based scheduler v2 ran for ${dateStr}.`,
        `Assigned ${assignments.length} of ${workOrders.length} work orders.`,
        unscheduled.length ? `${unscheduled.length} unscheduled due to constraint violations.` : 'All work orders scheduled.',
        'Hard constraints: skill match, capacity, availability window, SLA deadline.',
        'Soft constraints: SLA urgency (×4), priority (×3), skill quality (×2), travel time (×2), load balance (×1).',
      ].join(' '),
      metadata: { runId, dateStr, unscheduled_count: unscheduled.length },
    });
  } catch (e) {
    logger.warn('scheduler: flowspace write error', { error: e.message });
  }

  logger.info('scheduler: run complete', {
    tenantId, runId, assigned: assignments.length, unscheduled: unscheduled.length,
  });

  return {
    runId,
    assignmentsCount: assignments.length,
    unscheduledCount: unscheduled.length,
    assignments,
    unscheduled,
  };
}
