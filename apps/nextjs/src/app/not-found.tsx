import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#164B49] bg-[#102A2A]/80 p-10 text-center backdrop-blur-sm">
        <p className="mb-2 text-sm font-semibold tracking-widest text-[#50C878]">
          404
        </p>
        <h1 className="mb-3 text-2xl font-bold text-white">
          This page doesn&apos;t exist
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-[#8FA8A8]">
          The page you&apos;re looking for couldn&apos;t be found.
        </p>
        <Link
          href="/"
          className="inline-block rounded-md bg-[#50C878] px-6 py-2.5 text-sm font-semibold text-[#0A1A1A] transition-colors hover:bg-[#66D99A]"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
