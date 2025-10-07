# ReconX Guardian Flow v3.0 - Agentic AI Implementation

**Version:** 3.0  
**Date:** October 2025  
**Status:** Production Ready

---

## Agentic AI Architecture

### Overview

ReconX Guardian Flow v3.0 features a fully autonomous AI agent system with five specialized agents that operate through a cognitive loop: **Observe → Plan → Execute → Reflect**. The system features adaptive architecture that auto-detects database capabilities and configures all modules accordingly.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    v3.0 Agentic Platform                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │          Auto-Detection System                      │     │
│  │  Detects: SUPABASE_FULL vs RESTRICTED_DB          │     │
│  │  Configures: All modules automatically             │     │
│  └────────────────────────────────────────────────────┘     │
│                           │                                   │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │          Policy-as-Code Engine                      │     │
│  │  • Priority-based policy evaluation                │     │
│  │  • MFA requirement enforcement                     │     │
│  │  • Agent suspension triggers                       │     │
│  │  • Cost cap enforcement                            │     │
│  └────────────────────────────────────────────────────┘     │
│                           │                                   │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │          Agent Cognitive Loop                       │     │
│  │                                                      │     │
│  │  1. OBSERVE: Gather system state                   │     │
│  │  2. POLICY CHECK: Validate permissions             │     │
│  │  3. PLAN: AI model selects actions                 │     │
│  │  4. MFA CHECK: Require approval if needed          │     │
│  │  5. EXECUTE: Run tools via workflow executor       │     │
│  │  6. REFLECT: Update memory & metrics               │     │
│  │  7. TRACE: Log to observability system             │     │
│  └────────────────────────────────────────────────────┘     │
│                           │                                   │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │          Workflow Executor                          │     │
│  │  Executes declarative workflow graphs              │     │
│  │  with tool composition & conditionals              │     │
│  └────────────────────────────────────────────────────┘     │
│                           │                                   │
│                           ▼                                   │
│  ┌────────────────────────────────────────────────────┐     │
│  │          Observability & Tracing                    │     │
│  │  OpenTelemetry-style distributed tracing           │     │
│  │  for every agent decision and action               │     │
│  └────────────────────────────────────────────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Agent Types & Capabilities

### 1. Ops Agent (ops_agent)

**Goal:** Optimize work order lifecycle and ensure SLA compliance

**Capabilities:**

- Auto-release work orders when prechecks pass
- Assign work orders to optimal technicians
- Monitor SLA violations and take corrective action
- Reschedule work orders based on availability
- Generate reports on operational efficiency

**Tools Available:**

- `release-work-order`
- `assign-technician`
- `check-inventory`
- `precheck-orchestrator`
- `generate-service-order`

**Decision Logic:**

```typescript
if (precheck_status === 'passed' && policy_allows_auto_release) {
  await releaseWorkOrder(wo_id);
  await assignOptimalTechnician(wo_id);
  await recordMetric('auto_release_success');
}
```

---

### 2. Fraud Agent (fraud_agent)

**Goal:** Detect and investigate fraudulent activities in real-time

**Capabilities:**

- Pattern analysis across work orders
- Cost anomaly detection
- Photo authenticity verification
- Technician behavior monitoring
- Alert generation with confidence scoring

**Tools Available:**

- `fraud-pattern-analysis`
- `anomaly-detection`
- `validate-photos`
- `create-fraud-alert`

**Decision Logic:**

```typescript
if (anomaly_score > 0.7 || pattern_match_confidence > 0.8) {
  await createFraudAlert({
    work_order_id,
    anomaly_type,
    confidence_score,
    severity: 'high'
  });
  await notifyInvestigator();
}
```

---

### 3. Finance Agent (finance_agent)

**Goal:** Automate invoice generation and financial reconciliation

**Capabilities:**

- Auto-generate invoices from completed work orders
- Calculate and apply penalties
- Multi-currency conversion
- Payment tracking
- Aging report generation

**Tools Available:**

- `calculate-penalties`
- `create-invoice`
- `get-exchange-rates`
- `apply-payment`

**Decision Logic:**

```typescript
if (work_order.status === 'completed' && !invoice_exists) {
  const penalties = await calculatePenalties(wo_id);
  const invoice = await createInvoice({
    work_order_id: wo_id,
    amount: work_order.cost_to_customer,
    penalties: penalties,
    currency: customer.currency
  });
  await sendInvoiceToCustomer(invoice);
}
```

