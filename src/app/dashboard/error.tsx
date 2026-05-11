"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TopNav } from "@/components/top-nav";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="min-h-screen glass-page">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-8">
        <section className="glass-surface-strong rounded-3xl p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">Dashboard</p>
          <h1 className="mt-4 font-display text-4xl text-[color:var(--ink)]">Something went wrong.</h1>
          <p className="mt-4 max-w-lg text-[color:var(--ink-soft)]">
            We couldn&apos;t load your dashboard data. This is usually a temporary network issue.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-xs text-[color:var(--ink-soft)]/60">Error ID: {error.digest}</p>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-[color:var(--ink)] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.16)] transition-all hover:-translate-y-0.5 hover:bg-black"
            >
              Try again
            </button>
            <Link
              href="/"
              className="glass-chip rounded-full px-6 py-3 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white/80"
            >
              Go home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
