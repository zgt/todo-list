import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Users } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";
import { authClient } from "~/utils/auth";

export default function ListsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const { data: lists, isLoading } = useQuery(
    trpc.taskList.all.queryOptions(undefined, {
      enabled: !!session,
    }),
  );

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
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
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#DCE4E4",
              flex: 1,
            }}
          >
            My Lists
          </Text>
          <Pressable
            onPress={() => router.push("/lists/create")}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#50C878",
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Create list"
            accessibilityRole="button"
          >
            <Plus size={20} color="#0A1A1A" />
          </Pressable>
        </View>

        {isLoading ? (
          <View
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <ActivityIndicator color="#50C878" />
          </View>
        ) : !lists || lists.length === 0 ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 32,
            }}
          >
            <Users
              size={48}
              color="#8FA8A8"
              style={{ marginBottom: 16 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#DCE4E4",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              No lists yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#8FA8A8",
                textAlign: "center",
              }}
            >
              Create a list to share tasks with others
            </Text>
          </View>
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              gap: 12,
              paddingBottom: 24,
            }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.push(`/lists/${item.id}` as never)}
                style={{
                  backgroundColor: "#102A2A",
                  borderWidth: 1,
                  borderColor: "#164B49",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
                accessibilityLabel={`List: ${item.name}, ${item.taskCount} tasks`}
                accessibilityRole="button"
              >
                <View style={{ flexDirection: "row" }}>
                  {/* Color bar */}
                  <View
                    style={{
                      width: 4,
                      backgroundColor: item.color ?? "#50C878",
                    }}
                  />
                  <View style={{ flex: 1, padding: 16 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#DCE4E4",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.memberCount > 1 && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginLeft: 8,
                          }}
                        >
                          <Users size={14} color="#8FA8A8" />
                          <Text style={{ fontSize: 12, color: "#8FA8A8" }}>
                            {item.memberCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    {item.description && (
                      <Text
                        style={{
                          fontSize: 13,
                          color: "#8FA8A8",
                          marginTop: 4,
                        }}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    )}
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#4A6A6A",
                        marginTop: 8,
                      }}
                    >
                      {item.taskCount} {item.taskCount === 1 ? "task" : "tasks"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}
