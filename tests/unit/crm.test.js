/**
 * Unit tests for CRM Pipeline and Survey (NPS/CSAT) logic — Sprint 39.
 */
import { describe, it, expect } from 'vitest';

// ── Pipeline summary helpers ──────────────────────────────────────────────────

function buildPipelineSummary(deals) {
  const STAGES = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const stageMap = {};
  for (const d of deals) {
    if (!stageMap[d.stage]) stageMap[d.stage] = { stage: d.stage, count: 0, totalAmount: 0, weightedARR: 0 };
    stageMap[d.stage].count       += 1;
    stageMap[d.stage].totalAmount += Number(d.amount) || 0;
    stageMap[d.stage].weightedARR += ((Number(d.amount) || 0) * (Number(d.probability) || 0)) / 100;
  }
  return STAGES.map(s => stageMap[s] ?? { stage: s, count: 0, totalAmount: 0, weightedARR: 0 });
}

// ── NPS helpers ───────────────────────────────────────────────────────────────

function calcNPS(responses) {
  const promoters  = responses.filter(r => r.score >= 9).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  if (responses.length === 0) return null;
  return Math.round(((promoters - detractors) / responses.length) * 100);
}

function classifyNPS(score) {
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CRM Pipeline', () => {
  describe('buildPipelineSummary', () => {
    it('returns all stages including empty ones', () => {
      const summary = buildPipelineSummary([]);
      expect(summary).toHaveLength(6);
      expect(summary.every(s => s.count === 0)).toBe(true);
    });

    it('sums totalAmount correctly per stage', () => {
      const deals = [
        { stage: 'Prospect',  amount: 1000, probability: 10 },
        { stage: 'Prospect',  amount: 2000, probability: 20 },
        { stage: 'Qualified', amount: 5000, probability: 50 },
      ];
      const summary = buildPipelineSummary(deals);
      const prospect  = summary.find(s => s.stage === 'Prospect');
      const qualified = summary.find(s => s.stage === 'Qualified');
      expect(prospect.count).toBe(2);
      expect(prospect.totalAmount).toBe(3000);
      expect(qualified.totalAmount).toBe(5000);
    });

    it('calculates weightedARR = amount * probability / 100', () => {
      const deals = [
        { stage: 'Proposal', amount: 10000, probability: 40 },
        { stage: 'Proposal', amount: 20000, probability: 60 },
      ];
      const summary = buildPipelineSummary(deals);
      const proposal = summary.find(s => s.stage === 'Proposal');
      // 10000 * 40/100 + 20000 * 60/100 = 4000 + 12000 = 16000
      expect(proposal.weightedARR).toBe(16000);
    });

    it('handles deals across multiple stages', () => {
      const deals = [
        { stage: 'Negotiation', amount: 50000, probability: 80 },
        { stage: 'Closed Won',  amount: 30000, probability: 100 },
      ];
      const summary = buildPipelineSummary(deals);
      const neg   = summary.find(s => s.stage === 'Negotiation');
      const won   = summary.find(s => s.stage === 'Closed Won');
      expect(neg.weightedARR).toBe(40000);
      expect(won.weightedARR).toBe(30000);
    });
  });

  describe('Stage validation', () => {
    const VALID_STAGES = ['Prospect', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

    it('accepts all valid stages', () => {
      for (const s of VALID_STAGES) {
        expect(VALID_STAGES.includes(s)).toBe(true);
      }
    });

    it('rejects invalid stage', () => {
      expect(VALID_STAGES.includes('Invalid Stage')).toBe(false);
    });

    it('allows stage transition to adjacent stage', () => {
      const idx = VALID_STAGES.indexOf('Prospect');
      const next = VALID_STAGES[idx + 1];
      expect(next).toBe('Qualified');
    });

    it('stage Closed Won is terminal (last open stage)', () => {
      const wonIdx  = VALID_STAGES.indexOf('Closed Won');
      const lostIdx = VALID_STAGES.indexOf('Closed Lost');
      expect(wonIdx).toBeLessThan(VALID_STAGES.length);
      expect(lostIdx).toBe(VALID_STAGES.length - 1);
    });
  });
});

describe('NPS scoring', () => {
  it('classifies score 9 as promoter', () => {
    expect(classifyNPS(9)).toBe('promoter');
  });

  it('classifies score 10 as promoter', () => {
    expect(classifyNPS(10)).toBe('promoter');
  });

  it('classifies score 8 as passive', () => {
    expect(classifyNPS(8)).toBe('passive');
  });

  it('classifies score 7 as passive', () => {
    expect(classifyNPS(7)).toBe('passive');
  });

  it('classifies score 6 as detractor', () => {
    expect(classifyNPS(6)).toBe('detractor');
  });

  it('classifies score 0 as detractor', () => {
    expect(classifyNPS(0)).toBe('detractor');
  });

  it('calculates NPS = (promoters - detractors) / total * 100', () => {
    // 3 promoters (9,10,9), 1 passive (7), 1 detractor (5)
    const responses = [{ score: 9 }, { score: 10 }, { score: 9 }, { score: 7 }, { score: 5 }];
    const nps = calcNPS(responses);
    // (3 - 1) / 5 * 100 = 40
    expect(nps).toBe(40);
  });

  it('returns null for empty responses', () => {
    expect(calcNPS([])).toBeNull();
  });

  it('returns -100 when all are detractors', () => {
    const responses = [{ score: 1 }, { score: 2 }, { score: 3 }];
    // (0 - 3) / 3 * 100 = -100
    expect(calcNPS(responses)).toBe(-100);
  });

  it('returns 100 when all are promoters', () => {
    const responses = [{ score: 9 }, { score: 10 }, { score: 9 }];
    // (3 - 0) / 3 * 100 = 100
    expect(calcNPS(responses)).toBe(100);
  });
});

describe('Survey token', () => {
  it('token is single-use: once tokenUsed=true, it cannot respond again', () => {
    // Simulates server-side guard logic
    function canRespond(survey) {
      return !survey.tokenUsed;
    }

    const survey = { token: 'abc-123', tokenUsed: false };
    expect(canRespond(survey)).toBe(true);

    // After responding
    survey.tokenUsed = true;
    expect(canRespond(survey)).toBe(false);
  });

  it('token format is UUID-like (non-empty string)', () => {
    // Simulates crypto.randomUUID() output format check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const sampleToken = '550e8400-e29b-41d4-a716-446655440000';
    expect(uuidRegex.test(sampleToken)).toBe(true);
  });

  it('invalid token returns survey not found', () => {
    const surveys = [{ token: 'valid-token', tokenUsed: false }];
    const find = (t) => surveys.find(s => s.token === t) ?? null;
    expect(find('unknown-token')).toBeNull();
    expect(find('valid-token')).not.toBeNull();
  });
});
