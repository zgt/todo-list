"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/auth/server";

export async function signInWithDiscord() {
  const res = await auth.api.signInSocial({
    body: {
      provider: "discord",
      callbackURL: "/",
    },
  });
  if (!res.url) {
    throw new Error("No URL returned from signInSocial");
  }
  redirect(res.url);
}

export async function signInWithApple() {
  const res = await auth.api.signInSocial({
    body: {
      provider: "apple",
      callbackURL: "/",
    },
  });
  if (!res.url) {
    throw new Error("No URL returned from signInSocial");
  }
  redirect(res.url);
}

export async function signOut() {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/");
}
