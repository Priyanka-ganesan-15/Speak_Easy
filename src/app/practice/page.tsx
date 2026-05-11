import { TopNav } from "@/components/top-nav";
import { PracticeStudio } from "@/components/practice-studio";
import { topics } from "@/lib/mock-data";

export default function PracticePage() {
  return (
    <div className="min-h-screen glass-page">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-8">
        <section className="glass-surface-strong rounded-3xl p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">Practice Studio</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-[color:var(--ink)]">Spin, plan, and speak without stopping.</h1>
          <p className="mt-4 max-w-2xl text-[color:var(--ink-soft)]">
            Pick a topic, set your prep and speech timer, then deliver uninterrupted. Every session is saved to your history.
          </p>
        </section>

        <PracticeStudio topics={topics} />
      </main>
    </div>
  );
}
