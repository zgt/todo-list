import { Text, View } from "react-native";

import type { SubmissionItem } from "~/components/music/roundDetailTypes";
import { ResultCard } from "~/components/music/ResultCard";

interface ResultsPhaseViewProps {
  submissions: SubmissionItem[];
}

export function ResultsPhaseView({ submissions }: ResultsPhaseViewProps) {
  const sortedSubmissions = [...submissions].sort(
    (a, b) => b.totalPoints - a.totalPoints,
  );

  return (
    <View className="gap-3">
      <Text className="text-xl font-bold text-[#DCE4E4]">
        Results ({submissions.length})
      </Text>

      {sortedSubmissions.map((sub, index) => (
        <ResultCard
          key={sub.id}
          rank={index + 1}
          trackName={sub.trackName}
          artistName={sub.artistName}
          albumName={sub.albumName}
          albumArtUrl={sub.albumArtUrl}
          submitterName={sub.submitter?.name ?? null}
          totalPoints={sub.totalPoints}
          votes={sub.votes}
          comments={sub.comments}
        />
      ))}
    </View>
  );
}
