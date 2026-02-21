import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const [joinedList, setJoinedList] = useState<{
    id: string;
    name: string;
    color: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const joinMutation = useMutation(
    trpc.taskList.joinByInvite.mutationOptions({
      onSuccess: async (data) => {
        setJoinedList(data);
        await queryClient.invalidateQueries(trpc.taskList.all.queryFilter());
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
      },
      onError: (err) => {
        setError(err.message);
      },
    }),
  );

  useEffect(() => {
    if (code && session && !joinMutation.isPending && !joinedList && !error) {
      joinMutation.mutate({ inviteCode: code });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, session]);

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          {joinMutation.isPending && (
            <>
              <ActivityIndicator
                color="#50C878"
                size="large"
                style={{ marginBottom: 16 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#DCE4E4",
                  textAlign: "center",
                }}
              >
                Joining list...
              </Text>
            </>
          )}

          {joinedList && (
            <>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: joinedList.color ?? "#50C878",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  opacity: 0.8,
                }}
              >
                <Text
                  style={{
                    fontSize: 28,
                    color: "#0A1A1A",
                    fontWeight: "700",
                  }}
                >
                  {joinedList.name.charAt(0)}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: "#DCE4E4",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Joined &ldquo;{joinedList.name}&rdquo;
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#8FA8A8",
                  textAlign: "center",
                  marginBottom: 24,
                }}
              >
                You can now see and edit tasks in this list.
              </Text>
              <Pressable
                onPress={() =>
                  router.replace(`/lists/${joinedList.id}` as never)
                }
                style={{
                  backgroundColor: "#50C878",
                  borderRadius: 10,
                  paddingHorizontal: 32,
                  paddingVertical: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#0A1A1A",
                  }}
                >
                  View List
                </Text>
              </Pressable>
            </>
          )}

          {error && (
            <>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "#ef4444",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                Could not join list
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#8FA8A8",
                  textAlign: "center",
                  marginBottom: 24,
                }}
              >
                {error}
              </Text>
              <Pressable
                onPress={() => router.replace("/" as never)}
                style={{
                  backgroundColor: "#102A2A",
                  borderWidth: 1,
                  borderColor: "#164B49",
                  borderRadius: 10,
                  paddingHorizontal: 32,
                  paddingVertical: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#DCE4E4",
                  }}
                >
                  Go Home
                </Text>
              </Pressable>
            </>
          )}

          {!session && (
            <Text
              style={{
                fontSize: 16,
                color: "#8FA8A8",
                textAlign: "center",
              }}
            >
              Please sign in to join this list.
            </Text>
          )}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}
