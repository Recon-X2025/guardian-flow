#!/usr/bin/env node
/**
 * MongoDB migration runner — Phase 0 + Phase 1 collections
 * Creates indexes for all new collections introduced in the Master Execution Plan.
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://vivekkumar787067_db_user:Vivek09876@cluster0.xdkbkkd.mongodb.net/';
const DB_NAME = process.env.DB_NAME || 'guardianflow';

async function runMigrations() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log('Connected to MongoDB');

    const migrationsApplied = await db.collection('schema_migrations').find({}).toArray();
    const appliedVersions = new Set(migrationsApplied.map(m => m.version));

    const migrations = [
      {
        version: '003_phase0_workflow_tables',
        description: 'Create indexes for Phase 0 workflow, developer portal, marketplace, and platform collections',
        run: async () => {
          // workflow_templates
          await db.collection('workflow_templates').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('workflow_templates').createIndex({ name: 1, tenant_id: 1 }, { unique: true, sparse: true }).catch(() => {});

          // workflow_executions
          await db.collection('workflow_executions').createIndex({ workflow_template_id: 1 }).catch(() => {});
          await db.collection('workflow_executions').createIndex({ status: 1 }).catch(() => {});
          await db.collection('workflow_executions').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('workflow_executions').createIndex({ created_at: -1 }).catch(() => {});

          // workflow_template_versions
          await db.collection('workflow_template_versions').createIndex({ template_id: 1, version: 1 }, { unique: true }).catch(() => {});

          // developer_portal_accounts
          await db.collection('developer_portal_accounts').createIndex({ user_id: 1 }, { unique: true }).catch(() => {});
          await db.collection('developer_portal_accounts').createIndex({ tenant_id: 1 }).catch(() => {});

          // partner_api_keys
          await db.collection('partner_api_keys').createIndex({ key_hash: 1 }, { unique: true }).catch(() => {});
          await db.collection('partner_api_keys').createIndex({ partner_id: 1 }).catch(() => {});
          await db.collection('partner_api_keys').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }).catch(() => {});

          // federated_learning_models
          await db.collection('federated_learning_models').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('federated_learning_models').createIndex({ status: 1 }).catch(() => {});

          // developer_training_jobs
          await db.collection('developer_training_jobs').createIndex({ model_id: 1 }).catch(() => {});
          await db.collection('developer_training_jobs').createIndex({ status: 1 }).catch(() => {});
          await db.collection('developer_training_jobs').createIndex({ tenant_id: 1 }).catch(() => {});

          // model_performance_metrics
          await db.collection('model_performance_metrics').createIndex({ model_id: 1 }).catch(() => {});
          await db.collection('model_performance_metrics').createIndex({ recorded_at: -1 }).catch(() => {});

          // compliance_policies
          await db.collection('compliance_policies').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('compliance_policies').createIndex({ policy_type: 1 }).catch(() => {});

          // compliance_audit_trails
          await db.collection('compliance_audit_trails').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('compliance_audit_trails').createIndex({ created_at: -1 }).catch(() => {});
          await db.collection('compliance_audit_trails').createIndex({ entity_type: 1, entity_id: 1 }).catch(() => {});

          // marketplace_extensions
          await db.collection('marketplace_extensions').createIndex({ partner_id: 1 }).catch(() => {});
          await db.collection('marketplace_extensions').createIndex({ category: 1 }).catch(() => {});
          await db.collection('marketplace_extensions').createIndex({ status: 1 }).catch(() => {});

          // extension_installations
          await db.collection('extension_installations').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('extension_installations').createIndex({ extension_id: 1 }).catch(() => {});

          // marketplace_transactions
          await db.collection('marketplace_transactions').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('marketplace_transactions').createIndex({ created_at: -1 }).catch(() => {});

          // marketplace_analytics
          await db.collection('marketplace_analytics').createIndex({ extension_id: 1 }).catch(() => {});
          await db.collection('marketplace_analytics').createIndex({ extension_id: 1, date: 1 }, { unique: true }).catch(() => {});

          // api_usage_analytics
          await db.collection('api_usage_analytics').createIndex({ tenant_id: 1, period_start: -1 }).catch(() => {});
          await db.collection('api_usage_analytics').createIndex({ endpoint: 1 }).catch(() => {});

          // system_health_metrics
          await db.collection('system_health_metrics').createIndex({ service_name: 1 }).catch(() => {});
          await db.collection('system_health_metrics').createIndex({ recorded_at: -1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }).catch(() => {});

          // platform_configurations
          await db.collection('platform_configurations').createIndex({ key: 1 }, { unique: true }).catch(() => {});
          await db.collection('platform_configurations').createIndex({ tenant_id: 1 }).catch(() => {});

          // developer_webhooks
          await db.collection('developer_webhooks').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('developer_webhooks').createIndex({ event_type: 1 }).catch(() => {});

          // webhook_deliveries
          await db.collection('webhook_deliveries').createIndex({ webhook_id: 1 }).catch(() => {});
          await db.collection('webhook_deliveries').createIndex({ created_at: -1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }).catch(() => {});
          await db.collection('webhook_deliveries').createIndex({ status: 1 }).catch(() => {});
        },
      },
      {
        version: '004_phase1_telemetry',
        description: 'Create indexes for Phase 1 telemetry, analytics, and seed metadata collections',
        run: async () => {
          // function_telemetry
          await db.collection('function_telemetry').createIndex({ function_name: 1, created_at: -1 }).catch(() => {});
          await db.collection('function_telemetry').createIndex({ tenant_id: 1, created_at: -1 }).catch(() => {});
          await db.collection('function_telemetry').createIndex({ security_level: 1, created_at: -1 }).catch(() => {});
          await db.collection('function_telemetry').createIndex({ created_at: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }).catch(() => {});

          // analytics_events
          await db.collection('analytics_events').createIndex({ tenant_id: 1, created_at: -1 }).catch(() => {});
          await db.collection('analytics_events').createIndex({ event_type: 1, created_at: -1 }).catch(() => {});
          await db.collection('analytics_events').createIndex({ event_category: 1, created_at: -1 }).catch(() => {});
          await db.collection('analytics_events').createIndex({ created_at: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }).catch(() => {});

          // analytics_hourly_aggregates
          await db.collection('analytics_hourly_aggregates').createIndex({ tenant_id: 1, hour_start: -1, event_type: 1 }, { unique: true }).catch(() => {});

          // seed_metadata
          await db.collection('seed_metadata').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('seed_metadata').createIndex({ seed_type: 1 }).catch(() => {});
        },
      },
      {
        version: '005_phase1_security',
        description: 'Create indexes for Phase 1 security events, OAuth, MFA, frontend errors, and tracing collections',
        run: async () => {
          // security_events
          await db.collection('security_events').createIndex({ tenant_id: 1, created_at: -1 }).catch(() => {});
          await db.collection('security_events').createIndex({ severity: 1 }).catch(() => {});
          await db.collection('security_events').createIndex({ event_type: 1 }).catch(() => {});
          await db.collection('security_events').createIndex({ created_at: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }).catch(() => {});

          // oauth_providers
          await db.collection('oauth_providers').createIndex({ tenant_id: 1, provider: 1 }, { unique: true }).catch(() => {});
          await db.collection('oauth_providers').createIndex({ enabled: 1 }).catch(() => {});

          // user_mfa_settings
          await db.collection('user_mfa_settings').createIndex({ user_id: 1 }, { unique: true }).catch(() => {});

          // frontend_errors
          await db.collection('frontend_errors').createIndex({ tenant_id: 1, created_at: -1 }).catch(() => {});
          await db.collection('frontend_errors').createIndex({ severity: 1 }).catch(() => {});
          await db.collection('frontend_errors').createIndex({ created_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }).catch(() => {});

          // api_usage_metrics
          await db.collection('api_usage_metrics').createIndex({ tenant_id: 1, period_start: -1 }).catch(() => {});
          await db.collection('api_usage_metrics').createIndex({ endpoint: 1, period_start: -1 }).catch(() => {});

          // rate_limit_config
          await db.collection('rate_limit_config').createIndex({ tenant_id: 1, endpoint_pattern: 1 }, { unique: true }).catch(() => {});

          // trace_spans
          await db.collection('trace_spans').createIndex({ trace_id: 1 }).catch(() => {});
          await db.collection('trace_spans').createIndex({ tenant_id: 1, created_at: -1 }).catch(() => {});
          await db.collection('trace_spans').createIndex({ created_at: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }).catch(() => {});
        },
      },
      {
        version: '006_phase1_assets_compliance',
        description: 'Create indexes for Phase 1 asset management and compliance framework collections',
        run: async () => {
          // assets
          await db.collection('assets').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('assets').createIndex({ asset_number: 1 }, { unique: true }).catch(() => {});
          await db.collection('assets').createIndex({ status: 1 }).catch(() => {});
          await db.collection('assets').createIndex({ warranty_expiry: 1 }).catch(() => {});

          // asset_lifecycle_events
          await db.collection('asset_lifecycle_events').createIndex({ asset_id: 1, event_date: -1 }).catch(() => {});
          await db.collection('asset_lifecycle_events').createIndex({ event_type: 1 }).catch(() => {});

          // compliance_frameworks
          await db.collection('compliance_frameworks').createIndex({ framework_name: 1, version: 1 }, { unique: true }).catch(() => {});
          await db.collection('compliance_frameworks').createIndex({ active: 1 }).catch(() => {});

          // compliance_controls
          await db.collection('compliance_controls').createIndex({ framework_id: 1 }).catch(() => {});
          await db.collection('compliance_controls').createIndex({ control_id: 1 }).catch(() => {});

          // compliance_evidence
          await db.collection('compliance_evidence').createIndex({ tenant_id: 1 }).catch(() => {});
          await db.collection('compliance_evidence').createIndex({ control_id: 1 }).catch(() => {});
          await db.collection('compliance_evidence').createIndex({ evidence_date: -1 }).catch(() => {});
        },
      },
      {
        version: '007_phase2_customer_partner',
        description: 'Create indexes for Phase 2 SLA predictions, customer portal, partner, and offline queue collections',
        run: async () => {
          // sla_predictions
          await db.collection('sla_predictions').createIndex({ work_order_id: 1 }).catch(() => {});
          await db.collection('sla_predictions').createIndex({ breach_probability: -1 }).catch(() => {});

          // sla_alerts
          await db.collection('sla_alerts').createIndex({ work_order_id: 1 }).catch(() => {});
          await db.collection('sla_alerts').createIndex({ escalated_to: 1 }).catch(() => {});
          await db.collection('sla_alerts').createIndex({ created_at: -1 }).catch(() => {});

          // customer_portal_users
          await db.collection('customer_portal_users').createIndex({ customer_id: 1 }).catch(() => {});
          await db.collection('customer_portal_users').createIndex({ user_id: 1 }, { unique: true }).catch(() => {});

          // portal_activity
          await db.collection('portal_activity').createIndex({ customer_id: 1, created_at: -1 }).catch(() => {});
          await db.collection('portal_activity').createIndex({ user_id: 1 }).catch(() => {});

          // partners
          await db.collection('partners').createIndex({ partner_type: 1 }).catch(() => {});
          await db.collection('partners').createIndex({ status: 1 }).catch(() => {});
          await db.collection('partners').createIndex({ api_key_hash: 1 }, { unique: true, sparse: true }).catch(() => {});

          // partner_api_usage
          await db.collection('partner_api_usage').createIndex({ partner_id: 1, created_at: -1 }).catch(() => {});
          await db.collection('partner_api_usage').createIndex({ endpoint: 1 }).catch(() => {});

          // offline_queue
          await db.collection('offline_queue').createIndex({ user_id: 1, synced: 1 }).catch(() => {});
          await db.collection('offline_queue').createIndex({ created_at: 1 }).catch(() => {});
        },
      },
      {
        version: '008_phase3_workforce',
        description: 'Create indexes for Phase 3 workforce scheduling collections',
        run: async () => {
          // technician_availability
          await db.collection('technician_availability').createIndex({ technician_id: 1, date: 1 }, { unique: true }).catch(() => {});

          // scheduling_recommendations
          await db.collection('scheduling_recommendations').createIndex({ work_order_id: 1 }).catch(() => {});
          await db.collection('scheduling_recommendations').createIndex({ recommended_technician_id: 1 }).catch(() => {});
        },
      },
      {
        version: '009_phase4_bi',
        description: 'Create indexes for Phase 4 business intelligence connector collections',
        run: async () => {
          // bi_connectors
          await db.collection('bi_connectors').createIndex({ tenant_id: 1, connector_type: 1 }).catch(() => {});
        },
      },
      {
        version: '010_phase5_global',
        description: 'Create indexes for Phase 5 globalization and localization collections',
        run: async () => {
          // tenant_localization
          await db.collection('tenant_localization').createIndex({ tenant_id: 1 }, { unique: true }).catch(() => {});

          // translations
          await db.collection('translations').createIndex({ key: 1, locale: 1 }, { unique: true }).catch(() => {});
        },
      },
      {
        version: '011_sprint1_flowspace_dex_sso',
        description: 'Create indexes for Sprint 1: FlowSpace decision_records, DEX execution_contexts, and SSO sso_configs collections',
        run: async () => {
          // ── decision_records (FlowSpace) ───────────────────────────────────
          // Primary access pattern: tenant + domain + timestamp (ledger view)
          await db.collection('decision_records').createIndex(
            { tenant_id: 1, domain: 1, created_at: -1 },
          ).catch(() => {});
          // Secondary: tenant + entity (WO-scoped record lookup)
          await db.collection('decision_records').createIndex(
            { tenant_id: 1, entity_type: 1, entity_id: 1, created_at: -1 },
          ).catch(() => {});
          // Lineage walk: follow lineage_parent_id chains
          await db.collection('decision_records').createIndex(
            { tenant_id: 1, lineage_parent_id: 1 },
          ).catch(() => {});
          // Actor filter
          await db.collection('decision_records').createIndex(
            { tenant_id: 1, actor_type: 1, actor_id: 1 },
          ).catch(() => {});
          // Unique record lookup
          await db.collection('decision_records').createIndex({ id: 1 }, { unique: true }).catch(() => {});
          // TTL: retain 7 years for EU AI Act Art. 13 compliance (never auto-delete by default)
          // Note: index expiry intentionally NOT set — retention managed by data governance policy

          // ── execution_contexts (DEX) ───────────────────────────────────────
          // Active context dashboard: tenant + stage
          await db.collection('execution_contexts').createIndex(
            { tenant_id: 1, current_stage: 1, updated_at: -1 },
          ).catch(() => {});
          // Entity lookup: find context for a given WO/invoice/etc.
          await db.collection('execution_contexts').createIndex(
            { tenant_id: 1, entity_type: 1, entity_id: 1 },
          ).catch(() => {});
          // Flow ID lookup
          await db.collection('execution_contexts').createIndex(
            { tenant_id: 1, flow_id: 1 },
          ).catch(() => {});
          // Unique context lookup
          await db.collection('execution_contexts').createIndex({ id: 1 }, { unique: true }).catch(() => {});

          // ── sso_configs ───────────────────────────────────────────────────
          // One SSO config per tenant
          await db.collection('sso_configs').createIndex(
            { tenant_id: 1 },
            { unique: true },
          ).catch(() => {});
          // Protocol filter (find tenants using SAML vs OIDC)
          await db.collection('sso_configs').createIndex({ protocol: 1, enabled: 1 }).catch(() => {});
        },
      },
      {
        version: '012_sprint2_currency',
        description: 'Create exchange_rates collection and indexes; add currency field indexes on financial collections',
        async run() {
          // ── exchange_rates ────────────────────────────────────────────────
          // Primary lookup: base + target rate for a given date
          await db.collection('exchange_rates').createIndex(
            { base: 1, target: 1, date: -1 },
          ).catch(() => {});

          // ── currency field indexes on financial collections ────────────────
          // Fast currency-filtered queries on invoices
          await db.collection('invoices').createIndex({ currency: 1 }).catch(() => {});
          // Fast currency-filtered queries on payments
          await db.collection('payments').createIndex({ currency: 1 }).catch(() => {});
          // Fast currency-filtered queries on quotes
          await db.collection('quotes').createIndex({ currency: 1 }).catch(() => {});
        },
      },
    ];

    for (const migration of migrations) {
      if (appliedVersions.has(migration.version)) {
        console.log(`Skipping ${migration.version} (already applied)`);
        continue;
      }

      console.log(`Applying ${migration.version}: ${migration.description}...`);
      try {
        await migration.run();
        await db.collection('schema_migrations').insertOne({
          version: migration.version,
          description: migration.description,
          applied_at: new Date(),
        });
        console.log(`Applied ${migration.version}`);
      } catch (err) {
        console.error(`Error applying ${migration.version}:`, err.message);
        throw err;
      }
    }

    console.log('All migrations applied');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

runMigrations();
