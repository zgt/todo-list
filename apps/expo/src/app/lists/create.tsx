import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react-native";

import { GradientBackground } from "~/components/GradientBackground";
import { trpc } from "~/utils/api";

const PRESET_COLORS = [
  "#50C878",
  "#4A90D9",
  "#E5A04D",
  "#E57373",
  "#AB47BC",
  "#26A69A",
  "#5C6BC0",
  "#EC407A",
  "#78909C",
  "#8D6E63",
];

export default function CreateListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#50C878");

  const createMutation = useMutation(
    trpc.taskList.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.taskList.all.queryFilter());
        router.back();
      },
    }),
  );

  const handleSubmit = () => {
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
    });
  };

  const canSubmit = name.trim().length > 0 && !createMutation.isPending;

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Stack.Screen options={{ headerShown: false }} />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingBottom: 24,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{ marginRight: 12 }}
            >
              <ArrowLeft size={24} color="#DCE4E4" />
            </Pressable>
            <Text style={{ fontSize: 24, fontWeight: "700", color: "#DCE4E4" }}>
              New List
            </Text>
          </View>

          {/* Name */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#8FA8A8",
                marginBottom: 6,
              }}
            >
              Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="List name"
              placeholderTextColor="#4A6A6A"
              autoFocus
              style={{
                backgroundColor: "#102A2A",
                borderWidth: 1,
                borderColor: "#164B49",
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                color: "#DCE4E4",
              }}
            />
          </View>

          {/* Description */}
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#8FA8A8",
                marginBottom: 6,
              }}
            >
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's this list for?"
              placeholderTextColor="#4A6A6A"
              multiline
              textAlignVertical="top"
              style={{
                backgroundColor: "#102A2A",
                borderWidth: 1,
                borderColor: "#164B49",
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: "#DCE4E4",
                minHeight: 80,
              }}
            />
          </View>

          {/* Color Picker */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: "#8FA8A8",
                marginBottom: 8,
              }}
            >
              Color
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {PRESET_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: c,
                    borderWidth: color === c ? 3 : 0,
                    borderColor: "#DCE4E4",
                    opacity: color === c ? 1 : 0.6,
                  }}
                />
              ))}
            </View>
          </View>

          {/* Preview */}
          <View
            style={{
              marginBottom: 24,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                width: 4,
                height: 32,
                borderRadius: 2,
                backgroundColor: color,
              }}
            />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#DCE4E4" }}>
              {name || "List name"}
            </Text>
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={{
              backgroundColor: canSubmit ? "#50C878" : "#164B49",
              borderRadius: 10,
              paddingVertical: 14,
              alignItems: "center",
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: canSubmit ? "#0A1A1A" : "#8FA8A8",
              }}
            >
              {createMutation.isPending ? "Creating..." : "Create List"}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}
