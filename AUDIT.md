# Tokilist — Repository Audit

_Read-only audit. Generated 2026-07-10 by a four-phase multi-agent workflow (map → loop-until-cap sweep → 3-lens adversarial verification → synthesis + completeness). No project files were modified._

## Summary

**102 confirmed findings** (survived a 3-verifier adversarial panel): 0 critical · 9 high · 38 medium · 55 low.

Overall posture: functional but with systemic gaps in authorization, concurrency, and notification correctness — no true critical survived (the one "critical" was a broken iOS widget, correctly downgraded to high), and the verification panel deflated most originally-high findings once unguessable-UUID reachability and soft/recoverable outcomes were accounted for. The risk is concentrated in three clusters. First, the offline-sync router (sync.ts) re-implements task logic and drops nearly every guard the online tRPC path enforces — shared-list role checks (G001), soft-delete filtering (G008), atomic version conflict (F001), field completeness (G017), and input bounds (G014); this is partly mitigated today because the offline-sync subsystem appears not yet wired to a live screen, but it must reach parity before it is enabled. Second, the reminder/notification subsystem is unreliable end to end: non-idempotent sends (F018), decorative offset preferences (F095/G006), duplicate server+local fires (F120), and swallowed send errors (G005). Third, a small set of genuine authorization gaps. Fix first, in order: **H000/H011 (silent cross-provider account takeover** — Better Auth's `accountLinking` is left at library defaults so any of Discord/Google/Apple auto-merges into an existing account on a provider-attested email alone, and the pinned better-auth 1.6.9 carries the matching advisory GHSA-g38m-r43w-p2q7; this was found by the completeness sweep and is the single highest-severity item), F106 (inverted DEBUG_AUTH flag logs OAuth codes in every production request — a one-line fix, highest value-per-effort), F009 (any user can enumerate all moderation reports incl. PII), F079/F096 (push token never revoked on sign-out/switch → cross-user notification delivery), G002 (32-bit invite codes with zero rate limiting — the app has no rate limiting anywhere), then the sync-router guard-parity set (G001/G008/G004/F001) before offline sync ships.

> Severity note: severities below are the **post-verification** grades. The adversarial panel explicitly downgraded many finder-assigned severities once reachability (invite/category IDs are unguessable v4 UUIDs), recoverability (user can edit the wrong date), and intended-behavior were accounted for. Original finder severity is shown where it changed.

## Methodology & coverage

- **Phase 1 — Map:** 8 parallel readers over apps/nextjs, apps/expo (excl. generated ios/), packages/api, packages/auth, packages/db, packages/ui, supabase/, scripts/, tooling/CI/env → synthesized target list.
- **Phase 2 — Sweep:** 5 dimensions (backend-correctness, data-layer, web-frontend, mobile, cross-cutting) run as parallel pipelines. Rotating finder lenses (by-file, by-data-flow, by-user-story, by-edge-case, then by-invariant, by-adversary, by-failure-injection, by-cross-surface-diff). Each round deduped against **all** prior findings (including rejected ones). **55 finder agents over 11 rounds/dimension surfaced 167 raw findings.**
- **Phase 3 — Adversarial verify:** each unique finding (138 after dedupe) faced 3 verifiers with distinct lenses (does-it-reproduce / real-world-impact / is-it-intended), each prompted to **refute** and defaulting to refuted when uncertain. 2-of-3 non-refuted to survive.
- **Phase 4 — Synthesis + completeness critic + gap sweep:** survivors ranked and re-graded; a completeness critic found unexamined surfaces; a final gap sweep swept + verified those.

**Coverage caveat (no silent truncation):** No dimension reached the "2 consecutive dry rounds" stop condition — **all five were capped at 11 rounds while still surfacing new (mostly medium/low) findings.** Coverage is therefore breadth-capped, not exhaustive; yield was decaying (2–3 new/round, almost all medium/low) when the sweep was stopped to spend budget on verification, which the brief prioritized ("confirmed findings, not plausible ones"). The completeness critic then recovered the two largest blind spots (Better Auth config, migration drift), which the gap sweep confirmed.

**Infrastructure note:** the Phase-3 verification run hit the account session limit mid-flight; 116 of 138 panels initially failed and were auto-scored "refuted" by a fail-safe. This was detected, and all affected panels were **re-verified with fresh sonnet panels** so no finding was killed by infrastructure rather than by a verifier. Reported kill rates below are from genuine panels only.

### Kill rate (confirmed refutations / total judged)

| Dimension | Judged | Killed | Kill rate |
|---|---|---|---|
| backend-correctness | 31 | 8 | 26% |
| data-layer | 28 | 9 | 32% |
| web-frontend | 33 | 12 | 36% |
| mobile | 22 | 7 | 32% |
| cross-cutting | 24 | 14 | 58% |
| **Sweep total (138)** | **138** | **50** | **36%** |
| Completeness gap sweep | 15 | 1 | 7% |

The elevated cross-cutting kill rate (58%) reflects that dimension's bias toward style/hygiene leads (dead code, dependency pins) that the impact lens deflated; backend-correctness was the most durable (26% killed).

## Systemic themes

These root causes each span multiple findings — fixing the pattern is higher-leverage than fixing findings one by one.

1. **Offline-sync router (sync.ts) bypasses the guards the online tRPC path enforces — scopes by userId not list-role, skips soft-delete filters, does non-atomic conflict checks, and drops fields. Currently low-reachability (subsystem not wired to a live screen) but a latent minefield to enable.**  
   _Findings:_ G001, G008, G004, F001, F019, F020, G017, G014
2. **Non-atomic check-then-act and missing optimistic locks: read-modify-write races cause lost updates, duplicate side-effects, and cap overshoot because SQL WHERE/atomic increments are not used.**  
   _Findings:_ F046, F001, F013, F088, F003, F027, F041
3. **Soft-delete is not honored consistently — access helpers, eager-load joins, subtask mutations, invite joins, and the archive cron all ignore deletedAt, so deleted lists/tasks/categories stay writable or visible.**  
   _Findings:_ F002, G009, G008, F012, F032, F036, F051
4. **Reminder/snooze/notification delivery is non-idempotent, partially decorative, and duplicated: offset preferences are never applied, snooze corrupts reminderAt, sends re-fire or double-fire, and failures are swallowed.**  
   _Findings:_ F011, F109, F095, G006, F018, F022, F120, F086, F092, G005, F007
5. **Push-token lifecycle and device-to-user binding are broken: tokens are never revoked on sign-out/account-switch (cross-user notification leak), never retried on failure, and duplicated/never-pruned due to a non-unique index.**  
   _Findings:_ F079, F096, G036, F027, F041, F052
6. **Missing authorization, IDOR, and a complete absence of rate limiting: admin-only data exposed to all users, category IDOR on read/write, brute-forceable low-entropy invites, a shared static API key trusting client-supplied user_id, and a fail-open cron.**  
   _Findings:_ F009, F098, G002, F017, F000, F020, F007, F106, F023
7. **Fire-and-forget and swallowed errors: mutations and background sends drop failures silently with no retry, surfacing nothing to the user or caller.**  
   _Findings:_ G005, F022, F018, F080, G022, G024
8. **Account deletion and ownership transitions destroy or detach other members' shared-list data with no notification, driven by raw FK cascade/set-null behavior.**  
   _Findings:_ F016, F040
9. **Web frontend: prominent controls that do nothing, no error boundary, loading-state flashes, and accessibility regressions.**  
   _Findings:_ F073, F074, F066, G025, G020, G026, G027, F064, G028, F054, F055, F058, F070, G021
10. **Unindexed, unbounded, or N+1 background/bulk queries that waste work or enable self-service DoS at scale.**  
   _Findings:_ F031, F048, F029, G014, G018, G019, F033
11. **Dead code and leftover scaffolding: unwired lint plugin, orphaned modules, a dead workspace package, and unused schema left from the removed music-league feature.**  
   _Findings:_ F060, F102, F115, G023, G040, G032, G019
12. **Authentication trust boundary was unconfigured (completeness-sweep cluster).** Cross-provider account linking left at library defaults enables silent account merge on email alone; the pinned better-auth 1.6.9 carries a matching advisory.  
   _Findings:_ H000, H011, H001, H002

## Findings

### 🟠 High

#### `F009` moderation.getReports has no admin/role check — any authenticated user can enumerate all content reports
**Location:** `packages/api/src/router/moderation.ts:128` · **Area:** backend-correctness

**Failure scenario.** Any authenticated non-admin calls moderation.getReports and receives every content report in the system — reporter identities, reported-user identities, reasons, and free-text details for all users.

**Fix direction.** Gate getReports (and any other moderation admin surface) behind an explicit admin/role check; the standing TODO must become a hard authorization guard, not a protectedProcedure.

#### `G001` sync.push/pull scope every operation by Task.userId only, never honoring shared-list editor/owner role — offline sync silently can't apply or fetch shared-list task edits
**Location:** `packages/api/src/router/sync.ts:82` · **Area:** backend-correctness · **Related:** G008, G004

**Failure scenario.** A shared-list editor edits a task they did not originally create while offline; sync.push scopes the lookup by Task.userId only, so the edit silently no-ops (server never finds the row) and sync.pull never returns co-members' tasks — shared-list edits are undeliverable via the offline path.

**Fix direction.** Route sync.push/pull authorization through the same assertListAccess(...,"editor") logic the online task.ts path uses, keyed on the task's listId rather than Task.userId.

#### `G008` sync.push's 'update' operation looks up and writes the server task with no isNull(Task.deletedAt) filter, letting a client silently resurrect a soft-deleted task or edit it while deleted
**Location:** `packages/api/src/router/sync.ts:82` · **Area:** backend-correctness · **Related:** G001

**Failure scenario.** A client sends a sync.push update for a task that was soft-deleted server-side; the serverTask lookup has no isNull(deletedAt) filter and the update branch accepts a client-supplied deletedAt, so the deleted task is silently edited or effectively resurrected out of band.

**Fix direction.** Add isNull(Task.deletedAt) to the sync.push serverTask lookup and stop trusting client-supplied deletedAt on the update branch, matching the online task.ts guards.

#### `H000` No accountLinking/trustedProviders hardening: any of Discord, Google, or Apple silently merges into an existing user the instant that provider reports the matching email as verified
**Location:** `packages/auth/src/index.ts:58` · **Area:** gap:auth-config

**Failure scenario.** Alice signs up on Tokilist via 'Continue with Google' using alice@company.com and accumulates private tasks/shared lists. Alice leaves the company; IT reassigns/forwards alice@company.com to a new hire (or the address is otherwise later verifiable by someone else, e.g. a stale personal address changing hands). That person creates a Discord account, verifies alice@company.com through Discord's own email-verification flow (so `profile.verified === true`), then opens Tokilist and clicks 'Continue with Discord'. Because `trustedProviders` is `[]` and `userInfo.emailVerified` is true, better-auth's `handleOAuthUserInfo` silently calls `internalAdapter.linkAccount(...)` and immediately hands back a session for Alice's existing account (dist/oauth2/link-account.mjs ~line 20-38) — no confirmation prompt, no email notification to the original account owner that a new provider was just linked. The new party now has full session access to Alice's tasks and shared lists.

**Fix direction.** Do not merge two OAuth identities on email alone. Set account.accountLinking.trustedProviders to none (or require a verified re-auth / explicit in-app confirmation before linking a second provider), and email the account owner when a provider is linked. Also upgrade better-auth off 1.6.9 (see the CVE finding).

#### `H011` better-auth pinned to 1.6.9, vulnerable to core OAuth account-linking takeover (GHSA-g38m-r43w-p2q7), fixed in 1.6.11
**Location:** `pnpm-workspace.yaml:30` · **Area:** gap:dep-advisories

**Failure scenario.** An attacker who controls (or compromises) an account at a supported OAuth provider (e.g. Discord/Google) that asserts email_verified: true for an email address matching an existing Tokilist user's pre-registered/unverified email can have better-auth auto-link the OAuth identity to that existing account, taking it over without ever proving ownership of the victim's original credential.

**Fix direction.** better-auth 1.6.9 has a known OAuth account-linking takeover advisory — upgrade to a patched release. This is the same root cause as the accountLinking finding, from the dependency angle.

#### `H008` One failing pending widget action permanently jams the entire widget-to-server sync queue (poison-action replay)
**Location:** `apps/expo/src/hooks/useWidgetSync.ts:72` · **Area:** gap:widget-bridge-authz

**Failure scenario.** User A has a widget checkbox visible for a task that gets deleted or removed from A's access (e.g. a shared-list owner revokes A's access, or the task is deleted from another device) before A's next app foreground. A taps the stale checkbox: TodoWidget.swift's ToggleTaskIntent queues {taskId, completed} into pendingWidgetActions. On next app open, useWidgetActions calls updateTaskMutation for that taskId, which throws NOT_FOUND/FORBIDDEN server-side; the catch swallows it and clearPendingWidgetActions() never runs. A now taps a second, valid task's checkbox from the widget; this new action is appended after the poisoned one. Every future app foreground retries the poisoned action first, fails, and the valid second action is never applied to the server — the widget checkbox silently stops syncing entirely until the user manually intervenes (e.g. reinstall) or someone edits the underlying UserDefaults value directly.

