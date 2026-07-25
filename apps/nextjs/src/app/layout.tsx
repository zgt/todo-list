import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { cn } from "@acme/ui";
import { SidebarProvider } from "@acme/ui/sidebar";
import { ThemeProvider } from "@acme/ui/theme";
import { Toaster } from "@acme/ui/toast";

import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";

import "~/app/styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    env.VERCEL_ENV === "production"
      ? "https://toki.calayo.net"
      : "http://localhost:3000",
  ),
  title: "Tokilist",
  description:
    "Tokilist is a cross-platform task management app for tasks, categories, shared lists, and reminders.",
  openGraph: {
    title: "Tokilist",
    description:
      "Tokilist is a cross-platform task management app for tasks, categories, shared lists, and reminders.",
    url: "https://toki.calayo.net",
    siteName: "Tokilist",
  },
};

export const viewport: Viewport = {
  themeColor: "black",
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default async function RootLayout(props: { children: React.ReactNode }) {
  // Seed the sidebar from the cookie its toggle writes. Routes that render
  // the sidebar (/, /text-cleaner, (app)/*) are dynamic anyway via
  // getSession(); the static marketing pages opt out with
  // `dynamic = "force-static"`, under which cookies() returns empty and the
  // sidebar (which they don't render) just defaults closed.
  const cookieStore = await cookies();
  const sidebarDefaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        <ThemeProvider>
          <NuqsAdapter>
            <TRPCReactProvider>
              <SidebarProvider defaultOpen={sidebarDefaultOpen}>
                {props.children}
              </SidebarProvider>
            </TRPCReactProvider>
          </NuqsAdapter>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
