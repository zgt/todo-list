import { Pressable, View } from "react-native";
import { Plus } from "lucide-react-native";

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  return (
    <Pressable
      onPress={onPress}
      className="shadow-2xl shadow-primary/50"
    >
      <View className="h-16 w-16 items-center justify-center rounded-full bg-primary border border-white/20">
        <Plus size={32} color="#0A1A1A" />
      </View>
    </Pressable>
  );
}
