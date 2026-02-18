import { Image, ScrollView, Text, View } from "react-native";
import { Check, Minus } from "lucide-react-native";

interface MemberStatus {
  id: string;
  name: string | null;
  image: string | null;
  hasSubmitted: boolean;
  hasVoted: boolean;
}

interface MemberStatusBoardProps {
  members: MemberStatus[];
  /** Which action to track: "submitted" or "voted" */
  trackAction: "submitted" | "voted";
  label?: string;
}

export function MemberStatusBoard({
  members,
  trackAction,
  label,
}: MemberStatusBoardProps) {
  const completedCount = members.filter((m) =>
    trackAction === "submitted" ? m.hasSubmitted : m.hasVoted,
  ).length;

  return (
    <View className="rounded-xl border border-[#164B49] bg-[#102A2A] px-4 py-3">
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xs font-semibold uppercase tracking-wide text-[#8FA8A8]">
          {label ??
            (trackAction === "submitted"
              ? "Submission Status"
              : "Voting Status")}
        </Text>
        <Text className="text-xs font-medium text-[#50C878]">
          {completedCount}/{members.length}
        </Text>
      </View>

      {/* Scrollable member list */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12 }}
      >
        {members.map((member) => {
          const isDone =
            trackAction === "submitted"
              ? member.hasSubmitted
              : member.hasVoted;

          return (
            <View key={member.id} className="items-center" style={{ width: 52 }}>
              {/* Avatar with status indicator */}
              <View className="relative">
                {member.image ? (
                  <Image
                    source={{ uri: member.image }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      borderWidth: 2,
                      borderColor: isDone ? "#50C878" : "#164B49",
                    }}
                  />
                ) : (
                  <View
                    className="items-center justify-center rounded-full"
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: isDone ? "#50C878" + "20" : "#0A1A1A",
                      borderWidth: 2,
                      borderColor: isDone ? "#50C878" : "#164B49",
                    }}
                  >
                    <Text
                      className={`text-xs font-bold ${isDone ? "text-[#50C878]" : "text-[#8FA8A8]"}`}
                    >
                      {(member.name ?? "?")[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}

                {/* Status badge */}
                <View
                  className="absolute -bottom-0.5 -right-0.5 items-center justify-center rounded-full"
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: isDone ? "#50C878" : "#164B49",
                  }}
                >
                  {isDone ? (
                    <Check size={10} color="#0A1A1A" strokeWidth={3} />
                  ) : (
                    <Minus size={10} color="#8FA8A8" strokeWidth={2} />
                  )}
                </View>
              </View>

              {/* Name */}
              <Text
                className={`mt-1.5 text-[10px] ${isDone ? "text-[#DCE4E4]" : "text-[#8FA8A8]"}`}
                numberOfLines={1}
              >
                {member.name?.split(" ")[0] ?? "?"}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