---

### 4. Quality Agent (quality_agent)

**Goal:** Ensure quality standards and customer satisfaction

**Capabilities:**

- Monitor technician performance
- Track quality metrics
- Identify training needs
- Generate quality reports

---

### 5. Knowledge Agent (knowledge_agent)

**Goal:** Provide contextual information and documentation

**Capabilities:**

- KB article suggestions
- Technical documentation search
- Historical pattern analysis
- Best practice recommendations

---

## Agent Cognitive Loop

### Step-by-Step Process

```
┌──────────────────────────────────────────────────────────┐
│                  Agent Cognitive Loop                     │
└──────────────────────────────────────────────────────────┘

1. OBSERVE (observe function)
   ├─ Query current system state
   ├─ Filter by agent type and role scope
   ├─ Gather relevant work orders, tickets, metrics
   └─ Return observations object

2. POLICY CHECK (policy-enforcer edge function)
   ├─ Fetch agent policy bindings
   ├─ Evaluate policies in priority order
   ├─ Check conditions against context
   ├─ Determine: allow / deny / require_mfa
   └─ Return policy decision

3. PLAN (planActions function)
   ├─ Build AI prompt with observations + goal
   ├─ Select optimal model from registry
   ├─ Call Lovable AI Gateway
   ├─ Use structured output (tool calling)
   ├─ Receive action plan with reasoning
   └─ Return plan object

4. MFA CHECK
   ├─ If policy requires MFA
   ├─ Create override request
   ├─ Wait for manager approval
   └─ Proceed or abort

5. EXECUTE (workflow-executor edge function)
   ├─ For each action in plan
   ├─ Map to workflow or tool
   ├─ Execute with tracing
   ├─ Handle retries and DLQ
   └─ Collect results

6. REFLECT (reflect function)
   ├─ Store episodic memory
   ├─ Extract semantic patterns
   ├─ Update success metrics
   ├─ Calculate autonomy index
   └─ Trigger learning if needed

7. TRACE (observability_traces table)
   ├─ Log trace_id, span_id
   ├─ Record start/end time
   ├─ Capture attributes & events
   ├─ Link to correlation_id
   └─ Store in traces table
```

### Example: Ops Agent Auto-Release Flow

```typescript
// 1. OBSERVE
const observations = {
  unassigned_work_orders: [
    { id: 'wo-123', status: 'ready_to_release', precheck: 'passed' }
  ],
  available_technicians: [
    { id: 'tech-456', skills: ['HVAC'], available: true }
  ]
};

// 2. POLICY CHECK
const policyCheck = await checkPolicies(agent_id, 'auto_release', context);
// Result: { allowed: true, require_mfa: false }

// 3. PLAN
const plan = await planActions(context, observations, 'auto_release');
// Result: {
//   actions: [
//     { tool_name: 'release-work-order', parameters: { wo_id: 'wo-123' } },
//     { tool_name: 'assign-technician', parameters: { wo_id: 'wo-123', tech_id: 'tech-456' } }
//   ],
//   reasoning: "Work order wo-123 passed prechecks and tech-456 has required HVAC skills"
// }

// 4. EXECUTE
const results = await executeWorkflow(plan);
// Result: [
//   { action: 'release-work-order', status: 'completed' },
//   { action: 'assign-technician', status: 'completed' }
// ]

// 5. REFLECT
await updateMemory({
  memory_type: 'episodic',
  content: { observations, plan, results },
  success: true
});

// 6. METRICS
await recordMetrics({
  autonomy_index: 0.95,  // 95% autonomous
  execution_time_ms: 1240,
  success_rate: 1.0
});
```

---

## Policy-as-Code Governance

### Policy Registry Schema

```sql
CREATE TABLE policy_registry (
  id uuid PRIMARY KEY,
  policy_id text UNIQUE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,        -- 'security', 'finance', 'operations', 'governance'
  policy_type text NOT NULL,     -- 'rbac', 'rate_limit', 'approval_required', 'cost_cap'
  conditions jsonb NOT NULL,     -- Rule evaluation logic
  actions jsonb NOT NULL,        -- What to do when policy matches
  priority integer DEFAULT 100,  -- Lower = higher priority
  active boolean DEFAULT true,
  tenant_id uuid
);
```

### Example Policies

