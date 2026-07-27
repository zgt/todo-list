/**
 * Pure helper for sync.pull's keyset pagination (G004).
 *
 * Extracted so it can be unit tested without a database: given the page of
 * rows actually returned (ordered by updatedAt asc, id asc), compute the
 * cursor the client should advance to. The client must never substitute
 * `Date.now()` here — that silently skips any rows updated after the pull
 * request was issued but before the response was applied.
 */
export function computeNextCursor(
  rows: { id: string; updatedAt: Date | string | number | null }[],
): { updatedAt: number; id: string } | null {
  if (rows.length === 0) return null;

  const last = rows[rows.length - 1];
  if (!last) return null;

  const updatedAt = last.updatedAt
    ? new Date(last.updatedAt).getTime()
    : Date.now();

  return { updatedAt, id: last.id };
}
