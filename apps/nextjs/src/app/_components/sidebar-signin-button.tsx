"use client";

import { signInWithDiscord } from "./auth-actions";

export function SidebarSignInButton() {
  return (
    <form>
      <button
        type="submit"
        className="glass-card flex items-center gap-3 p-3 rounded-2xl border border-white/10 w-full hover:bg-white/5 transition-colors cursor-pointer"
        formAction={signInWithDiscord}
      >
        <div className="size-10 rounded-full bg-linear-to-br from-primary to-emerald-700 p-[2px]">
          <div className="rounded-full size-full bg-muted flex items-center justify-center border-2 border-black">
            <span className="text-xs font-bold">?</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden text-left">
          <p className="text-sm font-medium truncate text-white">Guest</p>
          <p className="text-xs text-muted-foreground truncate">Sign in to continue</p>
        </div>
      </button>
    </form>
  );
}