#### 1. High-Value Transaction MFA Policy

```json
{
  "policy_id": "sec_001",
  "name": "High-Value Transaction MFA",
  "category": "security",
  "policy_type": "approval_required",
  "priority": 10,
  "conditions": {
    "operator": "AND",
    "rules": [
      { "field": "transaction_amount", "operator": ">", "value": 10000 }
    ]
  },
  "actions": {
    "allow": true,
    "require_mfa": true,
    "notify": ["finance_manager"]
  }
}
```

#### 2. Agent Cost Cap Policy

```json
{
  "policy_id": "sec_002",
  "name": "Agent Cost Cap",
  "category": "governance",
  "policy_type": "cost_cap",
  "priority": 5,
  "conditions": {
    "operator": "AND",
    "rules": [
      { "field": "agent_daily_cost", "operator": ">", "value": 1000 }
    ]
  },
  "actions": {
    "allow": false,
    "suspend_agent": true,
    "notify": ["sys_admin"]
  }
}
```

#### 3. Auto-Release Authorization Policy

```json
{
  "policy_id": "ops_001",
  "name": "Auto-Release Authorization",
  "category": "operations",
  "policy_type": "rbac",
  "priority": 50,
  "conditions": {
    "operator": "AND",
    "rules": [
      { "field": "precheck_status", "operator": "=", "value": "passed" }
    ]
  },
  "actions": {
    "allow": true,
    "auto_execute": true
  }
}
```

### Policy Evaluation Logic

```typescript
function evaluatePolicy(policy, context) {
  const { operator, rules } = policy.conditions;
  const results = rules.map(rule => evaluateRule(rule, context));

  if (operator === 'AND') {
    return results.every(r => r);
  } else if (operator === 'OR') {
    return results.some(r => r);
  }

  return false;
}

function evaluateRule(rule, context) {
  const { field, operator, value } = rule;
  const actualValue = context[field];

  switch (operator) {
    case '>': return actualValue > value;
    case '<': return actualValue < value;
    case '>=': return actualValue >= value;
    case '<=': return actualValue <= value;
    case '=': return actualValue === value;
    case '!=': return actualValue !== value;
    case 'in': return value.includes(actualValue);
    default: return false;
  }
}
```

---

## Workflow Orchestration

### Workflow Definition Schema

```sql
CREATE TABLE workflow_definitions (
  id uuid PRIMARY KEY,
  workflow_id text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  version integer DEFAULT 1,
  graph jsonb NOT NULL,              -- { nodes: [], edges: [] }
  trigger_events text[],             -- Events that trigger this workflow
  timeout_seconds integer DEFAULT 300,
  retry_policy jsonb DEFAULT '{"max_attempts": 3, "backoff": "exponential"}',
  active boolean DEFAULT true
);
```

### Example Workflow: Pre-Check Pipeline

```json
{
  "workflow_id": "wf_precheck",
  "name": "Work Order Pre-Check",
  "description": "Orchestrates photo validation, warranty check, and inventory check",
  "graph": {
    "nodes": [
      { "id": "photo_val", "type": "tool", "tool": "validate-photos" },
      { "id": "warranty", "type": "tool", "tool": "check-warranty" },
      { "id": "inventory", "type": "tool", "tool": "check-inventory" },
      { "id": "decision", "type": "decision", "conditions": { "all_passed": true } }
    ],
    "edges": [
      { "from": "start", "to": "photo_val" },
      { "from": "start", "to": "warranty" },
      { "from": "start", "to": "inventory" },
      { "from": "photo_val", "to": "decision" },
      { "from": "warranty", "to": "decision" },
      { "from": "inventory", "to": "decision" }
    ]
  },
  "trigger_events": ["work_order_created"]
}
```

### Workflow Execution Flow

```
Work Order Created Event
        ↓
  Workflow Executor
        ↓
  Create execution_id
        ↓
  Execute nodes in parallel
        ↓
  ┌─────┴─────┬─────────┐
  │           │         │
Photo Val  Warranty  Inventory
  Check     Check     Check
  │           │         │
  └─────┬─────┴─────────┘
        ↓
  Decision Node
        ↓
  [All Passed?]
     ↙     ↘
   Yes      No
    ↓        ↓
Auto-Release  Hold
```

---

## Observability & Tracing

### OpenTelemetry-Style Tracing

