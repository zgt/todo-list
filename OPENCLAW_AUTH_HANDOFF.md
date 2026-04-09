# Expo + Better Auth + tRPC Auth Debug Handoff

## Problem Statement

The Expo app can authenticate and often shows logged-in UI, but after session expiry / refresh boundaries it enters broken states:

- initially: 401 loops on protected tRPC queries
- later: queries could load but mutations still failed
- throughout: `authClient.useSession()` and server-authenticated tRPC often disagreed
- intermittent server crash:
  - `Invalid Base64 character: ,`
  - thrown inside `auth.api.getSession(...)` in `apps/nextjs/src/app/api/trpc/[trpc]/route.ts`

The strongest pattern is that Expo’s local Better Auth state and the cookie actually used by tRPC are diverging.

## Repo Areas Touched

- `apps/expo/src/utils/auth.ts`
- `apps/expo/src/utils/api.tsx`
- `apps/expo/src/utils/auth-debug.ts`
- `apps/expo/src/utils/auth-gate.ts`
- `apps/expo/src/hooks/useSessionRefresh.ts`
- `apps/expo/src/hooks/usePushTokenRegistration.ts`
- `apps/expo/src/app/_layout.tsx`
- `apps/nextjs/src/app/api/trpc/[trpc]/route.ts`
- `apps/nextjs/src/app/api/auth/[...all]/route.ts`
- `packages/auth/src/index.ts`
- `apps/nextjs/src/auth/server.ts`
- `apps/expo/eas.json`
- `.env`

## Key Findings

### 1. Server auth-route and tRPC often receive different cookies

This is the most important persistent finding.

Examples from logs:

- auth route:
  - `/api/auth/get-session`
  - incoming cookie fingerprints like `1301:*`
  - returns `200`
- tRPC:
  - `/api/trpc/...`
  - incoming cookie fingerprints like `1409:*` or `2601:*`
  - resolves `hasSession: false`
  - returns `401`

This means Expo’s tRPC path is not sending the same effective cookie state that Better Auth’s own auth-route path is using successfully.

### 2. We caught a concrete stale-header race in Expo

Earlier, `trpcFetch` built request headers before waiting on the auth gate, so after refresh succeeded it still dispatched with a stale cookie.

Expo logs proved this:

- cookie prepared before wait: old fingerprint
- `waitForAuthReady(...)`
- refresh succeeded and `cookieAfterRefresh` changed
- request still dispatched with old cookie

This was patched, but it was not the full root cause.

### 3. Cookie corruption still occurs, sometimes causing server 500s

Repeated Next logs showed:

- `Invalid Base64 character: ,`
- thrown from `auth.api.getSession(...)`
- this happens before protected tRPC middleware, during session resolution

This proves a malformed Better Auth cookie value with a comma still sometimes reaches the server.

Even after several sanitization attempts, this still reappeared later in the run.

### 4. Logged-in UI and server-valid session were different states

At one stage:

- Expo UI showed profile picture / logged-in state
- protected tRPC requests were still unauthorized

This mismatch improved after gating the protected tree behind a server-validated session, but did not fully fix auth behavior.

### 5. Current strongest diagnosis

`authClient.getCookie()` in Expo appears to produce a reconstructed cookie blob that is not equivalent to the cookie state Better Auth’s own auth-route requests use successfully.

Current evidence:

- auth-route requests succeed with smaller cookie fingerprints (`1301:*`, `1303:*`, `107:*`)
- tRPC requests sent via Expo often emit larger, different fingerprints (`1409:*`, `2601:*`)
- those larger cookies often map to `hasSession: false` or trigger base64 parse failures

So the remaining bug likely sits in Better Auth Expo cookie storage / reconstruction behavior, or in how this app’s storage interacts with that plugin.

## Research / Design Hypotheses We Tested

### Hypothesis A: Simple concurrent refresh race

Partially true but incomplete.

There was a real race between:

- `useSessionRefresh()`
- `authClient.useSession()`
- 401-triggered refresh / invalidation
- push-token registration
- initial protected query mount

We added gating and deduping around these. It improved symptoms but did not eliminate the core bug.

### Hypothesis B: tRPC route using stale `session_data` cache

Also partially true.

We changed the Next tRPC route to call:

```ts
auth.api.getSession({
  headers: req.headers,
  query: { disableCookieCache: true },
  returnHeaders: true,
})
```

