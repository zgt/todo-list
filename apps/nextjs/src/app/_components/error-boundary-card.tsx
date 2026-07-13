"use client";

/**
 * Shared branded error card used by the route-segment error boundaries.
 * Renders inside the root layout, so the Aurora/shader background sits
 * behind it — keep this treatment quiet: one message, one action.
 */
export function ErrorBoundaryCard({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-full w-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#164B49] bg-[#102A2A]/80 p-10 text-center backdrop-blur-sm">
        <h1 className="mb-3 text-2xl font-bold text-white">
          Something went wrong
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-[#8FA8A8]">
          This section failed to load. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-[#50C878] px-6 py-2.5 text-sm font-semibold text-[#0A1A1A] transition-colors hover:bg-[#66D99A]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
