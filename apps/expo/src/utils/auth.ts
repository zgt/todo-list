import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";

import { authStorage } from "./auth-storage";
import { getBaseUrl } from "./base-url";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: "tokilist",
      storagePrefix: "expo",
      storage: authStorage,
    }),
  ],
});

export type Auth = typeof authClient;
export type Session = Auth["$Infer"]["Session"];
export type User = Session["user"];
