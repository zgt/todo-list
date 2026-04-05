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

const handler = async (req: NextRequest) => {
  // Pre-resolve the session with returnHeaders so we can capture Set-Cookie
  // headers from Better Auth's session token refresh (updateAge). Without this,
  // the refreshed token is written to the DB but never sent to the client,
  // causing 401 loops after updateAge (24h) on Expo.
  const authResult = await auth.api.getSession({
    headers: req.headers,
    returnHeaders: true,
  });

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
