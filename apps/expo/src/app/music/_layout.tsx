import { Stack } from "expo-router";

export default function MusicLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A1A1A" },
      }}
    >
      <Stack.Screen
        name="join/[inviteCode]"
        options={{
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}
