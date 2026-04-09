import { authTrace, nextTraceId } from "./auth-debug";

let activeAuthTransitions = 0;
let authReadyPromise: Promise<void> | null = null;
let resolveAuthReady: (() => void) | null = null;

function ensurePendingPromise(): Promise<void> {
  if (!authReadyPromise) {
    authReadyPromise = new Promise<void>((resolve) => {
      resolveAuthReady = resolve;
    });
  }

  return authReadyPromise;
}

export function beginAuthTransition(source: string): void {
  activeAuthTransitions += 1;
  ensurePendingPromise();
  authTrace("auth-gate", "begin auth transition", {
    source,
    activeAuthTransitions,
  });
}

export function endAuthTransition(source: string): void {
  if (activeAuthTransitions > 0) {
    activeAuthTransitions -= 1;
  }

  authTrace("auth-gate", "end auth transition", {
    source,
    activeAuthTransitions,
  });

  if (activeAuthTransitions === 0 && resolveAuthReady) {
    resolveAuthReady();
    resolveAuthReady = null;
    authReadyPromise = null;
  }
}

export async function waitForAuthReady(source: string): Promise<void> {
  if (activeAuthTransitions === 0 || !authReadyPromise) {
    return;
  }

  const traceId = nextTraceId("auth-gate");
  authTrace("auth-gate", "waiting for auth transition", {
    source,
    traceId,
    activeAuthTransitions,
  });
  await authReadyPromise;
  authTrace("auth-gate", "auth transition settled", {
    source,
    traceId,
  });
}
