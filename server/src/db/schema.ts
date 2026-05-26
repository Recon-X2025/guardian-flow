import { pgTable, uuid, text, timestamp, boolean, jsonb, index, uniqueIndex, pgEnum, numeric } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role_type", ["sys_admin", "tenant_admin", "user", "technician", "customer"]);
export const dexStateEnum = pgEnum("dex_state", ["initialized", "scoring", "verifying", "completed", "failed"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  active: boolean("active").default(true).notNull(),
  tenantId: uuid("tenant_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  tenantId: uuid("tenant_id"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  tenantEmailIdx: uniqueIndex("tenant_email_idx").on(t.tenantId, t.email),
}));

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull(), // 'admin', 'manager', 'technician', 'customer'
  tenantId: uuid("tenant_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdRoleIdx: index("user_id_role_idx").on(t.userId, t.role),
}));

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authAuditLogs = pgTable("auth_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id"),
  userId: uuid("user_id").notNull(),
  email: text("email").notNull(),
  event: text("event").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workOrders = pgTable("work_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  priority: text("priority").notNull().default("medium"),
  description: text("description"),
  technicianId: uuid("technician_id"),
  tenantId: uuid("tenant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const decisionRecords = pgTable("decision_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  domain: text("domain").notNull(),
  actorType: text("actor_type").notNull().default("human"),
  actorId: uuid("actor_id").notNull(),
  action: text("action").notNull(),
  rationale: text("rationale"),
  context: jsonb("context"),
  constraints: jsonb("constraints"),
  alternatives: jsonb("alternatives"),
  confidenceScore: numeric("confidence_score"),
  modelVersion: text("model_version"),
  priorState: jsonb("prior_state"),
  newState: jsonb("new_state"),
  parentDecisionId: uuid("parent_decision_id"),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  outcome: jsonb("outcome"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  tenantIdx: index("flowspace_tenant_idx").on(t.tenantId),
  lineageIdx: index("flowspace_lineage_idx").on(t.parentDecisionId),
  entityIdx: index("flowspace_entity_idx").on(t.entityType, t.entityId),
}));

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  event: text("event").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dexContexts = pgTable("dex_contexts", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull(),
  flowId: text("flow_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  state: text("state").default("created").notNull(),
  payload: jsonb("payload"),
  score: numeric("score"),
  activeActors: jsonb("active_actors").default("[]").notNull(),
  executionTrace: jsonb("execution_trace").default("[]").notNull(),
  governanceHooks: jsonb("governance_hooks").default("[]").notNull(),
  checkpoints: jsonb("checkpoints").default("[]").notNull(),
  metadata: jsonb("metadata").default("{}").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const dexSignals = pgTable("dex_signals", {
  id: uuid("id").defaultRandom().primaryKey(),
  contextId: uuid("context_id").notNull(),
  metric: text("metric").notNull(),
  value: numeric("value").notNull(),
  observedAt: timestamp("observed_at").defaultNow().notNull(),
});
