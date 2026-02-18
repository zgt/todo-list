import { Text, View } from "react-native";
import { Check } from "lucide-react-native";

const PHASES = ["SUBMISSION", "LISTENING", "VOTING", "RESULTS"] as const;
const PHASE_LABELS = ["Submit", "Listen", "Vote", "Results"] as const;

type Phase = (typeof PHASES)[number];

interface PhaseProgressBarProps {
  currentPhase: string;
}

export function PhaseProgressBar({ currentPhase }: PhaseProgressBarProps) {
  const currentIndex = PHASES.indexOf(currentPhase as Phase);
  const isCompleted = currentPhase === "COMPLETED";

  return (
    <View className="flex-row items-center justify-between px-2">
      {PHASES.map((phase, index) => {
        const isActive = index === currentIndex && !isCompleted;
        const isDone = index < currentIndex || isCompleted;

        return (
          <View key={phase} className="flex-1 flex-row items-center">
            {/* Step circle */}
            <View className="items-center">
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  isDone
                    ? "bg-[#50C878]"
                    : isActive
                      ? "border-2 border-[#50C878] bg-[#50C878]/20"
                      : "border border-[#164B49] bg-[#0A1A1A]"
                }`}
              >
                {isDone ? (
                  <Check size={16} color="#0A1A1A" strokeWidth={3} />
                ) : (
                  <Text
                    className={`text-xs font-bold ${
                      isActive ? "text-[#50C878]" : "text-[#8FA8A8]"
                    }`}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                className={`mt-1 text-[10px] font-semibold ${
                  isDone || isActive ? "text-[#50C878]" : "text-[#8FA8A8]"
                }`}
              >
                {PHASE_LABELS[index]}
              </Text>
            </View>

            {/* Connector line */}
            {index < PHASES.length - 1 && (
              <View
                className={`mx-1 h-0.5 flex-1 ${
                  isDone ? "bg-[#50C878]" : "bg-[#164B49]"
                }`}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}
