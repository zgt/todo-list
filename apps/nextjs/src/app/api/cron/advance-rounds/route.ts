import { NextResponse } from "next/server";

import {
  notifyResultsAvailable,
  notifyVotingOpen,
  sendSubmissionReminders,
} from "@acme/api/notifications";
import {
  pushNotifyResultsAvailable,
  pushNotifyRoundStarted,
  pushNotifySubmissionReminder,
  pushNotifyVotingOpen,
  pushNotifyVotingReminder,
} from "@acme/api/push-notifications";
import { createPlaylist } from "@acme/api/spotify";
import { and, eq, lt } from "@acme/db";
import { db } from "@acme/db/client";
import { League, Round, Submission } from "@acme/db/schema";

import { env } from "~/env";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const summary: {
    submissionToListening: string[];
    listeningToVoting: string[];
    votingToResults: string[];
    submissionReminders: string[];
    pendingToSubmission: string[];
  } = {
    submissionToListening: [],
    listeningToVoting: [],
    votingToResults: [],
    submissionReminders: [],
    pendingToSubmission: [],
  };

  // SUBMISSION where submissionDeadline < now → advance to LISTENING
  const submissionRounds = await db.query.Round.findMany({
    where: and(
      eq(Round.status, "SUBMISSION"),
      lt(Round.submissionDeadline, now),
    ),
  });

  for (const round of submissionRounds) {
    // Create Spotify playlist from submissions
    let playlistUrl: string | null = null;
    try {
      const submissions = await db.query.Submission.findMany({
        where: eq(Submission.roundId, round.id),
      });

      if (submissions.length > 0) {
        const league = await db.query.League.findFirst({
          where: eq(League.id, round.leagueId),
        });

        const playlistName = league
          ? `${league.name} - ${round.themeName}`
          : round.themeName;

        playlistUrl = await createPlaylist(
          playlistName,
          `Round ${round.roundNumber}: ${round.themeName}`,
          submissions.map((s) => s.spotifyTrackId),
        );

        await db
          .update(Round)
          .set({ playlistUrl })
          .where(eq(Round.id, round.id));

        console.log(`Created playlist for round ${round.id}: ${playlistUrl}`);
      }
    } catch (err) {
      console.error(`Failed to create playlist for round ${round.id}:`, err);
      // Don't block phase transition if playlist creation fails
    }

    await db
      .update(Round)
      .set({ status: "LISTENING" })
      .where(eq(Round.id, round.id));
    summary.submissionToListening.push(round.id);
  }

  // LISTENING → advance to VOTING (immediate)
  const listeningRounds = await db.query.Round.findMany({
    where: eq(Round.status, "LISTENING"),
  });

  for (const round of listeningRounds) {
    await db
      .update(Round)
      .set({ status: "VOTING" })
      .where(eq(Round.id, round.id));
    summary.listeningToVoting.push(round.id);
    await notifyVotingOpen(round.id);
    void pushNotifyVotingOpen(round.id);
  }

  // VOTING where votingDeadline < now → advance to RESULTS (calculate point totals)
  const votingRounds = await db.query.Round.findMany({
    where: and(eq(Round.status, "VOTING"), lt(Round.votingDeadline, now)),
  });

  for (const round of votingRounds) {
    await db
      .update(Round)
      .set({ status: "RESULTS" })
      .where(eq(Round.id, round.id));
    summary.votingToResults.push(round.id);
    await notifyResultsAvailable(round.id);
    void pushNotifyResultsAvailable(round.id);

    // Check for PENDING rounds in the same league to activate
    const pendingRound = await db.query.Round.findFirst({
      where: and(
        eq(Round.leagueId, round.leagueId),
        eq(Round.status, "PENDING"),
      ),
    });

    if (pendingRound) {
      const league = await db.query.League.findFirst({
        where: eq(League.id, round.leagueId),
      });

      if (league) {
        const addDays = (date: Date, days: number): Date => {
          const result = new Date(date);
          result.setDate(result.getDate() + days);
          return result;
        };

        const newSubmissionDeadline = addDays(now, league.submissionWindowDays);
        const newVotingDeadline = addDays(
          newSubmissionDeadline,
          league.votingWindowDays,
        );

        await db
          .update(Round)
          .set({
            status: "SUBMISSION",
            startDate: now,
            submissionDeadline: newSubmissionDeadline,
            votingDeadline: newVotingDeadline,
          })
          .where(eq(Round.id, pendingRound.id));

        summary.pendingToSubmission.push(pendingRound.id);
        void pushNotifyRoundStarted(pendingRound.id);
      }
    }
  }

  // Submission reminders: rounds where submissionDeadline is within 24h
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const upcomingSubmissionRounds = await db.query.Round.findMany({
    where: and(
      eq(Round.status, "SUBMISSION"),
      lt(Round.submissionDeadline, twentyFourHoursFromNow),
    ),
  });

  // Voting reminders: rounds where votingDeadline is within 24h
  const upcomingVotingRounds = await db.query.Round.findMany({
    where: and(
      eq(Round.status, "VOTING"),
      lt(Round.votingDeadline, twentyFourHoursFromNow),
    ),
  });

  for (const round of upcomingSubmissionRounds) {
    await sendSubmissionReminders(round.id);
    void pushNotifySubmissionReminder(round.id);
    summary.submissionReminders.push(round.id);
  }

  for (const round of upcomingVotingRounds) {
    void pushNotifyVotingReminder(round.id);
  }

  return NextResponse.json({
    ok: true,
    timestamp: now.toISOString(),
    summary,
  });
}
