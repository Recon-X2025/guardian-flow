/**
 * @file server/routes/subscriptions.js
 * @description Subscription & Recurring Billing routes.
 *
 * Two modes:
 *  stripe  — Stripe Subscriptions + automatic invoice generation (requires STRIPE_SECRET_KEY)
 *  local   — Internal billing engine: plans, subscriptions, billing cycles, auto-generated invoices
 *
 * Endpoints
 * ─────────
 *  Plans (tenant-configurable service packages)
 *   GET    /api/subscriptions/plans               — list plans
 *   POST   /api/subscriptions/plans               — create plan
 *   PUT    /api/subscriptions/plans/:id            — update plan
 *   DELETE /api/subscriptions/plans/:id            — archive plan
 *
 *  Subscriptions
 *   GET    /api/subscriptions                     — list subscriptions for tenant
 *   POST   /api/subscriptions                     — create subscription (Stripe or local)
 *   GET    /api/subscriptions/:id                 — get subscription detail
 *   PUT    /api/subscriptions/:id                 — update subscription (e.g. change plan)
 *   POST   /api/subscriptions/:id/cancel          — cancel subscription (immediate or at period end)
 *   POST   /api/subscriptions/:id/pause           — pause billing
 *   POST   /api/subscriptions/:id/resume          — resume paused subscription
 *
 *  Billing
 *   GET    /api/subscriptions/:id/invoices        — list invoices for a subscription
 *   POST   /api/subscriptions/:id/generate-invoice— manually generate next invoice (local mode)
 *   POST   /api/subscriptions/webhooks/stripe     — Stripe webhook handler
 *   POST   /api/subscriptions/run-billing-cycle   — cron: run billing for all due subscriptions
 */

import express from 'express';
import { randomUUID } from 'crypto';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

function tenantId(req) {
  return req.user?.tenantId ?? req.user?.tenant_id ?? req.user?.id;
}

// ── Stripe helper (lazy-loaded only when keys present) ────────────────────────

let stripeClient = null;
function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const Stripe = require('stripe');
    stripeClient = Stripe(key);
    return stripeClient;
  } catch {
    return null;
  }
}

const BILLING_INTERVALS = ['monthly', 'quarterly', 'annual', 'weekly'];
const SUB_STATUSES = ['active', 'paused', 'cancelled', 'past_due', 'trialing', 'incomplete'];

// ── Plans ─────────────────────────────────────────────────────────────────────

