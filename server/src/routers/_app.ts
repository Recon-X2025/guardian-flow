import { router } from "../trpc.js";
import { authRouter } from "./auth.js";
import { workOrdersRouter } from "./workOrders.js";
import { iotRouter } from "./iot.js";

export const appRouter = router({
  auth: authRouter,
  workOrders: workOrdersRouter,
  iot: iotRouter,
});

export type AppRouter = typeof appRouter;