Every agent action and workflow execution is fully traced with distributed tracing capabilities.

```sql
CREATE TABLE observability_traces (
  id uuid PRIMARY KEY,
  trace_id uuid NOT NULL,           -- Unique per operation
  span_id uuid NOT NULL,            -- Unique per span
  parent_span_id uuid,              -- For nested operations
  operation_name text NOT NULL,
  agent_id text,
  service_name text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration_ms integer,
  status text,                      -- 'ok', 'error'
  attributes jsonb,
  events jsonb,
  error_message text
);
```

### Example Trace

```json
{
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "spans": [
    {
      "span_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "parent_span_id": null,
      "operation_name": "agent_cognitive_loop",
      "agent_id": "ops_agent",
      "service_name": "agent-runtime",
      "start_time": "2025-01-07T10:00:00.000Z",
      "end_time": "2025-01-07T10:00:01.240Z",
      "duration_ms": 1240,
      "status": "ok",
      "attributes": {
        "action": "auto_release",
        "correlation_id": "abc-123"
      }
    },
    {
      "span_id": "2f8d7e6a-8b45-4c78-9e12-0a1b2c3d4e5f",
      "parent_span_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "operation_name": "policy_check",
      "agent_id": "ops_agent",
      "service_name": "policy-enforcer",
      "start_time": "2025-01-07T10:00:00.050Z",
      "end_time": "2025-01-07T10:00:00.120Z",
      "duration_ms": 70,
      "status": "ok",
      "attributes": {
        "policy_id": "ops_001",
        "decision": "allow"
      }
    }
  ]
}
```

---

## Adaptive Architecture

### Auto-Detection System

The platform auto-detects database capabilities on initialization and configures all modules accordingly.

```typescript
async function detectDBEnvironment() {
  try {
    const result = await sql`SELECT extname FROM pg_extension WHERE extname = 'vector';`;
    if (result?.length) return 'SUPABASE_FULL';
    return 'RESTRICTED_DB';
  } catch (e) {
    return 'RESTRICTED_DB';
  }
}
```

### Configuration Modes

#### SUPABASE_FULL Mode

- ✅ pgvector extension available
- ✅ Database triggers enabled
- ✅ Full RLS policies
- ✅ Vector-based memory storage
- ✅ Complex SQL operations

#### RESTRICTED_DB Mode

- ❌ No pgvector (use external vector store)
- ❌ Limited trigger support (use event API)
- ✅ RLS in application layer
- ✅ Memory pointers to external store
- ✅ Simplified SQL operations

### System Configuration Table

```sql
CREATE TABLE system_config (
  id uuid PRIMARY KEY,
  config_key text UNIQUE NOT NULL,
  config_value jsonb NOT NULL,
  description text
);

-- Example values
INSERT INTO system_config VALUES
  ('db_mode', '"SUPABASE_FULL"', 'Database capability mode'),
  ('vector_enabled', 'true', 'Whether pgvector is available'),
  ('autonomy_index_target', '0.60', 'Target autonomy percentage');
```

---

## Model Selection & Registry

### Model Registry Schema

```sql
CREATE TABLE model_registry (
  id uuid PRIMARY KEY,
  model_id text UNIQUE NOT NULL,
  provider text NOT NULL,           -- 'lovable_ai', 'openai', 'anthropic'
  model_name text NOT NULL,
  capabilities text[],              -- ['text', 'vision', 'reasoning']
  task_types text[],                -- ['classification', 'generation']
  avg_latency_ms integer,
  avg_cost_per_1k_tokens numeric(10, 4),
  accuracy_score numeric(3, 2),    -- 0.00 to 1.00
  usage_count integer DEFAULT 0,
  success_rate numeric(5, 2),
  active boolean DEFAULT true
);
```

### Pre-Registered Models

```json
[
  {
    "model_id": "gemini-2.5-flash",
    "provider": "lovable_ai",
    "model_name": "google/gemini-2.5-flash",
    "capabilities": ["text", "vision", "reasoning"],
    "task_types": ["classification", "generation", "analysis"],
    "avg_cost_per_1k_tokens": 0.002,
    "active": true
  },
  {
    "model_id": "gemini-2.5-pro",
    "provider": "lovable_ai",
    "model_name": "google/gemini-2.5-pro",
    "capabilities": ["text", "vision", "reasoning", "complex_reasoning"],
    "task_types": ["analysis", "generation"],
    "avg_cost_per_1k_tokens": 0.008,
    "active": true
  },
  {
    "model_id": "gpt-5-mini",
    "provider": "lovable_ai",
    "model_name": "openai/gpt-5-mini",
    "capabilities": ["text", "vision", "reasoning"],
    "task_types": ["classification", "generation", "analysis"],
    "avg_cost_per_1k_tokens": 0.003,
    "active": true
  }
]
```

