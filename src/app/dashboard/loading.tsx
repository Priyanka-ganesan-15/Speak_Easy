import { TopNav } from "@/components/top-nav";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-black/8 ${className ?? ""}`}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen glass-page">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-8">

        {/* hero skeleton */}
        <section className="glass-surface-strong rounded-3xl p-8 md:p-10">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="mt-5 h-12 w-3/4" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
          <Skeleton className="mt-2 h-4 w-2/3 max-w-md" />
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
          </div>
          <div className="mt-7 flex gap-3">
            <Skeleton className="h-11 w-36 rounded-full" />
            <Skeleton className="h-11 w-44 rounded-full" />
          </div>
        </section>

        {/* stat cards skeleton */}
        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-surface rounded-2xl p-5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="mt-4 h-9 w-20" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          ))}
        </section>

        {/* weekly goals skeleton */}
        <section className="glass-surface mt-8 rounded-3xl p-6 md:p-8">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="mt-2 h-4 w-64" />
          <div className="mt-8 grid grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </section>

        {/* chart row skeleton */}
        <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="glass-surface rounded-2xl p-5">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="mt-2 h-4 w-72" />
            <Skeleton className="mt-4 h-48 w-full rounded-xl" />
          </div>
          <div className="glass-surface rounded-2xl p-5">
            <Skeleton className="h-7 w-40" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-surface-soft rounded-xl p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-full" />
                  <Skeleton className="mt-2 h-3 w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* recent sessions skeleton */}
        <section className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="glass-surface rounded-2xl p-5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-4 h-40 w-full rounded-xl" />
          </div>
          <div className="glass-surface rounded-2xl p-5">
            <Skeleton className="h-7 w-36" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-surface-soft rounded-xl p-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-40" />
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
