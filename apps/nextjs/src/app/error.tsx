"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="border-border-strong bg-surface-2/80 w-full max-w-md rounded-2xl border p-10 text-center backdrop-blur-sm">
        <h1 className="mb-3 text-2xl font-bold text-white">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          An unexpected error occurred. Please try again.
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
