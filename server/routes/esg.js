/**
 * ESG Routes
 * GET/POST /api/esg/emissions
 * GET      /api/esg/emissions/summary?year=
 * GET/POST /api/esg/targets
 * GET      /api/esg/targets/:id/progress
 * GET/POST /api/esg/reports
 * POST     /api/esg/reports/generate — auto-generate GRI / SASB / TCFD report from emissions data
 * GET      /api/esg/scope3/calculate — Scope 3 upstream + downstream estimation
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import logger from '../utils/logger.js';

const router = express.Router();

// ── Scope 3 Category Emission Factors (kg CO₂e per $ spend, simplified) ───────
// Based on EEIO-based spend-based emission factors (EPA Environmentally-Extended I-O)
const SCOPE3_FACTORS = {
  purchased_goods:     0.42,   // kg CO₂e / $ spend on goods
  capital_goods:       0.25,
  fuel_energy_related: 0.18,
  upstream_transport:  0.21,
  waste_operations:    0.12,
  business_travel:     0.28,
  employee_commuting:  0.14,
  upstream_leased:     0.09,
  downstream_transport:0.19,
  processing_sold:     0.31,
  use_sold:            0.08,
  end_of_life:         0.06,
  downstream_leased:   0.07,
  franchises:          0.22,
  investments:         0.11,
};

function kgToTonnes(kg) { return +(kg / 1000).toFixed(3); }

// GRI Disclosure builder
function buildGriSections(summary, targets, year) {
  return {
    'GRI 305-1': {
      title: 'Direct (Scope 1) GHG Emissions',
      disclosure: `Total Scope 1 emissions for ${year}: ${kgToTonnes(summary.scope1)} tCO₂e (${summary.scope1.toLocaleString()} kg CO₂e).`,
      value_kg: summary.scope1,
      value_tonnes: kgToTonnes(summary.scope1),
      unit: 'tCO₂e',
      methodology: 'GHG Protocol Corporate Standard',
      verification_status: 'third_party_review_pending',
    },
    'GRI 305-2': {
      title: 'Energy Indirect (Scope 2) GHG Emissions',
      disclosure: `Total Scope 2 emissions for ${year}: ${kgToTonnes(summary.scope2)} tCO₂e. Market-based method applied where supplier-specific emission factors available.`,
      value_kg: summary.scope2,
      value_tonnes: kgToTonnes(summary.scope2),
      unit: 'tCO₂e',
      methodology: 'GHG Protocol Scope 2 Guidance — market-based',
    },
    'GRI 305-3': {
      title: 'Other Indirect (Scope 3) GHG Emissions',
      disclosure: `Total Scope 3 emissions for ${year}: ${kgToTonnes(summary.scope3)} tCO₂e. Upstream and downstream value-chain activities included per GHG Protocol Scope 3 Standard.`,
      value_kg: summary.scope3,
      value_tonnes: kgToTonnes(summary.scope3),
      unit: 'tCO₂e',
      methodology: 'GHG Protocol Scope 3 Standard, Category 1–15',
    },
    'GRI 305-4': {
      title: 'GHG Emissions Intensity',
      disclosure: `GHG intensity calculated against reporting boundary.`,
      total_tonnes: kgToTonnes(summary.total),
    },
    'GRI 305-5': {
      title: 'Reduction of GHG Emissions',
      targets: targets.map(t => ({
        type: t.target_type,
        baseline_year: t.baseline_year,
        target_year: t.target_year,
        reduction_target_pct: t.baseline_kg && t.target_kg
          ? +((1 - t.target_kg / t.baseline_kg) * 100).toFixed(1)
          : null,
      })),
    },
  };
}

// SASB Disclosure builder
function buildSasbSections(summary, year) {
  const totalTonnes = kgToTonnes(summary.total);
  return {
    'EM-CO-110a.1': {
      title: 'Gross global Scope 1 emissions, percentage covered under emissions-limiting regulations',
      value_tonnes: kgToTonnes(summary.scope1),
      disclosure: `Gross Scope 1: ${kgToTonnes(summary.scope1)} tCO₂e for ${year}. Regulatory coverage assessed per applicable jurisdiction.`,
    },
    'EM-CO-110a.2': {
      title: 'Discussion of long-term and short-term strategy to manage GHG emissions',
      disclosure: 'Organisation has implemented operational efficiency initiatives and renewable energy procurement to reduce Scope 1 and 2 emissions, targeting net-zero aligned with SBTi framework.',
    },
    'EM-CO-120a.1': {
      title: 'Air quality — NOx, SOx and other air emissions',
      disclosure: 'Air quality data collected per national regulatory reporting requirements. Data available on request.',
    },
    'summary': { year, total_scope1_2_3_tonnes: totalTonnes },
  };
}

// TCFD Disclosure builder
function buildTcfdSections(summary, targets, year) {
  return {
    governance: {
      'a': 'Board-level oversight of climate-related risks and opportunities through ESG Committee. Quarterly reviews of emissions data and target progress.',
      'b': 'Management role: ESG Lead reports to CFO; responsible for climate risk integration into business strategy and capital allocation.',
    },
    strategy: {
      'a': 'Climate-related risks identified: physical (extreme weather, flooding), transitional (carbon pricing, technology shifts, regulatory changes).',
      'b': 'Climate risks and opportunities integrated into strategic planning horizon of 3–5 years.',
      'c': 'Scenario analysis conducted against 1.5°C and 2°C pathways per IEA WEO scenarios.',
    },
    risk_management: {
      'a': 'Climate risk identification process: annual materiality assessment, supply chain mapping, physical asset vulnerability screening.',
      'b': 'Climate risks integrated into enterprise risk management framework.',
      'c': 'Carbon footprint managed through internal carbon price mechanism.',
    },
    metrics_and_targets: {
      scope1_tonnes: kgToTonnes(summary.scope1),
      scope2_tonnes: kgToTonnes(summary.scope2),
      scope3_tonnes: kgToTonnes(summary.scope3),
      total_tonnes: kgToTonnes(summary.total),
      year,
      targets: targets.map(t => ({
        type: t.target_type,
        baseline_year: t.baseline_year,
        target_year: t.target_year,
      })),
    },
  };
}

// ── Helper: summarise emissions for a year ────────────────────────────────────

async function summariseEmissions(adapter, tenantId, year) {
  let records = await adapter.findMany('emissions_records', { tenant_id: tenantId });
  if (year) {
    records = records.filter(r => r.period_start && new Date(r.period_start).getFullYear() === parseInt(year, 10));
  }
  let scope1 = 0, scope2 = 0, scope3 = 0;
  for (const r of records) {
    const qty = Number(r.quantity_kg_co2e) || 0;
    if (r.scope === 1 || r.scope === '1') scope1 += qty;
    else if (r.scope === 2 || r.scope === '2') scope2 += qty;
    else if (r.scope === 3 || r.scope === '3') scope3 += qty;
  }
  return { scope1, scope2, scope3, total: scope1 + scope2 + scope3 };
}

router.get('/emissions/summary', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const summary = await summariseEmissions(adapter, req.user.tenantId, req.query.year);
    res.json({ ...summary, year: req.query.year || null });
  } catch (err) {
    logger.error('ESG: emissions summary error', { error: err.message });
    res.status(500).json({ error: 'Failed to get emissions summary' });
  }
});

router.get('/emissions', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const records = await adapter.findMany('emissions_records', { tenant_id: req.user.tenantId });
    res.json({ records, total: records.length });
  } catch (err) {
    logger.error('ESG: list emissions error', { error: err.message });
    res.status(500).json({ error: 'Failed to list emissions records' });
  }
});

router.post('/emissions', async (req, res) => {
  try {
    const { scope, category, source, quantity_kg_co2e, period_start, period_end, verification_status } = req.body;
    if (!scope || quantity_kg_co2e === undefined) {
      return res.status(400).json({ error: 'scope and quantity_kg_co2e are required' });
    }
    const adapter = await getAdapter();
    const record = {
      id: randomUUID(), tenant_id: req.user.tenantId, scope, category: category || null,
      source: source || null, quantity_kg_co2e, period_start: period_start || null,
      period_end: period_end || null, verification_status: verification_status || 'pending',
      created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne('emissions_records', record);
    res.status(201).json({ record });
  } catch (err) {
    logger.error('ESG: create emission error', { error: err.message });
    res.status(500).json({ error: 'Failed to create emissions record' });
  }
});

router.get('/targets', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const targets = await adapter.findMany('esg_targets', { tenant_id: req.user.tenantId });
    res.json({ targets, total: targets.length });
  } catch (err) {
    logger.error('ESG: list targets error', { error: err.message });
    res.status(500).json({ error: 'Failed to list ESG targets' });
  }
});

router.post('/targets', async (req, res) => {
  try {
    const { target_type, baseline_year, target_year, baseline_kg, target_kg, description } = req.body;
    if (!target_type) return res.status(400).json({ error: 'target_type is required' });
    const adapter = await getAdapter();
    const target = {
      id: randomUUID(), tenant_id: req.user.tenantId, target_type,
      baseline_year: baseline_year || null, target_year: target_year || null,
      baseline_kg: baseline_kg || 0, target_kg: target_kg || 0,
      description: description || null,
    };
    await adapter.insertOne('esg_targets', target);
    res.status(201).json({ target });
  } catch (err) {
    logger.error('ESG: create target error', { error: err.message });
    res.status(500).json({ error: 'Failed to create ESG target' });
  }
});

router.get('/targets/:id/progress', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const target = await adapter.findOne('esg_targets', { id: req.params.id, tenant_id: tenantId });
    if (!target) return res.status(404).json({ error: 'ESG target not found' });

    const currentYear = new Date().getFullYear();
    const records = await adapter.findMany('emissions_records', { tenant_id: tenantId });
    const yearRecords = records.filter(r => r.period_start && new Date(r.period_start).getFullYear() === currentYear);
    const current_kg = yearRecords.reduce((sum, r) => sum + (Number(r.quantity_kg_co2e) || 0), 0);
    const baseline_kg = Number(target.baseline_kg) || 0;
    const target_kg = Number(target.target_kg) || 0;
    const denominator = baseline_kg - target_kg;
    const percent_achieved = denominator !== 0 ? ((baseline_kg - current_kg) / denominator) * 100 : 0;

    res.json({
      current_kg, target_kg, baseline_kg,
      percent_achieved: +percent_achieved.toFixed(2),
      on_track: current_kg <= target_kg,
    });
  } catch (err) {
    logger.error('ESG: target progress error', { error: err.message });
    res.status(500).json({ error: 'Failed to get target progress' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const adapter = await getAdapter();
    const reports = await adapter.findMany('esg_reports', { tenant_id: req.user.tenantId });
    res.json({ reports, total: reports.length });
  } catch (err) {
    logger.error('ESG: list reports error', { error: err.message });
    res.status(500).json({ error: 'Failed to list ESG reports' });
  }
});

router.post('/reports', async (req, res) => {
  try {
    const { framework, period_start, period_end, status, sections } = req.body;
    if (!framework) return res.status(400).json({ error: 'framework is required' });
    const adapter = await getAdapter();
    const report = {
      id: randomUUID(), tenant_id: req.user.tenantId, framework,
      period_start: period_start || null, period_end: period_end || null,
      status: status || 'draft', sections: sections || {},
      created_by: req.user.userId, created_at: new Date(),
    };
    await adapter.insertOne('esg_reports', report);
    res.status(201).json({ report });
  } catch (err) {
    logger.error('ESG: create report error', { error: err.message });
    res.status(500).json({ error: 'Failed to create ESG report' });
  }
});

// ── Report Generation — GRI / SASB / TCFD ─────────────────────────────────────

/**
 * POST /api/esg/reports/generate
 * Body: { framework: 'GRI'|'SASB'|'TCFD', year?: number }
 *
 * Auto-generates a structured ESG report by pulling emissions data and targets
 * for the specified year, applying the chosen reporting framework's disclosure
 * structure, and persisting the report.
 */
