import { createTRPCRouter } from "./create-context";
import { exampleRouter } from "./routes/example";
import { paymentRouter } from "./routes/payment";

export const appRouter = createTRPCRouter({
  example: exampleRouter,
  payment: paymentRouter,
});

export type AppRouter = typeof appRouter;
