/**
 * @file server/routes/graphql-api.js
 * @description GraphQL endpoint — read-heavy analytics and cross-domain queries.
 *
 * Uses graphql-yoga (lightweight, Express-compatible).
 *
 * Supported queries
 * ─────────────────
 *  revenueStats       — total_recognised, total_deferred, active_contracts, recognition_rate
 *  revenueContracts   — list of revenue contracts (filters: status)
 *  taxHistory         — recent tax calculations for tenant
 *  workOrderStats     — total, open, in_progress, completed counts
 *  workOrders(limit)  — paginated list of work orders
 *  assetStats         — total, active, inactive asset counts
 *  scheduleStats      — upcoming jobs count for next 7 days
 */

import { createYoga, createSchema } from 'graphql-yoga';
import { getAdapter } from '../db/factory.js';
import { authenticateToken } from '../middleware/auth.js';
import express from 'express';

const router = express.Router();

// ── GraphQL schema ────────────────────────────────────────────────────────────

const typeDefs = /* GraphQL */ `
  type RevenueStats {
    total_contract_value: Float!
    total_recognised: Float!
    total_deferred: Float!
    active_contracts: Int!
    recognition_rate: Float!
    due_this_period: Float!
    current_period: String!
  }

  type RevenueContract {
    id: ID!
    customer_name: String
    description: String
    contract_date: String
    currency: String
    total_amount: Float!
    recognised_amount: Float!
    deferred_amount: Float!
    status: String!
  }

  type TaxCalculation {
    id: ID!
    subtotal: Float!
    tax_amount: Float!
    tax_rate: Float!
    provider: String!
    currency: String
    calculated_at: String!
  }

  type WorkOrderStats {
    total: Int!
    open: Int!
    in_progress: Int!
    completed: Int!
    cancelled: Int!
  }

  type WorkOrder {
    id: ID!
    title: String
    status: String
    priority: String
    created_at: String
    updated_at: String
  }

  type AssetStats {
    total: Int!
    active: Int!
    inactive: Int!
    maintenance_due: Int!
  }

  type ScheduleStats {
    upcoming_7_days: Int!
    today: Int!
    overdue: Int!
  }

  type Query {
    revenueStats: RevenueStats
    revenueContracts(status: String, limit: Int): [RevenueContract!]!
    taxHistory(limit: Int): [TaxCalculation!]!
    workOrderStats: WorkOrderStats
    workOrders(limit: Int): [WorkOrder!]!
    assetStats: AssetStats
    scheduleStats: ScheduleStats
  }
`;

function resolvers(req) {
  const tenantId = req.user?.tenantId ?? req.user?.tenant_id ?? req.user?.id;

  return {
    Query: {
      async revenueStats() {
        const adapter = await getAdapter();
        const contracts = await adapter.findMany('revenue_contracts', { tenant_id: tenantId });
        const totalValue      = contracts.reduce((s, c) => s + (c.total_amount ?? 0), 0);
        const totalRecognised = contracts.reduce((s, c) => s + (c.recognised_amount ?? 0), 0);
        const totalDeferred   = contracts.reduce((s, c) => s + (c.deferred_amount ?? 0), 0);
        const activeContracts = contracts.filter(c => c.status === 'active').length;
        const period = new Date().toISOString().slice(0, 7);
        const due = await adapter.findMany('revenue_schedules', { tenant_id: tenantId, period, status: 'pending' });
        const dueAmt = due.reduce((s, r) => s + (r.amount ?? 0), 0);
        return {
          total_contract_value: totalValue,
          total_recognised: totalRecognised,
          total_deferred: totalDeferred,
          active_contracts: activeContracts,
          recognition_rate: totalValue > 0 ? Math.round((totalRecognised / totalValue) * 10000) / 100 : 0,
          due_this_period: dueAmt,
          current_period: period,
        };
      },

      async revenueContracts(_, { status, limit = 50 }) {
        const adapter = await getAdapter();
        const filter = { tenant_id: tenantId };
        if (status) filter.status = status;
        return adapter.findMany('revenue_contracts', filter, { limit, sort: { contract_date: -1 } });
      },

      async taxHistory(_, { limit = 20 }) {
        const adapter = await getAdapter();
        return adapter.findMany('tax_calculations', { tenant_id: tenantId }, { limit, sort: { calculated_at: -1 } });
      },

      async workOrderStats() {
        const adapter = await getAdapter();
        const all = await adapter.findMany('work_orders', { tenant_id: tenantId });
        return {
          total: all.length,
          open: all.filter(w => w.status === 'open').length,
          in_progress: all.filter(w => w.status === 'in_progress').length,
          completed: all.filter(w => w.status === 'completed').length,
          cancelled: all.filter(w => w.status === 'cancelled').length,
        };
      },

      async workOrders(_, { limit = 20 }) {
        const adapter = await getAdapter();
        return adapter.findMany('work_orders', { tenant_id: tenantId }, { limit, sort: { created_at: -1 } });
      },

      async assetStats() {
        const adapter = await getAdapter();
        const all = await adapter.findMany('assets', { tenant_id: tenantId });
        const now = new Date();
        return {
          total: all.length,
          active: all.filter(a => a.status === 'active').length,
          inactive: all.filter(a => a.status !== 'active').length,
          maintenance_due: all.filter(a => {
            if (!a.next_maintenance_date) return false;
            return new Date(a.next_maintenance_date) <= now;
          }).length,
        };
      },

      async scheduleStats() {
        const adapter = await getAdapter();
        const now = new Date();
        const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const today = now.toISOString().slice(0, 10);
        const all = await adapter.findMany('scheduled_jobs', { tenant_id: tenantId });
        return {
          upcoming_7_days: all.filter(j => {
            if (!j.scheduled_at) return false;
            const d = new Date(j.scheduled_at);
            return d >= now && d <= in7;
          }).length,
          today: all.filter(j => j.scheduled_at?.startsWith(today)).length,
          overdue: all.filter(j => {
            if (!j.scheduled_at || j.status === 'completed') return false;
            return new Date(j.scheduled_at) < now;
          }).length,
        };
      },
    },
  };
}

// ── yoga middleware factory ───────────────────────────────────────────────────

function createYogaMiddleware() {
  const yoga = createYoga({
    schema: createSchema({ typeDefs, resolvers: () => ({}) }),
    plugins: [],
    context: (ctx) => ({ ...ctx }),
    graphqlEndpoint: '/api/graphql',
    landingPage: true,
    logging: false,
  });
  return yoga;
}

// Mount with auth middleware + dynamic resolver injection
router.use(authenticateToken, (req, res, next) => {
  const dynamicSchema = createSchema({ typeDefs, resolvers: resolvers(req) });
  const yoga = createYoga({
    schema: dynamicSchema,
    context: { req },
    graphqlEndpoint: '/api/graphql',
    landingPage: process.env.NODE_ENV !== 'production',
    logging: false,
  });

  // graphql-yoga handles the request
  yoga(req, res, next);
});

export default router;
