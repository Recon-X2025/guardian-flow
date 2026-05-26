import { router } from "../trpc.js";
import { authRouter } from "./auth.js";
import { workOrdersRouter } from "./workOrders.js";
import { iotRouter } from "./iot.js";
import { flowspaceRouter } from "./flowspace.js";
import { dexRouter } from "./dex.js";

export const appRouter = router({
  auth: authRouter,
  workOrders: workOrdersRouter,
  iot: iotRouter,
  flowspace: flowspaceRouter,
  dex: dexRouter,
});

export type AppRouter = typeof appRouter;
