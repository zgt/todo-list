import { useEffect, useRef, useState } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Sentry from "@sentry/react-native";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthGuard } from "~/components/AuthGuard";
import { resetAuthGuard } from "~/utils/api";
import { GradientBackground } from "~/components/GradientBackground";
import { useNotifications } from "~/hooks/useNotifications";
import { usePushTokenRegistration } from "~/hooks/usePushTokenRegistration";
import { useSessionRefresh } from "~/hooks/useSessionRefresh";
import { queryClient } from "~/utils/api";
import {
  authClient,
  clearAuthStorage,
  fetchMobileSession,
  getMobileSessionToken,
  setMobileSessionToken,
  syncMobileSessionTokenFromSession,
} from "~/utils/auth";
import type { Session } from "~/utils/auth";
import { beginAuthTransition, endAuthTransition } from "~/utils/auth-gate";
import { authTrace, cookieFingerprint, nextTraceId } from "~/utils/auth-debug";
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
  const authCallbackUrl = Linking.useURL();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [serverSession, setServerSession] = useState<Session | null>(null);
  const [authBootstrapNonce, setAuthBootstrapNonce] = useState(0);
  const sessionRef = useRef<Session | null>(null);
  const serverSessionRef = useRef<Session | null>(null);
  const sessionUserId = session?.user.id ?? null;
  const sessionId = session?.session.id ?? null;
  const isLoadingAuth = isPending || !isAuthReady;

  // Set up notification handlers and permissions
  useNotifications();

  // Register push token with server when authenticated
  usePushTokenRegistration(isAuthReady && !!serverSession && !isPending);

  // Proactively refresh session cookies to prevent 401 errors
  useSessionRefresh(isAuthReady && !!serverSession);

  useEffect(() => {
    sessionRef.current = session ?? null;
  }, [session]);

  useEffect(() => {
    serverSessionRef.current = serverSession;
  }, [serverSession]);

  useEffect(() => {
    if (!isLoadingAuth || !SENTRY_DSN) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const mobileToken = getMobileSessionToken();
      Sentry.captureMessage("Auth bootstrap stuck loading", {
        level: "error",
        tags: {
          component: "root_layout_auth",
        },
        extra: {
          isAuthReady,
          isPending,
          hasServerSession: !!serverSessionRef.current,
          hasSession: !!sessionRef.current,
          sessionId: sessionRef.current?.session.id ?? null,
          sessionUserId: sessionRef.current?.user.id ?? null,
          mobileToken: cookieFingerprint(mobileToken),
          authCallbackUrl,
          authBootstrapNonce,
        },
      });
    }, 8000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    authBootstrapNonce,
    authCallbackUrl,
    isAuthReady,
    isLoadingAuth,
    isPending,
  ]);

  useEffect(() => {
    if (!authCallbackUrl) {
      return;
    }

    authTrace("layout", "received auth callback url", {
      authCallbackUrl,
    });
    const parsedUrl = Linking.parse(authCallbackUrl);
    const token =
      typeof parsedUrl.queryParams?.token === "string"
        ? parsedUrl.queryParams.token
        : null;
    const errorParam =
      typeof parsedUrl.queryParams?.error === "string"
        ? parsedUrl.queryParams.error
        : null;

    authTrace("layout", "parsed auth callback url", {
      hasToken: !!token,
      token: token ? `${token.length}` : "none",
      error: errorParam,
      path: parsedUrl.path ?? null,
    });

    if (!token) {
      return;
    }

    setMobileSessionToken(token);
    setAuthBootstrapNonce((current) => current + 1);
  }, [authCallbackUrl]);

  useEffect(() => {
    let cancelled = false;
    const traceId = nextTraceId("layout-auth-ready");
    setIsAuthReady(false);

    const validateInitialSession = async () => {
      beginAuthTransition("layout-initial-auth");
      try {
        authTrace("layout", "starting initial auth validation", {
          traceId,
          hasSession: !!sessionRef.current,
        });

        const mobileSession = await fetchMobileSession();
        if (mobileSession?.session) {
          syncMobileSessionTokenFromSession(mobileSession);
          authTrace("layout", "restored auth from mobile token", {
            traceId,
            userId: mobileSession.user.id,
          });
          if (!cancelled) {
            setServerSession(mobileSession);
          }
          return;
        }

        const result = await authClient.getSession({
          query: { disableCookieCache: true },
        });
        const validatedSession = result.data ?? null;
        const syncedToken = syncMobileSessionTokenFromSession(validatedSession);
        authTrace("layout", "completed initial auth validation", {
          traceId,
          hasSession: !!validatedSession,
          syncedToken: syncedToken ? `${syncedToken.length}` : "none",
        });

        if (cancelled) return;

        if (validatedSession) {
          setServerSession(validatedSession);
          return;
        }

        if (sessionRef.current) {
          authTrace(
            "layout",
            "preserving existing session while server validation is inconclusive",
            {
              traceId,
              hadServerSession: !!serverSessionRef.current,
            },
          );
          setServerSession((currentSession) => currentSession ?? sessionRef.current);
          return;
        }

        clearAuthStorage();
        setServerSession(null);
      } catch (validationError) {
        authTrace("layout", "initial auth validation failed", {
          traceId,
          error:
            validationError instanceof Error
              ? validationError.message
              : "non-error auth validation failure",
        });
        if (!cancelled && !sessionRef.current) {
          setServerSession(null);
        }
      } finally {
        endAuthTransition("layout-initial-auth");
        if (!cancelled) {
          setIsAuthReady(true);
        }
      }
    };

    void validateInitialSession();

    return () => {
      cancelled = true;
    };
  }, [authBootstrapNonce, sessionId, sessionUserId]);

  authTrace("layout", "root layout auth state", {
    isAuthReady,
    isPending,
    hasServerSession: !!serverSession,
    hasSession: !!session,
    hasError: !!error,
  });

  if (isLoadingAuth) {
    return (
      <GradientBackground continuousRippleWhileVisible>
        <></>
      </GradientBackground>
    );
  }

  // Reset the sign-out guard when we have a valid session
  // (user just logged in or session was refreshed successfully)
  if (serverSession) {
    resetAuthGuard();
  }

  if (error || !serverSession) {
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
