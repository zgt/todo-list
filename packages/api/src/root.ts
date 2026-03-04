import { authRouter } from "./router/auth";
import { categoryRouter } from "./router/category";
import { moderationRouter } from "./router/moderation";
import { notificationRouter } from "./router/notification";
import { postRouter } from "./router/post";
import { subtaskRouter } from "./router/subtask";
import { syncRouter } from "./router/sync";
import { taskRouter } from "./router/task";
import { taskListRouter } from "./router/task-list";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  category: categoryRouter,
  moderation: moderationRouter,
  notification: notificationRouter,
  post: postRouter,
  subtask: subtaskRouter,
  sync: syncRouter,
  task: taskRouter,
  taskList: taskListRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
