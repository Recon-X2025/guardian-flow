import { z } from "zod";
import { randomUUID } from "crypto";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure } from "../trpc.js";
import { workOrders as workOrdersTable } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export const workOrdersRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(workOrdersTable)
      .where(eq(workOrdersTable.tenantId, ctx.tenantId));
  }),

  get: tenantProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [wo] = await ctx.db
        .select()
        .from(workOrdersTable)
        .where(
          and(
            eq(workOrdersTable.id, input.id),
            eq(workOrdersTable.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!wo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work order not found",
        });
      }

      return wo;
    }),

  create: tenantProcedure
    .input(
      z.object({
        title: z.string().min(1),
        priority: z.string().optional(),
        description: z.string().optional(),
        technicianId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const woId = randomUUID();
      const [newWo] = await ctx.db
        .insert(workOrdersTable)
        .values({
          id: woId,
          title: input.title,
          priority: input.priority || "medium",
          description: input.description || null,
          technicianId: input.technicianId || null,
          tenantId: ctx.tenantId,
          status: "open",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Trigger Temporal workflow in background
      import("../workflows/trigger.js")
        .then(({ startWorkOrderLifecycle }) => startWorkOrderLifecycle(woId, ctx.tenantId))
        .catch((err) => {
          console.error("Failed to start Temporal workflow: " + err.message);
        });

      return newWo;
    }),

  updateStatus: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [updatedWo] = await ctx.db
        .update(workOrdersTable)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(workOrdersTable.id, input.id),
            eq(workOrdersTable.tenantId, ctx.tenantId)
          )
        )
        .returning();

      if (!updatedWo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Work order not found",
        });
      }

      return updatedWo;
    }),
});
