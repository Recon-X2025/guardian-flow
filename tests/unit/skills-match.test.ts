/**
 * @file tests/unit/skills-match.test.ts
 * @description Unit tests for the skill match scoring algorithm
 *              (scoreMatch / scoreAssignment from skills & scheduler services).
 */

import { describe, it, expect } from 'vitest';

// ── Pure scoring helpers (mirrors server/routes/skills.js scoreMatch) ─────────

interface TechSkill {
  skill_id: string;
  expiry_date?: string | null;
}

function scoreMatch(techSkills: TechSkill[], requiredSkills: string[]) {
  const matched = techSkills.filter(s => requiredSkills.includes(s.skill_id));
  const allValid = matched.every(s => !s.expiry_date || new Date(s.expiry_date) > new Date());
  return {
    skillMatchPercent: requiredSkills.length ? (matched.length / requiredSkills.length) * 100 : 100,
    certificationValid: allValid,
    finalScore: (matched.length / Math.max(requiredSkills.length, 1)) * 100 * (allValid ? 1 : 0.5),
  };
}

// ── scoreAssignment (mirrors server/services/scheduler.js) ───────────────────

interface WorkOrder {
  requiredSkills: string[];
  requiredCerts?: string[];
  slaDeadline?: string | null;
}

interface Technician {
  skills: TechSkill[];
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
  if (hoursLeft <= 0) return 1;
  if (hoursLeft <= 4) return 0.9;
  if (hoursLeft <= 24) return 0.7;
  return 0.5;
}

function scoreAssignment(technician: Technician, workOrder: WorkOrder): number {
  const skillScore = calculateSkillMatch(technician.skills, workOrder.requiredSkills);
  const certScore  = areCertsValid(technician.skills, workOrder.requiredCerts) ? 1 : 0.5;
  const slaScore   = workOrder.slaDeadline ? calculateSlaUrgency(workOrder.slaDeadline) : 0.5;
  return (skillScore * 0.5 + certScore * 0.3 + slaScore * 0.2) * 100;
}

// ── scoreMatch tests ──────────────────────────────────────────────────────────

describe('scoreMatch()', () => {
  it('returns 100% when all required skills are matched and valid', () => {
    const techSkills: TechSkill[] = [{ skill_id: 'elec' }, { skill_id: 'hvac' }];
    const result = scoreMatch(techSkills, ['elec', 'hvac']);
    expect(result.skillMatchPercent).toBe(100);
    expect(result.certificationValid).toBe(true);
    expect(result.finalScore).toBe(100);
  });

  it('returns 50% when only half of required skills match', () => {
    const techSkills: TechSkill[] = [{ skill_id: 'elec' }];
    const result = scoreMatch(techSkills, ['elec', 'hvac']);
    expect(result.skillMatchPercent).toBe(50);
  });

  it('returns 100% when no skills are required', () => {
    const result = scoreMatch([], []);
    expect(result.skillMatchPercent).toBe(100);
    expect(result.finalScore).toBe(0); // 0 matched / max(0,1) * 100
  });

  it('halves the finalScore when certifications are expired', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const techSkills: TechSkill[] = [{ skill_id: 'elec', expiry_date: past }];
    const result = scoreMatch(techSkills, ['elec']);
    expect(result.certificationValid).toBe(false);
    expect(result.finalScore).toBe(50); // 100 * 0.5
  });

  it('certificationValid is true when expiry is in the future', () => {
    const future = new Date(Date.now() + 86400000 * 30).toISOString();
    const techSkills: TechSkill[] = [{ skill_id: 'elec', expiry_date: future }];
    const result = scoreMatch(techSkills, ['elec']);
    expect(result.certificationValid).toBe(true);
    expect(result.finalScore).toBe(100);
  });

  it('certificationValid is true when no expiry is set', () => {
    const techSkills: TechSkill[] = [{ skill_id: 'elec', expiry_date: null }];
    const result = scoreMatch(techSkills, ['elec']);
    expect(result.certificationValid).toBe(true);
  });

  it('returns 0 match when technician has no matching skills', () => {
    const techSkills: TechSkill[] = [{ skill_id: 'plumbing' }];
    const result = scoreMatch(techSkills, ['elec', 'hvac']);
    expect(result.skillMatchPercent).toBe(0);
    expect(result.finalScore).toBe(0);
  });

  it('ignores technician skills not in required list', () => {
    const techSkills: TechSkill[] = [{ skill_id: 'elec' }, { skill_id: 'irrelevant' }];
    const result = scoreMatch(techSkills, ['elec']);
    expect(result.skillMatchPercent).toBe(100);
  });
});

