import { useEffect, useRef, useState } from "react";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Sentry from "@sentry/react-native";
import { QueryClientProvider } from "@tanstack/react-query";

import { AuthGuard } from "~/components/AuthGuard";
import { GradientBackground } from "~/components/GradientBackground";
import { useNotifications } from "~/hooks/useNotifications";
import { usePushTokenRegistration } from "~/hooks/usePushTokenRegistration";
import { queryClient } from "~/utils/api";
import { authClient } from "~/utils/auth";
import { hasSessionTokenCookie } from "~/utils/auth-storage";
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

// F085: a signed-out deep link into tokilist://invite/<code> renders
// AuthGuard instead of the Stack, so the /invite/[code] screen never mounts
// and the code is dropped. Stash the code here (module-level — simplest
// option that survives the same JS session across the OAuth redirect; the
// app isn't killed for in-app browser sign-in) and resume navigation to it
// once sign-in succeeds.
//
// D11: the stash carries a 15-minute TTL (discarded at consumption time if
// stale) so an invite tapped long before the user actually finishes signing
// in doesn't silently resurrect and redirect them later, and the code is
// only extracted from an actual `invite/<code>` URL PATH (via expo-linking's
// parser), not merely a substring anywhere in the URL — e.g. a `?next=`
// query param containing the text "invite/" would previously match the old
// regex-over-the-raw-string approach.
const PENDING_INVITE_TTL_MS = 15 * 60 * 1000;

interface PendingInvite {
  code: string;
  storedAt: number;
}

let pendingInvite: PendingInvite | null = null;

function extractInviteCode(url: string | null | undefined): string | null {
  if (!url) return null;
  const { hostname, path } = Linking.parse(url);

  // Custom-scheme deep links (tokilist://invite/<code>, the only form this
  // app currently issues) put "invite" in `hostname` and the code in
  // `path` — expo-linking's URL-based parser treats the segment right
  // after `scheme://` as authority/host, not path.
  if (hostname === "invite") {
    const code = path?.split("/")[0];
    return code ? decodeURIComponent(code) : null;
  }

  // Other URL forms (e.g. the Expo Go dev client's `exp://host/--/invite/
  // <code>`, or a future universal link) surface "invite/<code>" as the
  // path itself.
  if (path?.startsWith("invite/")) {
    const code = path.split("/")[1];
    return code ? decodeURIComponent(code) : null;
  }

  return null;
}

function stashPendingInvite(code: string) {
  pendingInvite = { code, storedAt: Date.now() };
}

/** Consume the stashed invite code, discarding it if past its TTL (D11). */
function consumePendingInvite(): string | null {
  const invite = pendingInvite;
  pendingInvite = null;
  if (!invite) return null;
  if (Date.now() - invite.storedAt > PENDING_INVITE_TTL_MS) return null;
  return invite.code;
}

function RootLayout() {
  const colorScheme = useColorScheme();
  const { data: session, isPending, error } = authClient.useSession();
  const [isRecoveringSession, setIsRecoveringSession] = useState(false);
  const hasTriedSessionRecovery = useRef(false);
  const router = useRouter();
  const wasUnauthenticatedRef = useRef(false);
  const hasHandledPendingInviteRef = useRef(false);

  useNotifications();
  usePushTokenRegistration(!!session && !isPending);

  useEffect(() => {
    if (error) {
      console.error("[Auth] Session error:", error);
      Sentry.captureException(error, { tags: { component: "auth_session" } });
    }
  }, [error]);

  // Capture an invite deep link (cold start or foreground tap) so it can be
  // resumed after sign-in even if AuthGuard is showing right now.
  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      const code = extractInviteCode(url);
      if (code) stashPendingInvite(code);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      const code = extractInviteCode(url);
      if (code) stashPendingInvite(code);
    });

    return () => subscription.remove();
  }, []);

  // Once the user was seen signed-out (i.e. AuthGuard would have rendered),
  // resume to the stashed invite code the first time a session appears.
  useEffect(() => {
    if (isPending) return;
    if (error || !session) {
      wasUnauthenticatedRef.current = true;
      return;
    }
    if (
      !wasUnauthenticatedRef.current ||
      hasHandledPendingInviteRef.current ||
      !pendingInvite
    ) {
      return;
    }

    hasHandledPendingInviteRef.current = true;
    const code = consumePendingInvite();
    if (code) router.push(`/invite/${code}` as never);
  }, [error, isPending, session, router]);

  useEffect(() => {
    if (
      isPending ||
      session ||
      error ||
      isRecoveringSession ||
      hasTriedSessionRecovery.current
    ) {
      return;
    }
    if (!hasSessionTokenCookie()) return;

    hasTriedSessionRecovery.current = true;

    void Promise.resolve().then(async () => {
      setIsRecoveringSession(true);
      try {
        await authClient.getSession();
      } catch (sessionError) {
        console.error("[Auth] Session recovery error:", sessionError);
        Sentry.captureException(sessionError, {
          tags: { component: "auth_session_recovery" },
        });
      } finally {
        setIsRecoveringSession(false);
      }
    });
  }, [error, isPending, isRecoveringSession, session]);

  if (isPending || isRecoveringSession) {
    return (
      <GradientBackground continuousRippleWhileVisible>
        <></>
      </GradientBackground>
    );
  }

  if (error || !session) {
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
