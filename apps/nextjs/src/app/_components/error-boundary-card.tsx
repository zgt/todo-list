"use client";

/**
 * Shared branded error card used by the route-segment error boundaries.
 * Renders inside the root layout, so the Aurora/shader background sits
 * behind it — keep this treatment quiet: one message, one action.
 */
export function ErrorBoundaryCard({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-full w-full flex-1 items-center justify-center p-6">
      <div className="border-border-strong bg-surface-2/80 w-full max-w-md rounded-2xl border p-10 text-center backdrop-blur-sm">
        <h1 className="mb-3 text-2xl font-bold text-white">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          This section failed to load. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-md px-6 py-2.5 text-sm font-semibold transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