This was needed because Better Auth could return `null` too early if `session_data` cache was stale.

This helped but did not solve the Expo/tRPC cookie divergence.

### Hypothesis C: Manual Expo cookie merge from flattened `Set-Cookie` was corrupting storage

Very likely true at least some of the time.

We observed:

- cookie sizes growing unexpectedly
- later base64 parse failures on server
- likely due to flattened `Set-Cookie` handling and chunk accumulation

We progressively reduced this behavior and eventually removed tRPC manual cookie sync entirely.

However, corruption still reappeared later, which suggests either:

- an old bundle was still running in some tests
- or the Expo Better Auth plugin itself can reconstruct a problematic cookie state from stored data

## Changes Made

### 1. Added detailed auth tracing

Expo:

- `apps/expo/src/utils/auth-debug.ts`
- logs in:
  - storage
  - tRPC headers
  - tRPC fetch
  - unauthorized handler
  - session refresh
  - root layout
  - auth gate

Next:

- `apps/nextjs/src/app/api/trpc/[trpc]/route.ts`
- `apps/nextjs/src/app/api/auth/[...all]/route.ts`

Tracing includes cookie fingerprints, not raw values.

### 2. Added debug session env knobs

In auth config and server wiring:

- `AUTH_TRACE`
- `AUTH_DEBUG_UPDATE_AGE_SEC`
- `AUTH_DEBUG_COOKIE_CACHE_MAX_AGE_SEC`
- `AUTH_DEBUG_SESSION_EXPIRES_IN_SEC`

### 3. Changed tRPC route to disable Better Auth cookie cache

File:

- `apps/nextjs/src/app/api/trpc/[trpc]/route.ts`

This is still likely correct and should probably stay.

### 4. Added Expo auth gate

Files:

- `apps/expo/src/utils/auth-gate.ts`
- `apps/expo/src/utils/api.tsx`
- `apps/expo/src/hooks/useSessionRefresh.ts`
- `apps/expo/src/app/_layout.tsx`

Used to:

- block tRPC during in-flight auth transitions
- serialize unauthorized refreshes
- delay protected tree mounting until initial validation

### 5. Gated protected UI on server-validated session

File:

- `apps/expo/src/app/_layout.tsx`

Now:

- app performs explicit `authClient.getSession({ disableCookieCache: true })`
- stores separate `serverSession`
- only mounts protected tree if `serverSession` exists
- clears stale local auth if local `useSession()` exists but server validation fails

This improved the misleading “profile picture but dead tRPC” state.

### 6. Push token registration now waits for authenticated ready state

File:

- `apps/expo/src/hooks/usePushTokenRegistration.ts`

And enabled from layout only when auth is ready and a session exists.

### 7. Cookie sanitization and storage hardening in Expo auth storage

File:

- `apps/expo/src/utils/auth.ts`

Added:

- storage sanitization on read/write
- dropping malformed Better Auth cookie entries containing commas
- safer parsing of stored cookie JSON
- targeted pruning of session-data/session-token entries

### 8. Removed tRPC manual cookie sync from response path

File:

- `apps/expo/src/utils/api.tsx`

Latest intended behavior:

- do not merge flattened `Set-Cookie` from tRPC into storage
- treat it only as a signal to call canonical `authClient.getSession({ disableCookieCache: true })`

Important: one later Expo log still showed:

- `[AuthTrace][storage] syncing set-cookie to storage`

That suggests at least one test run still had an older bundle path active. Verify current runtime carefully before trusting observations.

### 9. Replaced `authClient.getCookie()` for tRPC with a canonical minimal header

Latest change:

- `apps/expo/src/utils/auth.ts` exports `getTrpcCookieHeader()`
- `apps/expo/src/utils/api.tsx` uses that instead of `authClient.getCookie()`

Current implementation builds a header only from stored Better Auth `session_token` cookies.

Goal:

- avoid the bloated / divergent cookie blob coming from `authClient.getCookie()`

This was the last patch applied before handoff; no result was confirmed yet beyond “still not working”.

## Current Runtime Status At Handoff

The last confirmed patterns from logs:

- Expo root layout gating is active
- queries sometimes work
- mutations still fail
- tRPC and auth-route cookies still diverge
- server still sometimes sees unauthorized tRPC with larger cookie fingerprints
- there have been repeated server-side base64 comma failures in the overall session history

