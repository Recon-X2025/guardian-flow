/**
 * @file server/services/ai/agent.js
 * @description Agentic AI service — autonomous agents that drive DEX ExecutionContexts.
 *
 * Architecture
 * ────────────
 * An Agent receives a Goal (natural language + structured payload), decomposes it
 * into a sequence of tool calls, executes them, and records every decision in FlowSpace.
 * Agents operate within a DEX ExecutionContext and advance its stage when milestones occur.
 *
 * Tool registry (built-in agent capabilities)
 * ──────────────────────────────────────────
 *  schedule_job          — call the AI scheduler for a set of work orders
 *  assign_work_order     — assign a WO to a technician
 *  create_work_order     — create a new work order
 *  calculate_tax         — calculate tax for an invoice
 *  recognise_revenue     — trigger period-end revenue recognition
 *  generate_invoice      — generate a subscription invoice
 *  query_assets          — list assets matching criteria
 *  query_work_orders     — list WOs matching filter
 *  advance_dex_context   — advance a DEX ExecutionContext stage
 *  write_flowspace       — write a decision record to FlowSpace
 *
 * Agent loop (max MAX_TURNS turns to prevent infinite loops)
 * ──────────────────────────────────────────────────────────
 * 1. Send goal + available tools to LLM (GPT-4o / mock)
 * 2. If LLM returns tool_calls → execute each tool → append result to context
 * 3. If LLM returns text finish → treat as final answer
 * 4. Repeat up to MAX_TURNS
 *
 * All tool executions are appended to an execution trace stored with the agent run.
 */

import { randomUUID } from 'crypto';
import { getAdapter } from '../../db/factory.js';
import { writeDecisionRecord } from '../flowspace.js';
import logger from '../../utils/logger.js';

const MAX_TURNS = 10;
const AGENT_COLLECTION = 'agent_runs';

