import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq, inArray } from "@acme/db";
import {
  Comment,
  League,
  LeagueMember,
  Round,
  Submission,
  user,
  Vote,
} from "@acme/db/schema";

import {
  notifyResultsAvailable,
  notifyRoundStarted,
  notifyVotingOpen,
} from "../../lib/email/notifications";
import {
  pushNotifyResultsAvailable,
  pushNotifyRoundStarted,
  pushNotifyVotingOpen,
} from "../../lib/push/notifications";
import { createPlaylist, searchTracks } from "../../lib/spotify";
import { protectedProcedure, publicProcedure } from "../../trpc";

// Helper for invite codes
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export const musicLeagueRouter = {
  // --- LEAGUE PROCEDURES ---

  getLeagueByInviteCode: publicProcedure
    .input(z.object({ inviteCode: z.string() }))
    .query(async ({ ctx, input }) => {
      const league = await ctx.db.query.League.findFirst({
        where: eq(League.inviteCode, input.inviteCode),
        with: { members: true },
      });

      if (!league) return null;

      return {
        id: league.id,
        name: league.name,
        description: league.description,
        memberCount: league.members.length,
        maxMembers: league.maxMembers,
      };
    }),

  getUserProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get leagues joined count
    const memberships = await ctx.db.query.LeagueMember.findMany({
      where: eq(LeagueMember.userId, userId),
    });

    // Get all submissions by user with their votes
    const submissions = await ctx.db.query.Submission.findMany({
      where: eq(Submission.userId, userId),
      with: {
        votes: true,
        round: true,
      },
    });

    // Calculate total points
    const totalPoints = submissions.reduce(
      (sum, sub) => sum + sub.votes.reduce((vSum, v) => vSum + v.points, 0),
      0,
    );

    // Count rounds participated (unique round IDs)
    const roundIds = new Set(submissions.map((s) => s.roundId));

    // Find rounds won - get all submissions for rounds user participated in
    let roundsWon = 0;
    for (const roundId of roundIds) {
      const allRoundSubmissions = await ctx.db.query.Submission.findMany({
        where: eq(Submission.roundId, roundId),
        with: { votes: true },
      });

      const pointsByUser = new Map<string, number>();
      for (const sub of allRoundSubmissions) {
        const pts = sub.votes.reduce((s, v) => s + v.points, 0);
        pointsByUser.set(sub.userId, (pointsByUser.get(sub.userId) ?? 0) + pts);
      }

      const maxPoints = Math.max(...pointsByUser.values(), 0);
      if (maxPoints > 0 && (pointsByUser.get(userId) ?? 0) === maxPoints) {
        roundsWon++;
      }
    }

    // Find best submission
    let bestSubmission = null;
    let bestPoints = 0;
    for (const sub of submissions) {
      const pts = sub.votes.reduce((s, v) => s + v.points, 0);
      if (pts > bestPoints) {
        bestPoints = pts;
        bestSubmission = {
          trackName: sub.trackName,
          artistName: sub.artistName,
          albumArtUrl: sub.albumArtUrl,
          points: pts,
          roundTheme: sub.round.themeName,
        };
      }
    }

    // Get notification preferences from user
    const dbUser = await ctx.db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    return {
      leaguesJoined: memberships.length,
      totalPoints,
      roundsWon,
      roundsParticipated: roundIds.size,
      totalSubmissions: submissions.length,
      bestSubmission,
      notificationPreferences: dbUser?.notificationPreferences ?? {
        roundStart: true,
        submissionReminder: true,
        votingOpen: true,
        resultsAvailable: true,
      },
    };
  }),

  updateNotificationPreferences: protectedProcedure
    .input(
      z.object({
        roundStart: z.boolean(),
        submissionReminder: z.boolean(),
        votingOpen: z.boolean(),
        resultsAvailable: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({ notificationPreferences: input })
        .where(eq(user.id, ctx.session.user.id));
      return { success: true };
    }),

  createLeague: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        songsPerRound: z.number().int().min(1).max(5).default(1),
        maxMembers: z.number().int().min(2).max(50).default(20),
        allowDownvotes: z.boolean().default(false),
        upvotePointsPerRound: z.number().int().min(1).max(20).default(5),
        submissionWindowDays: z.number().int().min(1).max(14).default(3),
        votingWindowDays: z.number().int().min(1).max(14).default(2),
        downvotePointsPerRound: z.number().int().min(1).max(10).default(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const leagueId = crypto.randomUUID();

      await ctx.db.transaction(async (tx) => {
        await tx.insert(League).values({
          id: leagueId,
          name: input.name,
          description: input.description,
          songsPerRound: input.songsPerRound,
          maxMembers: input.maxMembers,
          allowDownvotes: input.allowDownvotes,
          upvotePointsPerRound: input.upvotePointsPerRound,
          submissionWindowDays: input.submissionWindowDays,
          votingWindowDays: input.votingWindowDays,
          downvotePointsPerRound: input.downvotePointsPerRound,
          inviteCode: generateInviteCode(),
          creatorId: ctx.session.user.id,
          status: "ACTIVE",
        });

        await tx.insert(LeagueMember).values({
          leagueId: leagueId,
          userId: ctx.session.user.id,
          role: "OWNER",
        });
      });

      return { id: leagueId };
    }),

  getAllLeagues: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.query.LeagueMember.findMany({
      where: eq(LeagueMember.userId, ctx.session.user.id),
      with: {
        league: {
          with: {
            members: true,
            rounds: {
              where: (round, { ne }) => ne(round.status, "COMPLETED"),
              orderBy: (round, { desc }) => [desc(round.roundNumber)],
              limit: 1,
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.league,
      memberCount: m.league.members.length,
      currentRound: m.league.rounds[0] ?? null,
    }));
  }),

  getLeagueById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const league = await ctx.db.query.League.findFirst({
        where: eq(League.id, input.id),
        with: {
          members: {
            with: { user: true },
            orderBy: (member, { asc }) => [asc(member.joinedAt)],
          },
          rounds: {
            orderBy: (round, { desc }) => [desc(round.roundNumber)],
            with: {
              submissions: {
                with: {
                  user: true,
                  votes: true,
                },
              },
            },
          },
        },
      });

      if (!league) {
        throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      }

      const isMember = league.members.some(
        (m) => m.userId === ctx.session.user.id,
      );
      if (!isMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this league",
        });
      }

      return league;
    }),

  joinLeague: protectedProcedure
    .input(z.object({ inviteCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const league = await ctx.db.query.League.findFirst({
        where: eq(League.inviteCode, input.inviteCode),
        with: { members: true },
      });

      if (!league) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite code",
        });
      }

      const existingMember = league.members.find(
        (m) => m.userId === ctx.session.user.id,
      );

      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this league",
        });
      }

      if (league.members.length >= league.maxMembers) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "This league is full",
        });
      }

      await ctx.db.insert(LeagueMember).values({
        leagueId: league.id,
        userId: ctx.session.user.id,
        role: "MEMBER",
      });

      return { id: league.id };
    }),

  // --- SPOTIFY SEARCH ---

  searchSpotify: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ input }) => {
      return searchTracks(input.query, Math.min(input.limit, 10));
    }),

  // --- ROUND PROCEDURES ---

  createRound: protectedProcedure
    .input(
      z.object({
        leagueId: z.string(),
        themeName: z.string().min(1).max(200),
        themeDescription: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.query.LeagueMember.findFirst({
        where: and(
          eq(LeagueMember.leagueId, input.leagueId),
          eq(LeagueMember.userId, ctx.session.user.id),
        ),
      });

      if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can create rounds",
        });
      }

      const league = await ctx.db.query.League.findFirst({
        where: eq(League.id, input.leagueId),
      });

      if (!league) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "League not found",
        });
      }

      const lastRound = await ctx.db.query.Round.findFirst({
        where: eq(Round.leagueId, input.leagueId),
        orderBy: (round, { desc }) => [desc(round.roundNumber)],
      });

      const roundNumber = (lastRound?.roundNumber ?? 0) + 1;

      const addDays = (date: Date, days: number): Date => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
      };

      let startDate: Date;
      let submissionDeadline: Date;
      let votingDeadline: Date;
      let status: "SUBMISSION" | "PENDING";

      if (!lastRound || lastRound.status === "COMPLETED") {
        // No previous round or previous is completed → start now
        startDate = new Date();
        submissionDeadline = addDays(startDate, league.submissionWindowDays);
        votingDeadline = addDays(submissionDeadline, league.votingWindowDays);
        status = "SUBMISSION";
      } else {
        // Previous round is NOT completed → queue as PENDING
        // Reject if there is already a PENDING round
        if (lastRound.status === "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "There is already a pending round. Only one pending round is allowed at a time.",
          });
        }

        startDate = lastRound.votingDeadline;
        submissionDeadline = addDays(startDate, league.submissionWindowDays);
        votingDeadline = addDays(submissionDeadline, league.votingWindowDays);
        status = "PENDING";
      }

      const [round] = await ctx.db
        .insert(Round)
        .values({
          leagueId: input.leagueId,
          roundNumber,
          themeName: input.themeName,
          themeDescription: input.themeDescription,
          startDate,
          submissionDeadline,
          votingDeadline,
          status,
        })
        .returning();

      // Send round started notifications only if starting immediately
      if (round?.id && status === "SUBMISSION") {
        void notifyRoundStarted(round.id);
        void pushNotifyRoundStarted(round.id);
      }

      return round;
    }),

  getRoundById: protectedProcedure
    .input(z.object({ roundId: z.string() }))
    .query(async ({ ctx, input }) => {
      const round = await ctx.db.query.Round.findFirst({
        where: eq(Round.id, input.roundId),
        with: {
          league: {
            with: {
              members: { with: { user: true } },
            },
          },
          submissions: {
            with: {
              user: true,
              votes: { with: { voter: true } },
              comments: { with: { user: true } },
            },
          },
        },
      });

      if (!round) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
      }

      const isMember = round.league.members.some(
        (m) => m.userId === ctx.session.user.id,
      );
      if (!isMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this league",
        });
      }

      const userRole =
        round.league.members.find((m) => m.userId === ctx.session.user.id)
          ?.role ?? "MEMBER";

      const submissions = round.submissions
        .map((sub) => {
          const totalPoints = sub.votes.reduce((sum, v) => sum + v.points, 0);
          const isOwn = sub.userId === ctx.session.user.id;

          if (round.status === "SUBMISSION" && !isOwn) {
            return null;
          }

          const hideSubmitter =
            round.status === "LISTENING" || round.status === "VOTING";

          return {
            ...sub,
            submitter: hideSubmitter && !isOwn ? null : sub.user,
            votes:
              round.status === "RESULTS" || round.status === "COMPLETED"
                ? sub.votes
                : [],
            comments:
              round.status === "RESULTS" || round.status === "COMPLETED"
                ? sub.comments
                : [],
            totalPoints:
              round.status === "RESULTS" || round.status === "COMPLETED"
                ? totalPoints
                : 0,
            isOwn,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      // Build member status for status board
      const memberStatus = round.league.members.map((m) => {
        const hasSubmitted = round.submissions.some(
          (s) => s.userId === m.userId,
        );
        const hasVoted = round.submissions.some((s) =>
          s.votes.some((v) => v.voterId === m.userId),
        );
        return {
          id: m.userId,
          name: m.user.name,
          image: m.user.image,
          hasSubmitted,
          hasVoted,
        };
      });

      return {
        ...round,
        submissions,
        userRole,
        memberStatus,
        leagueName: round.league.name,
        leagueId: round.league.id,
        upvotePointsPerRound: round.league.upvotePointsPerRound,
        allowDownvotes: round.league.allowDownvotes,
        downvotePointValue: round.league.downvotePointValue,
        downvotePointsPerRound: round.league.downvotePointsPerRound,
        songsPerRound: round.league.songsPerRound,
        memberCount: round.league.members.length,
        submissionCount: round.submissions.length,
      };
    }),

  // --- SUBMISSION PROCEDURES ---

  createSubmission: protectedProcedure
    .input(
      z.object({
        roundId: z.string(),
        spotifyTrackId: z.string(),
        trackName: z.string(),
        artistName: z.string(),
        albumName: z.string(),
        albumArtUrl: z.string(),
        previewUrl: z.string().nullish(),
        trackDurationMs: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const round = await ctx.db.query.Round.findFirst({
        where: eq(Round.id, input.roundId),
        with: { league: true },
      });

      if (!round) throw new TRPCError({ code: "NOT_FOUND" });
      if (round.status !== "SUBMISSION") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Wrong phase" });
      }

      const existing = await ctx.db.query.Submission.findMany({
        where: and(
          eq(Submission.roundId, input.roundId),
          eq(Submission.userId, ctx.session.user.id),
        ),
      });

      if (existing.length >= round.league.songsPerRound) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Limit reached" });
      }

      const duplicate = await ctx.db.query.Submission.findFirst({
        where: and(
          eq(Submission.roundId, input.roundId),
          eq(Submission.spotifyTrackId, input.spotifyTrackId),
        ),
      });

      if (duplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Track already submitted",
        });
      }

      return ctx.db.insert(Submission).values({
        ...input,
        userId: ctx.session.user.id,
      });
    }),

  deleteSubmission: protectedProcedure
    .input(z.object({ submissionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const submission = await ctx.db.query.Submission.findFirst({
        where: eq(Submission.id, input.submissionId),
        with: { round: true },
      });

      if (!submission) throw new TRPCError({ code: "NOT_FOUND" });
      if (submission.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (submission.round.status !== "SUBMISSION") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only delete during submission phase",
        });
      }

      await ctx.db
        .delete(Submission)
        .where(eq(Submission.id, input.submissionId));
      return { success: true };
    }),

  // --- VOTE PROCEDURES ---

  submitVotes: protectedProcedure
    .input(
      z.object({
        roundId: z.string(),
        votes: z.array(
          z.object({
            submissionId: z.string(),
            points: z.number().int(),
          }),
        ),
        comments: z.array(
          z.object({
            submissionId: z.string(),
            text: z.string().max(280),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const round = await ctx.db.query.Round.findFirst({
        where: eq(Round.id, input.roundId),
        with: { league: true },
      });

      if (!round) throw new TRPCError({ code: "NOT_FOUND" });
      if (round.status !== "VOTING") {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      // Validate upvote and downvote points separately
      const upvoteTotal = input.votes
        .filter((v) => v.points > 0)
        .reduce((sum, v) => sum + v.points, 0);
      const downvoteTotal = input.votes
        .filter((v) => v.points < 0)
        .reduce((sum, v) => sum + Math.abs(v.points), 0);

      if (upvoteTotal > round.league.upvotePointsPerRound) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Upvote points (${upvoteTotal}) exceed the limit of ${round.league.upvotePointsPerRound}`,
        });
      }

      if (
        downvoteTotal > 0 &&
        (!round.league.allowDownvotes ||
          downvoteTotal > round.league.downvotePointsPerRound)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: round.league.allowDownvotes
            ? `Downvote points (${downvoteTotal}) exceed the limit of ${round.league.downvotePointsPerRound}`
            : "Downvotes are not allowed in this league",
        });
      }

      await ctx.db.transaction(async (tx) => {
        // Delete existing votes for this round by this user
        await tx
          .delete(Vote)
          .where(
            and(
              eq(Vote.roundId, input.roundId),
              eq(Vote.voterId, ctx.session.user.id),
            ),
          );

        // Delete existing comments on submissions in this round by this user
        const submissions = await tx.query.Submission.findMany({
          where: eq(Submission.roundId, input.roundId),
          columns: { id: true },
        });
        const subIds = submissions.map((s) => s.id);

        if (subIds.length > 0) {
          await tx
            .delete(Comment)
            .where(
              and(
                inArray(Comment.submissionId, subIds),
                eq(Comment.userId, ctx.session.user.id),
              ),
            );
        }

        if (input.votes.length > 0) {
          await tx.insert(Vote).values(
            input.votes.map((v) => ({
              roundId: input.roundId,
              voterId: ctx.session.user.id,
              submissionId: v.submissionId,
              points: v.points,
            })),
          );
        }

        if (input.comments.length > 0) {
          await tx.insert(Comment).values(
            input.comments.map((c) => ({
              submissionId: c.submissionId,
              userId: ctx.session.user.id,
              text: c.text,
            })),
          );
        }
      });

      return { success: true };
    }),

  // --- LEAGUE MANAGEMENT PROCEDURES ---

  leaveLeague: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.query.LeagueMember.findFirst({
        where: and(
          eq(LeagueMember.leagueId, input.leagueId),
          eq(LeagueMember.userId, ctx.session.user.id),
        ),
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a member of this league",
        });
      }

      if (member.role === "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "The owner cannot leave the league. Transfer ownership or delete the league instead.",
        });
      }

      await ctx.db.delete(LeagueMember).where(eq(LeagueMember.id, member.id));

      return { success: true };
    }),

  deleteLeague: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.query.LeagueMember.findFirst({
        where: and(
          eq(LeagueMember.leagueId, input.leagueId),
          eq(LeagueMember.userId, ctx.session.user.id),
        ),
      });

      if (member?.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league owner can delete the league",
        });
      }

      await ctx.db.delete(League).where(eq(League.id, input.leagueId));

      return { success: true };
    }),

  regenerateLeagueInviteCode: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.query.LeagueMember.findFirst({
        where: and(
          eq(LeagueMember.leagueId, input.leagueId),
          eq(LeagueMember.userId, ctx.session.user.id),
        ),
      });

      if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can regenerate invite codes",
        });
      }

      const newCode = generateInviteCode();

      await ctx.db
        .update(League)
        .set({ inviteCode: newCode })
        .where(eq(League.id, input.leagueId));

      return { inviteCode: newCode };
    }),

  updateLeagueSettings: protectedProcedure
    .input(
      z.object({
        leagueId: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        songsPerRound: z.number().int().min(1).max(5).optional(),
        allowDownvotes: z.boolean().optional(),
        upvotePointsPerRound: z.number().int().min(1).max(20).optional(),
        submissionWindowDays: z.number().int().min(1).max(14).optional(),
        votingWindowDays: z.number().int().min(1).max(14).optional(),
        downvotePointsPerRound: z.number().int().min(1).max(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db.query.LeagueMember.findFirst({
        where: and(
          eq(LeagueMember.leagueId, input.leagueId),
          eq(LeagueMember.userId, ctx.session.user.id),
        ),
      });

      if (member?.role !== "OWNER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the league owner can update settings",
        });
      }

      const { leagueId, ...updates } = input;

      // Filter out undefined values so we only set what was provided
      const setValues: Record<string, unknown> = {};
      if (updates.name !== undefined) setValues.name = updates.name;
      if (updates.description !== undefined)
        setValues.description = updates.description;
      if (updates.songsPerRound !== undefined)
        setValues.songsPerRound = updates.songsPerRound;
      if (updates.allowDownvotes !== undefined)
        setValues.allowDownvotes = updates.allowDownvotes;
      if (updates.upvotePointsPerRound !== undefined)
        setValues.upvotePointsPerRound = updates.upvotePointsPerRound;
      if (updates.submissionWindowDays !== undefined)
        setValues.submissionWindowDays = updates.submissionWindowDays;
      if (updates.votingWindowDays !== undefined)
        setValues.votingWindowDays = updates.votingWindowDays;
      if (updates.downvotePointsPerRound !== undefined)
        setValues.downvotePointsPerRound = updates.downvotePointsPerRound;

      if (Object.keys(setValues).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No settings to update",
        });
      }

      await ctx.db.update(League).set(setValues).where(eq(League.id, leagueId));

      return { success: true };
    }),

  // --- ADDITIONAL ROUND PROCEDURES ---

  getLatestRound: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.db.query.LeagueMember.findFirst({
        where: and(
          eq(LeagueMember.leagueId, input.leagueId),
          eq(LeagueMember.userId, ctx.session.user.id),
        ),
      });

      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this league",
        });
      }

      const round = await ctx.db.query.Round.findFirst({
        where: eq(Round.leagueId, input.leagueId),
        orderBy: (round, { desc }) => [desc(round.roundNumber)],
      });

      return round ?? null;
    }),

  advanceRoundPhase: protectedProcedure
    .input(z.object({ roundId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const round = await ctx.db.query.Round.findFirst({
        where: eq(Round.id, input.roundId),
        with: {
          league: {
            with: { members: true },
          },
        },
      });

      if (!round) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
      }

      const member = round.league.members.find(
        (m) => m.userId === ctx.session.user.id,
      );

      if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can advance round phases",
        });
      }

      const phaseOrder = [
        "SUBMISSION",
        "LISTENING",
        "VOTING",
        "RESULTS",
        "COMPLETED",
      ] as const;

      const currentIndex = phaseOrder.indexOf(
        round.status as (typeof phaseOrder)[number],
      );

      if (currentIndex === -1 || currentIndex >= phaseOrder.length - 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Round is already completed and cannot be advanced further",
        });
      }

      const nextStatus = phaseOrder[currentIndex + 1];
      if (!nextStatus) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to determine next round status",
        });
      }

      await ctx.db
        .update(Round)
        .set({ status: nextStatus })
        .where(eq(Round.id, input.roundId));

      // Send notifications based on phase transition (fire and forget)
      if (nextStatus === "VOTING") {
        void notifyVotingOpen(input.roundId);
        void pushNotifyVotingOpen(input.roundId);
      } else if (nextStatus === "RESULTS") {
        void notifyResultsAvailable(input.roundId);
        void pushNotifyResultsAvailable(input.roundId);
      }

      // When a round completes, activate any PENDING round in the same league
      if (nextStatus === "COMPLETED") {
        const pendingRound = await ctx.db.query.Round.findFirst({
          where: and(
            eq(Round.leagueId, round.leagueId),
            eq(Round.status, "PENDING"),
          ),
          orderBy: (r, { asc }) => [asc(r.roundNumber)],
        });

        if (pendingRound) {
          const now = new Date();
          const addDays = (date: Date, days: number): Date => {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
          };

          const league = await ctx.db.query.League.findFirst({
            where: eq(League.id, round.leagueId),
          });

          if (league) {
            const newSubmissionDeadline = addDays(
              now,
              league.submissionWindowDays,
            );
            const newVotingDeadline = addDays(
              newSubmissionDeadline,
              league.votingWindowDays,
            );

            await ctx.db
              .update(Round)
              .set({
                status: "SUBMISSION",
                startDate: now,
                submissionDeadline: newSubmissionDeadline,
                votingDeadline: newVotingDeadline,
              })
              .where(eq(Round.id, pendingRound.id));

            void notifyRoundStarted(pendingRound.id);
            void pushNotifyRoundStarted(pendingRound.id);
          }
        }
      }

      return { status: nextStatus };
    }),

  setRoundPlaylistUrl: protectedProcedure
    .input(
      z.object({
        roundId: z.string(),
        playlistUrl: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const round = await ctx.db.query.Round.findFirst({
        where: eq(Round.id, input.roundId),
        with: {
          league: {
            with: { members: true },
          },
        },
      });

      if (!round) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
      }

      const member = round.league.members.find(
        (m) => m.userId === ctx.session.user.id,
      );

      if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can set the playlist URL",
        });
      }

      await ctx.db
        .update(Round)
        .set({ playlistUrl: input.playlistUrl })
        .where(eq(Round.id, input.roundId));

      return { success: true };
    }),

  generateRoundPlaylist: protectedProcedure
    .input(z.object({ roundId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const round = await ctx.db.query.Round.findFirst({
        where: eq(Round.id, input.roundId),
        with: {
          league: {
            with: { members: true },
          },
        },
      });

      if (!round) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
      }

      const member = round.league.members.find(
        (m) => m.userId === ctx.session.user.id,
      );

      if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can generate playlists",
        });
      }

      const submissions = await ctx.db.query.Submission.findMany({
        where: eq(Submission.roundId, input.roundId),
      });

      if (submissions.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No submissions to create playlist from",
        });
      }

      const playlistName = `${round.league.name} - ${round.themeName}`;
      const playlistUrl = await createPlaylist(
        playlistName,
        `Round ${round.roundNumber}: ${round.themeName}`,
        submissions.map((s) => s.spotifyTrackId),
      );

      await ctx.db
        .update(Round)
        .set({ playlistUrl })
        .where(eq(Round.id, input.roundId));

      return { playlistUrl };
    }),

  // --- PLAYLIST & TRACK PROCEDURES ---

  getPlaylistTracks: protectedProcedure
    .input(z.object({ roundId: z.string() }))
    .query(async ({ ctx, input }) => {
      const round = await ctx.db.query.Round.findFirst({
        where: eq(Round.id, input.roundId),
        with: {
          league: {
            with: { members: true },
          },
          submissions: true,
        },
      });

      if (!round) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Round not found" });
      }

      const isMember = round.league.members.some(
        (m) => m.userId === ctx.session.user.id,
      );

      if (!isMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this league",
        });
      }

      return {
        roundNumber: round.roundNumber,
        themeName: round.themeName,
        playlistUrl: round.playlistUrl,
        tracks: round.submissions.map((sub) => ({
          id: sub.id,
          trackName: sub.trackName,
          artistName: sub.artistName,
          albumName: sub.albumName,
          albumArtUrl: sub.albumArtUrl,
          spotifyTrackId: sub.spotifyTrackId,
          trackDurationMs: sub.trackDurationMs,
        })),
      };
    }),

  // --- STANDINGS PROCEDURES ---

  getLeagueStandings: protectedProcedure
    .input(z.object({ leagueId: z.string() }))
    .query(async ({ ctx, input }) => {
      const league = await ctx.db.query.League.findFirst({
        where: eq(League.id, input.leagueId),
        with: {
          members: {
            with: { user: true },
          },
          rounds: {
            with: {
              submissions: {
                with: {
                  votes: true,
                },
              },
            },
          },
        },
      });

      if (!league) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "League not found",
        });
      }

      const isMember = league.members.some(
        (m) => m.userId === ctx.session.user.id,
      );

      if (!isMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this league",
        });
      }

      // Only count rounds that are COMPLETED or RESULTS
      const scoredRounds = league.rounds.filter(
        (r) => r.status === "COMPLETED" || r.status === "RESULTS",
      );

      // Build standings per member
      const standings = league.members.map((member) => {
        let totalPoints = 0;
        let roundsWon = 0;
        let roundsParticipated = 0;

        for (const round of scoredRounds) {
          const memberSubmissions = round.submissions.filter(
            (s) => s.userId === member.userId,
          );

          if (memberSubmissions.length > 0) {
            roundsParticipated++;
          }

          const roundPoints = memberSubmissions.reduce((sum, sub) => {
            return sum + sub.votes.reduce((vSum, v) => vSum + v.points, 0);
          }, 0);

          totalPoints += roundPoints;

          // Determine if this member won the round (highest points)
          const allUserPoints = new Map<string, number>();
          for (const sub of round.submissions) {
            const subPoints = sub.votes.reduce((s, v) => s + v.points, 0);
            allUserPoints.set(
              sub.userId,
              (allUserPoints.get(sub.userId) ?? 0) + subPoints,
            );
          }

          const maxPoints = Math.max(...allUserPoints.values(), 0);
          if (
            maxPoints > 0 &&
            (allUserPoints.get(member.userId) ?? 0) === maxPoints
          ) {
            roundsWon++;
          }
        }

        return {
          user: {
            id: member.user.id,
            name: member.user.name,
            image: member.user.image,
          },
          totalPoints,
          roundsWon,
          roundsParticipated,
          avgPointsPerRound:
            roundsParticipated > 0
              ? Math.round((totalPoints / roundsParticipated) * 100) / 100
              : 0,
        };
      });

      // Sort by totalPoints descending, then roundsWon descending
      standings.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints)
          return b.totalPoints - a.totalPoints;
        return b.roundsWon - a.roundsWon;
      });

      return standings;
    }),
} satisfies TRPCRouterRecord;
