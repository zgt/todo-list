import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, BellOff } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";

interface NotificationPref {
  key: "roundStart" | "submissionReminder" | "votingOpen" | "resultsAvailable";
  label: string;
  description: string;
}

const NOTIFICATION_PREFS: NotificationPref[] = [
  {
    key: "roundStart",
    label: "Round Started",
    description: "Get notified when a new round begins",
  },
  {
    key: "submissionReminder",
    label: "Submission Reminder",
    description: "Reminder before submission deadline",
  },
  {
    key: "votingOpen",
    label: "Voting Open",
    description: "Get notified when voting starts",
  },
  {
    key: "resultsAvailable",
    label: "Results Available",
    description: "Get notified when results are posted",
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rippleTrigger] = useState(0);

  const { data: profile, isLoading } = useQuery(
    trpc.musicLeague.getUserProfile.queryOptions(),
  );

  const [prefs, setPrefs] = useState({
    roundStart: true,
    submissionReminder: true,
    votingOpen: true,
    resultsAvailable: true,
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Sync prefs from server
  useEffect(() => {
    if (profile?.notificationPreferences) {
      const serverPrefs = profile.notificationPreferences as Record<
        string,
        boolean
      >;
      /* eslint-disable react-hooks/set-state-in-effect -- intentional: syncing server notification prefs to local state */
      setPrefs({
        roundStart: serverPrefs.roundStart ?? true,
        submissionReminder: serverPrefs.submissionReminder ?? true,
        votingOpen: serverPrefs.votingOpen ?? true,
        resultsAvailable: serverPrefs.resultsAvailable ?? true,
      });
      setHasChanges(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [profile?.notificationPreferences]);

  const saveMutation = useMutation(
    trpc.musicLeague.updateNotificationPreferences.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getUserProfile.queryFilter(),
        );
        setHasChanges(false);
        Alert.alert("Saved", "Notification preferences updated.");
      },
      onError: (error) => {
        Alert.alert("Failed to save", error.message);
      },
    }),
  );

  const handleToggle = (key: NotificationPref["key"]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = () => {
    saveMutation.mutate(prefs);
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <Stack.Screen options={{ headerShown: false }} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const allEnabled = Object.values(prefs).every(Boolean);

  return (
    <GradientBackground rippleTrigger={rippleTrigger}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              borderRadius: 999,
              backgroundColor: "#164B49",
              padding: 8,
            }}
          >
            <ArrowLeft color="#DCE4E4" size={24} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#DCE4E4" }}>
            Settings
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1, padding: 16 }}>
          {/* Notification Section Header */}
          <View
            style={{
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            {allEnabled ? (
              <Bell size={22} color="#50C878" />
            ) : (
              <BellOff size={22} color="#8FA8A8" />
            )}
            <View>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#DCE4E4" }}
              >
                Notifications
              </Text>
              <Text style={{ fontSize: 14, color: "#8FA8A8" }}>
                Choose which notifications you receive
              </Text>
            </View>
          </View>

          {/* Notification Toggles */}
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#164B49",
              backgroundColor: "#102A2A",
            }}
          >
            {NOTIFICATION_PREFS.map((pref, index) => (
              <View
                key={pref.key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                  borderBottomWidth:
                    index < NOTIFICATION_PREFS.length - 1 ? 1 : 0,
                  borderBottomColor: "#164B49",
                }}
              >
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                      color: "#DCE4E4",
                    }}
                  >
                    {pref.label}
                  </Text>
                  <Text
                    style={{ marginTop: 2, fontSize: 12, color: "#8FA8A8" }}
                  >
                    {pref.description}
                  </Text>
                </View>
                <Switch
                  value={prefs[pref.key]}
                  onValueChange={() => handleToggle(pref.key)}
                  trackColor={{ false: "#164B49", true: "#50C878" }}
                  thumbColor="#DCE4E4"
                />
              </View>
            ))}
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            style={{
              marginTop: 24,
              alignItems: "center",
              borderRadius: 12,
              backgroundColor: "#50C878",
              paddingVertical: 16,
              opacity: !hasChanges || saveMutation.isPending ? 0.5 : 1,
            }}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#0A1A1A" size="small" />
            ) : (
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#0A1A1A" }}
              >
                {hasChanges ? "Save Changes" : "No Changes"}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}