**Fix direction.** Ack widget pending-actions individually (per-action try/catch + remove-on-success) so one poison action (e.g. a server-deleted task id) cannot permanently jam the whole widget-to-server queue on every foreground.

#### `H009` App Group widget state (widgetData, pendingWidgetActions) is never cleared on sign-out or account switch, leaking the previous account's tasks into the widget and letting cross-account actions replay under the next session
**Location:** `apps/expo/src/utils/widget.ts:34` · **Area:** gap:widget-bridge-authz

**Failure scenario.** A shared/family iPad has User A signed in with tasks synced to the widget, then A signs out via ProfileMenu's handleSignOut. The home-screen widget continues showing A's task titles/categories to anyone looking at the device, including on the lock screen (accessoryRectangular/accessoryInline widgets render without unlocking), until User B signs in AND has tasks that trigger a useWidgetSync push — if B has zero tasks or doesn't open the app for a while, A's task data (potentially sensitive, e.g. 'Call therapist', 'Pay off credit card') stays visible indefinitely. Separately, if A tapped a widget checkbox right before signing out and the action never drained, B's first app foreground after signing in triggers useWidgetActions, which calls `vanillaTrpc.task.update.mutate({id: A's taskId, completed})` under B's now-active session — the server correctly rejects this as FORBIDDEN/NOT_FOUND, but per the sibling poison-queue defect this rejection then permanently blocks B's own subsequent widget toggles from ever syncing.

**Fix direction.** Clear App Group widget state (widgetData, pendingWidgetActions) on sign-out/account-switch so a second user on a shared device cannot read the first user's task titles from the widget container or replay their queued actions.

#### `F084` Widget JSON date fields always fail to decode on the Swift side (fractional-seconds mismatch), making the interactive widget checkbox a permanent no-op
**Location:** `apps/expo/widgets/TodoWidget.swift:83` · **Area:** mobile · **Severity:** high _(finder said critical)_

**Failure scenario.** User taps the checkbox on the iOS home-screen widget to complete a task; the Swift side fails to decode the JS-emitted ISO date (millisecond fractional seconds vs .iso8601 default), so WidgetData never populates — the widget renders empty and the tap is a permanent no-op.

**Fix direction.** Align the Swift JSONDecoder date strategy with the JS Date.toISOString() output (use .iso8601 with fractional seconds, or a custom formatter), and add a decode-failure fallback so a single bad field does not blank the whole widget.

#### `F079` Push token never re-registered on account switch, and never removed on sign-out — stale device→user binding
**Location:** `apps/expo/src/hooks/usePushTokenRegistration.ts:12` · **Area:** mobile · **Related:** F096, F052

**Failure scenario.** On a shared device, user A signs out and user B signs in (or A just signs out); the useRef guard permanently blocks re-registration and no sign-out path calls removeToken, so B's device keeps the Expo push token bound to A — A's task/shared-list notifications are delivered to B.

**Fix direction.** Re-register the push token on session/user change (key the effect on user id, not a one-shot ref) and call notification.removeToken on every sign-out before clearing the session.

### 🟡 Medium

#### `G004` sync.pull truncates delta results with ORDER BY updatedAt DESC + LIMIT 1000, and the mobile client advances its cursor to Date.now() regardless — permanently dropping tasks that didn't make the cutoff
**Location:** `packages/api/src/router/sync.ts:277` · **Area:** backend-correctness · **Severity:** medium _(finder said high)_ · **Related:** G001, F051

**Failure scenario.** A user with >1000 tasks modified in one delta window (e.g. first sync) hits sync.pull's ORDER BY updatedAt DESC LIMIT 1000; the oldest tasks in the range are omitted, yet the client advances its cursor to Date.now(), so those tasks never appear on that device.

**Fix direction.** Paginate sync.pull by a stable keyset cursor and only advance the client cursor to the max updatedAt actually returned, never to Date.now().

#### `F017` category.breadcrumbs leaks any user's category by ID with no ownership/access check
**Location:** `packages/api/src/router/category.ts:206` · **Area:** backend-correctness · **Severity:** medium _(finder said high)_ · **Related:** F000, F020

**Failure scenario.** A caller passes a known category UUID (not their own) to category.breadcrumbs via the id param; it returns that category plus its full ancestor chain (names, colors, icons) with no ownership/access check.

**Fix direction.** Verify the category belongs to the caller (or a list they can access) before returning breadcrumbs, mirroring other ownership checks.

#### `F002` assertListAccess never filters out soft-deleted lists — deleted shared lists remain fully writable
**Location:** `packages/api/src/lib/list-access.ts:20` · **Area:** backend-correctness · **Severity:** medium _(finder said high)_ · **Related:** F012, G009

**Failure scenario.** A former owner/member crafts an API call with a soft-deleted list's UUID; assertListAccess lacks isNull(deletedAt) so it still grants access, allowing hidden writes to a phantom list.

**Fix direction.** Add isNull(TaskList.deletedAt) to assertListAccess so soft-deleted lists grant no access anywhere.

#### `F001` sync.push conflict check is app-level read-then-write, not an atomic SQL lock — lost updates on concurrent sync
**Location:** `packages/api/src/router/sync.ts:186` · **Area:** backend-correctness · **Severity:** medium _(finder said high)_ · **Related:** F013, F088

**Failure scenario.** Two devices sync the same edited task; both read the same serverTask.version, both pass the app-level version check, and the second UPDATE (not conditioned on version in SQL) overwrites the first — one same-user edit is silently lost.

**Fix direction.** Make the conflict check atomic: put the expected version in the UPDATE...WHERE version = :v clause and treat a zero-row result as a conflict.

#### `F011` Snooze/unsnooze leaves a stale reminderAt that the reminder cron will still fire
**Location:** `packages/api/src/router/task.ts:685` · **Area:** backend-correctness · **Severity:** medium _(finder said high)_ · **Related:** F109, F120

**Failure scenario.** A user snoozes a task then unsnoozes (or edits the reminder while snoozed); unsnooze clears snoozedUntil but leaves reminderAt pointing at the snooze deadline, and the reminder cron (which ignores snoozedUntil) fires a stray reminder.

**Fix direction.** Restore/clear reminderAt (and reminderSentAt) on unsnooze and make the reminder cron aware of snoozedUntil.

#### `F013` task.update has no optimistic lock, so concurrent completions of a recurring task double-fire the next-occurrence insert and the completion push
**Location:** `packages/api/src/router/task.ts:386` · **Area:** backend-correctness · **Severity:** medium _(finder said high)_ · **Related:** F001

**Failure scenario.** Two near-simultaneous completions of the same recurring task both read the stale existing snapshot; both fire the next-occurrence insert and the completion push, producing a duplicate future task and duplicate notification.

**Fix direction.** Add optimistic locking / conditional UPDATE (or a uniqueness guard on generated occurrences) to task.update so side-effects fire exactly once.

#### `G002` Invite codes have only 32 bits of entropy and joinByInvite has zero rate limiting, enabling brute-force takeover of arbitrary shared lists
**Location:** `packages/api/src/router/task-list.ts:243` · **Area:** backend-correctness · **Severity:** medium _(finder said high)_

**Failure scenario.** An attacker scripts joinByInvite against the 8-hex-char (32-bit) invite space with no rate limiting; sustained guessing eventually lands a valid code and joins an arbitrary shared list.

**Fix direction.** Increase invite entropy (full UUID or >=128-bit random) and add per-user/per-IP rate limiting on joinByInvite; introduce a shared rate-limit layer since none exists app-wide.

#### `F016` Account deletion hard-deletes a departing member's tasks even when they live inside a shared list owned by someone else, with no notification to remaining members
**Location:** `packages/api/src/router/user.ts:46` · **Area:** backend-correctness · **Related:** F040

**Failure scenario.** A user who created tasks inside someone else's shared list deletes their account; deleteAccount hard-deletes every task by userId, permanently removing that content from the shared list with no notice to remaining members.

**Fix direction.** On account deletion, detach or reassign tasks that live in another owner's shared list rather than hard-deleting them, and notify remaining members.

#### `F019` sync.push treats a client-controlled updatedAt mismatch as a version conflict even when serverVersion matches, causing spurious conflicts under client clock skew
**Location:** `packages/api/src/router/sync.ts:148` · **Area:** backend-correctness

**Failure scenario.** A client with a skewed clock syncs; even when serverVersion matches (no real conflict), sync.push compares serverTask.updatedAt to the client-supplied data.updatedAt and rejects as a conflict, effectively stalling that task's edits.

**Fix direction.** Base conflict detection on the server-authoritative version only; do not compare against unvalidated client-supplied updatedAt.

#### `F022` Recurring-task next-occurrence insert is fire-and-forget with no retry, silently and permanently breaking the recurrence chain on any transient failure
**Location:** `packages/api/src/router/task.ts:514` · **Area:** backend-correctness

**Failure scenario.** Completing a recurring task inserts the next occurrence via void ...insert().catch(console.error); a transient DB failure logs and is dropped with no retry or backfill, permanently breaking the recurrence chain with no user-visible signal.

**Fix direction.** Tie the next-occurrence insert to the completion in a transaction (or a durable retry/outbox) so a failure rolls back or is retried rather than silently lost.

#### `F023` Shared-list push notifications ignore the user's block list
**Location:** `packages/api/src/lib/push/shared-list-notifications.ts:21` · **Area:** backend-correctness

**Failure scenario.** User A blocks user B, then both are in a shared list; getOtherMemberIdsWithPref never consults BlockedUser, so A still receives push notifications generated by B's activity.

**Fix direction.** Filter blocked relationships (either direction, per product intent) out of shared-list notification recipients.

#### `G005` push.ts swallows every error internally and never rethrows, so callers cannot distinguish a failed push send from a successful one
**Location:** `packages/api/src/lib/push.ts:28` · **Area:** backend-correctness · **Related:** F018, F052

**Failure scenario.** A reminder/shared-list push send fails inside sendPushToUsers; the nested try/catch only console.errors and returns void, so callers (reminder cron, sendTestPush) cannot tell a failed send from a success and never retry.

**Fix direction.** Surface send outcomes (return status / rethrow) so callers can retry or record failures instead of silently dropping deliveries.

#### `G006` reminderOffsetMinutes preference is stored and surfaced in UI on both platforms but never applied anywhere in reminder delivery logic
**Location:** `packages/api/src/lib/reminders.ts:97` · **Area:** backend-correctness · **Related:** F095

**Failure scenario.** Server-side twin of F095: reminderOffsetMinutes is fetched into UpcomingReminder.preferences but processReminders never subtracts it, so the offset preference is inert in delivery.

**Fix direction.** Subtract reminderOffsetMinutes from due date when selecting/sending due reminders in the cron path.

#### `F109` Snoozing a recurring task permanently corrupts the reminder-offset propagated to every future recurrence
**Location:** `packages/api/src/router/task.ts:643` · **Area:** cross-cutting · **Severity:** medium _(finder said high)_ · **Related:** F011, F095

**Failure scenario.** A user snoozes a recurring task (reminderAt overwritten with the snooze target), then completes it early; the next-occurrence generator recomputes the reminder offset from the corrupted reminderAt, propagating a wrong reminder time to every future occurrence.

**Fix direction.** Preserve the original due-date-relative reminder offset separately from the transient snooze target so completion recomputes from the real offset.

#### `F098` Obsidian sync API route: single static key + client-supplied user_id lets one leaked key read any user's tasks
**Location:** `apps/nextjs/src/app/api/tasks/route.ts:9` · **Area:** cross-cutting · **Severity:** medium _(finder said high)_

**Failure scenario.** The single global OBSIDIAN_SYNC_API_KEY authenticates /api/tasks with no binding to a user; anyone holding the leaked key dumps any user's tasks by changing the client-supplied user_id query param.

**Fix direction.** Bind each key to a specific user id server-side (or derive the user from the key) instead of trusting the client user_id; use constant-time comparison.

#### `F106` DEBUG_AUTH force-enabled in production logs OAuth authorization codes and cookie fingerprints
**Location:** `apps/nextjs/src/app/api/auth/[...all]/route.ts:6` · **Area:** cross-cutting · **Severity:** medium _(finder said high)_

**Failure scenario.** Every production request to the catch-all auth route is traced by default because the flag is inverted (DEBUG_AUTH = NODE_ENV==="production" || ...), writing the request query string (OAuth authorization codes) and cookie name/length/djb2 fingerprints into production logs.

**Fix direction.** Fix the inverted flag so tracing is opt-in (AUTH_TRACE-only), and never log raw query strings or any cookie-derived material even when tracing is on.

#### `F045` Monthly/yearly recurrence uses JS Date.setMonth, which overflows past month-end and permanently shifts the recurring day
**Location:** `packages/api/src/router/task.ts:141` · **Area:** data-layer · **Severity:** medium _(finder said high)_ · **Related:** F014

**Failure scenario.** A monthly/yearly recurring task due on the 31st (or 29/30) completes; getNextDueDate does setMonth(+1) on a Date carrying day 31, JS overflows into the following month, and the recurring day permanently drifts forward.

**Fix direction.** Clamp the day-of-month to the target month's last valid day when advancing monthly/yearly recurrences instead of relying on Date rollover.

#### `G009` Subtask router never filters on Task.deletedAt — soft-deleted tasks stay fully mutable
**Location:** `packages/api/src/router/subtask.ts:39` · **Area:** data-layer · **Severity:** medium _(finder said high)_ · **Related:** F002

**Failure scenario.** After a task is soft-deleted, the subtask API (no isNull(Task.deletedAt) filter) still creates/completes subtasks; completing the last subtask flips the parent completed state and fires a shared-list push referencing a task other members can no longer see.

**Fix direction.** Filter isNull(Task.deletedAt) on every parent-task lookup in subtask.ts and suppress side-effects for deleted parents.

#### `F051` Archive cron bypasses Drizzle's updatedAt tracking, so auto-archived tasks are invisible to mobile sync deltas forever
**Location:** `supabase/functions/archive-completed-tasks/index.ts:40` · **Area:** data-layer · **Severity:** medium _(finder said high)_ · **Related:** F036, G004

**Failure scenario.** The hourly archive edge function sets deleted_at via PostgREST, which never updates updated_at; sync.pull deltas key off updated_at only, so mobile clients never learn the task was archived and it lingers in their completed view indefinitely.

**Fix direction.** Have the archive function also bump updated_at (or drive archiving through Drizzle / a DB trigger) so sync deltas observe the change.

#### `F040` Account deletion of a list owner silently strips other members' tasks out of the shared list via ON DELETE SET NULL, with no notification
**Location:** `packages/api/src/router/user.ts:58` · **Area:** data-layer · **Severity:** medium _(finder said high)_ · **Related:** F016

**Failure scenario.** A shared-list owner deletes their account; the TaskList row is hard-deleted, ON DELETE SET NULL detaches every other member's tasks (they become personal) and ON DELETE CASCADE removes memberships — silently, with no notification.

**Fix direction.** Handle owner deletion explicitly: transfer ownership or archive the list with member notification instead of relying on raw FK cascade/set-null.

#### `G014` sync.push accepts an unbounded task array and processes it as N sequential per-task round trips with no server-side batch cap
**Location:** `packages/api/src/router/sync.ts:43` · **Area:** data-layer · **Related:** G018

**Failure scenario.** An authenticated client posts a huge tasks array to sync.push (no .max()); the handler loops sequentially issuing findFirst+insert/update per element, tying up a connection and enabling self-service DoS.

**Fix direction.** Cap the sync.push array size and batch the per-task DB work instead of N sequential round trips.

#### `G018` subtask.reorder issues one unbounded, unbatched UPDATE per array element with no size cap
**Location:** `packages/api/src/router/subtask.ts:219` · **Area:** data-layer · **Related:** G014

**Failure scenario.** An editor sends subtask.reorder with an arbitrarily large subtaskIds array (no .max()); the handler fires one UPDATE per element via Promise.all in a transaction, enabling a self-service DoS.

**Fix direction.** Cap the array size and collapse the reorder into a single batched CASE/values UPDATE.

#### `H002` packages/api/src/trpc.ts force-enables auth/cookie tracing in every production deployment, logging a cookie-name list and stable session fingerprint on every single tRPC call (web + mobile)
**Location:** `packages/api/src/trpc.ts:16` · **Area:** gap:auth-config

**Failure scenario.** In production, every tRPC call made by any signed-in web or mobile user (task.all, category.tree, etc. — not just auth flows) writes a line like `[AuthTrace][trpc] resolving session { cookieNames: [...], incomingCookie: '1409:a91f3c2' }` to stdout/production logs. Since the fingerprint is deterministic for a given cookie value, anyone with read access to the log aggregator (or logs leaked via a misconfigured sink) can correlate every API call across the app back to the same underlying session token for the lifetime of that session, without ever seeing the raw cookie — a persistent, always-on side channel that exists purely because the flag is gated on `NODE_ENV==='production'` instead of a genuine opt-in debug toggle.

**Fix direction.** Part of the DEBUG_AUTH-in-production cluster: flip the flag so verbose auth/cookie tracing is OFF unless explicitly enabled in a non-prod env; never default it on when NODE_ENV==="production". See F106.

#### `H004` No admin/role concept exists anywhere in the system, and no procedure ever mutates Report.status — the report-review lifecycle is entirely unimplemented, not merely unprotected
**Location:** `packages/api/src/router/moderation.ts:117` · **Area:** gap:moderation-authz · **Severity:** medium _(finder said high)_

**Failure scenario.** A user reports abusive content via reportContent; the row lands in Postgres with status='PENDING' (schema.ts:345 `status: reportStatusEnum("status").default("PENDING").notNull()`). There is no tRPC procedure in the entire monorepo that can ever set it to REVIEWED or DISMISSED — the enum values are permanently unreachable through the API. Every report ever filed sits as PENDING forever regardless of any future admin-panel work, because building 'an admin check on getReports' alone would not restore any moderation capability — the write side doesn't exist.

**Fix direction.** The moderation report/flag lifecycle has no actor: add a real admin/role concept (user role column + admin-gated procedures) or remove the report-review surface. Ties to F009.

#### `F085` Signed-out deep link to an invite can never reach the invite screen, and the code is dropped with no way to resume after sign-in
**Location:** `apps/expo/src/app/_layout.tsx:91` · **Area:** mobile · **Severity:** medium _(finder said high)_ · **Related:** F062

**Failure scenario.** A signed-out user taps tokilist://invite/CODE; RootLayout replaces the whole Stack with a bare AuthGuard, so the invite screen never mounts and the code is dropped — after signing in the user lands with no memory of the invite.

**Fix direction.** Preserve the pending invite (deep-link param) across the auth gate and resume the join after sign-in instead of discarding the route.

#### `F086` Snoozing a task cancels its own just-scheduled local reminder within moments, via the reschedule-safety-net effect
**Location:** `apps/expo/src/app/index.tsx:302` · **Area:** mobile · **Severity:** medium _(finder said high)_ · **Related:** F092

**Failure scenario.** During a snooze window, any later task.all fingerprint change (completing/editing another task, pull-to-refresh) re-runs rescheduleAllReminders, which cancels the snoozed task's local notification without recreating it (task absent from serverTasks) — the reminder silently vanishes.

**Fix direction.** Exclude snoozed tasks from the reschedule reconciliation or preserve their scheduled local notifications rather than cancelling on every fingerprint change.

#### `G033` React Query is never wired to AppState/NetInfo, so foreground and reconnect never trigger a refetch
**Location:** `apps/expo/src/utils/api.tsx:27` · **Area:** mobile · **Severity:** medium _(finder said high)_

**Failure scenario.** The shared QueryClient never wires focusManager/onlineManager to AppState/NetInfo; after backgrounding or reconnecting, no automatic refetch occurs, so the app shows stale data until the user manually pulls to refresh.

**Fix direction.** Wire RN AppState to focusManager.setEventListener and NetInfo to onlineManager.setEventListener so foreground/reconnect trigger refetch.

#### `F088` Mobile edit sheet holds a stale full-task snapshot and submits every field unconditionally, silently overwriting a concurrent shared-list member's edits with no version check
**Location:** `apps/expo/src/app/index.tsx:916` · **Area:** mobile · **Related:** F001

**Failure scenario.** Two shared-list members open the edit sheet on the same task; the sheet holds a stale full-task snapshot and submits every field unconditionally on save, so the second saver silently clobbers the first member's concurrent edits with no version check.

**Fix direction.** Refresh the edit buffer from live data (or diff changed fields) and add a version/conflict check on submit, consistent with the sync path.

#### `F095` Reminder offset preference is fully decorative — never applied by either the mobile local scheduler or the server cron
**Location:** `apps/expo/src/app/settings.tsx:45` · **Area:** mobile · **Related:** G006, F109

**Failure scenario.** A user sets "1 day before" reminder offset in Settings; the value is persisted but neither the mobile local scheduler nor the server cron reads it, so the reminder still fires at due time — the setting does nothing.

**Fix direction.** Apply reminderOffsetMinutes when computing scheduled reminder times on both the mobile scheduler and the server cron.

#### `G029` Widget sync silently skipped when task list becomes empty, freezing the widget on stale data
**Location:** `apps/expo/src/hooks/useWidgetSync.ts:24` · **Area:** mobile · **Related:** F092, F087

**Failure scenario.** A user's task list transitions to empty (last task deleted, or brand-new user); useWidgetSync bails when tasks.length===0, so the iOS widget is never told and keeps rendering the last non-empty snapshot indefinitely.

**Fix direction.** Sync the empty state to the widget explicitly rather than early-returning on an empty list.

#### `G036` Push-token registration has no retry after a failed attempt for the remainder of the app session
**Location:** `apps/expo/src/hooks/usePushTokenRegistration.ts:14` · **Area:** mobile · **Related:** F079

**Failure scenario.** The single push-registration attempt fails (transient error) after sign-in; the effect's [enabled] dep stays true for the whole session, so registration is never retried and the device gets no push token until next sign-out/in.

**Fix direction.** Retry registration on failure (backoff / re-trigger) rather than gating on a stably-true enabled flag.

#### `F066` Snoozing a task is a one-way action on web — no unsnooze UI and snoozed tasks vanish from every view
**Location:** `apps/nextjs/src/app/_components/tasks.tsx:386` · **Area:** web-frontend · **Severity:** medium _(finder said high)_

**Failure scenario.** A user snoozes a task on web; task.all filters out future-snoozed tasks and there is no unsnooze UI or snoozed view, so the task disappears from list and calendar until snoozedUntil elapses (up to 7 days) with no way to undo.

**Fix direction.** Wire task.unsnooze / task.snoozed into the web UI and surface snoozed tasks (or an undo affordance) so snooze is reversible.

#### `G020` No error.tsx/error boundary anywhere in apps/nextjs — every useSuspenseQuery crashes the whole page instead of showing an in-app error state
**Location:** `apps/nextjs/src/app/page.tsx:55` · **Area:** web-frontend · **Severity:** medium _(finder said high)_

**Failure scenario.** A transient failure in any of the five useSuspenseQuery call sites throws to the nearest error boundary; with no error.tsx anywhere under app/, the whole page unmounts to a blank/React error screen instead of an in-app error state.

**Fix direction.** Add route-level error.tsx (and a global-error boundary) with a retry affordance so query failures degrade gracefully.

#### `F062` Invite-code context is lost across the sign-in redirect, breaking the invite join flow for unauthenticated users
**Location:** `apps/nextjs/src/app/_components/auth-actions.ts:8` · **Area:** web-frontend · **Related:** F085

**Failure scenario.** A logged-out user opens a web invite link and clicks a social sign-in; all three sign-in actions hardcode callbackURL="/", so after OAuth they land on the homepage with the invite code lost and must re-open the original link.

**Fix direction.** Thread the invite code / return URL through the sign-in callbackURL so the user resumes the join flow post-auth.

#### `F064` The Trash view renders fully interactive TaskCards with no restore action, so every checkbox/edit/delete click on a soft-deleted task fails silently or shows a generic error
**Location:** `apps/nextjs/src/app/_components/tasks.tsx:1009` · **Area:** web-frontend · **Related:** G028

**Failure scenario.** A user clicks the checkbox/edit/delete on a genuinely soft-deleted task in the Trash view (rendered with the standard interactive TaskCard); task.update rejects the deleted row and the action fails with a generic error toast, with no restore action available.

**Fix direction.** Render Trash rows read-only and add explicit restore / permanently-delete actions instead of the standard mutating TaskCard.

#### `G021` Task card's primary Snooze/Edit/Delete actions are revealed only by mouse hover and are visually clipped when focused via keyboard
**Location:** `apps/nextjs/src/app/_components/tasks.tsx:1904` · **Area:** web-frontend

**Failure scenario.** A keyboard-only user tabs to a task card; the Snooze/Edit/Delete action row is revealed only via group-hover and is clipped by overflow-hidden, so it is unreachable/invisible on focus.

**Fix direction.** Add focus-within/focus-visible counterparts to the hover reveal so keyboard focus exposes the action row.

#### `G026` List detail page flashes "List not found" while the query is still loading
**Location:** `apps/nextjs/src/app/lists/[id]/list-detail.tsx:52` · **Area:** web-frontend

**Failure scenario.** Navigating to a list settings page, ListDetail uses a plain useQuery and treats list===undefined as "not found", so the user sees a "List not found" flash on every load before the query resolves.

**Fix direction.** Distinguish loading from not-found (check isPending/isLoading) before rendering the terminal not-found state.

#### `G027` Display name save calls a whole-cache invalidateQueries() that doesn't refresh the name it's supposed to update
**Location:** `apps/nextjs/src/app/settings/display-name-settings.tsx:32` · **Area:** web-frontend

**Failure scenario.** A user updates their display name; onSuccess calls invalidateQueries() with no args (refetching everything) yet the sidebar/header name comes from a server-rendered Better Auth prop that a client refetch never refreshes — the new name does not appear until reload.

**Fix direction.** Refresh the server-sourced user prop (router.refresh / targeted revalidation) instead of a blanket client invalidate that misses the SSR value.

### ⚪ Low

#### `F000` categoryId accepted with no ownership check → cross-user category IDOR (online task.ts path)
**Location:** `packages/api/src/router/task.ts:346` · **Area:** backend-correctness · **Severity:** low _(finder said high)_ · **Related:** F020, F017

**Failure scenario.** A client passes a categoryId belonging to another user to task.create/update; it is attached with no ownership check and joined back on reads (defense-in-depth gap; UUIDv4 is not enumerable so practical disclosure is minimal).

**Fix direction.** Validate that categoryId belongs to the acting user (or an accessible list) on write in task.ts.

#### `F020` sync.push accepts client-supplied categoryId with no ownership validation (mobile sync IDOR)
**Location:** `packages/api/src/router/sync.ts:107` · **Area:** backend-correctness · **Severity:** low _(finder said high)_ · **Related:** F000, G017

**Failure scenario.** Same categoryId-ownership gap as F000 but via the mobile sync.push create/update branches (currently low-reachability since the offline sync subsystem is not wired to a live screen).

**Fix direction.** Add the same category-ownership validation on the sync.push write branches.

#### `F012` joinByInvite lets new members join a soft-deleted shared list
**Location:** `packages/api/src/router/task-list.ts:265` · **Area:** backend-correctness · **Severity:** low _(finder said medium)_ · **Related:** F002

**Failure scenario.** A non-expiring invite is created, the list is later soft-deleted, and someone reuses the stale link; joinByInvite checks the invite's own state but not the list's deletedAt, admitting a new member into an emptied ghost list.

**Fix direction.** Check the underlying TaskList soft-delete state in joinByInvite and revoke outstanding invites on list delete.

#### `F018` processReminders is not per-channel idempotent: a thrown error after a successful push re-sends the push every cron cycle
**Location:** `packages/api/src/lib/reminders.ts:97` · **Area:** backend-correctness · **Severity:** low _(finder said medium)_ · **Related:** G005

**Failure scenario.** Push succeeds but the subsequent email send (or the reminderSentAt write) throws for a task; the shared try block skips persisting reminderSentAt, so the push is re-sent on the next hourly cron.

**Fix direction.** Persist reminderSentAt (idempotency marker) independently per channel so a downstream failure does not re-trigger the already-sent push.

#### `F007` Cron reminders endpoint is fail-open when CRON_SECRET is unset
**Location:** `apps/nextjs/src/app/api/cron/reminders/route.ts:10` · **Area:** backend-correctness · **Severity:** low _(finder said medium)_

**Failure scenario.** CRON_SECRET is left unset in an environment; the guard only runs if the secret exists, so the reminders cron endpoint is fully unauthenticated (idempotency limits spam).

**Fix direction.** Fail closed when CRON_SECRET is unset (reject) rather than skipping the check.

#### `F003` Category reparent is a non-transactional multi-statement sequence — a mid-sequence failure corrupts the materialized path tree
**Location:** `packages/api/src/router/category.ts:409` · **Area:** backend-correctness · **Severity:** low _(finder said medium)_

**Failure scenario.** A crash lands in the narrow inter-await window of a category reparent (isLeaf updates, path/depth rewrite, descendant loop are separate non-transactional statements), leaving the materialized path tree partially rewritten.

**Fix direction.** Wrap the reparent sequence in ctx.db.transaction as task.create already does.

#### `F014` Recurrence and reminder-offset math uses raw Date calendar arithmetic with no timezone anchor, so dates shift by the DST delta across transitions
**Location:** `packages/api/src/router/task.ts:126` · **Area:** backend-correctness · **Severity:** low _(finder said medium)_ · **Related:** F045

**Failure scenario.** A recurring task crosses a DST boundary; setDate/setMonth calendar math with no stored timezone shifts the due date and reminder by the ~1h DST delta seasonally.

**Fix direction.** Anchor recurrence/reminder math to a stored timezone (or document as an accepted simplification).

#### `F112` findCommissionFile fuzzy substring match can silently overwrite the wrong commission file
**Location:** `scripts/sync-tasks-to-obsidian.ts:360` · **Area:** cross-cutting · **Severity:** low _(finder said high)_ · **Related:** F119

**Failure scenario.** A Sewing/Commissions task title that is a substring of another commission file name triggers findCommissionFile's .includes() fallback, which updates the first match — overwriting the wrong commission note's checklist (personal, manually-run vault script).

**Fix direction.** Match commission files by task_id / exact name rather than a first-match substring scan.

#### `F120` Server push reminder and mobile local reminder both fire for the same task, guaranteeing a duplicate notification
**Location:** `apps/expo/src/app/index.tsx:292` · **Area:** cross-cutting · **Severity:** low _(finder said medium)_ · **Related:** F011

**Failure scenario.** A task with a reminder and default prefs fires both the server cron push and the mobile local OS notification at reminderAt, so the user gets two notifications.

**Fix direction.** Gate one channel off the other (e.g. suppress local when server push is enabled) to avoid duplicate reminders.

#### `F100` Obsidian sync script builds coding-project folder paths from unsanitized category names
**Location:** `scripts/sync-tasks-to-obsidian.ts:446` · **Area:** cross-cutting · **Severity:** low _(finder said medium)_

**Failure scenario.** routeCodingTask interpolates an unsanitized category-derived project string into a filesystem path (unlike sibling routeSewingTask), so an unusual category name can produce an unexpected path in the user's own vault.

**Fix direction.** Run the project segment through the same sanitize() used elsewhere.

#### `F119` Obsidian sync has no id-based file lookup for coding/fashion tasks — renaming a title or reclassifying silently orphans the old file
**Location:** `scripts/sync-tasks-to-obsidian.ts:462` · **Area:** cross-cutting · **Severity:** low _(finder said medium)_ · **Related:** F112

**Failure scenario.** A coding/fashion task title is renamed (or reclassified bug<->feature); the sync never reads back task_id from frontmatter, so it writes a new note and orphans the old one — recoverable duplicate notes in the owner's vault.

**Fix direction.** Look up existing notes by task_id frontmatter before writing.

#### `F102` apps/expo/src/utils/session-store.ts is entirely dead code duplicating auth-storage.ts
**Location:** `apps/expo/src/utils/session-store.ts:1` · **Area:** cross-cutting

**Failure scenario.** session-store.ts is a 7-line orphaned module with zero importers, duplicating auth-storage.ts as a misleading second source of truth for session storage.

**Fix direction.** Delete the dead module.

#### `F115` Dead music-league enum values and an unused ThemeTemplate table left in the live schema
**Location:** `packages/db/src/schema.ts:315` · **Area:** cross-cutting

**Failure scenario.** contentTypeEnum still declares unused LEAGUE/SUBMISSION/ROUND members and the ThemeTemplate table is dead leftover from the removed music-league feature.

**Fix direction.** Remove the dead enum members and table.

#### `G040` @acme/validators is a whole dead workspace package still wired as a dependency
**Location:** `packages/validators/src/index.ts:3` · **Area:** cross-cutting

**Failure scenario.** @acme/validators is dead create-t3-turbo scaffolding exporting only a schema named "unused", yet is still a declared dependency of consumers.

**Fix direction.** Remove the dead workspace package and its dependency references.

#### `F046` joinByInvite's maxUses check-then-act is not atomic and not transactional, letting concurrent joins exceed the invite's usage cap
**Location:** `packages/api/src/router/task-list.ts:289` · **Area:** data-layer · **Severity:** low _(finder said high)_

**Failure scenario.** Multiple users holding a valid invite call joinByInvite concurrently; the check-then-act reads useCount, checks maxUses in app code, and writes useCount = stale+1 non-transactionally, so the maxUses cap is overshot.

**Fix direction.** Use an atomic conditional increment (UPDATE ... SET use_count = use_count + 1 WHERE use_count < max_uses) or a row lock instead of read-modify-write.

#### `F036` The only 'archive' mechanism writes deletedAt instead of the dedicated archivedAt column, and no restore endpoint exists
**Location:** `supabase/functions/archive-completed-tasks/index.ts:42` · **Area:** data-layer · **Severity:** low _(finder said high)_ · **Related:** F051

**Failure scenario.** Every auto-archived completed task is written to deletedAt (never the dedicated archivedAt), so it appears in the Trash UI indistinguishable from a user deletion, and no restore path exists.

**Fix direction.** Write archivedAt for auto-archived tasks and distinguish archived from deleted in the Trash/restore UI.

#### `F027` PushToken.token "unique" index is not actually unique, enabling duplicate token rows
**Location:** `packages/db/src/schema.ts:466` · **Area:** data-layer · **Severity:** low _(finder said high)_ · **Related:** F041, F052

**Failure scenario.** push_token_token_unique is declared with index() not uniqueIndex(), so two concurrent registerToken calls for a new token both insert, creating duplicate rows and duplicate push sends to the device.

**Fix direction.** Change the index to uniqueIndex() and upsert on conflict.

#### `G017` sync.push's wire schema silently drops priority/recurrence/list/order fields on create, permanently losing that data
**Location:** `packages/api/src/router/sync.ts:24` · **Area:** data-layer · **Severity:** low _(finder said high)_ · **Related:** F020, G014

**Failure scenario.** A task created via sync.push loses priority/recurrence/list/order/reminder fields because SyncPushTaskSchema omits them (currently unreachable — the offline sync subsystem is not invoked by any live screen).

**Fix direction.** Add the missing fields to the sync wire schema before the offline sync path is enabled.

#### `G016` Web and mobile subtask-completion optimistic mirrors unconditionally overwrite parent completed, unlike the asymmetric server logic
**Location:** `apps/nextjs/src/app/_components/tasks.tsx:1227` · **Area:** data-layer · **Severity:** low _(finder said medium)_

**Failure scenario.** Completing a subtask, both web and mobile optimistic mirrors unconditionally set the parent completed to a value derived only from the current subtasks (unlike the asymmetric server logic), causing a brief wrong parent state until onSettled refetch corrects it.

**Fix direction.** Mirror the server's asymmetric auto-complete rule in the optimistic updater, or drop the optimistic parent write.

#### `F052` PushToken rows are never pruned when Expo reports a token invalid — the table grows unboundedly and every send retries dead tokens
**Location:** `packages/api/src/lib/push.ts:57` · **Area:** data-layer · **Severity:** low _(finder said medium)_ · **Related:** G005, F027

**Failure scenario.** Expo reports DeviceNotRegistered for a token; sendPushToUsers logs it but never deletes the PushToken row and receipts are never checked, so dead tokens accumulate and every send keeps retrying them.

**Fix direction.** Prune tokens on DeviceNotRegistered and check delivery receipts to remove invalidated tokens.

#### `F029` Bulk deleteMany re-runs assertListAccess per task with no listId dedup
**Location:** `packages/api/src/router/task.ts:591` · **Area:** data-layer · **Severity:** low _(finder said medium)_

**Failure scenario.** A 100-id deleteMany where all tasks share one list runs assertListAccess (2 round trips) per task with no listId dedup — up to ~100x redundant access checks and added latency.

**Fix direction.** Deduplicate distinct listIds and check access once per list.

#### `F031` Hourly archive UPDATE has no supporting index and scans the full task table across all users
**Location:** `supabase/functions/archive-completed-tasks/index.ts:40` · **Area:** data-layer · **Severity:** low _(finder said medium)_ · **Related:** F048

**Failure scenario.** The hourly archive UPDATE predicate (completed, completed_at, deleted_at) is not user-scoped and every matching index is userId-prefixed, so it full-scans the task table each run.

**Fix direction.** Add a supporting non-user-prefixed partial index for the archive predicate.

#### `F032` Soft-deleted categories keep surfacing through unfiltered with:{category:true} joins
**Location:** `packages/api/src/router/task.ts:197` · **Area:** data-layer · **Severity:** low _(finder said medium)_

**Failure scenario.** A category is soft-deleted (deletedAt set) but Task.categoryId is untouched; task queries eager-load category via with:{category:true} with no deletedAt filter, so the stale category label keeps showing on the owner's tasks.

**Fix direction.** Filter isNull(Category.deletedAt) on the joined category (or null out Task.categoryId on category delete).

#### `F041` registerToken's find-then-write race combined with the non-unique push_token index produces duplicate token rows and double sends
**Location:** `packages/api/src/router/notification.ts:23` · **Area:** data-layer · **Severity:** low _(finder said medium)_ · **Related:** F027

**Failure scenario.** registerToken does find-then-write with no DB uniqueness backstop (F027); concurrent calls for a new token both pass the existence check and both insert, yielding duplicate token rows / double sends.

**Fix direction.** Rely on a real unique constraint + upsert instead of find-then-insert.

#### `F048` No composite index backs the hourly reminders-due query; the only index on the hot column ignores the other three predicates
**Location:** `packages/db/src/schema.ts:200` · **Area:** data-layer · **Severity:** low _(finder said medium)_ · **Related:** F031

**Failure scenario.** The hourly reminders-due query filters four columns but task_reminder_at_idx covers only reminderAt, forcing heap fetches/filtering for the other three predicates.

**Fix direction.** Add a composite/partial index covering the reminders-due predicate.

#### `F033` task.deleted has no pagination/limit unlike its sibling task queries
**Location:** `packages/api/src/router/task.ts:207` · **Area:** data-layer

**Failure scenario.** task.deleted loads every soft-deleted/archived task with full relations and no limit (unlike sibling queries capped at 100) — potentially large payload for heavy trash (arguably intentional to show all restorable tasks).

**Fix direction.** Add pagination if trash size becomes a concern (or accept as intentional).

#### `G019` reminders.ts fetches PushToken rows per due task that are never consumed — dead N+1 round trip
**Location:** `packages/api/src/lib/reminders.ts:63` · **Area:** data-layer · **Related:** G005

**Failure scenario.** getUpcomingReminders issues a PushToken.findMany per due task whose result is never read (processReminders re-queries by userId), a dead N+1 round trip.

**Fix direction.** Remove the unused per-task PushToken fetch.

#### `H001` AUTH_DEBUG_* session-lifetime overrides have no environment gate and no numeric validation, so a stray/leftover env var silently shortens or corrupts session lifetime in production
**Location:** `apps/nextjs/src/auth/server.ts:31` · **Area:** gap:auth-config · **Severity:** low _(finder said medium)_

**Failure scenario.** A developer sets `AUTH_DEBUG_SESSION_EXPIRES_IN_SEC=60` (or copies a `.env` file wholesale) into Vercel's Production project environment while debugging the session issues described in OPENCLAW_AUTH_HANDOFF.md, then forgets to remove it after the investigation. Because server.ts never checks environment before applying the override, every production user's session now expires in 60 seconds instead of 30 days, forcing re-login constantly — or, if the value is mistyped (e.g. `AUTH_DEBUG_SESSION_EXPIRES_IN_SEC=prod`), `Number('prod')` is `NaN`, which is passed straight through to better-auth's session config with no validation error anywhere in the pipeline, producing undefined session-expiry behavior in production.

**Fix direction.** Gate the AUTH_DEBUG_* session overrides behind VERCEL_ENV !== "production" and validate them with z.coerce.number() so a stray/typo env var cannot silently shorten or NaN-corrupt production session lifetime.

#### `H012` next pinned to exact 16.2.4, predates May 2026 coordinated Next.js security release (13 CVEs, fixed 16.2.6)
**Location:** `apps/nextjs/package.json:41` · **Area:** gap:dep-advisories · **Severity:** low _(finder said medium)_

**Failure scenario.** A remote, unauthenticated attacker sends a specially-crafted HTTP request to an App Router Server Function/Server Action endpoint in the Next.js app, triggering excessive CPU usage server-side and causing a denial of service, without needing to bypass any middleware.

**Fix direction.** next is pinned to exact 16.2.4; keep it patched and watch Next.js security advisories. NOTE: the finder asserted a specific dated advisory that could not be independently confirmed here — treat the version-currency concern as real but the specific CVE claim as unverified.

#### `H013` nativewind pinned to prerelease 5.0.0-preview.2 as a production dependency in the Expo app
**Location:** `apps/expo/package.json:74` · **Area:** gap:dep-advisories

**Failure scenario.** An app-store production build of the Expo app ships with a nativewind preview build carrying open, acknowledged bugs (broken Modals, CSS @import failures on native, missing type declarations), any of which could surface as a runtime crash or visual/functional regression for end users with no stable-release fallback to revert to.

**Fix direction.** nativewind is pinned to prerelease 5.0.0-preview.2 in production; move to a stable release when available. Not a security issue.

#### `H010` Supabase project JWT hardcoded in committed SQL setup script
**Location:** `supabase/functions/archive-completed-tasks/setup-cron.sql:17` · **Area:** gap:env-secret-boundary

**Failure scenario.** Low practical risk since this is an anon key gated by RLS, not a service-role key — genuine impact would only occur if RLS policies on the underlying tables are missing or misconfigured, in which case anyone with this committed key (visible to anyone with repo access, including in git history even if later rotated) could call the archive-completed-tasks function or any RLS-exempt table directly. The more actionable issue is process hygiene: committing a live, working project key/ref pair into a setup script instead of requiring the operator to supply their own via env var or dashboard copy-paste.

**Fix direction.** Rotate the Supabase project JWT committed in the SQL setup script and scrub it from git history; move it to an env var / secret store.

#### `H003` TaskListMember.showInFilter column was added to schema.ts but never emitted to any migration SQL file
**Location:** `packages/db/src/schema.ts:252` · **Area:** gap:migration-drift · **Severity:** low _(finder said high)_

**Failure scenario.** Provision a new/staging/CI Postgres instance by running the checked-in migrations (`drizzle-kit migrate` against packages/db/drizzle/*.sql) instead of `pnpm db:push` — a very plausible path for disaster recovery or onboarding since the migration files exist and look authoritative. The resulting `task_list_member` table lacks `show_in_filter`. The first call to task-list.ts's list query (line 37) or the showInFilter-update mutation (line 458-466) throws `column "show_in_filter" does not exist`, breaking shared-list rendering and the per-member 'show in filter' toggle in both the Next.js sidebar/list-filter and the Expo list screen.

**Fix direction.** Migration hygiene: regenerate drizzle migrations so every schema.ts column (e.g. TaskListMember.showInFilter) is represented, or document that db:push is the source of truth and retire the stale drizzle/ SQL to avoid a migrate-based deploy provisioning a wrong schema. See the migration-drift note.

#### `H005` Auto-flagged content (ContentFlag) has no read endpoint anywhere — the keyword-blocklist moderation feature is entirely write-only and unreachable via the API
**Location:** `packages/api/src/router/moderation.ts:10` · **Area:** gap:moderation-authz · **Severity:** low _(finder said medium)_

**Failure scenario.** A user submits a task title containing a slur or threat (e.g. matching the BLOCKLIST in content-filter.ts:7-24). A ContentFlag row is silently written to the database, but since no procedure ever reads the ContentFlag table, this flagged content is invisible through the app/API forever — the only way to see it is a direct database console session, which defeats the purpose of having an in-app moderation queue at all.

**Fix direction.** ContentFlag rows are written but never readable by anyone — either build the admin read path or drop the auto-flag write; today it is dead moderation data.

#### `H006` reportContent never runs report `details` through the app's own content-filter blocklist, unlike every other user-generated-text path
**Location:** `packages/api/src/router/moderation.ts:18` · **Area:** gap:moderation-authz · **Severity:** low _(finder said medium)_

**Failure scenario.** A malicious user files a report (reason='HARASSMENT') whose `details` field contains threatening or slur-laden text targeting a named `reportedUserId`. That text is stored unfiltered and — via getReports, which any signed-in user can already call with no admin check — is readable by every other user in the app, turning the report system into an unmoderated broadcast channel for exactly the kind of content the blocklist elsewhere in the app is designed to catch.

**Fix direction.** Consistency: run report free-text details through the same content filter used elsewhere, or accept it explicitly; low security impact.

#### `H007` reportContent.contentId is unbounded, non-existence-checked, and has no foreign key — any authenticated user can insert unlimited garbage/oversized Report rows with no rate limiting anywhere in the API
**Location:** `packages/api/src/router/moderation.ts:15` · **Area:** gap:moderation-authz · **Severity:** low _(finder said medium)_

**Failure scenario.** An authenticated user scripts repeated calls to reportContent with a `contentId` that is megabytes long (or simply nonexistent/garbage), and reason/contentType set arbitrarily. There is no length cap, no verification the referenced content exists, and no per-user rate limit anywhere in the stack, so the Report table can be flooded with unbounded-size, referentially meaningless rows with only the client's own patience as a limit — a storage/DoS vector with no admin tooling (per the first finding) to ever clean it up.

**Fix direction.** Add .max() length bounds and (where applicable) existence checks to reportContent.contentId / reportedUserId; unbounded free-form IDs allow garbage/oversized rows.

#### `F080` Widget pending-action queue is cleared unconditionally per foreground pass, but never per-action — one failing action loses all others
**Location:** `apps/expo/src/hooks/useWidgetSync.ts:77` · **Area:** mobile · **Severity:** low _(finder said medium)_ · **Related:** G031

**Failure scenario.** A widget pending action fails mid-loop (e.g. task deleted server-side); useWidgetActions only clears the queue after the whole loop, so the throw leaves the queue uncleared and other actions are reprocessed / a poison entry can overwrite newer state.

**Fix direction.** Clear/ack each action individually as it succeeds so one failure does not affect the rest.

#### `F087` Widget sync rate-limiter drops updates with no retry, leaving the widget stale until an unrelated change re-triggers a sync
**Location:** `apps/expo/src/hooks/useWidgetSync.ts:34` · **Area:** mobile · **Severity:** low _(finder said medium)_ · **Related:** G029, F092

**Failure scenario.** Two task changes occur within ~1s; useWidgetSync's rate limiter drops the second sync with no reschedule, leaving the iOS widget stale until an unrelated change re-triggers a sync.

**Fix direction.** Reschedule a trailing sync after the rate-limit window instead of dropping the update.

#### `F092` Local task reminders never cancelled when active task list drops to zero via a remote action
**Location:** `apps/expo/src/app/index.tsx:303` · **Area:** mobile · **Severity:** low _(finder said medium)_ · **Related:** F086, G029

**Failure scenario.** A remote (web/other-device) action drops the user's serverTasks to empty; the sync-reminders effect bails on empty arrays, so previously-scheduled local reminders for now-gone tasks are never cancelled and can fire.

**Fix direction.** Cancel stale local reminders even when serverTasks is empty.

#### `F096` Signing out never revokes the device's push token server-side
**Location:** `apps/expo/src/components/ProfileMenu.tsx:109` · **Area:** mobile · **Severity:** low _(finder said medium)_ · **Related:** F079

**Failure scenario.** A user signs out on mobile; the flow clears the local session and cache but never calls notification.removeToken, so the Expo token stays active and the signed-out user keeps receiving their own notifications on that device.

**Fix direction.** Call notification.removeToken during sign-out before clearing the session.

#### `G031` useWidgetActions reprocesses the pending-actions queue on every re-render, not just app-foreground transitions
**Location:** `apps/expo/src/app/index.tsx:431` · **Area:** mobile · **Severity:** low _(finder said medium)_ · **Related:** F080

**Failure scenario.** index.tsx passes fresh inline (non-useCallback) closures to useWidgetActions on every render; the effect re-runs and re-reads the pending-actions queue on every re-render rather than only on foreground (common case: extra no-op reads).

**Fix direction.** Memoize the callbacks (useCallback) and scope processing to actual foreground transitions.

#### `G032` "custom" recurrence rule is fully implemented server-side but has no selectable UI in the mobile task form
**Location:** `apps/expo/src/components/TaskFormSheet.tsx:140` · **Area:** mobile

**Failure scenario.** The "custom" recurrence rule is fully implemented server-side and in the RN type but the mobile Repeat picker offers no pill for it — an unreachable dead feature on mobile.

**Fix direction.** Add a custom-recurrence UI or remove the unreachable option.

#### `F073` Header search input is fully decorative — no state, no handler, no filtering logic anywhere
**Location:** `apps/nextjs/src/app/_components/task-header.tsx:77` · **Area:** web-frontend · **Severity:** low _(finder said high)_

**Failure scenario.** A user types into the prominent header search box; it has no state/onChange/filtering wired, so nothing happens — a fully decorative primary control.

**Fix direction.** Wire the search input to task filtering state or remove it.

#### `F054` Live theme has diverged from hardcoded 'old emerald' colors baked into major UI surfaces
**Location:** `apps/nextjs/src/app/_components/tasks.tsx:792` · **Area:** web-frontend · **Severity:** low _(finder said medium)_

**Failure scenario.** Some UI surfaces (multiple-select, calendar, invite page, a token in tasks.tsx) hardcode the abandoned Emerald palette while the live theme is the newer Liquid Glass palette, producing subtle color inconsistency.

**Fix direction.** Replace hardcoded colors with theme tokens.

#### `F055` Primary task/subtask checkboxes render below the usable touch-target size on mobile web
**Location:** `apps/nextjs/src/app/_components/tasks.tsx:1644` · **Area:** web-frontend · **Severity:** low _(finder said medium)_

**Failure scenario.** The mobile main checkbox (16px) and subtask checkbox (14px) render below the WCAG AA 24px target with no padded hit area, causing mis-taps (desktop 24px meets AA).

**Fix direction.** Enforce a >=24px (ideally 44px) hit area via padding wrappers on the checkboxes.

#### `F058` Root layout disables pinch-to-zoom app-wide
**Location:** `apps/nextjs/src/app/layout.tsx:33` · **Area:** web-frontend · **Severity:** low _(finder said medium)_

**Failure scenario.** The viewport config sets maximumScale:1/userScalable:false, disabling pinch-to-zoom and text resize app-wide (WCAG 1.4.4 failure; iOS Safari ignores it so some users are unaffected).

**Fix direction.** Remove the zoom-blocking viewport constraints.

#### `F063` Blocked-users settings page has no auth guard and shows an empty state to logged-out visitors instead of the auth error
**Location:** `apps/nextjs/src/app/settings/blocked-users/page.tsx:16` · **Area:** web-frontend · **Severity:** low _(finder said medium)_

**Failure scenario.** A logged-out visitor hits /settings/blocked-users directly; the client-only page ignores the UNAUTHORIZED query error and renders the same "No blocked users" empty state as a real user with zero blocks.

**Fix direction.** Add a server session guard / render the auth error instead of a misleading empty state.

#### `F070` Due-date "overdue" check treats an all-day due date as due at midnight, not end of day
**Location:** `apps/nextjs/src/app/_components/tasks.tsx:1601` · **Area:** web-frontend · **Severity:** low _(finder said medium)_

**Failure scenario.** A task due "today" (stored local midnight) is compared to new Date() by isDueDateOverdue, so it is styled overdue for essentially the whole due day rather than after end-of-day.

**Fix direction.** Compare against end-of-day for all-day due dates.

#### `F074` Sidebar open/collapsed state is written to a cookie every toggle but never read back; the layout hardcodes it closed
**Location:** `apps/nextjs/src/app/layout.tsx:61` · **Area:** web-frontend · **Severity:** low _(finder said medium)_

**Failure scenario.** The sidebar writes its open/collapsed state to a cookie on every toggle, but SidebarProvider is instantiated with hardcoded defaultOpen={false} and never reads the cookie, so the state never persists across loads.

**Fix direction.** Read the sidebar_state cookie to seed defaultOpen (or drop the dead persistence).

#### `F078` joinByInvite success never invalidates taskList queries, so the newly joined list can be briefly invisible in the sidebar/filter
**Location:** `apps/nextjs/src/app/invite/[code]/page.tsx:19` · **Area:** web-frontend · **Severity:** low _(finder said medium)_

**Failure scenario.** After joinByInvite success the mutation only toasts and router.push("/"); it never invalidates taskList queries, so the newly joined list can be missing from the sidebar/filter until staleTime lapses (mitigated by SSR re-prefetch on navigation).

**Fix direction.** invalidateQueries the taskList list on join success.

#### `G022` One-click task delete with no confirmation and no error handling, inconsistent with other destructive actions
**Location:** `apps/nextjs/src/app/_components/tasks.tsx:1944` · **Area:** web-frontend · **Severity:** low _(finder said medium)_

**Failure scenario.** A user single-clicks delete on a task (no confirmation); the deleteTask mutation has no onError, so a network/permission failure leaves the UI silently wrong (delete is soft/recoverable so misclick harm is limited).

**Fix direction.** Add an onError toast; optionally a confirm for consistency with other destructive actions.

#### `G025` Shared-list push-notification opt-out preference has no UI anywhere in the web app
**Location:** `apps/nextjs/src/app/settings/notification-settings.tsx:32` · **Area:** web-frontend · **Severity:** low _(finder said medium)_

**Failure scenario.** The server fully implements and enforces the sharedListActivity opt-out preference, but the web app exposes no UI to toggle it, so users cannot opt out on web.

**Fix direction.** Add the shared-list-activity toggle to web notification settings.

#### `F060` eslint-plugin-jsx-a11y is a declared but completely unwired dependency
**Location:** `tooling/eslint/package.json:20` · **Area:** web-frontend

**Failure scenario.** eslint-plugin-jsx-a11y is a declared dependency but never wired into any eslint config, so a11y lint rules silently never run.

**Fix direction.** Wire the plugin into the react/nextjs eslint config (or drop the dependency).

#### `G023` Dead duplicate category-management UI ships a different (native confirm()) delete flow than the one actually mounted
**Location:** `apps/nextjs/src/app/categories/category-components.tsx:253` · **Area:** web-frontend

**Failure scenario.** categories/category-components.tsx ships a full parallel category CRUD (with a native confirm() delete) that is never mounted; only its skeleton export is used — dead, divergent code.

**Fix direction.** Delete the unused parallel implementation.

#### `G024` Invite-link clipboard copy has no error handling, unlike the app's own reference implementation
**Location:** `apps/nextjs/src/app/lists/[id]/list-detail.tsx:142` · **Area:** web-frontend

**Failure scenario.** handleCopyInvite awaits navigator.clipboard.writeText with no try/catch and a bare onClick, so a clipboard failure becomes an unhandled rejection with the button silently doing nothing.

**Fix direction.** Add error handling / user feedback consistent with the app's other copy implementation.

#### `G028` Category and Priority filter pills stay visible and interactive in the Deleted Tasks view but have zero effect there
**Location:** `apps/nextjs/src/app/_components/task-header.tsx:56` · **Area:** web-frontend · **Related:** F064

**Failure scenario.** In the Deleted Tasks view the Category/Priority filter pills stay visible and interactive but the deleted query is unfiltered, so they have no effect there.

**Fix direction.** Hide or disable the filter pills in the deleted view.

## Completeness critic — what could still hide

The sweep was genuinely broad — 88 confirmed survivors spanning every tRPC router, the sync protocol, reminders/push libs, the Supabase archive function, the Obsidian script, web frontend, mobile, and the Swift widget. Data-layer, backend-correctness, and web-frontend are well-saturated. The clear structural blind spot is the AUTHENTICATION TRUST BOUNDARY: packages/auth/src/index.ts, apps/nextjs/src/auth/server.ts, and auth-cli.ts appear in ZERO findings, yet they hold the account-linking policy, the (production-enabled) OAuth proxy, and the wildcard trustedOrigins — exactly where Better Auth's well-known account-takeover and open-redirect footguns live. My highest-confidence NEW gap is a confirmed fact, not a guess: the drizzle/ migrations stop at 0002 (Mar 3) while schema.ts was edited Mar 16, so the schema→migration→prod-DB invariant is broken and untraced. Biggest remaining blind spot in my own audit: I could not dynamically verify the auth-config or widget concerns statically — they need a focused Better Auth-aware reviewer (ideally checking better-auth default account-linking behavior against the installed version) and someone who can reason about the App Group / App Intent authorization path. The dependency-CVE angle is genuinely unexamined but low-yield. Given the 11-round cap with no dry rounds, I'd weight the auth-config sweep as the single most likely place a real high-severity defect still hides.

The high/medium gaps below were **swept and verified** in the final round (results folded into Findings above as H0xx). Remaining lower-priority gaps are listed for follow-up:

- **[high] Better Auth configuration security is completely unexamined — no finding touches account-linking, oAuthProxy open-redirect, trustedOrigins wildcards, or cookie hardening. This is the single highest-value blind spot: it is the app's authentication trust boundary and the sweep never entered it.**  
  _Where:_ packages/auth/src/index.ts (initAuth), apps/nextjs/src/auth/server.ts (enableOAuthProxy: true unconditionally in prod), packages/auth/script/auth-cli.ts. Focus on: (1) NO account.accountLinking config — Better Auth's default cross-provider linking behavior with Discord+Google+Apple, where Apple relay emails or an unverified provider email can link into an existing account; (2) oAuthProxy enabled in production web combined with the broad trustedOrigins list (http://localhost:*, exp://**, https://*.exp.direct, https://calayo.net apex) — documented open-redirect surface; (3) no advanced.useSecureCookies / sameSite / cookiePrefix config, relying on defaults; (4) getSession is a publicProcedure returning the full session object.  
  _Suspected:_ Account-takeover via automatic cross-provider account linking on an unverified/spoofable email, and/or open-redirect through the OAuth proxy leveraging a wildcard trusted origin. Both are HIGH severity and neither was tested.
- **[high] Schema-to-migration-to-production-DB integrity was never traced. Drizzle migrations stop at 0002 (Mar 3) but schema.ts was last edited Mar 16 — later schema changes have NO corresponding migration, and CLAUDE.md deploys via `pnpm db:push`, leaving drizzle/ migrations stale/decorative. Several data-layer findings (F027 non-unique PushToken index, priority/parentId CHECK constraints) assert what schema.ts declares but nobody confirmed the actual DB matches.**  
  _Where:_ packages/db/drizzle/*.sql + meta/_journal.json (three migrations, newest 1772549438310 = Mar 3) vs packages/db/src/schema.ts (mtime Mar 16, 14 tables). Diff schema.ts tables/indexes/constraints against the cumulative migration SQL: are user.notificationPreferences jsonb, PushToken table shape, UserPreference, ThemeTemplate, TaskListInvite constraints, and the schema's sql`` CHECK constraints (lines 82, 205) present in any migration? Cross-check F027/F048/F037/F048 index claims against the emitted SQL, not just the TS.  
  _Suspected:_ Environment drift: a deploy that runs drizzle-kit migrate (instead of db:push) provisions a DB missing recent columns/indexes/constraints, silently breaking queries or dropping the declared uniqueness/CHECK guarantees the app assumes. Medium-high integrity risk.
- **[medium] No admin/authorization model exists, but the moderation subsystem writes Reports and ContentFlags that only an admin could action — the end-to-end moderation invariant was never traced to a verdict. F009 (getReports has no role check) is a symptom; the deeper question is whether ANY admin capability exists and whether every protectedProcedure that should be privileged is systematically broken, not just one endpoint.**  
  _Where:_ packages/api/src/router/moderation.ts (getReports, report, block/unblock), packages/db/src/schema.ts Report/ContentFlag/BlockedUser tables, and search the whole repo for any 'role'/'admin'/'isAdmin' concept on the user table or session. Confirm whether report status transitions (pending/reviewed/dismissed) are reachable by anyone, and whether moderation.contentId/reportedUserId/blockedUserId (free-form z.string(), not uuid — moderation.ts:15-16,45,69) allow reporting/blocking arbitrary or non-existent IDs, self-blocking, or unbounded contentId.  
  _Suspected:_ Systemic broken authorization: the entire moderation feature is either non-functional (no admin can act) or fully exposed (any user enumerates/actions all reports), plus IDOR/garbage-data via unvalidated free-form ID inputs. Medium-high.
- **[medium] The SwiftUI native widget + native bridge surface is under-served — only one finding (F084) across a large body of Swift/App-Intent/App-Group/deep-link code. The date-decode no-op was found, but the data-sharing and action-authorization path around it was not swept to a verdict.**  
  _Where:_ apps/expo/widgets/TodoWidget.swift and any App Intent / interactive-checkbox handler, the App Group shared UserDefaults/container read-write, and the mobile side that populates it (apps/expo/src/hooks/useWidgetSync.ts, useWidgetActions in apps/expo/src/app/index.tsx). Look at what identity/authorization the widget action carries when it toggles a task, whether it writes to a shared container that another app/user context could read, and whether stale/foreign task IDs from the widget queue are validated before being applied server-side.  
  _Suspected:_ Widget-originated task mutations applied with no auth/ownership revalidation, or task content leaking into a world/other-app-readable App Group container. Hard to verify statically but plausibly medium.
- **[low] Env-var validation and client/server secret boundary (@t3-oss/env schemas) were never examined, despite the mapper flagging a committed Supabase JWT (F099) and DEBUG_AUTH leakage (F106) — the class of 'secret exposed to the wrong runtime' was only spot-hit, not swept.**  
  _Where:_ packages/auth/env.ts and apps/nextjs/src/env.ts: verify no server-only secret (AUTH_SECRET, *_SECRET, POSTGRES_URL, CRON_SECRET) is declared under the client/runtimeEnv client block or prefixed EXPO_PUBLIC_/NEXT_PUBLIC_; check apps/expo for any EXPO_PUBLIC_ var carrying a secret. Also confirm the AUTH_DEBUG_* numeric casts (server.ts) can't be set in a non-preview environment.  
  _Suspected:_ A server secret bundled into the client bundle (Next public env or Expo public env), leaking credentials to end users. Low-medium — bounded surface but high impact if present.
- **[low] The killed set shows a suspiciously high uniform kill pattern for cross-cutting/dependency findings (F103 NativeWind prerelease, F104/F110 dead pins, F118 superjson, F117 icon libs all refuted) — the dependency/supply-chain dimension was searched as 'dead config' only, never as an actual CVE/known-vuln angle. No finding examined installed versions against known advisories.**  
  _Where:_ Run against pnpm-lock.yaml / package.json the actual pinned versions of security-sensitive deps: better-auth, @better-auth/expo, drizzle-orm, next (16 canary?), the Neon/pg driver, expo SDK 55, and superjson. Check for prerelease/canary majors of Next 16 and React 19 in production, and any dep with a known advisory at the pinned version.  
  _Suspected:_ A pinned dependency (esp. a canary/prerelease of Next 16 or an old better-auth) carrying a known auth-bypass or SSRF advisory that the 'dead-config' lens structurally could not surface. Low likelihood of a confirmed hit but zero prior coverage.

## Appendix — refuted findings (not included above)

51 findings were investigated and **killed** by the adversarial panel (wrong, unreachable, intended behavior, or already guarded). Recorded so they are not re-litigated:

| id | title | claimed sev | area | panel verdict |
|---|---|---|---|---|
| G000 | Fire-and-forget content-flag insert uses the global db client instead of the enclosing tra | medium | backend-correctness | reproduce:ok \| impact:refuted \| intended:refuted |
| G007 | task.update lets a caller mark a parent task complete while its subtasks are still incompl | high | backend-correctness | reproduce:ok \| impact:refuted \| intended:refuted |
| F015 | subtask.create and subtask.delete never recompute the parent task's auto-complete invarian | high | backend-correctness | reproduce:ok \| impact:refuted \| intended:refuted |
| G044 | Task.version invariant is dead: the live (non-sync) write path never increments it, silent | high | cross-cutting | reproduce:refuted \| impact:refuted \| intended:refuted |
| G041 | notification.registerToken lets any authenticated user hijack another user's push-token ro | high | cross-cutting | reproduce:ok \| impact:refuted \| intended:refuted |
| F021 | post.delete has no ownership or auth-role check at all | high | backend-correctness | reproduce:ok \| impact:refuted \| intended:refuted |
| F004 | Subtask auto-complete-parent and completion-push are computed from an unlocked stale read  | medium | backend-correctness | reproduce:ok \| impact:refuted \| intended:refuted |
| F024 | Content moderation only scans the task title at creation time — descriptions, edits, and s | low | backend-correctness | reproduce:ok \| impact:refuted \| intended:refuted |
| F025 | Reminder cron ignores Task.archivedAt, firing push/email for archived (hidden) tasks | medium | backend-correctness | reproduce:ok \| impact:refuted \| intended:refuted |
| F028 | Reminder cron does unbounded fetch plus O(3n) sequential N+1 queries per due task | high | data-layer | reproduce:ok \| impact:refuted \| intended:refuted |
| F030 | sync.pull's (userId, updatedAt) delta query has no supporting composite index | medium | data-layer | reproduce:ok \| impact:refuted \| intended:refuted |
| F037 | Category.path containment queries (arrayContains/@>) have no GIN index; the declared index | medium | data-layer | reproduce:ok \| impact:refuted \| intended:refuted |
| F038 | Category reparent descendant rewrite issues one UPDATE per descendant instead of a single  | low | data-layer | reproduce:ok \| impact:refuted \| intended:refuted |
| F042 | taskList.byId loads every member and every task in a shared list with no limit, unlike eve | medium | data-layer | reproduce:ok \| impact:refuted \| intended:refuted |
| F043 | The Neon Pool has no 'error' event listener, so a dropped/idle connection can crash the wh | medium | data-layer | reproduce:ok \| impact:refuted \| intended:refuted |
| F047 | completed:true + completedAt:null is a reachable, unenforced combination that permanently  | medium | data-layer | reproduce:ok \| impact:refuted \| intended:refuted |
| F049 | Every task read endpoint eager-loads the related TaskList with no deletedAt filter, surfac | low | data-layer | reproduce:ok \| impact:refuted \| intended:refuted |
| F050 | drizzle.config.ts's direct-connection URL derivation silently no-ops for any pooler port o | low | data-layer | reproduce:refuted \| impact:refuted \| intended:refuted |
| F053 | Destructive button text fails WCAG AA contrast using live theme tokens | high | web-frontend | reproduce:refuted \| impact:refuted \| intended:refuted |
| F057 | Web UI has no control for recurrenceEndDate even though schema/API fully support it | medium | web-frontend | reproduce:ok \| impact:refuted \| intended:refuted |
| F059 | next.config.js falsely claims CI enforces lint/typecheck; no CI exists in the repo | medium | web-frontend | reproduce:ok \| impact:refuted \| intended:refuted |
| F065 | Calendar grid renders a fully-blank next-month row for 28-day-Sunday-start months | medium | web-frontend | reproduce:refuted \| impact:refuted \| intended:refuted |
| F067 | Viewer-role members get full mutate-capable task UI with no client-side awareness of their | high | web-frontend | reproduce:ok \| impact:refuted \| intended:refuted |
| F068 | Account-deletion error handling has no fallback and will surface a raw Postgres constraint | medium | web-frontend | reproduce:refuted \| impact:refuted \| intended:refuted |
| F069 | Invite page's own "Sign in" button performs no authentication | medium | web-frontend | reproduce:ok \| impact:refuted \| intended:refuted |
| F071 | Recurrence label renders "Every N s" with no unit noun for the schema-valid 'custom' recur | low | web-frontend | reproduce:ok \| impact:refuted \| intended:refuted |
| F072 | theme.css declares --shadow-glow / --shadow-glow-hover twice with contradictory abandoned- | low | web-frontend | reproduce:refuted \| impact:refuted \| intended:refuted |
| F075 | Global Ctrl/Cmd+B sidebar shortcut fires while typing in any input, with no focused-elemen | low | web-frontend | reproduce:ok \| impact:refuted \| intended:refuted |
| F076 | packages/ui's Calendar component (`./calendar` export) is dead code that still carries the | low | web-frontend | reproduce:refuted \| impact:refuted \| intended:ok |
| F077 | ListFilter and CategoryFilter silently disappear on query error with no retry or error UI, | medium | web-frontend | reproduce:ok \| impact:refuted \| intended:refuted |
| F082 | Auth-session invalidation races: session-token mirror is deleted asynchronously (un-awaite | medium | mobile | reproduce:refuted \| impact:refuted \| intended:refuted |
| F083 | Dead offline-sync stack: successful push never resets local task syncStatus back to 'synce | low | mobile | reproduce:refuted \| impact:refuted \| intended:refuted |
| F089 | Duplicate sync-queue rows for the same task are never fully reconciled — only the first ma | medium | mobile | reproduce:refuted \| impact:refuted \| intended:refuted |
| F090 | Sync-queue retry-count boundary is off-by-one against its own MAX, and the computed expone | low | mobile | reproduce:refuted \| impact:refuted \| intended:refuted |
| F091 | Notification action-button mutations (snooze/mark-done) have no offline queueing, retry, o | medium | mobile | reproduce:ok \| impact:refuted \| intended:refuted |
| F093 | Session-recovery attempt permanently disabled after first failure, blocking recovery from  | medium | mobile | reproduce:ok \| impact:refuted \| intended:refuted |
| F094 | Generated SQLite migrations are never applied at runtime (dead-code-only) | low | mobile | reproduce:refuted \| impact:refuted \| intended:refuted |
| F099 | Live-looking Supabase anon-key JWT and project URL committed to setup-cron.sql | medium | cross-cutting | reproduce:ok \| impact:refuted \| intended:refuted |
| F103 | NativeWind pinned to an outdated prerelease as a production dependency for the shipping mo | low | cross-cutting | reproduce:refuted \| impact:refuted \| intended:refuted |
| F104 | Dead Prisma allowlist entries in pnpm-workspace.yaml with no Prisma dependency anywhere in | low | cross-cutting | reproduce:ok \| impact:refuted \| intended:refuted |
| F105 | No CI workflow exists at all, and Next.js is configured to ignore TypeScript errors on bui | medium | cross-cutting | reproduce:ok \| impact:refuted \| intended:refuted |
| F110 | pnpm-workspace.yaml pins/overrides three Vite-related packages that are not used anywhere  | low | cross-cutting | reproduce:ok \| impact:refuted \| intended:refuted |
| F113 | --clean flag deletes the entire Obsidian Tasks/ folder with no confirmation prompt | low | cross-cutting | reproduce:refuted \| impact:refuted \| intended:refuted |
| F114 | Every tRPC request (web + mobile) logs cookie names and a fingerprint hash in production,  | medium | cross-cutting | reproduce:ok \| impact:refuted \| intended:refuted |
| F116 | AUTH_DEBUG_* env vars silently override production session lifetime with an unchecked Numb | medium | cross-cutting | reproduce:refuted \| impact:refuted \| intended:refuted |
| F117 | Two icon libraries and two Radix import styles are both actively used in packages/ui, cont | low | cross-cutting | reproduce:refuted \| impact:refuted \| intended:refuted |
| F118 | superjson is exact-pinned to 2.2.6 in three separate package.json files, bypassing the pnp | low | cross-cutting | reproduce:refuted \| impact:refuted \| intended:refuted |
| G003 | taskList.byId hands every member's private email address to any member, including a viewer | medium | backend-correctness | reproduce:ok \| impact:refuted \| intended:refuted |
| G038 | Web app has zero error tracking/observability, unlike mobile's full Sentry integration | medium | cross-cutting | reproduce:refuted \| impact:refuted \| intended:refuted |
| G042 | Dead CategoryForm component's type-unsafe validator cast masks a schema/default-value mism | low | cross-cutting | reproduce:refuted \| impact:refuted \| intended:refuted |
| gap | Migrations still create six music-league tables and three enum types that were deleted fro | medium | gap:migration-drift | refuted |

---

_Audit produced by orchestrated subagents; every finding above was confirmed against the real code by at least two independent adversarial verifiers. Line numbers are best estimates — confirm against the current tree before acting._