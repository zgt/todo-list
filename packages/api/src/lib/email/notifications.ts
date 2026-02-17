import { eq } from "@acme/db";
import { db } from "@acme/db/client";
import { LeagueMember, Round, Submission } from "@acme/db/schema";

import { sendEmail } from "./client";
import { resultsAvailableEmail } from "./templates/results-available";
import { roundStartedEmail } from "./templates/round-started";
import { submissionReminderEmail } from "./templates/submission-reminder";
import { votingOpenEmail } from "./templates/voting-open";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function getLeagueMembers(leagueId: string) {
  const members = await db.query.LeagueMember.findMany({
    where: eq(LeagueMember.leagueId, leagueId),
    with: { user: true },
  });
  return members;
}

export async function notifyRoundStarted(roundId: string) {
  const round = await db.query.Round.findFirst({
    where: eq(Round.id, roundId),
    with: { league: true },
  });
  if (!round) return;

  const members = await getLeagueMembers(round.leagueId);

  for (const member of members) {
    const prefs = member.user.notificationPreferences as {
      roundStart?: boolean;
    } | null;
    if (prefs?.roundStart === false) continue;

    const { subject, html } = roundStartedEmail({
      leagueName: round.league.name,
      themeName: round.themeName,
      deadline: formatDate(round.submissionDeadline),
    });

    await sendEmail({ to: member.user.email, subject, html });
  }
}

export async function notifyVotingOpen(roundId: string) {
  const round = await db.query.Round.findFirst({
    where: eq(Round.id, roundId),
    with: { league: true },
  });
  if (!round) return;

  const members = await getLeagueMembers(round.leagueId);

  for (const member of members) {
    const prefs = member.user.notificationPreferences as {
      votingOpen?: boolean;
    } | null;
    if (prefs?.votingOpen === false) continue;

    const { subject, html } = votingOpenEmail({
      leagueName: round.league.name,
      themeName: round.themeName,
      deadline: formatDate(round.votingDeadline),
    });

    await sendEmail({ to: member.user.email, subject, html });
  }
}

export async function notifyResultsAvailable(roundId: string) {
  const round = await db.query.Round.findFirst({
    where: eq(Round.id, roundId),
    with: { league: true },
  });
  if (!round) return;

  const members = await getLeagueMembers(round.leagueId);

  for (const member of members) {
    const prefs = member.user.notificationPreferences as {
      resultsAvailable?: boolean;
    } | null;
    if (prefs?.resultsAvailable === false) continue;

    const { subject, html } = resultsAvailableEmail({
      leagueName: round.league.name,
      themeName: round.themeName,
    });

    await sendEmail({ to: member.user.email, subject, html });
  }
}

export async function sendSubmissionReminders(roundId: string) {
  const round = await db.query.Round.findFirst({
    where: eq(Round.id, roundId),
    with: { league: true },
  });
  if (!round) return;

  const members = await getLeagueMembers(round.leagueId);

  // Get users who already submitted
  const submissions = await db.query.Submission.findMany({
    where: eq(Submission.roundId, roundId),
  });
  const submittedUserIds = new Set(submissions.map((s) => s.userId));

  for (const member of members) {
    // Skip members who already submitted
    if (submittedUserIds.has(member.userId)) continue;

    const prefs = member.user.notificationPreferences as {
      submissionReminder?: boolean;
    } | null;
    if (prefs?.submissionReminder === false) continue;

    const { subject, html } = submissionReminderEmail({
      leagueName: round.league.name,
      themeName: round.themeName,
      deadline: formatDate(round.submissionDeadline),
    });

    await sendEmail({ to: member.user.email, subject, html });
  }
}
