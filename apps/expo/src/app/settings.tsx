import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Clock,
  FlaskConical,
  Mail,
  Send,
  Smartphone,
  Wifi,
} from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";
import { REMINDER_OFFSET_OPTIONS } from "~/utils/notification-prefs";
import {
  cancelAllTaskReminders,
  getPermissionStatus,
  requestPermissions,
  scheduleTaskReminder,
} from "~/utils/notifications";

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [permissionStatus, setPermissionStatus] =
    useState<string>("undetermined");

  // Load preferences from server (source of truth)
  const { data: serverPrefs, isLoading: prefsLoading } = useQuery(
    trpc.notification.getUserPreferences.queryOptions(),
  );

  // Local state for optimistic UI (null = use server value)
  const [localPush, setLocalPush] = useState<boolean | null>(null);
  const [localEmail, setLocalEmail] = useState<boolean | null>(null);
  const [localOffset, setLocalOffset] = useState<number | null>(null);

  // Derived values: local override ?? server ?? defaults
  const pushReminders = localPush ?? serverPrefs?.pushReminders ?? true;
  const emailReminders = localEmail ?? serverPrefs?.emailReminders ?? false;
  const offsetMinutes = localOffset ?? serverPrefs?.reminderOffsetMinutes ?? 15;

  // Reset local overrides when server data arrives
  useEffect(() => {
    if (serverPrefs) {
      /* eslint-disable react-hooks/set-state-in-effect -- intentional: syncing server state resets optimistic overrides */
      setLocalPush(null);
      setLocalEmail(null);
      setLocalOffset(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [serverPrefs]);

  // Check notification permissions
  useEffect(() => {
    void getPermissionStatus().then(setPermissionStatus);
  }, []);

  // Mutation to update server preferences
  const updatePrefs = useMutation(
    trpc.notification.updateUserPreferences.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.notification.getUserPreferences.queryFilter(),
        );
        // Reset local overrides
        setLocalPush(null);
        setLocalEmail(null);
        setLocalOffset(null);
      },
      onError: () => {
        Alert.alert("Error", "Failed to save notification preferences.");
      },
    }),
  );

  const handleTogglePush = useCallback(
    async (value: boolean) => {
      setLocalPush(value);
      updatePrefs.mutate({
        pushReminders: value,
        emailReminders,
        reminderOffsetMinutes: offsetMinutes,
      });
      if (!value) {
        await cancelAllTaskReminders();
      }
    },
    [emailReminders, offsetMinutes, updatePrefs],
  );

  const handleToggleEmail = useCallback(
    (value: boolean) => {
      setLocalEmail(value);
      updatePrefs.mutate({
        pushReminders,
        emailReminders: value,
        reminderOffsetMinutes: offsetMinutes,
      });
    },
    [pushReminders, offsetMinutes, updatePrefs],
  );

  const handleSelectOffset = useCallback(
    (minutes: number) => {
      setLocalOffset(minutes);
      updatePrefs.mutate({
        pushReminders,
        emailReminders,
        reminderOffsetMinutes: minutes,
      });
    },
    [pushReminders, emailReminders, updatePrefs],
  );

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestPermissions();
    setPermissionStatus(granted ? "granted" : "denied");
  }, []);

  if (prefsLoading) {
    return (
      <GradientBackground>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Stack.Screen options={{ headerShown: false }} />
          <ActivityIndicator size="large" color="#50C878" />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
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
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft color="#DCE4E4" size={24} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#DCE4E4" }}>
            Notification Settings
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        >
          {/* Permission Status */}
          {permissionStatus !== "granted" && (
            <Pressable
              onPress={handleRequestPermission}
              style={{
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E5A04D",
                backgroundColor: "#2A2010",
                padding: 16,
              }}
            >
              <BellOff size={20} color="#E5A04D" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: "500", color: "#E5A04D" }}
                >
                  Notifications are disabled
                </Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: "#8FA8A8" }}>
                  Tap to enable notifications for this device
                </Text>
              </View>
            </Pressable>
          )}

          {/* Task Reminders Section */}
          <View
            style={{
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            {pushReminders ? (
              <Bell size={22} color="#50C878" />
            ) : (
              <BellOff size={22} color="#8FA8A8" />
            )}
            <View>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#DCE4E4" }}
              >
                Task Reminders
              </Text>
              <Text style={{ fontSize: 14, color: "#8FA8A8" }}>
                Get notified before tasks are due
              </Text>
            </View>
          </View>

          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#164B49",
              backgroundColor: "#102A2A",
            }}
          >
            {/* Push Notifications Toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: 1,
                borderBottomColor: "#164B49",
                padding: 16,
              }}
            >
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: "500", color: "#DCE4E4" }}
                >
                  Push Notifications
                </Text>
                <Text style={{ marginTop: 2, fontSize: 12, color: "#8FA8A8" }}>
                  Receive push notifications on this device
                </Text>
              </View>
              <Switch
                value={pushReminders}
                onValueChange={handleTogglePush}
                trackColor={{ false: "#164B49", true: "#50C878" }}
                thumbColor="#DCE4E4"
              />
            </View>

            {/* Email Reminders Toggle */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottomWidth: pushReminders ? 1 : 0,
                borderBottomColor: "#164B49",
                padding: 16,
              }}
            >
              <View
                style={{
                  flex: 1,
                  paddingRight: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Mail
                  size={18}
                  color={emailReminders ? "#50C878" : "#8FA8A8"}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                      color: "#DCE4E4",
                    }}
                  >
                    Email Reminders
                  </Text>
                  <Text
                    style={{ marginTop: 2, fontSize: 12, color: "#8FA8A8" }}
                  >
                    Receive reminder notifications via email
                  </Text>
                </View>
              </View>
              <Switch
                value={emailReminders}
                onValueChange={handleToggleEmail}
                trackColor={{ false: "#164B49", true: "#50C878" }}
                thumbColor="#DCE4E4"
              />
            </View>

            {/* Reminder Offset Selection */}
            {pushReminders && (
              <View style={{ padding: 16 }}>
                <View
                  style={{
                    marginBottom: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Clock size={16} color="#8FA8A8" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: "#8FA8A8",
                    }}
                  >
                    Remind me
                  </Text>
                </View>
                <View style={{ gap: 4 }}>
                  {REMINDER_OFFSET_OPTIONS.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => handleSelectOffset(option.value)}
                      style={{
                        borderRadius: 8,
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        backgroundColor:
                          offsetMinutes === option.value
                            ? "rgba(80, 200, 120, 0.2)"
                            : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight:
                            offsetMinutes === option.value ? "600" : "400",
                          color:
                            offsetMinutes === option.value
                              ? "#50C878"
                              : "#DCE4E4",
                        }}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Info */}
          <Text
            style={{
              marginTop: 16,
              textAlign: "center",
              fontSize: 12,
              color: "#8FA8A8",
            }}
          >
            Music League notification preferences can be found in{"\n"}
            Music Leagues → Settings
          </Text>

          {/* Test Notifications Section */}
          <TestNotificationsSection />

          {/* App Version */}
          <Text
            style={{
              marginTop: 32,
              textAlign: "center",
              fontSize: 12,
              color: "#4A6A6A",
            }}
          >
            Tokilist v{Constants.expoConfig?.version ?? "1.0.0"} (
            {Constants.expoConfig?.ios?.buildNumber ?? "1"})
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

// ─── Test Buttons (dev only) ─────────────────────────────────────────

interface TestButton {
  label: string;
  description: string;
  icon: React.ReactNode;
  onPress: () => void | Promise<void>;
  loading?: boolean;
}

function TestNotificationsSection() {
  const [sendingLocal, setSendingLocal] = useState(false);
  const [sendingScheduled, setSendingScheduled] = useState(false);

  const testPushGeneric = useMutation(
    trpc.notification.sendTestPush.mutationOptions({
      onSuccess: () =>
        Alert.alert("Sent", "Server push sent — check your device."),
      onError: (e) => Alert.alert("Failed", e.message),
    }),
  );

  const testPushRound = useMutation(
    trpc.notification.sendTestPush.mutationOptions({
      onSuccess: () => Alert.alert("Sent", "Round started push sent."),
      onError: (e) => Alert.alert("Failed", e.message),
    }),
  );

  const testPushVoting = useMutation(
    trpc.notification.sendTestPush.mutationOptions({
      onSuccess: () => Alert.alert("Sent", "Voting open push sent."),
      onError: (e) => Alert.alert("Failed", e.message),
    }),
  );

  const testPushResults = useMutation(
    trpc.notification.sendTestPush.mutationOptions({
      onSuccess: () => Alert.alert("Sent", "Results push sent."),
      onError: (e) => Alert.alert("Failed", e.message),
    }),
  );

  const handleLocalNotification = async () => {
    setSendingLocal(true);
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "📋 Local Test",
          body: "This is a local notification — no server involved!",
          sound: "default",
          data: { type: "test" },
        },
        trigger: null, // fire immediately
      });
      Alert.alert("Sent", "Local notification fired.");
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSendingLocal(false);
    }
  };

  const handleScheduledNotification = async () => {
    setSendingScheduled(true);
    try {
      const fiveSecondsFromNow = new Date(Date.now() + 5 * 1000);
      await scheduleTaskReminder(
        "test-scheduled",
        "Test Task — Due in 5 seconds!",
        fiveSecondsFromNow,
        0,
      );
      Alert.alert(
        "Scheduled",
        "Task reminder will fire in ~5 seconds. Background the app to see it!",
      );
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSendingScheduled(false);
    }
  };

  const buttons: TestButton[] = [
    {
      label: "Local (Immediate)",
      description: "Fires a local notification right now",
      icon: <Smartphone size={18} color="#DCE4E4" />,
      onPress: handleLocalNotification,
      loading: sendingLocal,
    },
    {
      label: "Local (Scheduled 5s)",
      description: "Schedules a task reminder in 5 seconds",
      icon: <Clock size={18} color="#DCE4E4" />,
      onPress: handleScheduledNotification,
      loading: sendingScheduled,
    },
    {
      label: "Server Push (Generic)",
      description: "Sends a test push via Expo push service",
      icon: <Wifi size={18} color="#DCE4E4" />,
      onPress: () => testPushGeneric.mutate({ variant: "generic" }),
      loading: testPushGeneric.isPending,
    },
    {
      label: "Server Push (Round Started)",
      description: "Simulates a new round notification",
      icon: <Send size={18} color="#DCE4E4" />,
      onPress: () => testPushRound.mutate({ variant: "round-started" }),
      loading: testPushRound.isPending,
    },
    {
      label: "Server Push (Voting Open)",
      description: "Simulates a voting open notification",
      icon: <Send size={18} color="#DCE4E4" />,
      onPress: () => testPushVoting.mutate({ variant: "voting-open" }),
      loading: testPushVoting.isPending,
    },
    {
      label: "Server Push (Results)",
      description: "Simulates a results available notification",
      icon: <Send size={18} color="#DCE4E4" />,
      onPress: () => testPushResults.mutate({ variant: "results-available" }),
      loading: testPushResults.isPending,
    },
  ];

  return (
    <View style={{ marginTop: 32 }}>
      <View
        style={{
          marginBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <FlaskConical size={22} color="#E5A04D" />
        <View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#DCE4E4" }}>
            Test Notifications
          </Text>
          <Text style={{ fontSize: 14, color: "#8FA8A8" }}>
            Tap to test each notification type
          </Text>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {buttons.map((btn) => (
          <Pressable
            key={btn.label}
            onPress={btn.onPress}
            disabled={btn.loading}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#164B49",
              backgroundColor: "#102A2A",
              padding: 16,
              opacity: btn.loading ? 0.5 : 1,
            }}
          >
            {btn.loading ? (
              <ActivityIndicator size="small" color="#DCE4E4" />
            ) : (
              btn.icon
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "500", color: "#DCE4E4" }}
              >
                {btn.label}
              </Text>
              <Text style={{ marginTop: 2, fontSize: 12, color: "#8FA8A8" }}>
                {btn.description}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
