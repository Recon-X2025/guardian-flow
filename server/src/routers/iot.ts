import { z } from "zod";
import { router, tenantProcedure } from "../trpc.js";
import { startTelemetryIngestion } from "../workflows/trigger.js";

export const iotRouter = router({
  ingestReading: tenantProcedure
    .input(
      z.object({
        device_id: z.string(),
        metric: z.string(),
        value: z.number(),
        unit: z.string().optional(),
        timestamp: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Trigger Temporal telemetry ingestion workflow
      await startTelemetryIngestion(ctx.tenantId, input);
      return { success: true };
    }),
});