router.get('/plans', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const plans = await adapter.findMany('subscription_plans', {
      tenant_id: tid, archived: { $ne: true },
    }, { sort: { price_amount: 1 } });
    res.json({ plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/plans', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const { name, description, price_amount, currency = 'USD', billing_interval = 'monthly', features = [] } = req.body;
    if (!name || !price_amount) return res.status(400).json({ error: 'name and price_amount are required' });
    if (!BILLING_INTERVALS.includes(billing_interval)) {
      return res.status(400).json({ error: `billing_interval must be one of: ${BILLING_INTERVALS.join(', ')}` });
    }

    // Optionally mirror to Stripe
    let stripe_price_id = null;
    const stripe = getStripe();
    if (stripe) {
      try {
        const stripeProduct = await stripe.products.create({ name, description: description ?? '' });
        const stripePrice = await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: Math.round(price_amount * 100),
          currency: currency.toLowerCase(),
          recurring: { interval: billing_interval === 'monthly' ? 'month' : billing_interval === 'annual' ? 'year' : billing_interval === 'weekly' ? 'week' : 'month' },
        });
        stripe_price_id = stripePrice.id;
      } catch (e) {
        logger.warn('subscriptions: stripe plan creation failed', { error: e.message });
      }
    }

    const now = new Date().toISOString();
    const plan = {
      id: randomUUID(), tenant_id: tid, name, description: description ?? null,
      price_amount, currency, billing_interval, features,
      stripe_price_id, archived: false, created_at: now, updated_at: now,
    };
    await adapter.insertOne('subscription_plans', plan);
    res.status(201).json({ plan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/plans/:id', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const existing = await adapter.findOne('subscription_plans', { id: req.params.id, tenant_id: tid });
    if (!existing) return res.status(404).json({ error: 'Plan not found' });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.tenant_id;
    await adapter.updateOne('subscription_plans', { id: req.params.id }, updates);
    res.json({ plan: { ...existing, ...updates } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/plans/:id', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    await adapter.updateOne('subscription_plans', { id: req.params.id, tenant_id: tid }, { archived: true, updated_at: new Date().toISOString() });
    res.json({ message: 'Plan archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Subscriptions ─────────────────────────────────────────────────────────────

router.get('/', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const { status, customer_id, limit = 50 } = req.query;
    const filter = { tenant_id: tid };
    if (status) filter.status = status;
    if (customer_id) filter.customer_id = customer_id;
    const subs = await adapter.findMany('subscriptions', filter, {
      limit: parseInt(limit), sort: { created_at: -1 },
    });
    res.json({ subscriptions: subs, total: subs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const { plan_id, customer_id, customer_name, customer_email, trial_end, metadata } = req.body;
    if (!plan_id) return res.status(400).json({ error: 'plan_id is required' });

    const plan = await adapter.findOne('subscription_plans', { id: plan_id, tenant_id: tid });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const now = new Date();
    let periodEnd;
    switch (plan.billing_interval) {
      case 'weekly':    periodEnd = new Date(now.getTime() + 7 * 86400000); break;
      case 'quarterly': periodEnd = new Date(now.getTime() + 91 * 86400000); break;
      case 'annual':    periodEnd = new Date(now.getTime() + 365 * 86400000); break;
      default:          periodEnd = new Date(now.getTime() + 30 * 86400000); // monthly
    }

    let stripe_subscription_id = null;
    const stripe = getStripe();
    if (stripe && customer_email && plan.stripe_price_id) {
      try {
        // Create or retrieve Stripe customer
        const customers = await stripe.customers.list({ email: customer_email, limit: 1 });
        const stripeCust = customers.data[0] ?? await stripe.customers.create({ email: customer_email, name: customer_name });
        const stripeSub = await stripe.subscriptions.create({
          customer: stripeCust.id,
          items: [{ price: plan.stripe_price_id }],
          trial_end: trial_end ? Math.floor(new Date(trial_end).getTime() / 1000) : undefined,
        });
        stripe_subscription_id = stripeSub.id;
      } catch (e) {
        logger.warn('subscriptions: stripe subscription creation failed', { error: e.message });
      }
    }

    const sub = {
      id: randomUUID(), tenant_id: tid,
      plan_id, plan_name: plan.name, price_amount: plan.price_amount,
      currency: plan.currency, billing_interval: plan.billing_interval,
      customer_id: customer_id ?? null, customer_name: customer_name ?? null,
      customer_email: customer_email ?? null,
      status: trial_end ? 'trialing' : 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      trial_end: trial_end ?? null,
      cancel_at_period_end: false,
      stripe_subscription_id,
      metadata: metadata ?? {},
      created_at: now.toISOString(), updated_at: now.toISOString(),
    };
    await adapter.insertOne('subscriptions', sub);

    // Auto-generate first invoice in local mode
    if (!stripe_subscription_id) {
      await generateInvoice(adapter, sub, tid);
    }

    logger.info('subscriptions: created', { subId: sub.id, tenantId: tid, planName: plan.name });
    res.status(201).json({ subscription: sub });
  } catch (err) {
    logger.error('subscriptions: create error', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const sub = await adapter.findOne('subscriptions', { id: req.params.id, tenant_id: tid });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    const invoices = await adapter.findMany('subscription_invoices', { subscription_id: req.params.id }, { sort: { created_at: -1 }, limit: 24 });
    res.json({ subscription: sub, invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const existing = await adapter.findOne('subscriptions', { id: req.params.id, tenant_id: tid });
    if (!existing) return res.status(404).json({ error: 'Subscription not found' });
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.id; delete updates.tenant_id;
    await adapter.updateOne('subscriptions', { id: req.params.id }, updates);
    res.json({ subscription: { ...existing, ...updates } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const sub = await adapter.findOne('subscriptions', { id: req.params.id, tenant_id: tid });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    const { at_period_end = true } = req.body;

    const stripe = getStripe();
    if (stripe && sub.stripe_subscription_id) {
      try {
        if (at_period_end) {
          await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
        } else {
          await stripe.subscriptions.cancel(sub.stripe_subscription_id);
        }
      } catch (e) {
        logger.warn('subscriptions: stripe cancel failed', { error: e.message });
      }
    }

    const updates = at_period_end
      ? { cancel_at_period_end: true, updated_at: new Date().toISOString() }
      : { status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() };

    await adapter.updateOne('subscriptions', { id: req.params.id }, updates);
    res.json({ subscription: { ...sub, ...updates } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/pause', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const sub = await adapter.findOne('subscriptions', { id: req.params.id, tenant_id: tid });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    await adapter.updateOne('subscriptions', { id: req.params.id }, {
      status: 'paused', paused_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    res.json({ message: 'Subscription paused' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/resume', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const sub = await adapter.findOne('subscriptions', { id: req.params.id, tenant_id: tid });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    await adapter.updateOne('subscriptions', { id: req.params.id }, {
      status: 'active', paused_at: null, updated_at: new Date().toISOString(),
    });
    res.json({ message: 'Subscription resumed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Billing ───────────────────────────────────────────────────────────────────

router.get('/:id/invoices', authenticateToken, async (req, res) => {
  try {
    const adapter = await getAdapter();
    const invoices = await adapter.findMany('subscription_invoices', { subscription_id: req.params.id }, { sort: { created_at: -1 }, limit: 36 });
    res.json({ invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/generate-invoice', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const sub = await adapter.findOne('subscriptions', { id: req.params.id, tenant_id: tid });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    const invoice = await generateInvoice(adapter, sub, tid);
    res.status(201).json({ invoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stripe Webhook ────────────────────────────────────────────────────────────

router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();

  if (!stripe || !webhookSecret) {
    return res.status(400).json({ error: 'Stripe not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.warn('subscriptions: webhook signature failed', { error: err.message });
    return res.status(400).json({ error: 'Webhook signature failed' });
  }

  const adapter = await getAdapter();

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const inv = event.data.object;
        const sub = await adapter.findOne('subscriptions', { stripe_subscription_id: inv.subscription });
        if (sub) {
          await adapter.insertOne('subscription_invoices', {
            id: randomUUID(),
            tenant_id: sub.tenant_id,
            subscription_id: sub.id,
            stripe_invoice_id: inv.id,
            amount: inv.amount_paid / 100,
            currency: inv.currency.toUpperCase(),
            status: 'paid',
            period_start: new Date(inv.period_start * 1000).toISOString(),
            period_end: new Date(inv.period_end * 1000).toISOString(),
            paid_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
          logger.info('subscriptions: stripe invoice.paid', { subId: sub.id, amount: inv.amount_paid / 100 });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object;
        await adapter.updateOne('subscriptions', { stripe_subscription_id: stripeSub.id }, {
          status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        logger.info('subscriptions: stripe subscription.deleted', { stripeSubId: stripeSub.id });
        break;
      }
      case 'customer.subscription.updated': {
        const stripeSub = event.data.object;
        await adapter.updateOne('subscriptions', { stripe_subscription_id: stripeSub.id }, {
          status: stripeSub.status,
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
        break;
      }
    }
  } catch (err) {
    logger.error('subscriptions: webhook processing error', { error: err.message, type: event.type });
  }

  res.json({ received: true });
});

// ── Cron billing runner ───────────────────────────────────────────────────────

router.post('/run-billing-cycle', authenticateToken, async (req, res) => {
  try {
    const tid = tenantId(req);
    const adapter = await getAdapter();
    const now = new Date();

    // Find all active subscriptions with period_end <= now
    const due = await adapter.findMany('subscriptions', {
      tenant_id: tid,
      status: 'active',
    });

    const processed = [];
    for (const sub of due) {
      if (!sub.current_period_end) continue;
      if (new Date(sub.current_period_end) > now) continue; // not due yet

      // Generate invoice
      const invoice = await generateInvoice(adapter, sub, tid);

      // Advance period
      const nextStart = new Date(sub.current_period_end);
      let nextEnd;
      switch (sub.billing_interval) {
        case 'weekly':    nextEnd = new Date(nextStart.getTime() + 7 * 86400000); break;
        case 'quarterly': nextEnd = new Date(nextStart.getTime() + 91 * 86400000); break;
        case 'annual':    nextEnd = new Date(nextStart.getTime() + 365 * 86400000); break;
        default:          nextEnd = new Date(nextStart.getTime() + 30 * 86400000);
      }
      await adapter.updateOne('subscriptions', { id: sub.id }, {
        current_period_start: nextStart.toISOString(),
        current_period_end: nextEnd.toISOString(),
        updated_at: now.toISOString(),
      });
      processed.push({ subscription_id: sub.id, invoice_id: invoice.id });
    }

    res.json({ processed, count: processed.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Internal: generate invoice ────────────────────────────────────────────────

async function generateInvoice(adapter, sub, tid) {
  const now = new Date().toISOString();
  const invoice = {
    id: randomUUID(),
    tenant_id: tid,
    subscription_id: sub.id,
    plan_id: sub.plan_id,
    plan_name: sub.plan_name,
    customer_id: sub.customer_id ?? null,
    customer_name: sub.customer_name ?? null,
    customer_email: sub.customer_email ?? null,
    amount: sub.price_amount,
    currency: sub.currency,
    status: 'open',
    billing_interval: sub.billing_interval,
    period_start: sub.current_period_start,
    period_end: sub.current_period_end,
    due_date: new Date(Date.now() + 14 * 86400000).toISOString(), // Net-14
    created_at: now,
  };
  await adapter.insertOne('subscription_invoices', invoice);
  logger.info('subscriptions: invoice generated', { invoiceId: invoice.id, subId: sub.id, amount: sub.price_amount });
  return invoice;
}

export default router;
