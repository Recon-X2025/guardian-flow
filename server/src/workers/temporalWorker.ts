import { Worker } from "@temporalio/worker";
import * as activities from "../workflows/activities.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function run() {
  const worker = await Worker.create({
    workflowsPath: join(__dirname, "../workflows/workflows.js"),
    activities,
    taskQueue: "work-order-tasks",
  });

  console.log("✅ Temporal Worker running successfully on taskQueue: 'work-order-tasks'...");
  await worker.run();
}

run().catch((err) => {
  console.error("❌ Temporal Worker startup failed:", err);
  process.exit(1);
});