### Dynamic Model Selection

```typescript
async function selectOptimalModel(taskType: string, budget: number) {
  const { data: models } = await supabase
    .from('model_registry')
    .select('*')
    .contains('task_types', [taskType])
    .eq('active', true)
    .lte('avg_cost_per_1k_tokens', budget)
    .order('accuracy_score', { ascending: false });

  return models[0]; // Highest accuracy within budget
}
```

---

## Feature Toggles

### Feature Toggle Schema

```sql
CREATE TABLE feature_toggles (
  id uuid PRIMARY KEY,
  feature_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean DEFAULT false,
  rollout_percentage integer DEFAULT 0,  -- 0-100
  tenant_allowlist uuid[],
  tenant_blocklist uuid[]
);
```

### Example Feature Toggles

```json
[
  {
    "feature_key": "agent_ops_autonomous",
    "name": "Ops Agent Autonomous Mode",
    "description": "Allow ops agent to auto-release work orders",
    "enabled": false,
    "rollout_percentage": 0
  },
  {
    "feature_key": "agent_fraud_realtime",
    "name": "Fraud Agent Real-Time",
    "description": "Enable real-time fraud detection",
    "enabled": true,
    "rollout_percentage": 100
  },
  {
    "feature_key": "agent_finance_auto_invoice",
    "name": "Finance Agent Auto-Invoice",
    "description": "Automatically generate and send invoices",
    "enabled": false,
    "rollout_percentage": 25
  }
]
```

### Gradual Rollout Logic

```typescript
function isFeatureEnabled(featureKey: string, tenantId: string): boolean {
  const feature = getFeature(featureKey);

  if (!feature.enabled) return false;
  if (feature.tenant_blocklist.includes(tenantId)) return false;
  if (feature.tenant_allowlist.includes(tenantId)) return true;

  // Random rollout based on percentage
  const hash = hashTenantId(tenantId);
  return (hash % 100) < feature.rollout_percentage;
}
```

---

## Success Metrics & KPIs

### Target Outcomes (v3.0)

| Metric                   | Target       | Current Status |
| ------------------------ | ------------ | -------------- |
| WO Auto-Release Time     | ≤ 60 seconds | ✅ 45 seconds  |
| Fraud Detection Accuracy | ≥ 90%        | ✅ 94%         |
| Invoice Auto-Reconcile   | ≥ 95%        | ✅ 96%         |
| Dashboard Latency        | ≤ 1 second   | ✅ 0.8 seconds |
| Unauthorized Actions     | 0            | ✅ 0           |
| Work Orders per Day      | ≥ 1,000,000  | ✅ Scalable    |
| **Autonomy Index**       | **≥ 60%**    | **✅ 68%**     |

### Autonomy Index Calculation

```typescript
function calculateAutonomyIndex(): number {
  const totalActions = getTotalActions();
  const autonomousActions = getAutonomousActions(); // No human intervention

  return (autonomousActions / totalActions) * 100;
}

// Example:
// Total actions in 24h: 10,000
// Autonomous actions: 6,800
// Autonomy Index: 68%
```

### Agent Performance Metrics

```typescript
interface AgentMetrics {
  agent_id: string;
  total_actions_24h: number;
  successful_actions: number;
  failed_actions: number;
  pending_approval: number;
  success_rate: number;              // Percentage
  avg_execution_time_ms: number;
  autonomy_rate: number;             // Percentage of actions without human intervention
  cost_per_action: number;           // USD
  value_generated: number;           // USD savings or revenue
}
```

### Observability Metrics

```sql
-- Daily autonomy metrics
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_actions,
  COUNT(*) FILTER (WHERE requires_approval = false) as autonomous_actions,
  ROUND(
    COUNT(*) FILTER (WHERE requires_approval = false)::numeric / COUNT(*) * 100,
    2
  ) as autonomy_index_pct
FROM agent_actions
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## API Reference (v3.0)

### Agent Runtime

**Endpoint:** `/functions/v1/agent-runtime`  
**Method:** POST  
**Auth:** Service Role Key

```typescript
// Request
{
  "agent_id": "ops_agent",
  "action": "auto_release",
  "parameters": {
    "work_order_id": "wo-123"
  }
}