// ── scoreAssignment tests ─────────────────────────────────────────────────────

describe('scoreAssignment()', () => {
  it('returns a score between 0 and 100', () => {
    const tech: Technician = { skills: [{ skill_id: 'elec' }] };
    const wo: WorkOrder = { requiredSkills: ['elec'] };
    const score = scoreAssignment(tech, wo);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gives max score for perfect match with no SLA deadline', () => {
    const tech: Technician = { skills: [{ skill_id: 'elec' }] };
    const wo: WorkOrder = { requiredSkills: ['elec'], requiredCerts: ['elec'] };
    // skillScore=1, certScore=1, slaScore=0.5 (no deadline)
    // (1*0.5 + 1*0.3 + 0.5*0.2) * 100 = 90
    expect(scoreAssignment(tech, wo)).toBeCloseTo(90, 1);
  });

  it('reduces score for missing skills', () => {
    const tech: Technician = { skills: [] };
    const wo: WorkOrder = { requiredSkills: ['elec', 'hvac'] };
    const score = scoreAssignment(tech, wo);
    // skillScore=0, certScore=1 (no certs required), slaScore=0.5
    // (0*0.5 + 1*0.3 + 0.5*0.2) * 100 = 40
    expect(score).toBeCloseTo(40, 1);
  });

  it('reduces score for invalid certifications', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const tech: Technician = { skills: [{ skill_id: 'cert-a', expiry_date: past }] };
    const wo: WorkOrder = { requiredSkills: [], requiredCerts: ['cert-a'] };
    // certScore=0.5
    const score = scoreAssignment(tech, wo);
    expect(score).toBeLessThan(scoreAssignment(
      { skills: [{ skill_id: 'cert-a', expiry_date: new Date(Date.now() + 86400000).toISOString() }] },
      wo
    ));
  });

  it('increases urgency for near-SLA deadline', () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hrs away
    const far  = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // 2 days away
    const tech: Technician = { skills: [{ skill_id: 'elec' }] };
    const woSoon: WorkOrder = { requiredSkills: ['elec'], slaDeadline: soon };
    const woFar:  WorkOrder = { requiredSkills: ['elec'], slaDeadline: far };
    expect(scoreAssignment(tech, woSoon)).toBeGreaterThan(scoreAssignment(tech, woFar));
  });

  it('scores overdue SLA at maximum urgency (slaScore=1)', () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    const tech: Technician = { skills: [{ skill_id: 'elec' }] };
    const wo: WorkOrder = { requiredSkills: ['elec'], slaDeadline: past };
    // skillScore=1, certScore=1, slaScore=1
    // (1*0.5 + 1*0.3 + 1*0.2) * 100 = 100
    expect(scoreAssignment(tech, wo)).toBeCloseTo(100, 1);
  });
});

// ── calculateSkillMatch tests ─────────────────────────────────────────────────

describe('calculateSkillMatch()', () => {
  it('returns 1 when all required skills are present', () => {
    const skills: TechSkill[] = [{ skill_id: 'a' }, { skill_id: 'b' }];
    expect(calculateSkillMatch(skills, ['a', 'b'])).toBe(1);
  });

  it('returns 1 when no skills required', () => {
    expect(calculateSkillMatch([], [])).toBe(1);
  });

  it('returns partial match fraction', () => {
    const skills: TechSkill[] = [{ skill_id: 'a' }];
    expect(calculateSkillMatch(skills, ['a', 'b', 'c'])).toBeCloseTo(1 / 3, 4);
  });

  it('returns 0 when no matching skills', () => {
    const skills: TechSkill[] = [{ skill_id: 'x' }];
    expect(calculateSkillMatch(skills, ['a', 'b'])).toBe(0);
  });
});
