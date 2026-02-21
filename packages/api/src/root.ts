import { authRouter } from "./router/auth";
import { categoryRouter } from "./router/category";
import { musicLeagueRouter } from "./router/music-league";
import { notificationRouter } from "./router/notification";
import { postRouter } from "./router/post";
import { subtaskRouter } from "./router/subtask";
import { syncRouter } from "./router/sync";
import { taskRouter } from "./router/task";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  category: categoryRouter,
  musicLeague: musicLeagueRouter,
  notification: notificationRouter,
  post: postRouter,
  subtask: subtaskRouter,
  sync: syncRouter,
  task: taskRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
