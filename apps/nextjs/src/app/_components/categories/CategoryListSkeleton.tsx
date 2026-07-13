export function CategoryListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="glass-card animate-pulse rounded-2xl border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full bg-white/10" />
            <div className="h-6 w-3/4 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
