import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities.js";

const { processTelemetry } = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
});

export async function telemetryIngestionWorkflow(
  tenantId: string,
  reading: { device_id: string; metric: string; value: number; unit?: string; timestamp?: string }
): Promise<string> {
  await processTelemetry(tenantId, reading);
  return `Telemetry from device ${reading.device_id} processed successfully`;
}
