import { Pressable, Text, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";

interface RoundHeaderProps {
  roundNumber: number;
  status: string;
  onBack: () => void;
}

export function RoundHeader({ roundNumber, status, onBack }: RoundHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-4">
      <Pressable 
        onPress={onBack} 
        className="rounded-full p-2"
        style={{ backgroundColor: "#164B49" }}
      >
        <ArrowLeft color="#DCE4E4" size={24} />
      </Pressable>
      <View>
        <Text className="text-center text-xl font-bold text-[#DCE4E4]">
          Round {roundNumber}
        </Text>
        <Text className="text-center text-xs font-medium text-[#50C878] uppercase">
          {status}
        </Text>
      </View>
      <View className="w-10" />
    </View>
  );
}
