import { authRouter } from "./router/auth";
import { categoryRouter } from "./router/category";
import { musicLeagueRouter } from "./router/music-league";
import { notificationRouter } from "./router/notification";
import { postRouter } from "./router/post";
import { syncRouter } from "./router/sync";
import { taskRouter } from "./router/task";
import { taskListRouter } from "./router/task-list";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  category: categoryRouter,
  musicLeague: musicLeagueRouter,
  notification: notificationRouter,
  post: postRouter,
  sync: syncRouter,
  task: taskRouter,
  taskList: taskListRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
