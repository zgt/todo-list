import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ArrowLeft, Check, Clock } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";
import { GradientBackground } from "~/components/GradientBackground";

export default function RoundDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: round, isLoading } = useQuery(
    trpc.musicLeague.getRoundById.queryOptions(
      { roundId: id! },
      { enabled: !!id },
    ),
  );

  if (isLoading || !round) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Text className="text-[#8FA8A8]">Loading round...</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const { status, submissions, userRole } = round;
  const isSubmissionPhase = status === "SUBMISSION";
  const isResultsPhase = status === "RESULTS" || status === "COMPLETED";

  const mySubmission = submissions.find(
    (s: { isOwn: boolean }) => s.isOwn,
  );

  return (
    <GradientBackground>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <Link href={`/music/league/${round.leagueId}` as never} asChild>
            <Pressable className="rounded-full bg-[#164B49] p-2">
              <ArrowLeft color="#DCE4E4" size={24} />
            </Pressable>
          </Link>
          <View>
            <Text className="text-center text-xl font-bold text-[#DCE4E4]">
              Round {round.roundNumber}
            </Text>
            <Text className="text-center text-xs font-medium uppercase text-[#50C878]">
              {status}
            </Text>
          </View>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Theme Card */}
          <View className="mb-6 rounded-xl border border-[#164B49] bg-[#102A2A] p-6 shadow-lg">
            <Text className="mb-2 text-sm font-bold uppercase tracking-wide text-[#50C878]">
              Theme
            </Text>
            <Text className="mb-4 text-3xl font-bold leading-tight text-[#DCE4E4]">
              {round.themeName}
            </Text>
            {round.themeDescription && (
              <Text className="text-base leading-relaxed text-[#8FA8A8]">
                {round.themeDescription}
              </Text>
            )}

            {/* Deadlines */}
            <View className="mt-6 flex-row gap-4 border-t border-[#164B49] pt-4">
              <View className="flex-1">
                <View className="mb-1 flex-row items-center gap-1">
                  <Clock size={12} color="#8FA8A8" />
                  <Text className="text-xs font-medium uppercase text-[#8FA8A8]">
                    Submit By
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-[#DCE4E4]">
                  {new Date(round.submissionDeadline).toLocaleDateString()}
                </Text>
              </View>
              <View className="flex-1">
                <View className="mb-1 flex-row items-center gap-1">
                  <Clock size={12} color="#8FA8A8" />
                  <Text className="text-xs font-medium uppercase text-[#8FA8A8]">
                    Vote By
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-[#DCE4E4]">
                  {new Date(round.votingDeadline).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* User Actions */}
          {isSubmissionPhase && (
            <View className="mb-8">
              {mySubmission ? (
                <View className="rounded-lg border border-[#50C878]/30 bg-[#164B49]/30 p-4">
                  <View className="mb-2 flex-row items-center gap-2">
                    <Check size={16} color="#50C878" />
                    <Text className="font-semibold text-[#50C878]">
                      You've submitted!
                    </Text>
                  </View>
                  <Text className="text-lg font-medium text-[#DCE4E4]">
                    {mySubmission.trackName}
                  </Text>
                  <Text className="text-sm text-[#8FA8A8]">
                    {mySubmission.artistName}
                  </Text>
                </View>
              ) : (
                <View className="items-center rounded-lg bg-[#50C878] p-4">
                  <Text className="text-lg font-bold text-[#0A1A1A]">
                    Submit a Song
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Submissions List */}
          <Text className="mb-4 text-xl font-bold text-[#DCE4E4]">
            {isResultsPhase ? "Results" : "Submissions"} ({submissions.length})
          </Text>

          {submissions.length === 0 ? (
            <Text className="py-8 text-center italic text-[#8FA8A8]">
              No submissions yet. Be the first!
            </Text>
          ) : (
            <View className="gap-3 pb-8">
              {submissions.map(
                (
                  sub: {
                    id: string;
                    isOwn: boolean;
                    trackName: string;
                    artistName: string;
                    submitter: { name: string | null } | null;
                    totalPoints: number;
                  },
                  index: number,
                ) => (
                  <View
                    key={sub.id}
                    className={`rounded-lg border p-3 ${
                      sub.isOwn
                        ? "border-[#50C878]/50 bg-[#50C878]/10"
                        : "border-[#164B49] bg-[#102A2A]"
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      {isResultsPhase && (
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-[#0A1A1A]">
                          <Text className="font-bold text-[#DCE4E4]">
                            #{index + 1}
                          </Text>
                        </View>
                      )}

                      <View className="h-12 w-12 rounded bg-[#0A1A1A]" />

                      <View className="flex-1">
                        <Text
                          className="font-semibold text-[#DCE4E4]"
                          numberOfLines={1}
                        >
                          {sub.trackName}
                        </Text>
                        <Text
                          className="text-xs text-[#8FA8A8]"
                          numberOfLines={1}
                        >
                          {sub.artistName}
                        </Text>
                        {isResultsPhase && sub.submitter && (
                          <Text className="mt-1 text-xs text-[#50C878]">
                            Submitted by {sub.submitter.name}
                          </Text>
                        )}
                      </View>

                      {isResultsPhase && (
                        <View className="items-end">
                          <Text className="text-lg font-bold text-[#50C878]">
                            {sub.totalPoints}
                          </Text>
                          <Text className="text-xs text-[#8FA8A8]">pts</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ),
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
