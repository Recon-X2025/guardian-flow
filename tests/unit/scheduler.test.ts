/**
 * @file tests/unit/scheduler.test.ts
 * @description Unit tests for the solveSchedule scoring logic.
 *              Mirrors the pure functions in server/services/scheduler.js.
 */

import { describe, it, expect } from 'vitest';

// ── Pure helpers (mirrors server/services/scheduler.js) ──────────────────────

interface TechSkill {
  skill_id: string;
  expiry_date?: string | null;
}

interface WorkOrder {
  requiredSkills: string[];
  requiredCerts?: string[];
  slaDeadline?: string | null;
}

interface Technician {
  skills: TechSkill[];
  location?: { lat: number; lng: number } | null;
}

function calculateSkillMatch(techSkills: TechSkill[], requiredSkills: string[]): number {
  if (!requiredSkills.length) return 1;
  const matched = techSkills.filter(s => requiredSkills.includes(s.skill_id)).length;
  return matched / requiredSkills.length;
}

function areCertsValid(techSkills: TechSkill[], requiredCerts: string[] = []): boolean {
  if (!requiredCerts.length) return true;
  return requiredCerts.every(certId => {
    const found = techSkills.find(s => s.skill_id === certId);
    if (!found) return false;
    return !found.expiry_date || new Date(found.expiry_date) > new Date();
  });
}

function calculateSlaUrgency(slaDeadline: string): number {
  const hoursLeft = (new Date(slaDeadline).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft <= 0)  return 1;
  if (hoursLeft <= 4)  return 0.9;
  if (hoursLeft <= 24) return 0.7;
  return 0.5;
}

function scoreAssignment(technician: Technician, workOrder: WorkOrder): number {
  const skillScore = calculateSkillMatch(technician.skills, workOrder.requiredSkills);
  const certScore  = areCertsValid(technician.skills, workOrder.requiredCerts) ? 1 : 0.5;
  const slaScore   = workOrder.slaDeadline ? calculateSlaUrgency(workOrder.slaDeadline) : 0.5;
  return (skillScore * 0.5 + certScore * 0.3 + slaScore * 0.2) * 100;
}

// ── calculateSlaUrgency tests ─────────────────────────────────────────────────

describe('calculateSlaUrgency()', () => {
  it('returns 1 for an overdue deadline', () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    expect(calculateSlaUrgency(past)).toBe(1);
  });

  it('returns 0.9 for deadline within 4 hours', () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    expect(calculateSlaUrgency(soon)).toBe(0.9);
  });

  it('returns 0.7 for deadline within 24 hours', () => {
    const today = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    expect(calculateSlaUrgency(today)).toBe(0.7);
  });

  it('returns 0.5 for deadline more than 24 hours away', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    expect(calculateSlaUrgency(future)).toBe(0.5);
  });
});

// ── scoreAssignment tests ─────────────────────────────────────────────────────

describe('scoreAssignment()', () => {
  it('produces score between 0 and 100', () => {
    const tech: Technician = { skills: [{ skill_id: 'elec' }] };
    const wo: WorkOrder    = { requiredSkills: ['elec'] };
    const score = scoreAssignment(tech, wo);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('scores 100 for perfect match with overdue SLA', () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    const tech: Technician = { skills: [{ skill_id: 'elec' }] };
    const wo: WorkOrder    = { requiredSkills: ['elec'], requiredCerts: ['elec'], slaDeadline: past };
    // (1*0.5 + 1*0.3 + 1*0.2) * 100 = 100
    expect(scoreAssignment(tech, wo)).toBeCloseTo(100, 1);
  });

  it('scores lower when technician has no matching skills', () => {
    const tech: Technician = { skills: [] };
    const wo: WorkOrder    = { requiredSkills: ['elec', 'hvac'] };
    // skillScore=0, certScore=1 (no certs), slaScore=0.5 (no deadline)
    // (0 + 0.3 + 0.1) * 100 = 40
    expect(scoreAssignment(tech, wo)).toBeCloseTo(40, 1);
  });

  it('reduces score for expired certs', () => {
    const past   = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000 * 30).toISOString();
    const expiredTech: Technician = { skills: [{ skill_id: 'cert-a', expiry_date: past }] };
    const validTech:   Technician = { skills: [{ skill_id: 'cert-a', expiry_date: future }] };
    const wo: WorkOrder = { requiredSkills: [], requiredCerts: ['cert-a'] };
    expect(scoreAssignment(expiredTech, wo)).toBeLessThan(scoreAssignment(validTech, wo));
  });

  it('urgent SLA increases score vs distant deadline', () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const far  = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const tech: Technician = { skills: [{ skill_id: 'elec' }] };
    const woSoon: WorkOrder = { requiredSkills: ['elec'], slaDeadline: soon };
    const woFar:  WorkOrder = { requiredSkills: ['elec'], slaDeadline: far };
    expect(scoreAssignment(tech, woSoon)).toBeGreaterThan(scoreAssignment(tech, woFar));
  });

  it('returns 90 for full skill+cert match with no SLA deadline', () => {
    const tech: Technician = { skills: [{ skill_id: 'elec' }] };
    const wo: WorkOrder    = { requiredSkills: ['elec'], requiredCerts: ['elec'] };
    // (1*0.5 + 1*0.3 + 0.5*0.2) * 100 = 90
    expect(scoreAssignment(tech, wo)).toBeCloseTo(90, 1);
  });
});
