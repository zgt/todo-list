import { StyleSheet, Pressable, Text, View } from "react-native";
import { BlurView } from "expo-blur";

interface CategoryPillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function CategoryPill({ label, active, onPress }: CategoryPillProps) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.pillContainer,
          active ? styles.pillActive : styles.pillInactive,
        ]}
        className="overflow-hidden rounded-full"
      >
        <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
        <View className="px-6 py-2">
          <Text
            className={`text-sm font-medium ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pillContainer: {
    borderRadius: 9999,
    overflow: "hidden",
  },
  pillActive: {
    borderWidth: 2,
    borderColor: "rgba(80, 200, 120, 1)", // #50C878 primary emerald
    backgroundColor: "rgba(80, 200, 120, 0.2)",
    shadowColor: "#50C878",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pillInactive: {
    borderWidth: 2,
    borderColor: "rgba(22, 75, 73, 1)", // #164B49 border default
    backgroundColor: "transparent",
  },
});
