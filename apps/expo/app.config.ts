import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Todo List",
  slug: "todolist",
  scheme: "todolist",
  version: "0.1.0",
  orientation: "portrait",
  icon: "./assets/icon-light.png",
  userInterfaceStyle: "automatic",
  updates: {
    fallbackToCacheTimeout: 0,
  },
  newArchEnabled: true,
  assetBundlePatterns: ["**/*"],
  ios: {
    bundleIdentifier: "app.todolist",
    supportsTablet: true,
    icon: {
      light: "./assets/icon-light.png",
      dark: "./assets/icon-dark.png",
    },
  },
  android: {
    package: "app.todolist",
    adaptiveIcon: {
      foregroundImage: "./assets/icon-light.png",
      backgroundColor: "#0A1A1A",
    },
    edgeToEdgeEnabled: true,
  },
  extra: {
    eas: {
      projectId: "8d1cfb02-5da5-4ca3-8ca8-65ed8d802307",
    },
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
    reactCanary: true,
    reactCompiler: true,
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
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
  ],
});
