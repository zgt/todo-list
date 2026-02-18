import { eq } from "@acme/db";
import { db } from "@acme/db/client";
import { LeagueMember, Round, Submission } from "@acme/db/schema";

import { sendPushToUsers } from "../push";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function getLeagueMemberIds(leagueId: string): Promise<string[]> {
  const members = await db.query.LeagueMember.findMany({
    where: eq(LeagueMember.leagueId, leagueId),
    with: { user: true },
  });
  return members
    .filter((m) => {
      const prefs = m.user.notificationPreferences as Record<string, boolean> | null;
      // Default to opted-in if no preferences set
      return prefs === null || prefs === undefined;
    })
    .map((m) => m.userId);
}

async function getLeagueMemberIdsWithPref(
  leagueId: string,
  prefKey: string,
): Promise<string[]> {
  const members = await db.query.LeagueMember.findMany({
    where: eq(LeagueMember.leagueId, leagueId),
    with: { user: true },
  });
  return members
    .filter((m) => {
      const prefs = m.user.notificationPreferences as Record<string, boolean> | null;
      // Opted-in by default; only skip if explicitly false
      return !prefs || prefs[prefKey] !== false;
    })
    .map((m) => m.userId);
}

/** Push: New round started, time to submit */
export async function pushNotifyRoundStarted(roundId: string): Promise<void> {
  const round = await db.query.Round.findFirst({
    where: eq(Round.id, roundId),
    with: { league: true },
  });
  if (!round) return;

  const userIds = await getLeagueMemberIdsWithPref(
    round.leagueId,
    "roundStart",
  );

  await sendPushToUsers(userIds, {
    title: `🎵 New Round: ${round.themeName}`,
    body: `${round.league.name} — Submit by ${formatDate(round.submissionDeadline)}`,
    data: {
      type: "league",
      leagueId: round.leagueId,
      roundId: round.id,
    },
  });
}

/** Push: Voting phase has opened */
export async function pushNotifyVotingOpen(roundId: string): Promise<void> {
  const round = await db.query.Round.findFirst({
    where: eq(Round.id, roundId),
    with: { league: true },
  });
  if (!round) return;

  const userIds = await getLeagueMemberIdsWithPref(
    round.leagueId,
    "votingOpen",
  );

  await sendPushToUsers(userIds, {
    title: `🗳️ Time to Vote!`,
    body: `${round.league.name} — "${round.themeName}" voting open until ${formatDate(round.votingDeadline)}`,
    data: {
      type: "league",
      leagueId: round.leagueId,
      roundId: round.id,
    },
  });
}

/** Push: Results are available */
export async function pushNotifyResultsAvailable(
  roundId: string,
): Promise<void> {
  const round = await db.query.Round.findFirst({
    where: eq(Round.id, roundId),
    with: { league: true },
  });
  if (!round) return;

  const userIds = await getLeagueMemberIdsWithPref(
    round.leagueId,
    "resultsAvailable",
  );

  await sendPushToUsers(userIds, {
    title: `🏆 Results Are In!`,
    body: `${round.league.name} — See who won "${round.themeName}"`,
    data: {
      type: "league",
      leagueId: round.leagueId,
      roundId: round.id,
    },
  });
}

/** Push: Submission deadline reminder (only to members who haven't submitted) */
export async function pushNotifySubmissionReminder(
  roundId: string,
): Promise<void> {
  const round = await db.query.Round.findFirst({
    where: eq(Round.id, roundId),
    with: { league: true },
  });
  if (!round) return;

  const allUserIds = await getLeagueMemberIdsWithPref(
    round.leagueId,
    "submissionReminder",
  );

  // Filter out users who already submitted
  const submissions = await db.query.Submission.findMany({
    where: eq(Submission.roundId, roundId),
  });
  const submittedUserIds = new Set(submissions.map((s) => s.userId));
  const userIds = allUserIds.filter((id) => !submittedUserIds.has(id));

  if (userIds.length === 0) return;

  await sendPushToUsers(userIds, {
    title: `⏰ Submission Deadline Approaching`,
    body: `${round.league.name} — "${round.themeName}" submissions close ${formatDate(round.submissionDeadline)}`,
    data: {
      type: "league",
      leagueId: round.leagueId,
      roundId: round.id,
    },
  });
}

/** Push: Voting deadline reminder (only to members who haven't voted) */
export async function pushNotifyVotingReminder(
  roundId: string,
): Promise<void> {
  const round = await db.query.Round.findFirst({
    where: eq(Round.id, roundId),
    with: {
      league: true,
      submissions: { with: { votes: true } },
    },
  });
  if (!round) return;

  const allUserIds = await getLeagueMemberIdsWithPref(
    round.leagueId,
    "votingOpen",
  );

  // Find users who have voted (any vote on any submission in this round)
  const votedUserIds = new Set(
    round.submissions.flatMap((s) => s.votes.map((v) => v.voterId)),
  );
  const userIds = allUserIds.filter((id) => !votedUserIds.has(id));

  if (userIds.length === 0) return;

  await sendPushToUsers(userIds, {
    title: `⏰ Voting Deadline Approaching`,
    body: `${round.league.name} — Vote on "${round.themeName}" before ${formatDate(round.votingDeadline)}`,
    data: {
      type: "league",
      leagueId: round.leagueId,
      roundId: round.id,
    },
  });
}
