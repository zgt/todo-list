import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, X } from "lucide-react-native";

import { trpc } from "~/utils/api";

export default function JoinLeagueModal() {
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: league,
    isLoading,
    error,
  } = useQuery(
    trpc.musicLeague.getLeagueByInviteCode.queryOptions({
      inviteCode: String(inviteCode),
    }),
  );

  const joinMutation = useMutation(
    trpc.musicLeague.joinLeague.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries(
          trpc.musicLeague.getAllLeagues.queryFilter(),
        );
        router.replace(`/music/league/${data.id}` as never);
      },
      onError: (error) => {
        if (error.message.includes("already a member")) {
          if (league) {
            router.replace(`/music/league/${league.id}` as never);
          }
          return;
        }
        Alert.alert("Failed to join", error.message);
      },
    }),
  );

  const dismiss = () => router.back();

  const handleJoin = () => {
    if (!inviteCode) return;
    joinMutation.mutate({ inviteCode });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <ActivityIndicator color="#50C878" size="large" />
        </View>
      );
    }

    if (error || !league) {
      return (
        <>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#DCE4E4",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            League not found
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#8FA8A8",
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 20,
            }}
          >
            The invite code "{inviteCode}" doesn't match any league. Check the
            code and try again.
          </Text>
          <Pressable
            onPress={dismiss}
            style={{
              alignItems: "center",
              borderRadius: 12,
              backgroundColor: "#164B49",
              paddingVertical: 14,
            }}
          >
            <Text style={{ fontWeight: "600", color: "#DCE4E4", fontSize: 16 }}>
              Dismiss
            </Text>
          </Pressable>
        </>
      );
    }

    return (
      <>
        {/* Invite badge */}
        <View
          style={{
            alignSelf: "flex-start",
            borderRadius: 9999,
            backgroundColor: "rgba(80, 200, 120, 0.2)",
            paddingHorizontal: 12,
            paddingVertical: 4,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: "#50C878",
              textTransform: "uppercase",
            }}
          >
            You're invited
          </Text>
        </View>

        {/* League name */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: "#DCE4E4",
            marginBottom: 8,
          }}
        >
          {league.name}
        </Text>

        {/* Description */}
        {league.description && (
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: "#8FA8A8",
              marginBottom: 16,
            }}
          >
            {league.description}
          </Text>
        )}

        {/* Member count */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
          }}
        >
          <Users size={16} color="#8FA8A8" />
          <Text style={{ fontSize: 14, color: "#8FA8A8" }}>
            {league.memberCount}
            {league.maxMembers ? ` / ${league.maxMembers}` : ""} members
          </Text>
        </View>

        {/* Join button */}
        <Pressable
          onPress={handleJoin}
          disabled={joinMutation.isPending}
          style={{
            alignItems: "center",
            borderRadius: 12,
            backgroundColor: "#50C878",
            paddingVertical: 16,
            opacity: joinMutation.isPending ? 0.5 : 1,
          }}
        >
          {joinMutation.isPending ? (
            <ActivityIndicator color="#0A1A1A" />
          ) : (
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#0A1A1A",
              }}
            >
              Join League
            </Text>
          )}
        </Pressable>
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* Backdrop — tap to dismiss */}
      <Pressable
        onPress={dismiss}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
        }}
      />

      {/* Centered modal card */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#164B49",
            backgroundColor: "#102A2A",
            padding: 24,
          }}
        >
          {/* Close button */}
          <Pressable
            onPress={dismiss}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              borderRadius: 9999,
              backgroundColor: "#164B49",
              padding: 6,
              zIndex: 1,
            }}
          >
            <X color="#8FA8A8" size={18} />
          </Pressable>

          {renderContent()}
        </View>
      </View>
    </View>
  );
}