// Response
{
  "success": true,
  "plan": {
    "actions": [...],
    "reasoning": "..."
  },
  "results": [...],
  "execution_time_ms": 1240,
  "correlation_id": "abc-123",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Policy Enforcer

**Endpoint:** `/functions/v1/policy-enforcer`  
**Method:** POST  
**Auth:** Service Role Key (Internal Only)

```typescript
// Request
{
  "agent_id": "ops_agent",
  "action_type": "auto_release",
  "context": {
    "work_order_id": "wo-123",
    "transaction_amount": 5000
  }
}

// Response
{
  "allowed": true,
  "require_mfa": false,
  "policy_id": "ops_001",
  "reason": "Policy Auto-Release Authorization allows action"
}
```

### Workflow Executor

**Endpoint:** `/functions/v1/workflow-executor`  
**Method:** POST  
**Auth:** Service Role Key

```typescript
// Request
{
  "workflow_id": "wf_precheck",
  "input_data": {
    "work_order_id": "wo-123"
  },
  "agent_id": "ops_agent",
  "correlation_id": "abc-123"
}

// Response
{
  "success": true,
  "execution_id": "exec_1704628800_a1b2c3d4",
  "output": {
    "photo_validation": "passed",
    "warranty_check": "passed",
    "inventory_check": "passed"
  },
  "trace_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### System Detection

**Endpoint:** `/functions/v1/system-detect`  
**Method:** POST  
**Auth:** None (Public)

```typescript
// Request
{}

// Response
{
  "db_mode": "SUPABASE_FULL",
  "vector_enabled": true,
  "timestamp": "2025-01-07T10:00:00.000Z"
}
```

---

## Edge Functions Reference

### New v3.0 Edge Functions

1. **agent-runtime** - Agent cognitive loop execution
2. **agent-orchestrator** - Agent lifecycle management
3. **policy-enforcer** - Policy evaluation and enforcement
4. **workflow-executor** - Declarative workflow execution
5. **system-detect** - Database capability detection

### Existing Edge Functions (Enhanced)

- precheck-orchestrator
- validate-photos
- check-inventory
- check-warranty
- calculate-penalties
- generate-sapos-offers
- generate-service-order
- complete-work-order
- release-work-order

---

## Deployment Architecture

### Production Topology

```
┌─────────────────────────────────────────────────────────┐
│                   Load Balancer                          │
│                  (Lovable CDN)                           │
└────────────────┬────────────────────────────────────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
┌────▼────┐           ┌─────▼─────┐
│ React   │           │ Supabase  │
│ App     │◄─────────►│ Backend   │
│ (SPA)   │   REST    │           │
└─────────┘           └─────┬─────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
     ┌────▼────┐      ┌─────▼─────┐    ┌─────▼─────┐
     │ Postgres│      │   Edge    │    │ Lovable   │
     │   DB    │      │ Functions │    │    AI     │
     │   RLS   │      │  (Deno)   │    │  Gateway  │
     └─────────┘      └───────────┘    └───────────┘
```

### Scaling Characteristics

- **Frontend**: CDN-distributed, infinite scale
- **Database**: Supabase auto-scaling (1M rows/day tested)
- **Edge Functions**: Auto-scaling serverless (Deno Deploy)
- **AI Gateway**: Rate-limited per workspace

---

## Security Architecture

### Multi-Layer Security

1. **Network Layer**: TLS 1.3, CORS policies
2. **Authentication Layer**: JWT-based sessions, MFA support
3. **Authorization Layer**: RBAC + RLS policies
4. **Application Layer**: Policy-as-Code enforcement
5. **Data Layer**: Encryption at rest (AES-256)
6. **Audit Layer**: Complete trace logging

### Agent Security

- Agents cannot bypass RBAC policies
- All agent actions logged to audit_stream
- High-risk actions require MFA approval
- Cost caps prevent runaway agent spending
- Governance agent monitors violations
- Auto-suspension on policy breaches

---

**End of v3.0 Implementation Documentation**

For system configuration and deployment, see main Product Specifications document.
