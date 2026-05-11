import { TopNav } from "@/components/top-nav";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-black/8 ${className ?? ""}`} />;
}

export default function PracticeLoading() {
  return (
    <div className="min-h-screen glass-page">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-8">

        {/* header skeleton */}
        <section className="glass-surface-strong rounded-3xl p-8 md:p-10">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="mt-5 h-14 w-3/4" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
          <Skeleton className="mt-2 h-4 w-1/2 max-w-sm" />
        </section>

        {/* wheel + timer skeleton */}
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* topic wheel */}
          <div className="glass-surface overflow-hidden rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/40 bg-white/36 px-6 py-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-3.5 w-44" />
              </div>
              <Skeleton className="h-10 w-20 rounded-full" />
            </div>
            <Skeleton className="mx-4 mt-4 h-[448px] rounded-2xl" />
          </div>

          {/* session timer */}
          <div className="glass-surface rounded-3xl p-6">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="mt-2 h-4 w-64" />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="glass-surface-soft rounded-2xl p-4">
                <Skeleton className="h-4 w-20" />
                <div className="mt-3 flex gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-14 rounded-full" />
                  ))}
                </div>
              </div>
              <div className="glass-surface-soft rounded-2xl p-4">
                <Skeleton className="h-4 w-24" />
                <div className="mt-3 flex gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-14 rounded-full" />
                  ))}
                </div>
              </div>
            </div>
            <div className="glass-surface-soft mt-6 rounded-2xl p-5 text-center">
              <Skeleton className="mx-auto h-3.5 w-24" />
              <Skeleton className="mx-auto mt-3 h-9 w-28" />
              <Skeleton className="mx-auto mt-3 h-12 w-32" />
            </div>
            <div className="mt-5 flex gap-3">
              <Skeleton className="h-9 w-32 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
