import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ExternalLink,
  Info,
  Pencil,
  Shield,
  Trash2,
  UserCircle,
} from "lucide-react-native";

import { UserAvatar } from "~/components/UserAvatar";
import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? "0.0.0";

export default function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.name ?? "");
  const inputRef = useRef<TextInput>(null);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const deleteInputRef = useRef<TextInput>(null);

  const updateNameMutation = useMutation(
    trpc.user.updateDisplayName.mutationOptions({
      onSuccess: () => {
        setIsEditingName(false);
        void queryClient.invalidateQueries();
        void authClient.getSession({ query: { disableCookieCache: true } });
      },
      onError: () => {
        Alert.alert("Error", "Could not update display name. Please try again.");
      },
    }),
  );

  const deleteAccountMutation = useMutation(
    trpc.user.deleteAccount.mutationOptions({
      onSuccess: async () => {
        try {
          await authClient.signOut();
        } catch {
          // Session already deleted on server, just clear local state
        }
      },
      onError: (error) => {
        Alert.alert(
          "Deletion Failed",
          error.message ?? "Could not delete your account. Please try again.",
        );
      },
    }),
  );

  const handleSaveName = () => {
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === user?.name) {
      setIsEditingName(false);
      setEditedName(user?.name ?? "");
      return;
    }
    updateNameMutation.mutate({ name: trimmed });
  };

  const handleStartEditing = () => {
    setEditedName(user?.name ?? "");
    setIsEditingName(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This action cannot be undone.\n\nAre you sure you want to continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            setShowDeleteConfirm(true);
            setTimeout(() => deleteInputRef.current?.focus(), 100);
          },
        },
      ],
    );
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmText !== "DELETE") return;
    deleteAccountMutation.mutate({ confirmation: "DELETE" });
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText("");
  };

  if (!user) return null;

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
          >
            <ArrowLeft color="#DCE4E4" size={24} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#DCE4E4" }}>
            Account
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Section */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <View
              style={{
                borderRadius: 999,
                borderWidth: 3,
                borderColor: "#164B49",
                marginBottom: 16,
              }}
            >
              <UserAvatar name={user.name} image={user.image} size={96} />
            </View>

            {isEditingName ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  maxWidth: 300,
                }}
              >
                <TextInput
                  ref={inputRef}
                  value={editedName}
                  onChangeText={setEditedName}
                  onSubmitEditing={handleSaveName}
                  maxLength={50}
                  returnKeyType="done"
                  autoFocus
                  style={{
                    flex: 1,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#21716C",
                    backgroundColor: "#0A1A1A",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 18,
                    color: "#DCE4E4",
                    textAlign: "center",
                  }}
                  placeholderTextColor="#8FA8A8"
                  placeholder="Display name"
                  editable={!updateNameMutation.isPending}
                />
                <Pressable
                  onPress={handleSaveName}
                  disabled={updateNameMutation.isPending}
                  style={{
                    borderRadius: 16,
                    backgroundColor: "#50C878",
                    padding: 10,
                  }}
                >
                  {updateNameMutation.isPending ? (
                    <ActivityIndicator size="small" color="#0A1A1A" />
                  ) : (
                    <Check size={20} color="#0A1A1A" />
                  )}
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleStartEditing}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: "#DCE4E4",
                  }}
                >
                  {user.name}
                </Text>
                <Pencil size={16} color="#8FA8A8" />
              </Pressable>
            )}

            <Text
              style={{
                fontSize: 14,
                color: "#8FA8A8",
                marginTop: 4,
              }}
            >
              {user.email}
            </Text>
          </View>

          {/* About Section */}
          <SectionHeader icon={<Info size={20} color="#50C878" />} title="About" />
          <View
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#164B49",
              backgroundColor: "#102A2A",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#164B49",
              }}
            >
              <Text style={{ fontSize: 16, color: "#DCE4E4" }}>Version</Text>
              <Text style={{ fontSize: 16, color: "#8FA8A8" }}>
                {APP_VERSION}
              </Text>
            </View>

            <Pressable
              onPress={() =>
                void Linking.openURL("https://tokilist.com/privacy")
              }
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#164B49",
              }}
            >
              <Text style={{ fontSize: 16, color: "#DCE4E4" }}>
                Privacy Policy
              </Text>
              <ExternalLink size={16} color="#8FA8A8" />
            </Pressable>

            <Pressable
              onPress={() => void Linking.openURL("https://tokilist.com/terms")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
              }}
            >
              <Text style={{ fontSize: 16, color: "#DCE4E4" }}>
                Terms of Service
              </Text>
              <ExternalLink size={16} color="#8FA8A8" />
            </Pressable>
          </View>

          {/* Danger Zone */}
          <SectionHeader
            icon={<Shield size={20} color="#E57373" />}
            title="Danger Zone"
            color="#E57373"
          />

          {showDeleteConfirm ? (
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E57373",
                backgroundColor: "#2A1010",
                padding: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#E57373",
                  marginBottom: 8,
                }}
              >
                Confirm Account Deletion
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#DCE4E4",
                  marginBottom: 16,
                  lineHeight: 20,
                }}
              >
                This will permanently delete your account, all tasks, lists, and
                music league data. Type{" "}
                <Text style={{ fontWeight: "700", color: "#E57373" }}>
                  DELETE
                </Text>{" "}
                to confirm.
              </Text>

              <TextInput
                ref={deleteInputRef}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                onSubmitEditing={handleConfirmDelete}
                placeholder='Type "DELETE" to confirm'
                placeholderTextColor="#8FA8A8"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!deleteAccountMutation.isPending}
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E57373",
                  backgroundColor: "#0A1A1A",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: "#DCE4E4",
                  marginBottom: 16,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                }}
              >
                <Pressable
                  onPress={handleCancelDelete}
                  disabled={deleteAccountMutation.isPending}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#164B49",
                    backgroundColor: "#102A2A",
                    paddingVertical: 14,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#DCE4E4",
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirmDelete}
                  disabled={
                    deleteConfirmText !== "DELETE" ||
                    deleteAccountMutation.isPending
                  }
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    backgroundColor:
                      deleteConfirmText === "DELETE" &&
                      !deleteAccountMutation.isPending
                        ? "#E57373"
                        : "#4A2020",
                    paddingVertical: 14,
                    alignItems: "center",
                    opacity:
                      deleteConfirmText !== "DELETE" ||
                      deleteAccountMutation.isPending
                        ? 0.5
                        : 1,
                  }}
                >
                  {deleteAccountMutation.isPending ? (
                    <ActivityIndicator size="small" color="#DCE4E4" />
                  ) : (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#DCE4E4",
                      }}
                    >
                      Delete Forever
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={handleDeleteAccount}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E57373",
                backgroundColor: "#2A1010",
                padding: 16,
              }}
            >
              <Trash2 size={20} color="#E57373" />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#E57373",
                  }}
                >
                  Delete Account
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#8FA8A8",
                    marginTop: 2,
                  }}
                >
                  Permanently delete your account and all data
                </Text>
              </View>
              <ChevronRight size={18} color="#E57373" />
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function SectionHeader({
  icon,
  title,
  color = "#DCE4E4",
}: {
  icon: React.ReactNode;
  title: string;
  color?: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 24,
        marginBottom: 12,
      }}
    >
      {icon}
      <Text style={{ fontSize: 18, fontWeight: "700", color }}>{title}</Text>
    </View>
  );
}
