/// <reference path="./types.d.ts" />
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import { defineConfig } from "eslint/config";

export const nextjsConfig = defineConfig(
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // TypeError: context.getAncestors is not a function
      "@next/next/no-duplicate-head": "off",
    },
  },
  // jsx-a11y is DOM-oriented, so it's wired in here (the Next.js web config)
  // rather than into the shared react config, which apps/expo also composes.
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...jsxA11y.flatConfigs.recommended,
  },
);
