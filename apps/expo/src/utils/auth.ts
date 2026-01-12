import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";

import { getBaseUrl } from "./base-url";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: "todolist",
      storagePrefix: "expo",
      storage: SecureStore,
    }),
  ],
});

export type Auth = typeof authClient;
export type Session = Auth["$Infer"]["Session"];
export type User = Session["user"];
