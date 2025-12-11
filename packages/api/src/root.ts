import { authRouter } from "./router/auth";
import { categoryRouter } from "./router/category";
import { postRouter } from "./router/post";
import { taskRouter } from "./router/task";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  category: categoryRouter,
  post: postRouter,
  task: taskRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
