import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { DotBackground } from "./DotBackground";

export function GradientBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      {/* Base gradient background */}
      <LinearGradient
        colors={["#0A1A1A", "#102A2A", "#0A1A1A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Dot pattern overlay */}
      <DotBackground />

      {/* Aurora effects */}
      <LinearGradient
        colors={["rgba(80, 200, 120, 0.15)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
      />
      <LinearGradient
        colors={["transparent", "rgba(80, 200, 120, 0.1)"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: 0.4 }]}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1A1A",
  },
});
