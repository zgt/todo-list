import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
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
  const [refreshing, setRefreshing] = useState(false);
  const [rippleTrigger, setRippleTrigger] = useState(0);
  const rippleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRipple = useCallback(() => {
    if (rippleDebounceRef.current) return;
    setRippleTrigger((prev) => prev + 1);
    rippleDebounceRef.current = setTimeout(() => {
      rippleDebounceRef.current = null;
    }, 500);
  }, []);

  const {
    data: profile,
    isLoading,
    refetch,
  } = useQuery(trpc.musicLeague.getUserProfile.queryOptions());

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
      setPrefs({
        roundStart: serverPrefs.roundStart ?? true,
        submissionReminder: serverPrefs.submissionReminder ?? true,
        votingOpen: serverPrefs.votingOpen ?? true,
        resultsAvailable: serverPrefs.resultsAvailable ?? true,
      });
      setHasChanges(false);
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerRipple();
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch, triggerRipple]);

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color="#50C878" />
          <Text className="mt-3 text-[#8FA8A8]">Loading settings...</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const allEnabled = Object.values(prefs).every(Boolean);

  return (
    <GradientBackground rippleTrigger={rippleTrigger}>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4">
          <Pressable
            onPress={() => router.back()}
            className="rounded-full bg-[#164B49] p-2"
          >
            <ArrowLeft color="#DCE4E4" size={24} />
          </Pressable>
          <Text className="text-xl font-bold text-[#DCE4E4]">Settings</Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#50C878"
            />
          }
        >
          {/* Notification Section Header */}
          <View className="mb-4 flex-row items-center gap-3">
            {allEnabled ? (
              <Bell size={22} color="#50C878" />
            ) : (
              <BellOff size={22} color="#8FA8A8" />
            )}
            <View>
              <Text className="text-lg font-bold text-[#DCE4E4]">
                Notifications
              </Text>
              <Text className="text-sm text-[#8FA8A8]">
                Choose which notifications you receive
              </Text>
            </View>
          </View>

          {/* Notification Toggles */}
          <View className="rounded-xl border border-[#164B49] bg-[#102A2A]">
            {NOTIFICATION_PREFS.map((pref, index) => (
              <View
                key={pref.key}
                className={`flex-row items-center justify-between p-4 ${
                  index < NOTIFICATION_PREFS.length - 1
                    ? "border-b border-[#164B49]"
                    : ""
                }`}
              >
                <View className="flex-1 pr-4">
                  <Text className="text-base font-medium text-[#DCE4E4]">
                    {pref.label}
                  </Text>
                  <Text className="mt-0.5 text-xs text-[#8FA8A8]">
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
            className="mt-6 items-center rounded-xl bg-[#50C878] py-4 active:bg-[#66D99A]"
            style={
              !hasChanges || saveMutation.isPending
                ? { opacity: 0.5 }
                : undefined
            }
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="#0A1A1A" size="small" />
            ) : (
              <Text className="text-base font-bold text-[#0A1A1A]">
                {hasChanges ? "Save Changes" : "No Changes"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
