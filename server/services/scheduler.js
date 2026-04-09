/**
 * @file server/services/scheduler.js
 * @description Constraint-based scheduling solver — Sprint 7.
 *
 * Uses a greedy scoring approach to assign technicians to open work orders.
 * No external LP solver required.
 *
 * Exports: solveSchedule, scoreAssignment, detectConstraintViolations
 */

import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

// ── Scoring helpers ───────────────────────────────────────────────────────────

/**
 * Returns a 0–1 fraction of required skills covered by the technician.
 */
function calculateSkillMatch(techSkills, requiredSkills) {
  if (!requiredSkills || requiredSkills.length === 0) return 1;
  const matched = techSkills.filter(s => requiredSkills.includes(s.skill_id)).length;
  return matched / requiredSkills.length;
}

/**
 * Returns true when every required cert exists and is not expired.
 */
function areCertsValid(techSkills, requiredCerts = []) {
  if (!requiredCerts || requiredCerts.length === 0) return true;
  return requiredCerts.every(certId => {
    const found = techSkills.find(s => s.skill_id === certId);
    if (!found) return false;
    return !found.expiry_date || new Date(found.expiry_date) > new Date();
  });
}

/**
 * Returns a 0–1 urgency score based on how close the SLA deadline is.
 */
function calculateSlaUrgency(slaDeadline) {
  const hoursLeft = (new Date(slaDeadline).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft <= 0)  return 1;
  if (hoursLeft <= 4)  return 0.9;
  if (hoursLeft <= 24) return 0.7;
  return 0.5;
}

/**
 * Compute the proximity score (0–1). Returns 0.5 when coords unavailable.
 * Simple inverse-distance heuristic using Euclidean approximation.
 */
function calculateProximityScore(techLocation, woLocation) {
  if (!techLocation || !woLocation) return 0.5;
  const { lat: lat1, lng: lng1 } = techLocation;
  const { lat: lat2, lng: lng2 } = woLocation;
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return 0.5;

  // Approximate km distance (good enough for scoring)
  const dLat = (lat2 - lat1) * 111;
  const dLng = (lng2 - lng1) * 111 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const distKm = Math.sqrt(dLat * dLat + dLng * dLng);

  // Score drops from 1 → 0 over 100km
  return Math.max(0, 1 - distKm / 100);
}

/**
 * Score a technician–work-order pair.
 * Returns a 0–100 composite score.
 *
 * Weights:
 *   skill match     50 %
 *   cert validity   20 %
 *   SLA urgency     20 %
 *   proximity       10 %
 *
 * @param {object} technician
 * @param {object} workOrder
 * @returns {number}
 */
export function scoreAssignment(technician, workOrder) {
  const skillScore = calculateSkillMatch(
    technician.skills || [],
    workOrder.requiredSkills || [],
  );
  const certScore = areCertsValid(
    technician.skills || [],
    workOrder.requiredCerts || [],
  ) ? 1 : 0.5;
  const slaScore = workOrder.slaDeadline
    ? calculateSlaUrgency(workOrder.slaDeadline)
    : 0.5;
  const proximityScore = calculateProximityScore(
    technician.location,
    workOrder.location,
  );

  return (
    skillScore    * 0.50 +
    certScore     * 0.20 +
    slaScore      * 0.20 +
    proximityScore * 0.10
  ) * 100;
}

/**
 * Detect constraint violations for a technician–WO pair.
 *
 * @param {object} technician
 * @param {object} workOrder
 * @returns {string[]} array of violation labels
 */
export function detectConstraintViolations(technician, workOrder) {
  const violations = [];
  const techSkills = technician.skills || [];
  const requiredSkills = workOrder.requiredSkills || [];
  const requiredCerts  = workOrder.requiredCerts  || [];

  // Missing skills
  const missingSkills = requiredSkills.filter(
    skillId => !techSkills.some(s => s.skill_id === skillId),
  );
  if (missingSkills.length > 0) {
    violations.push('MISSING_SKILL');
  }

  // Invalid / expired certifications
  if (requiredCerts.length > 0 && !areCertsValid(techSkills, requiredCerts)) {
    violations.push('EXPIRED_CERTIFICATION');
  }

  // SLA jeopardy — less than 4 hours remaining
  if (workOrder.slaDeadline) {
    const hoursLeft = (new Date(workOrder.slaDeadline).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft <= 4) {
      violations.push('SLA_JEOPARDY');
    }
  }

  return violations;
}

