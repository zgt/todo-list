const DEBUG_AUTH = process.env.EXPO_PUBLIC_AUTH_TRACE === "1";

function djb2(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function isAuthTraceEnabled(): boolean {
  return DEBUG_AUTH;
}

export function cookieFingerprint(cookie: string | null | undefined): string {
  if (!cookie) return "none";
  return `${cookie.length}:${djb2(cookie)}`;
}

export function nextTraceId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function authTrace(
  scope: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  if (!DEBUG_AUTH) return;

  if (details) {
    console.log(`[AuthTrace][${scope}] ${message}`, details);
    return;
  }

  console.log(`[AuthTrace][${scope}] ${message}`);
}
