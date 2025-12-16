import { Pressable, View } from "react-native";
import { Plus } from "lucide-react-native";

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  return (
    <Pressable onPress={onPress} className="shadow-primary/50 shadow-2xl">
      <View className="bg-primary h-16 w-16 items-center justify-center rounded-full border border-white/20">
        <Plus size={32} color="#0A1A1A" />
      </View>
    </Pressable>
  );
}
