import { Text, View } from "react-native";

interface RemainingPointsBadgeProps {
  remaining: number;
  total: number;
}

export function RemainingPointsBadge({
  remaining,
  total,
}: RemainingPointsBadgeProps) {
  const ratio = total > 0 ? remaining / total : 0;

  let colorClass: string;
  let bgClass: string;
  let borderClass: string;

  if (remaining === 0) {
    colorClass = "text-[#E57373]";
    bgClass = "bg-[#E57373]/10";
    borderClass = "border-[#E57373]/30";
  } else if (ratio <= 0.3) {
    colorClass = "text-[#FFD700]";
    bgClass = "bg-[#FFD700]/10";
    borderClass = "border-[#FFD700]/30";
  } else {
    colorClass = "text-[#50C878]";
    bgClass = "bg-[#50C878]/10";
    borderClass = "border-[#50C878]/30";
  }

  return (
    <View
      className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${bgClass} ${borderClass}`}
    >
      <Text className={`text-sm font-bold ${colorClass}`}>
        {remaining}
      </Text>
      <Text className="text-xs text-[#8FA8A8]">
        / {total} pts remaining
      </Text>
    </View>
  );
}
