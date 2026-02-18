import { Text, View } from "react-native";

interface RoundThemeCardProps {
  themeName: string;
  themeDescription: string | null;
  submissionDeadline: Date;
  votingDeadline: Date;
}

export function RoundThemeCard({
  themeName,
  themeDescription,
  submissionDeadline,
  votingDeadline,
}: RoundThemeCardProps) {
  return (
    <View 
      className="mb-6 rounded-xl border border-[#164B49] p-6"
      style={{ backgroundColor: "#102A2A" }}
    >
      <Text className="mb-2 text-sm font-bold tracking-wide text-[#50C878] uppercase">
        Theme
      </Text>
      <Text className="mb-4 text-3xl leading-tight font-bold text-[#DCE4E4]">
        {themeName}
      </Text>
      {themeDescription && (
        <Text className="text-base leading-relaxed text-[#8FA8A8]">
          {themeDescription}
        </Text>
      )}
      <View className="mt-6 flex-row gap-4 border-t border-[#164B49] pt-4">
        <View className="flex-1">
          <Text className="mb-1 text-xs font-medium text-[#8FA8A8] uppercase">
            Submit By
          </Text>
          <Text className="text-sm font-semibold text-[#DCE4E4]">
            {submissionDeadline.toLocaleDateString()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-xs font-medium text-[#8FA8A8] uppercase">
            Vote By
          </Text>
          <Text className="text-sm font-semibold text-[#DCE4E4]">
            {votingDeadline.toLocaleDateString()}
          </Text>
        </View>
      </View>
    </View>
  );
}