## Most Important Open Questions

1. Is the current Expo runtime definitely on the newest bundle?
   One log after removing manual tRPC cookie sync still showed the old storage-sync trace.

2. Does `getTrpcCookieHeader()` materially change the outgoing cookie shape?
   This needs fresh logs after a full Metro/app restart.

3. Is `session_data` actually required for Better Auth to resolve a session in this environment?
   Current assumption is that `session_token` alone should be enough when server uses `disableCookieCache: true`.

4. Is the Better Auth Expo plugin itself mutating storage into an invalid state?
   Current evidence points in that direction because auth-route requests and tRPC requests diverge even after reducing custom merge logic.

## Recommended Next Steps

### 1. Fully restart Expo app and Metro

Do not rely on hot state for the next verification pass.

Need a clean run because older runtime paths were still appearing in logs.

### 2. Verify the latest tRPC cookie source

Fresh Expo logs should confirm that `trpc-fetch` outgoing cookies now come from `getTrpcCookieHeader()`, not `authClient.getCookie()`.

Compare:

- Expo `outgoingCookie`
- Next `incomingCookie`
- auth-route cookie fingerprints in the same window

### 3. If tRPC still fails with minimal `session_token` cookie only

Then inspect Better Auth server expectations directly:

- whether additional cookie(s) beyond `session_token` are required in this setup
- whether cookie names/prefixes/chunking are mismatched

### 4. If tRPC succeeds with minimal header

Then the real bug is confirmed to be in Better Auth Expo cookie reconstruction, and the long-term fix is:

- keep auth-route/plugin for sign-in/session refresh
- keep tRPC on a separate canonical minimal cookie header path
- never use `authClient.getCookie()` for manual authenticated requests

### 5. If base64 comma error reappears even with minimal header

Then some other storage path is still contaminating outgoing cookies, and the next debug step is to log the exact cookie names included by `getTrpcCookieHeader()`.

## Useful Log Patterns

Expo:

- `[AuthTrace][trpc-headers]`
- `[AuthTrace][trpc-fetch]`
- `[AuthTrace][auth-gate]`
- `[AuthTrace][layout]`
- `[AuthTrace][unauthorized]`
- `[AuthTrace][storage]`

Next:

- `[AuthTrace][next-auth]`
- `[AuthTrace][next-trpc]`
- `hasSession: true/false`
- `forwardedSetCookies`
- `Invalid Base64 character: ,`

## Log Appendix

### Expo: stale header captured before auth gate settled

This proved the original `trpcFetch` stale-cookie race:

```text
LOG  [AuthTrace][trpc-headers] prepared react tRPC headers {"cookie": "1301:3dc647e0", "source": "expo-react"}
LOG  [AuthTrace][auth-gate] waiting for auth transition {"activeAuthTransitions": 1, "source": "trpc-fetch", "traceId": "auth-gate-mnr2x66u-u2qcg6"}
LOG  [Auth] Session refresh succeeded — refetching with fresh cookies
LOG  [AuthTrace][unauthorized] recovery refresh succeeded {"cookieAfterRefresh": "1301:b90a3871", "traceId": "unauthorized-mnr2x63d-9t2e0m"}
LOG  [AuthTrace][auth-gate] auth transition settled {"source": "trpc-fetch", "traceId": "auth-gate-mnr2x66u-u2qcg6"}
LOG  [AuthTrace][trpc-fetch] dispatching tRPC request {"method": "GET", "outgoingCookie": "1301:3dc647e0", "traceId": "trpc-fetch-mnr2x66u-vc1jgv", ...}
```

### Expo: after patch, `trpcFetch` could refresh the cookie after wait

This shows the newer patch worked mechanically, even though auth still failed:

```text
LOG  [AuthTrace][trpc-headers] prepared react tRPC headers {"cookie": "1303:ee0b2dbe", "source": "expo-react"}
LOG  [AuthTrace][auth-gate] waiting for auth transition {"activeAuthTransitions": 1, "source": "trpc-fetch", "traceId": "auth-gate-mnr362uz-20itje"}
LOG  [AuthTrace][unauthorized] recovery refresh succeeded {"cookieAfterRefresh": "1303:fb004677", "traceId": "unauthorized-mnr362sj-jefdr5"}
LOG  [AuthTrace][auth-gate] auth transition settled {"source": "trpc-fetch", "traceId": "auth-gate-mnr362uz-20itje"}
LOG  [AuthTrace][trpc-fetch] dispatching tRPC request {"cookieBeforeWait": "1303:ee0b2dbe", "outgoingCookie": "1303:fb004677", ...}
```

