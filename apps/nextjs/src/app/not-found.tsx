import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="border-border-strong bg-surface-2/80 w-full max-w-md rounded-2xl border p-10 text-center backdrop-blur-sm">
        <p className="text-primary mb-2 text-sm font-semibold tracking-widest">
          404
        </p>
        <h1 className="mb-3 text-2xl font-bold text-white">
          This page doesn&apos;t exist
        </h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          The page you&apos;re looking for couldn&apos;t be found.
        </p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary-hover inline-block rounded-md px-6 py-2.5 text-sm font-semibold transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
