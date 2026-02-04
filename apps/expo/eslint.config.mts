import { defineConfig } from "eslint/config";

import { baseConfig } from "@acme/eslint-config/base";
import { reactConfig } from "@acme/eslint-config/react";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**", "drizzle/**", "plugins/**"],
  },
  baseConfig,
  reactConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Disable immutability check for React Native Reanimated worklets
      // Worklet functions (marked with "worklet" directive) need to modify shared values
      "react-hooks/immutability": "off",
    },
  },
);
