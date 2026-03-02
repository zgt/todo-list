import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Crown,
  Link as LinkIcon,
  LogOut,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { getBaseUrl } from "~/utils/base-url";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  const { data: list, isLoading } = useQuery(
    trpc.taskList.byId.queryOptions(
      { id: id },
      {
        enabled: !!session && !!id,
      },
    ),
  );

  const isOwner = list?.ownerId === session?.user.id;

  const deleteMutation = useMutation(
    trpc.taskList.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.taskList.all.queryFilter());
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
        router.back();
      },
    }),
  );

  const leaveMutation = useMutation(
    trpc.taskList.leave.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.taskList.all.queryFilter());
        await queryClient.invalidateQueries(trpc.task.all.queryFilter());
        router.back();
      },
    }),
  );

  const removeMemberMutation = useMutation(
    trpc.taskList.removeMember.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.taskList.byId.queryFilter());
      },
    }),
  );

  const updateRoleMutation = useMutation(
    trpc.taskList.updateMemberRole.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.taskList.byId.queryFilter());
      },
    }),
  );

  const createInviteMutation = useMutation(
    trpc.taskList.createInvite.mutationOptions(),
  );

  const handleDelete = () => {
    Alert.alert(
      "Delete List",
      "All tasks in this list will become personal tasks. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate({ id: id }),
        },
      ],
    );
  };

  const handleLeave = () => {
    Alert.alert("Leave List", "You will lose access to this list's tasks.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => leaveMutation.mutate({ listId: id }),
      },
    ]);
  };

  const handleInvite = async () => {
    try {
      const result = await createInviteMutation.mutateAsync({
        listId: id,
        role: "editor",
      });
      const inviteUrl = `${getBaseUrl()}/invite/${result.inviteCode}`;
      await Share.share({
        message: `Join my list "${list?.name}" on Tokilist: ${inviteUrl}`,
        url: inviteUrl,
      });
    } catch (error) {
      console.error("Failed to create invite:", error);
      Alert.alert("Error", "Failed to create invite link.");
    }
  };

  const handleRemoveMember = (userId: string, userName: string) => {
    Alert.alert("Remove Member", `Remove ${userName} from this list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeMemberMutation.mutate({ listId: id, userId }),
      },
    ]);
  };

  const handleChangeRole = (userId: string, currentRole: string) => {
    const newRole = currentRole === "editor" ? "viewer" : "editor";
    Alert.alert("Change Role", `Change role to ${newRole}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () =>
          updateRoleMutation.mutate({
            listId: id,
            userId,
            role: newRole,
          }),
      },
    ]);
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <Stack.Screen options={{ headerShown: false }} />
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator color="#50C878" />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!list) {
    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <Stack.Screen options={{ headerShown: false }} />
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ fontSize: 16, color: "#8FA8A8" }}>
              List not found
            </Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 14, color: "#50C878" }}>Go back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const members = list.members;
  const tasks = list.tasks;

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16 }}>
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingTop: 8,
                  paddingBottom: 16,
                }}
              >
                <Pressable
                  onPress={() => router.back()}
                  hitSlop={12}
                  style={{ marginRight: 12 }}
                  accessibilityLabel="Go back"
                  accessibilityRole="button"
                >
                  <ArrowLeft size={24} color="#DCE4E4" />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: list.color ?? "#50C878",
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "700",
                        color: "#DCE4E4",
                      }}
                      numberOfLines={1}
                    >
                      {list.name}
                    </Text>
                  </View>
                  {list.description && (
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#8FA8A8",
                        marginTop: 4,
                        marginLeft: 20,
                      }}
                    >
                      {list.description}
                    </Text>
                  )}
                </View>
              </View>

              {/* Actions */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
                {isOwner && (
                  <Pressable
                    onPress={handleInvite}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      backgroundColor: "rgba(80, 200, 120, 0.15)",
                      borderWidth: 1,
                      borderColor: "#50C878",
                      borderRadius: 8,
                      paddingVertical: 10,
                    }}
                    accessibilityLabel="Invite members"
                    accessibilityRole="button"
                  >
                    <LinkIcon size={16} color="#50C878" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#50C878",
                      }}
                    >
                      Invite
                    </Text>
                  </Pressable>
                )}
                {isOwner ? (
                  <Pressable
                    onPress={handleDelete}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(239, 68, 68, 0.3)",
                      borderRadius: 8,
                      paddingVertical: 10,
                    }}
                  >
                    <Trash2 size={16} color="#ef4444" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#ef4444",
                      }}
                    >
                      Delete
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={handleLeave}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(239, 68, 68, 0.3)",
                      borderRadius: 8,
                      paddingVertical: 10,
                    }}
                  >
                    <LogOut size={16} color="#ef4444" />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#ef4444",
                      }}
                    >
                      Leave
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Members Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Users size={16} color="#8FA8A8" />
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: "#8FA8A8",
                  }}
                >
                  Members ({members.length})
                </Text>
              </View>
            </View>
          }
          renderItem={({ item: member }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#164B49",
              }}
            >
              {/* Avatar */}
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#102A2A",
                  borderWidth: 1,
                  borderColor: "#164B49",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#DCE4E4",
                  }}
                >
                  {member.user.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: "#DCE4E4",
                    }}
                  >
                    {member.user.name}
                  </Text>
                  {member.role === "owner" && (
                    <Crown size={12} color="#E5A04D" />
                  )}
                </View>
                <Text style={{ fontSize: 12, color: "#8FA8A8" }}>
                  {member.role}
                </Text>
              </View>
              {/* Owner actions on non-owner members */}
              {isOwner && member.role !== "owner" && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => handleChangeRole(member.userId, member.role)}
                    hitSlop={8}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      backgroundColor: "#102A2A",
                      borderWidth: 1,
                      borderColor: "#164B49",
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#8FA8A8" }}>
                      {member.role === "editor" ? "→ Viewer" : "→ Editor"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() =>
                      handleRemoveMember(member.userId, member.user.name)
                    }
                    hitSlop={8}
                  >
                    <UserMinus size={16} color="#ef4444" />
                  </Pressable>
                </View>
              )}
            </View>
          )}
          ListFooterComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#8FA8A8",
                  marginBottom: 12,
                }}
              >
                Tasks ({tasks.length})
              </Text>
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <View
                    key={task.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: "#164B49",
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderColor: task.completed ? "#50C878" : "#164B49",
                        backgroundColor: task.completed
                          ? "#50C878"
                          : "transparent",
                        marginRight: 12,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: task.completed ? "#8FA8A8" : "#DCE4E4",
                        textDecorationLine: task.completed
                          ? "line-through"
                          : "none",
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {task.title}
                    </Text>
                  </View>
                ))
              ) : (
                <Text
                  style={{
                    fontSize: 14,
                    color: "#8FA8A8",
                    fontStyle: "italic",
                    textAlign: "center",
                    paddingVertical: 16,
                  }}
                >
                  No tasks in this list yet
                </Text>
              )}
            </View>
          }
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