// ── Tool definitions ──────────────────────────────────────────────────────────

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'schedule_job',
      description: 'Run the AI scheduling engine for a date to optimally assign work orders to technicians',
      parameters: {
        type: 'object',
        properties: { date: { type: 'string', description: 'ISO date YYYY-MM-DD' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_work_order',
      description: 'Assign a specific work order to a technician',
      parameters: {
        type: 'object',
        properties: {
          work_order_id: { type: 'string' },
          technician_id: { type: 'string' },
        },
        required: ['work_order_id', 'technician_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_work_orders',
      description: 'Query work orders with a filter',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          priority: { type: 'string' },
          limit: { type: 'integer' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_assets',
      description: 'Query assets with a filter',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          limit: { type: 'integer' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'advance_dex_context',
      description: 'Advance a DEX ExecutionContext to the next stage',
      parameters: {
        type: 'object',
        properties: {
          context_id: { type: 'string' },
          target_stage: { type: 'string', enum: ['assigned', 'in_progress', 'pending_review', 'completed', 'closed', 'failed'] },
          reason: { type: 'string' },
        },
        required: ['context_id', 'target_stage'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_flowspace',
      description: 'Write a decision record to the FlowSpace immutable ledger',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: 'What decision was made' },
          rationale: { type: 'string', description: 'Why this decision was made' },
        },
        required: ['action', 'rationale'],
      },
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(toolName, args, context) {
  const { tenantId, dexContextId, agentRunId } = context;
  const adapter = await getAdapter();

  switch (toolName) {
    case 'schedule_job': {
      const { optimizeSchedule } = await import('./scheduler.js');
      const result = await optimizeSchedule(tenantId, args.date ?? null);
      return { scheduled: result.assignmentsCount, unscheduled: result.unscheduledCount, runId: result.runId };
    }

    case 'assign_work_order': {
      await adapter.updateOne('work_orders', { id: args.work_order_id, tenant_id: tenantId }, {
        technician_id: args.technician_id,
        status: 'assigned',
        updated_at: new Date().toISOString(),
      });
      return { assigned: true, work_order_id: args.work_order_id };
    }

    case 'query_work_orders': {
      const filter = { tenant_id: tenantId };
      if (args.status) filter.status = args.status;
      if (args.priority) filter.priority = args.priority;
      const wos = await adapter.findMany('work_orders', filter, { limit: args.limit ?? 20, sort: { created_at: -1 } });
      return { work_orders: wos.map(w => ({ id: w.id, title: w.title, status: w.status, priority: w.priority })), count: wos.length };
    }

    case 'query_assets': {
      const filter = { tenant_id: tenantId };
      if (args.status) filter.status = args.status;
      const assets = await adapter.findMany('assets', filter, { limit: args.limit ?? 20 });
      return { assets: assets.map(a => ({ id: a.id, name: a.name, status: a.status })), count: assets.length };
    }

    case 'advance_dex_context': {
      const ctx = await adapter.findOne('execution_contexts', { id: args.context_id, tenant_id: tenantId });
      if (!ctx) return { error: 'Context not found' };
      await adapter.updateOne('execution_contexts', { id: args.context_id }, {
        stage: args.target_stage,
        updated_at: new Date().toISOString(),
      });
      return { advanced: true, context_id: args.context_id, new_stage: args.target_stage };
    }

    case 'write_flowspace': {
      await writeDecisionRecord({
        tenantId,
        domain: 'agentic_ai',
        actorType: 'agent',
        actorId: agentRunId,
        action: args.action,
        resourceType: 'agent_run',
        resourceId: agentRunId,
        rationale: args.rationale,
      });
      return { written: true };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ── LLM helper (GPT-4o function calling) ─────────────────────────────────────

async function callLLM(messages) {
  if (!process.env.OPENAI_API_KEY) {
    return mockAgentResponse(messages);
  }

  const body = {
    model: 'gpt-4o',
    messages,
    tools: TOOL_DEFINITIONS,
    tool_choice: 'auto',
    max_tokens: 1024,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  const json = await response.json();
  return json.choices[0].message;
}

function mockAgentResponse(messages) {
  const lastMsg = messages[messages.length - 1]?.content ?? '';
  const lower = lastMsg.toLowerCase();

  // Decide which tool to call based on keywords
  if (lower.includes('schedule') || lower.includes('assign')) {
    return {
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: randomUUID(),
        type: 'function',
        function: { name: 'schedule_job', arguments: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }) },
      }],
    };
  }
  if (lower.includes('work order') || lower.includes('workorder')) {
    return {
      role: 'assistant',
      content: null,
      tool_calls: [{
        id: randomUUID(),
        type: 'function',
        function: { name: 'query_work_orders', arguments: JSON.stringify({ status: 'released', limit: 10 }) },
      }],
    };
  }
  // Default: provide a summary answer
  return {
    role: 'assistant',
    content: `Mock agent: I have processed your request "${lastMsg.slice(0, 80)}". All actions completed successfully. No further tool calls needed.`,
    tool_calls: undefined,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Run an autonomous agent to achieve a goal.
 *
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} params.goal — natural language goal
 * @param {object} [params.payload] — structured context passed to agent
 * @param {string} [params.dexContextId] — optional DEX context to operate within
 * @param {string} [params.actorId] — user or system ID that triggered the agent
 * @returns {Promise<AgentRunResult>}
 */
export async function runAgent({ tenantId, goal, payload = {}, dexContextId = null, actorId = 'system' }) {
  const agentRunId = randomUUID();
  const startedAt = new Date().toISOString();
  const adapter = await getAdapter();
  const trace = [];

  logger.info('agent: starting run', { agentRunId, tenantId, goal: goal.slice(0, 80) });

  const systemPrompt = [
    'You are an autonomous field-service management agent for Guardian Flow.',
    'You have access to tools for scheduling, work orders, assets, DEX context management, and decision recording.',
    'Your goal is to fulfil the user\'s request using the minimum necessary tool calls.',
    'Always write a FlowSpace decision record after completing a significant action.',
    'When you have completed the goal, provide a concise summary as your final message.',
  ].join(' ');

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        `Goal: ${goal}`,
        payload && Object.keys(payload).length ? `Context: ${JSON.stringify(payload)}` : '',
        dexContextId ? `DEX Context ID: ${dexContextId}` : '',
      ].filter(Boolean).join('\n'),
    },
  ];

  const agentContext = { tenantId, dexContextId, agentRunId };
  let finalAnswer = '';
  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;
    let assistantMsg;
    try {
      assistantMsg = await callLLM(messages);
    } catch (err) {
      logger.warn('agent: LLM call failed', { error: err.message, turn: turns });
      finalAnswer = `Agent error at turn ${turns}: ${err.message}`;
      break;
    }

    messages.push(assistantMsg);

    // No tool calls → done
    if (!assistantMsg.tool_calls?.length) {
      finalAnswer = assistantMsg.content ?? '';
      break;
    }

    // Execute each tool call
    for (const tc of assistantMsg.tool_calls) {
      let toolArgs;
      try {
        toolArgs = JSON.parse(tc.function.arguments ?? '{}');
      } catch {
        toolArgs = {};
      }

      const traceEntry = {
        turn: turns,
        tool: tc.function.name,
        args: toolArgs,
        started_at: new Date().toISOString(),
      };

      let toolResult;
      try {
        toolResult = await executeTool(tc.function.name, toolArgs, agentContext);
        traceEntry.result = toolResult;
        traceEntry.status = 'success';
      } catch (err) {
        toolResult = { error: err.message };
        traceEntry.result = toolResult;
        traceEntry.status = 'error';
        logger.warn('agent: tool execution error', { tool: tc.function.name, error: err.message });
      }

      traceEntry.finished_at = new Date().toISOString();
      trace.push(traceEntry);

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  const finishedAt = new Date().toISOString();

  // Persist agent run
  const agentRun = {
    id: agentRunId,
    tenant_id: tenantId,
    actor_id: actorId,
    goal,
    payload,
    dex_context_id: dexContextId,
    final_answer: finalAnswer,
    trace,
    turns_used: turns,
    status: turns >= MAX_TURNS ? 'max_turns_exceeded' : 'completed',
    started_at: startedAt,
    finished_at: finishedAt,
  };

  try {
    await adapter.insertOne(AGENT_COLLECTION, agentRun);
  } catch (e) {
    logger.warn('agent: failed to persist run', { error: e.message });
  }

  // Write a FlowSpace decision for the run itself
  try {
    await writeDecisionRecord({
      tenantId,
      domain: 'agentic_ai',
      actorType: 'agent',
      actorId: agentRunId,
      action: 'agent_run_complete',
      resourceType: 'agent_run',
      resourceId: agentRunId,
      rationale: `Agent completed goal "${goal.slice(0, 100)}" in ${turns} turn(s). Tools used: ${[...new Set(trace.map(t => t.tool))].join(', ') || 'none'}.`,
      metadata: { turns_used: turns, tools_called: trace.length },
    });
  } catch (e) {
    logger.warn('agent: flowspace write error', { error: e.message });
  }

  logger.info('agent: run complete', { agentRunId, turns, status: agentRun.status });
  return agentRun;
}
