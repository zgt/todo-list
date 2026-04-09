import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Sentry from "@sentry/react-native";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthGuard } from "~/components/AuthGuard";
import { resetAuthGuard } from "~/utils/api";
import { DotBackground } from "~/components/DotBackground";
import { useNotifications } from "~/hooks/useNotifications";
import { usePushTokenRegistration } from "~/hooks/usePushTokenRegistration";
import { useSessionRefresh } from "~/hooks/useSessionRefresh";
import { queryClient } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { authTrace } from "~/utils/auth-debug";
import { CategoryFilterProvider } from "./_components/category-filter-context";

import "../styles.css";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

const SENTRY_DSN: string =
  process.env.EXPO_PUBLIC_SENTRY_DSN ??
  (Constants.expoConfig?.extra?.sentryDsn as string | undefined) ??
  "";

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    sendDefaultPii: false,
    enableNativeFramesTracking: true,
  });
}

function RootLayout() {
  const colorScheme = useColorScheme();
  const { data: session, isPending, error } = authClient.useSession();

  // Set up notification handlers and permissions
  useNotifications();

  // Register push token with server when authenticated
  usePushTokenRegistration();

  // Proactively refresh session cookies to prevent 401 errors
  useSessionRefresh();

  authTrace("layout", "root layout auth state", {
    isPending,
    hasSession: !!session,
    hasError: !!error,
  });

  if (isPending) {
    return <DotBackground trigger={1} />;
  }

  // Reset the sign-out guard when we have a valid session
  // (user just logged in or session was refreshed successfully)
  if (session) {
    resetAuthGuard();
  }

  if (error || !session) {
    if (error) {
      console.error("[Auth] Session error:", error);
      Sentry.captureException(error, { tags: { component: "auth_session" } });
    }
    return <AuthGuard />;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <CategoryFilterProvider>
              {/*
                The Stack component displays the current page.
                It also allows you to configure your screens
              */}
              <Stack
                screenOptions={{
                  headerShown: false,
                  headerStyle: {
                    backgroundColor: "#1c4d2c",
                  },
                  contentStyle: {
                    backgroundColor:
                      colorScheme == "dark" ? "#09090B" : "#FFFFFF",
                  },
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen
                  name="swipe-tutorial"
                  options={{
                    presentation: "fullScreenModal",
                    headerShown: false,
                    animation: "slide_from_bottom",
                  }}
                />
              </Stack>
              <StatusBar />
            </CategoryFilterProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default SENTRY_DSN ? Sentry.wrap(RootLayout) : RootLayout;