router.post('/reports/generate', async (req, res) => {
  try {
    const { framework, year: yearParam } = req.body;
    if (!['GRI', 'SASB', 'TCFD'].includes(framework)) {
      return res.status(400).json({ error: 'framework must be GRI, SASB, or TCFD' });
    }

    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const year = parseInt(yearParam, 10) || new Date().getFullYear();

    const summary = await summariseEmissions(adapter, tenantId, year);
    const targets = await adapter.findMany('esg_targets', { tenant_id: tenantId });

    let sections;
    switch (framework) {
      case 'GRI':  sections = buildGriSections(summary, targets, year);  break;
      case 'SASB': sections = buildSasbSections(summary, year);          break;
      case 'TCFD': sections = buildTcfdSections(summary, targets, year); break;
    }

    const report = {
      id: randomUUID(),
      tenant_id: tenantId,
      framework,
      reporting_year: year,
      period_start: `${year}-01-01`,
      period_end: `${year}-12-31`,
      status: 'draft',
      sections,
      emissions_summary: summary,
      generated_at: new Date().toISOString(),
      created_by: req.user.userId,
      created_at: new Date(),
    };

    await adapter.insertOne('esg_reports', report);

    logger.info('ESG: generated report', { framework, year, tenantId });
    res.status(201).json({ report });
  } catch (err) {
    logger.error('ESG: generate report error', { error: err.message });
    res.status(500).json({ error: 'Failed to generate ESG report' });
  }
});

