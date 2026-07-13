"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#164B49] bg-[#102A2A]/80 p-10 text-center backdrop-blur-sm">
        <h1 className="mb-3 text-2xl font-bold text-white">
          Something went wrong
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-[#8FA8A8]">
          An unexpected error occurred. Please try again.
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
