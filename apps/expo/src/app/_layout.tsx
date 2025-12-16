import "react-native-gesture-handler";

import { useEffect } from "react";
import { Text, useColorScheme, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as TaskManager from "expo-task-manager";
import { QueryClientProvider } from "@tanstack/react-query";

import { db } from "~/db/client";
import { registerBackgroundSync } from "~/sync/background-sync";
import { syncManager } from "~/sync/manager";
import { networkMonitor } from "~/sync/network-monitor";
import { queryClient } from "~/utils/api";

import "../styles.css";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import migrations from "../../drizzle/migrations";

// Define the background sync task immediately

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { success: dbReady, error: dbError } = useMigrations(db, migrations);

  // Removed manual init effect since useMigrations handles it

  // Initialize sync system
  useEffect(() => {
    if (!dbReady) return;

    // Start network monitor and set sync callback
    networkMonitor.setSyncCallback(() => syncManager.fullSync());
    networkMonitor.start();

    // Trigger initial sync
    console.log("Triggering initial sync...");
    syncManager.fullSync().catch((error) => {
      console.error("Initial sync failed:", error);
    });

    console.log(
      "Is background-sync defined",
      TaskManager.isTaskDefined("background-sync"),
    );
    // Register background sync
    registerBackgroundSync().catch((error) => {
      console.error("Failed to register background sync:", error);
    });

    // Cleanup on unmount
    return () => {
      networkMonitor.stop();
    };
  }, [dbReady]);

  if (dbError) {
    console.log(dbError);
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            color: "#FF0000",
            fontSize: 16,
            fontWeight: "bold",
            marginBottom: 10,
          }}
        >
          Database Error
        </Text>
        <Text
          style={{
            color: colorScheme === "dark" ? "#FFFFFF" : "#000000",
            textAlign: "center",
          }}
        >
          {dbError.message}
        </Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text
          style={{
            color: colorScheme === "dark" ? "#FFFFFF" : "#000000",
            fontSize: 16,
          }}
        >
          Initializing database...
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {/*
            The Stack component displays the current page.
            It also allows you to configure your screens
          */}
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: "#c03484",
            },
            contentStyle: {
              backgroundColor: colorScheme == "dark" ? "#09090B" : "#FFFFFF",
            },
          }}
        />
        <StatusBar />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
