import { Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Minus, Plus } from "lucide-react-native";

interface PointStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}

export function PointStepper({
  value,
  min = 0,
  max,
  onChange,
}: PointStepperProps) {
  const canDecrement = value > min;
  const canIncrement = value < max;

  const handleDecrement = () => {
    if (!canDecrement) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value - 1);
  };

  const handleIncrement = () => {
    if (!canIncrement) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value + 1);
  };

  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={handleDecrement}
        disabled={!canDecrement}
        className="h-9 w-9 items-center justify-center rounded-full border border-[#164B49] bg-[#0A1A1A] active:bg-[#164B49]"
        style={!canDecrement ? { opacity: 0.3 } : undefined}
      >
        <Minus size={16} color="#DCE4E4" />
      </Pressable>

      <View className="min-w-[36px] items-center">
        <Text
          className={`text-lg font-bold ${
            value > 0 ? "text-[#50C878]" : "text-[#8FA8A8]"
          }`}
        >
          {value}
        </Text>
      </View>

      <Pressable
        onPress={handleIncrement}
        disabled={!canIncrement}
        className="h-9 w-9 items-center justify-center rounded-full border"
        style={({ pressed }) => [
          {
            borderColor: "rgba(80,200,120,0.5)",
            backgroundColor: pressed
              ? "rgba(80,200,120,0.2)"
              : "rgba(80,200,120,0.1)",
          },
          !canIncrement && { opacity: 0.3 },
        ]}
      >
        <Plus size={16} color="#50C878" />
      </Pressable>
    </View>
  );
}
