import type { ConfigContext, ExpoConfig } from "expo/config";

// App Store Category: Productivity
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Tokilist",
  slug: "tokilist",
  scheme: "tokilist",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon-light.png",
  userInterfaceStyle: "automatic",
  updates: {
    fallbackToCacheTimeout: 0,
  },
  owner: "zgtf",
  assetBundlePatterns: ["**/*"],
  android: {
    package: "com.zgtf.tokilist",
    adaptiveIcon: {
      foregroundImage: "./assets/icon-light.png",
      backgroundColor: "#0A1A1A",
    },
  },
  extra: {
    eas: {
      projectId: "02742173-7649-4eb5-a065-307f33cddd7f",
    },
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
    reactCanary: true,
    reactCompiler: true,
  },
  plugins: [
    "./plugins/withSyncWidgetVersion",
    [
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG ?? "calayo-clothing",
        project: process.env.SENTRY_PROJECT ?? "react-native",
      },
    ],
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    "expo-apple-authentication",
    "expo-notifications",
    "expo-background-task",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#E4E4E7",
        image: "./assets/icon-light.png",
        dark: {
          backgroundColor: "#18181B",
          image: "./assets/icon-dark.png",
        },
      },
    ],
    [
      "react-native-widget-extension",
      {
        widgetsFolder: "widgets",
        deploymentTarget: "17.0",
        groupIdentifier: "group.com.zgtf.todolist",
      },
    ],
  ],
  ios: {
    usesAppleSignIn: true,
    bundleIdentifier: "com.zgtf.todolist",
    buildNumber: "1",
    supportsTablet: true,
    icon: {
      light: "./assets/icon-light.png",
      dark: "./assets/icon-dark.png",
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIRequiredDeviceCapabilities: ["armv7"],
      NSUserNotificationsUsageDescription:
        "Tokilist sends reminders for your tasks and music league updates.",
    },
    entitlements: {
      "com.apple.security.application-groups": ["group.com.zgtf.todolist"],
    },
  },
});
