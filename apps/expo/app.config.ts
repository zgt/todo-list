import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Tokilist",
  slug: "tokilist",
  scheme: "tokilist",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon-light.png",
  userInterfaceStyle: "automatic",
  updates: {
    fallbackToCacheTimeout: 0,
  },
  owner: "zgtf",
  newArchEnabled: true,
  assetBundlePatterns: ["**/*"],
  android: {
    package: "com.zgtf.tokilist",
    adaptiveIcon: {
      foregroundImage: "./assets/icon-light.png",
      backgroundColor: "#0A1A1A",
    },
    // edgeToEdgeEnabled: true, // Commented out - causes type error with new architecture
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
    supportsTablet: true,
    icon: {
      light: "./assets/icon-light.png",
      dark: "./assets/icon-dark.png",
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    entitlements: {
      "com.apple.security.application-groups": ["group.com.zgtf.todolist"],
    },
  },
});
