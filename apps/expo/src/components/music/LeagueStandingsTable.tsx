import { Image, Text, View } from "react-native";

interface StandingEntry {
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  totalPoints: number;
  roundsWon: number;
  roundsParticipated: number;
  avgPointsPerRound: number;
}

interface LeagueStandingsTableProps {
  standings: StandingEntry[];
  currentUserId: string;
}

export function LeagueStandingsTable({
  standings,
  currentUserId,
}: LeagueStandingsTableProps) {
  if (standings.length === 0) {
    return (
      <View className="items-center py-6">
        <Text className="text-sm text-[#8FA8A8] italic">
          No standings yet. Complete a round to see rankings.
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-xl border border-[#164B49] bg-[#102A2A] overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center border-b border-[#164B49] px-4 py-3">
        <Text className="w-8 text-xs font-bold text-[#8FA8A8] uppercase">#</Text>
        <Text className="flex-1 text-xs font-bold text-[#8FA8A8] uppercase">Player</Text>
        <Text className="w-14 text-center text-xs font-bold text-[#8FA8A8] uppercase">Pts</Text>
        <Text className="w-14 text-center text-xs font-bold text-[#8FA8A8] uppercase">Wins</Text>
      </View>

      {/* Rows */}
      {standings.map((entry, index) => {
        const isCurrentUser = entry.user.id === currentUserId;
        const position = index + 1;

        return (
          <View
            key={entry.user.id}
            className={`flex-row items-center px-4 py-3 ${
              isCurrentUser ? "bg-[#50C878]/10" : ""
            } ${index < standings.length - 1 ? "border-b border-[#164B49]/50" : ""}`}
          >
            {/* Position */}
            <View className="w-8">
              <Text
                className={`text-sm font-bold ${
                  position === 1
                    ? "text-[#FFD700]"
                    : position === 2
                      ? "text-[#C0C0C0]"
                      : position === 3
                        ? "text-[#CD7F32]"
                        : "text-[#8FA8A8]"
                }`}
              >
                {position}
              </Text>
            </View>

            {/* Player */}
            <View className="flex-1 flex-row items-center gap-2">
              {entry.user.image ? (
                <Image
                  source={{ uri: entry.user.image }}
                  className="h-7 w-7 rounded-full"
                />
              ) : (
                <View className="h-7 w-7 items-center justify-center rounded-full bg-[#164B49]">
                  <Text className="text-xs font-bold text-[#DCE4E4]">
                    {(entry.user.name ?? "?")[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
              <Text
                className={`text-sm font-medium ${
                  isCurrentUser ? "text-[#50C878]" : "text-[#DCE4E4]"
                }`}
                numberOfLines={1}
              >
                {entry.user.name ?? "Unknown"}
                {isCurrentUser ? " (you)" : ""}
              </Text>
            </View>

            {/* Points */}
            <Text className="w-14 text-center text-sm font-bold text-[#DCE4E4]">
              {entry.totalPoints}
            </Text>

            {/* Wins */}
            <Text className="w-14 text-center text-sm font-medium text-[#8FA8A8]">
              {entry.roundsWon}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