### Expo: manual tRPC cookie sync appeared after it was supposed to be removed

This indicates at least one test run still used an older runtime path or stale bundle:

```text
LOG  [AuthTrace][trpc-fetch] received tRPC response {"setCookie": "1466:83678133", "status": 200, "traceId": "trpc-fetch-mnr32bsx-246t5w"}
LOG  [AuthTrace][storage] syncing set-cookie to storage {"headerFingerprint": "1466:83678133", "nextCookie": "306:7bb08e8d", "previousCookie": "1550:39bb7cd"}
```

### Next: auth route succeeds but tRPC gets a different cookie and fails

This is the most important divergence pattern:

```text
[AuthTrace][next-auth] handling auth request {
  traceId: 'mnr32hsq-qkj0id',
  method: 'GET',
  path: '/api/auth/get-session',
  query: '',
  incomingCookie: '1301:a570164f'
}
[AuthTrace][next-auth] completed auth request { traceId: 'mnr32hsq-qkj0id', status: 200, setCookie: 'none' }

[AuthTrace][next-trpc] handling tRPC request {
  traceId: 'mnr32hrh-9wea24',
  method: 'GET',
  path: '/api/trpc/task.all,taskList.all,notification.getUserPreferences,category.all',
  source: 'expo-react',
  incomingCookie: '2601:426f0cba'
}
[AuthTrace][next-trpc] resolved Better Auth session for tRPC request { traceId: 'mnr32hrh-9wea24', hasSession: false, setCookies: [] }
```

### Next: server-side base64 parse failure

This still happened intermittently and explains the Expo-side JSON parse errors:

```text
ERROR [Better Auth]: INTERNAL_SERVER_ERROR Error: Invalid Base64 character: ,
    at async handler (src/app/api/trpc/[trpc]/route.ts:69:22)

POST /api/trpc/task.update?batch=1 500
GET /api/trpc/task.all?... 500
```

### Expo: mutation failing with 500 / JSON parse error

Representative mutation failure on the client:

```text
LOG  [AuthTrace][trpc-headers] prepared react tRPC headers {"cookie": "107:61a10ef2", "source": "expo-react"}
LOG  [AuthTrace][trpc-fetch] dispatching tRPC request {"cookieBeforeWait": "107:61a10ef2", "method": "POST", "outgoingCookie": "107:61a10ef2", "traceId": "trpc-fetch-mnr30bcj-bbpzve", "url": "http://192.168.1.135:3000/api/trpc/task.update?batch=1"}
LOG  [AuthTrace][trpc-fetch] received tRPC response {"setCookie": "none", "status": 500, "traceId": "trpc-fetch-mnr30bcj-bbpzve"}
ERROR << mutation #14 task.update {"result": [TRPCClientError: JSON Parse error: Unexpected end of input]}
```

## Dev Servers Used During Debugging

Separate direct processes worked best:

- Next direct dev server:
  - `pnpm --filter @acme/nextjs dev`
- Expo direct dev server:
  - `pnpm --filter @acme/expo dev`

Turbo mixed output made correlation much harder.

## Files Most Worth Reading First

- [apps/expo/src/utils/api.tsx](/home/m/coding/todo-list/apps/expo/src/utils/api.tsx)
- [apps/expo/src/utils/auth.ts](/home/m/coding/todo-list/apps/expo/src/utils/auth.ts)
- [apps/expo/src/app/_layout.tsx](/home/m/coding/todo-list/apps/expo/src/app/_layout.tsx)
- [apps/expo/src/hooks/useSessionRefresh.ts](/home/m/coding/todo-list/apps/expo/src/hooks/useSessionRefresh.ts)
- [apps/nextjs/src/app/api/trpc/[trpc]/route.ts](/home/m/coding/todo-list/apps/nextjs/src/app/api/trpc/[trpc]/route.ts)
- [apps/nextjs/src/app/api/auth/[...all]/route.ts](/home/m/coding/todo-list/apps/nextjs/src/app/api/auth/[...all]/route.ts)
