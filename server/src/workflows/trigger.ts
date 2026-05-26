import { Connection, Client } from "@temporalio/client";
import { woLifecycleWorkflow } from "./woLifecycle.js";
import { telemetryIngestionWorkflow } from "./telemetryIngestion.js";

export async function startWorkOrderLifecycle(woId: string, tenantId: string) {
  // Connect to local Temporal server
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
  });
  
  const client = new Client({
    connection,
  });

  await client.workflow.start(woLifecycleWorkflow, {
    taskQueue: "work-order-tasks",
    workflowId: `wo-lifecycle-${woId}`,
    args: [woId, tenantId],
  });
  
  console.log(`[Temporal Client] Successfully scheduled SLA tracking workflow for Work Order ${woId}`);
}

export async function startTelemetryIngestion(
  tenantId: string,
  reading: { device_id: string; metric: string; value: number; unit?: string; timestamp?: string }
) {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
  });
  
  const client = new Client({
    connection,
  });

  await client.workflow.start(telemetryIngestionWorkflow, {
    taskQueue: "work-order-tasks",
    workflowId: `telemetry-ingestion-${reading.device_id}-${Date.now()}`,
    args: [tenantId, reading],
  });
  
  console.log(`[Temporal Client] Successfully scheduled Telemetry Ingestion workflow for Device ${reading.device_id}`);
}

