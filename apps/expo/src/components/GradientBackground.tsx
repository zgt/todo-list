import { StyleSheet, View } from "react-native";

import { DotBackground } from "./DotBackground";

export function GradientBackground({
  children,
  rippleTrigger,
}: {
  children: React.ReactNode;
  rippleTrigger?: number;
}) {
  return (
    <View style={styles.container}>
      {/* Base background */}
      <View
        style={[StyleSheet.absoluteFill, styles.baseGradient]}
        pointerEvents="none"
      />

      {/* Dot pattern overlay */}
      <DotBackground trigger={rippleTrigger} />

      {/* Aurora effects (subtle overlays) */}
      <View
        style={[StyleSheet.absoluteFill, styles.auroraTop]}
        pointerEvents="none"
      />
      <View
        style={[StyleSheet.absoluteFill, styles.auroraBottom]}
        pointerEvents="none"
      />

      <View style={{ flex: 1, zIndex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1A1A",
  },
  baseGradient: {
    backgroundColor: "#0E2222",
  },
  auroraTop: {
    backgroundColor: "rgba(80, 200, 120, 0.06)",
    opacity: 0.6,
  },
  auroraBottom: {
    backgroundColor: "rgba(80, 200, 120, 0.04)",
    opacity: 0.4,
  },
});
