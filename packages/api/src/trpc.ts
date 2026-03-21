/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1)
 * 2. You want to create a new middleware or type of procedure (see Part 3)
 *
 * tl;dr - this is where all the tRPC server stuff is created and plugged in.
 * The pieces you will need to use are documented accordingly near the end
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod/v4";

import type { Auth } from "@acme/auth";
import { sql } from "@acme/db";
import { db } from "@acme/db/client";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

export const createTRPCContext = async (opts: {
  headers: Headers;
  auth: Auth;
}) => {
  const authApi = opts.auth.api;

  // DEBUG: log what cookies/headers are arriving
  const cookie = opts.headers.get("cookie");
  const expoOrigin = opts.headers.get("expo-origin");
  const trpcSource = opts.headers.get("x-trpc-source");
  console.log(`[AUTH DEBUG] x-trpc-source: ${trpcSource}`);
  console.log(`[AUTH DEBUG] expo-origin: ${expoOrigin}`);
  console.log(`[AUTH DEBUG] cookie present: ${!!cookie}, length: ${cookie?.length ?? 0}`);
  if (cookie) {
    // Log cookie names (not values) for security
    const cookieNames = cookie.split(";").map((c) => c.trim().split("=")[0]).filter(Boolean);
    console.log(`[AUTH DEBUG] cookie names: ${JSON.stringify(cookieNames)}`);
    // Log first 8 chars of each cookie value to identify duplicates/corruption
    const cookiePreviews = cookie.split(";").map((c) => {
      const [name, ...rest] = c.trim().split("=");
      const val = rest.join("=");
      return `${name}=${val?.substring(0, 8)}...`;
    });
    console.log(`[AUTH DEBUG] cookie previews: ${JSON.stringify(cookiePreviews)}`);
    console.log(`[AUTH DEBUG] raw cookie: ${cookie}`);
  }

  const session = await authApi.getSession({
    headers: opts.headers,
  });

  console.log(`[AUTH DEBUG] session result: ${session ? `user=${session.user?.id}, expires=${session.session?.expiresAt}` : "null"}`);

  // If session is null but cookie exists, try to understand why
  if (!session && cookie) {
    // Check if the token exists in DB directly
    const tokenCookie = cookie.split(";").find((c) => c.trim().startsWith("__Secure-better-auth.session_token=") || c.trim().startsWith("better-auth.session_token="));
    if (tokenCookie) {
      const tokenValue = tokenCookie.trim().split("=").slice(1).join("=");
      console.log(`[AUTH DEBUG] token length: ${tokenValue.length}, first8: ${tokenValue.substring(0, 8)}`);
      // Direct DB lookup
      try {
        const dbSession = await db.execute(
          sql`SELECT id, "userId", "expiresAt", substring(token, 1, 8) as token_prefix FROM session WHERE token = ${tokenValue}`
        );
        console.log(`[AUTH DEBUG] direct DB lookup rows: ${dbSession.rowCount}, result: ${JSON.stringify(dbSession.rows?.[0] ?? "no rows")}`);
        // Also count total sessions
        const totalSessions = await db.execute(sql`SELECT count(*) as cnt FROM session`);
        console.log(`[AUTH DEBUG] total sessions in DB: ${JSON.stringify(totalSessions.rows?.[0])}`);
      } catch (e) {
        console.log(`[AUTH DEBUG] DB lookup failed: ${e}`);
      }
    }
  }

  return {
    authApi,
    session,
    db,
  };
};
/**
 * 2. INITIALIZATION
 *
 * This is where the trpc api is initialized, connecting the context and
 * transformer
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError
          ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
          : null,
    },
  }),
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these
 * a lot in the /src/server/api/routers folder
 */

/**
 * This is how you create new routers and subrouters in your tRPC API
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an articifial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev 100-500ms
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthed) procedure
 *
 * This is the base piece you use to build new queries and mutations on your
 * tRPC API. It does not guarantee that a user querying is authorized, but you
 * can still access user session data if they are logged in
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
