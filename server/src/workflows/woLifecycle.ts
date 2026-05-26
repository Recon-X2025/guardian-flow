import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "./activities.js";

const { sendSlaAlertEmail } = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
});

export async function woLifecycleWorkflow(woId: string, tenantId: string): Promise<string> {
  // Simulate SLA check timer (30 seconds for local demo purposes)
  await sleep("30s");

  // Fire breach alert activity
  await sendSlaAlertEmail(woId, tenantId);

  return `Work order ${woId} SLA tracking finished`;
}
