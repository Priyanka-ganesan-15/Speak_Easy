import { TopNav } from "@/components/top-nav";
import { SessionTimer } from "@/components/session-timer";
import { TopicWheel } from "@/components/topic-wheel";
import { topics } from "@/lib/mock-data";

export default function PracticePage() {
  return (
    <div className="min-h-screen hero-glow">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-8">
        <section className="rounded-3xl border border-black/10 bg-[color:var(--paper)] p-8 shadow-[0_16px_40px_rgba(0,0,0,0.08)] md:p-10">
          <p className="text-sm uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">Practice Studio</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-[color:var(--ink)]">Spin, plan, and speak without stopping.</h1>
          <p className="mt-4 max-w-2xl text-[color:var(--ink-soft)]">
            In UI mode this page simulates the complete speaking workflow. Backend hooks for recording, transcription,
            and AI scoring come next.
          </p>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <TopicWheel topics={topics} />
          <SessionTimer />
        </section>

        <section className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
          <h2 className="font-display text-2xl text-[color:var(--ink)]">Upcoming Integration Slots</h2>
          <div className="mt-4 grid gap-3 text-sm text-[color:var(--ink-soft)] md:grid-cols-3">
            <div className="rounded-xl border border-black/10 bg-[color:var(--paper-soft)] p-4">
              <p className="font-medium text-[color:var(--ink)]">Audio Capture</p>
              <p className="mt-2">MediaRecorder integration with pause-proof upload state.</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-[color:var(--paper-soft)] p-4">
              <p className="font-medium text-[color:var(--ink)]">Speech-to-Text</p>
              <p className="mt-2">Async transcript pipeline with queue states and retries.</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-[color:var(--paper-soft)] p-4">
              <p className="font-medium text-[color:var(--ink)]">AI Feedback</p>
              <p className="mt-2">Rubric score, strengths, weak points, and drills per topic.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
