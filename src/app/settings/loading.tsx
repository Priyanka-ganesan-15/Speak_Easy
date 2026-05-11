import { TopNav } from "@/components/top-nav";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-black/8 ${className ?? ""}`} />;
}

function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="glass-surface rounded-3xl p-6 md:p-8">
      <div className="mb-6 border-b border-white/35 pb-5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
      <div className={`grid gap-5 ${rows > 1 ? "sm:grid-cols-2" : ""}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-6 h-10 w-32 rounded-full" />
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="min-h-screen glass-page">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10 md:px-8">
        <div className="mb-8">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="mt-3 h-10 w-32" />
        </div>
        <div className="flex flex-col gap-6">
          <SectionSkeleton rows={3} />
          <SectionSkeleton rows={3} />
          <div className="glass-surface rounded-3xl p-6 md:p-8">
            <div className="mb-6 border-b border-white/35 pb-5">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="mt-2 h-4 w-56" />
            </div>
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