// ── Scope 3 Supply Chain Calculation ──────────────────────────────────────────

/**
 * POST /api/esg/scope3/calculate
 * Body: { spend_by_category: { purchased_goods: 50000, business_travel: 10000, … }, year? }
 *
 * Calculates estimated Scope 3 emissions by applying spend-based emission factors
 * to provided spend data per category (15 GHG Protocol Scope 3 categories).
 * Also stores an emissions record per category.
 */
router.post('/scope3/calculate', async (req, res) => {
  try {
    const { spend_by_category, year: yearParam, persist = true } = req.body;
    if (!spend_by_category || typeof spend_by_category !== 'object') {
      return res.status(400).json({ error: 'spend_by_category object is required' });
    }

    const adapter = await getAdapter();
    const tenantId = req.user.tenantId;
    const year = parseInt(yearParam, 10) || new Date().getFullYear();
    const periodStart = `${year}-01-01`;
    const periodEnd = `${year}-12-31`;

    const breakdown = [];
    let totalKg = 0;

    for (const [category, spend] of Object.entries(spend_by_category)) {
      const factor = SCOPE3_FACTORS[category];
      if (factor === undefined) continue;
      const spendNum = Number(spend) || 0;
      const quantity_kg = +(spendNum * factor).toFixed(2);
      totalKg += quantity_kg;
      breakdown.push({ category, spend: spendNum, factor, quantity_kg_co2e: quantity_kg });

      if (persist && quantity_kg > 0) {
        const record = {
          id: randomUUID(), tenant_id: tenantId, scope: 3, category,
          source: 'spend_based_estimation', quantity_kg_co2e: quantity_kg,
          period_start: periodStart, period_end: periodEnd,
          verification_status: 'estimated', created_by: req.user.userId, created_at: new Date(),
        };
        await adapter.insertOne('emissions_records', record);
      }
    }

    const unknown_categories = Object.keys(spend_by_category).filter(k => SCOPE3_FACTORS[k] === undefined);

    res.json({
      year,
      total_scope3_kg: +totalKg.toFixed(2),
      total_scope3_tonnes: kgToTonnes(totalKg),
      breakdown,
      unknown_categories,
      available_categories: Object.keys(SCOPE3_FACTORS),
      persisted: persist,
      methodology: 'EPA EEIO spend-based emission factors',
    });
  } catch (err) {
    logger.error('ESG: scope3 calculate error', { error: err.message });
    res.status(500).json({ error: 'Failed to calculate Scope 3 emissions' });
  }
});

export default router;
