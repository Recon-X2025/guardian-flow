import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "./activities.js";

const { runDexRecoverySweep } = proxyActivities<typeof activities>({
  startToCloseTimeout: "5 minutes",
});

export async function dexRecoveryWorkflow(): Promise<void> {
  // Continuous sweeper loop
  while (true) {
    try {
      await runDexRecoverySweep();
    } catch (err: any) {
      console.error("DEX Recovery activity error in workflow loop: " + err.message);
    }
    // Poll every 30 seconds
    await sleep("30s");
  }
}
