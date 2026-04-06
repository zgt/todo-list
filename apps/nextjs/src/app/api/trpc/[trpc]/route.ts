import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";

/**
 * Configure basic CORS headers
 * You should extend this to match your needs
 */
const setCorsHeaders = (res: Response) => {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Request-Method", "*");
  res.headers.set("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
  res.headers.set("Access-Control-Allow-Headers", "*");
};

export const OPTIONS = () => {
  const response = new Response(null, {
    status: 204,
  });
  setCorsHeaders(response);
  return response;
};

/**
 * Coalesce concurrent getSession calls for the same session token.
 * When Better Auth refreshes a session (past updateAge), it rotates the token
 * in the DB — invalidating the old one. Without coalescing, concurrent requests
 * with the same old token would fail because only the first call finds the token.
 *
 * By sharing one Promise per token, all concurrent requests get the same session
 * result and the same Set-Cookie header with the new token.
 */
const pendingSessionResolves = new Map<
  string,
  Promise<{ response: Awaited<ReturnType<typeof auth.api.getSession>>; headers: Headers }>
>();

function extractSessionToken(headers: Headers): string | null {
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  // Better Auth stores the session token in a cookie named "better-auth.session_token"
  const match = cookie.match(/better-auth\.session_token=([^;]+)/);
  return match?.[1]?.trim() ?? null;
}

async function resolveSessionCoalesced(
  reqHeaders: Headers,
): Promise<{ response: Awaited<ReturnType<typeof auth.api.getSession>>; headers: Headers }> {
  const token = extractSessionToken(reqHeaders);

  // No token → no session, skip coalescing
  if (!token) {
    const result = await auth.api.getSession({
      headers: reqHeaders,
      returnHeaders: true,
    });
    return result;
  }

  // If another request is already resolving this exact token, reuse its result
  const pending = pendingSessionResolves.get(token);
  if (pending) return pending;

  const promise = auth.api
    .getSession({ headers: reqHeaders, returnHeaders: true })
    .finally(() => {
      // Clean up after resolution so future requests (with new token) aren't stale
      pendingSessionResolves.delete(token);
    });

  pendingSessionResolves.set(token, promise);
  return promise;
}

const handler = async (req: NextRequest) => {
  // Pre-resolve the session with returnHeaders so we can capture Set-Cookie
  // headers from Better Auth's session token refresh (updateAge). Without this,
  // the refreshed token is written to the DB but never sent to the client,
  // causing 401 loops after updateAge (24h) on Expo.
  //
  // Coalesced so concurrent requests with the same token share one DB call,
  // avoiding races where the first call rotates the token and the rest fail.
  const authResult = await resolveSessionCoalesced(req.headers);

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: () =>
      createTRPCContext({
        auth: auth,
        headers: req.headers,
        session: authResult.response,
      }),
    onError({ error, path }) {
      console.error(`>>> tRPC Error on '${path}'`, error);
    },
  });

  setCorsHeaders(response);

  // Forward Set-Cookie from auth session refresh to the client.
  // This ensures the Expo app receives the refreshed session token.
  const setCookies = authResult.headers?.getSetCookie?.();
  if (setCookies?.length) {
    console.log(
      `[Auth] Forwarding ${setCookies.length} Set-Cookie header(s) to tRPC response`,
    );
    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }
  }

  return response;
};

export { handler as GET, handler as POST };
