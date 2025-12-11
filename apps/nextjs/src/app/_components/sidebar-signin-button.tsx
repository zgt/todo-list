"use client";

import { signInWithDiscord } from "./auth-actions";

export function SidebarSignInButton() {
  return (
    <form>
      <button
        type="submit"
        className="glass-card flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/10 p-3 transition-colors hover:bg-white/5"
        formAction={signInWithDiscord}
      >
        <div className="from-primary size-10 rounded-full bg-linear-to-br to-emerald-700 p-[2px]">
          <div className="bg-muted flex size-full items-center justify-center rounded-full border-2 border-black">
            <span className="text-xs font-bold">?</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden text-left">
          <p className="truncate text-sm font-medium text-white">Guest</p>
          <p className="text-muted-foreground truncate text-xs">
            Sign in to continue
          </p>
        </div>
      </button>
    </form>
  );
}
