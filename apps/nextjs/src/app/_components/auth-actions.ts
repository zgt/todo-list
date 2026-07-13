"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/auth/server";

// Only allow same-origin relative paths (e.g. "/invite/abc123") as a post-login
// destination, to avoid being used as an open redirect.
function resolveCallbackURL(returnUrl?: string) {
  if (
    returnUrl &&
    returnUrl.startsWith("/") &&
    !returnUrl.startsWith("//") &&
    !returnUrl.startsWith("/\\")
  ) {
    return returnUrl;
  }
  return "/";
}

export async function signInWithDiscord(returnUrl?: string) {
  const res = await auth.api.signInSocial({
    body: {
      provider: "discord",
      callbackURL: resolveCallbackURL(returnUrl),
    },
  });
  if (!res.url) {
    throw new Error("No URL returned from signInSocial");
  }
  redirect(res.url);
}

export async function signInWithGoogle(returnUrl?: string) {
  const res = await auth.api.signInSocial({
    body: {
      provider: "google",
      callbackURL: resolveCallbackURL(returnUrl),
    },
  });
  if (!res.url) {
    throw new Error("No URL returned from signInSocial");
  }
  redirect(res.url);
}

export async function signInWithApple(returnUrl?: string) {
  const res = await auth.api.signInSocial({
    body: {
      provider: "apple",
      callbackURL: resolveCallbackURL(returnUrl),
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
