import Link from "next/link";

export default function ListNotFound() {
  return (
    <div className="flex min-h-full w-full flex-1 items-center justify-center p-6">
      <div className="border-border-strong bg-surface-2/80 w-full max-w-md rounded-2xl border p-10 text-center backdrop-blur-sm">
        <h1 className="mb-3 text-2xl font-bold text-white">List not found</h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          This list doesn&apos;t exist or you no longer have access to it.
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