/**
 * Solve an optimal schedule for open work orders on a given date.
 *
 * Algorithm: greedy — for each WO (sorted by SLA urgency), pick the
 * highest-scoring available technician.
 *
 * @param {string} date     - ISO date string (YYYY-MM-DD)
 * @param {string} tenantId
 * @returns {Promise<object>} { assignments, unassigned, solverMeta }
 */
export async function solveSchedule(date, tenantId) {
  const adapter = await getAdapter();

  // Fetch open work orders for this tenant on the given date
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const endOfDay   = new Date(`${date}T23:59:59.999Z`);

  const allWOs = await adapter.findMany('work_orders', { tenant_id: tenantId });
  const workOrders = allWOs.filter(wo => {
    if (!['open', 'pending', 'scheduled'].includes(wo.status)) return false;
    const scheduled = wo.scheduled_date ? new Date(wo.scheduled_date) : null;
    if (scheduled) {
      return scheduled >= startOfDay && scheduled <= endOfDay;
    }
    return true; // include undated open WOs
  });

  // Fetch technicians for this tenant
  const technicians = await adapter.findMany('technicians', { tenant_id: tenantId });

  // Fetch technician skills in bulk
  const techSkillsMap = new Map();
  for (const tech of technicians) {
    const skills = await adapter.findMany('technician_skills', {
      tenant_id: tenantId,
      technician_id: tech.id,
    });
    techSkillsMap.set(tech.id, skills);
  }

  // Enrich technicians with their skills
  const enrichedTechs = technicians.map(tech => ({
    ...tech,
    skills: techSkillsMap.get(tech.id) || [],
  }));

  // Sort WOs by SLA urgency (most urgent first)
  const sortedWOs = [...workOrders].sort((a, b) => {
    const urgencyA = a.sla_deadline ? calculateSlaUrgency(a.sla_deadline) : 0;
    const urgencyB = b.sla_deadline ? calculateSlaUrgency(b.sla_deadline) : 0;
    return urgencyB - urgencyA;
  });

  const assignments = [];
  const unassigned  = [];
  const assignedTechIds = new Set();

  for (const wo of sortedWOs) {
    const normalizedWO = {
      id: wo.id,
      title: wo.title || wo.description || wo.wo_number,
      requiredSkills: wo.required_skills || [],
      requiredCerts:  wo.required_certs  || [],
      slaDeadline:    wo.sla_deadline    || null,
      location:       wo.location        || null,
    };

    // Score all available technicians
    const candidates = enrichedTechs
      .filter(t => t.available !== false && !assignedTechIds.has(t.id))
      .map(tech => {
        const normalizedTech = {
          id:       tech.id,
          name:     tech.name || tech.display_name,
          skills:   tech.skills,
          location: tech.location || null,
        };
        const score      = scoreAssignment(normalizedTech, normalizedWO);
        const violations = detectConstraintViolations(normalizedTech, normalizedWO);
        return { tech: normalizedTech, score, violations };
      })
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      unassigned.push({ workOrder: normalizedWO, reason: 'NO_AVAILABLE_TECHNICIAN' });
      continue;
    }

    const best = candidates[0];
    assignedTechIds.add(best.tech.id);

    assignments.push({
      workOrderId:         wo.id,
      workOrderTitle:      normalizedWO.title,
      technicianId:        best.tech.id,
      technicianName:      best.tech.name,
      score:               Math.round(best.score * 100) / 100,
      skillMatchPercent:   Math.round(calculateSkillMatch(best.tech.skills, normalizedWO.requiredSkills) * 100),
      constraintViolations: best.violations,
      alternatives:        candidates.slice(1, 4).map(c => ({
        technicianId:   c.tech.id,
        technicianName: c.tech.name,
        score:          Math.round(c.score * 100) / 100,
        violations:     c.violations,
      })),
      status: 'proposed',
    });
  }

  logger.info('Scheduler solved', {
    tenantId,
    date,
    totalWOs:    workOrders.length,
    assigned:    assignments.length,
    unassigned:  unassigned.length,
  });

  return {
    assignments,
    unassigned,
    solverMeta: {
      date,
      solvedAt:      new Date().toISOString(),
      algorithm:     'greedy-score',
      totalWOs:      workOrders.length,
      totalTechs:    technicians.length,
      assignedCount: assignments.length,
    },
  };
}
