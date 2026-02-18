import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Clock } from "lucide-react-native";

interface CountdownTimerProps {
  deadline: Date | string;
  label?: string;
}

function getTimeRemaining(deadline: Date) {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
  };
}

export function CountdownTimer({ deadline, label }: CountdownTimerProps) {
  const deadlineDate = useMemo(
    () => (typeof deadline === "string" ? new Date(deadline) : deadline),
    [deadline],
  );
  const [time, setTime] = useState(() => getTimeRemaining(deadlineDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining(deadlineDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineDate]);

  if (time.total <= 0) {
    return (
      <View className="flex-row items-center gap-2 rounded-lg bg-[#8FA8A8]/10 px-3 py-2">
        <Clock size={14} color="#8FA8A8" />
        <Text className="text-xs font-medium text-[#8FA8A8]">
          {label ? `${label}: ` : ""}Deadline passed
        </Text>
      </View>
    );
  }

  // Less than 1 hour = urgent
  const isUrgent = time.total < 60 * 60 * 1000;
  // Less than 24 hours = warning
  const isWarning = time.total < 24 * 60 * 60 * 1000;

  const accentColor = isUrgent ? "#E57373" : isWarning ? "#FFD700" : "#50C878";

  const bgClass = isUrgent
    ? "bg-[#E57373]/10"
    : isWarning
      ? "bg-[#FFD700]/10"
      : "bg-[#50C878]/10";

  return (
    <View
      className={`flex-row items-center gap-2 rounded-lg px-3 py-2 ${bgClass}`}
    >
      <Clock size={14} color={accentColor} />
      {label && <Text className="text-xs text-[#8FA8A8]">{label}</Text>}
      <View className="flex-row items-center gap-1">
        {time.days > 0 && (
          <>
            <TimeUnit value={time.days} unit="d" color={accentColor} />
            <Text className="text-[10px] text-[#8FA8A8]">:</Text>
          </>
        )}
        <TimeUnit value={time.hours} unit="h" color={accentColor} />
        <Text className="text-[10px] text-[#8FA8A8]">:</Text>
        <TimeUnit value={time.minutes} unit="m" color={accentColor} />
        <Text className="text-[10px] text-[#8FA8A8]">:</Text>
        <TimeUnit value={time.seconds} unit="s" color={accentColor} />
      </View>
    </View>
  );
}

function TimeUnit({
  value,
  unit,
  color,
}: {
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View className="items-center">
      <Text
        className="text-sm font-bold"
        style={{ color, fontVariant: ["tabular-nums"] }}
      >
        {value.toString().padStart(2, "0")}
      </Text>
      <Text className="text-[8px] text-[#8FA8A8]">{unit}</Text>
    </View>
  );
}
