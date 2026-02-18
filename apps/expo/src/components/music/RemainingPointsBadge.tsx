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
  let badgeStyle: { backgroundColor: string; borderColor: string };

  if (remaining === 0) {
    colorClass = "text-[#E57373]";
    badgeStyle = {
      backgroundColor: "rgba(229,115,115,0.1)",
      borderColor: "rgba(229,115,115,0.3)",
    };
  } else if (ratio <= 0.3) {
    colorClass = "text-[#FFD700]";
    badgeStyle = {
      backgroundColor: "rgba(255,215,0,0.1)",
      borderColor: "rgba(255,215,0,0.3)",
    };
  } else {
    colorClass = "text-[#50C878]";
    badgeStyle = {
      backgroundColor: "rgba(80,200,120,0.1)",
      borderColor: "rgba(80,200,120,0.3)",
    };
  }

  return (
    <View
      className="flex-row items-center gap-2 rounded-full border px-4 py-2"
      style={badgeStyle}
    >
      <Text className={`text-sm font-bold ${colorClass}`}>{remaining}</Text>
      <Text className="text-xs text-[#8FA8A8]">/ {total} pts remaining</Text>
    </View>
  );
}
