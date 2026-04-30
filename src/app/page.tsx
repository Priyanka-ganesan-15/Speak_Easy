import Link from "next/link";
import { TopNav } from "@/components/top-nav";

export default function Home() {
  return (
    <div className="min-h-screen glass-page">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-12 md:px-8">
        <section className="glass-surface-strong fade-rise rounded-3xl p-8 md:p-12">
          <p className="text-sm uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">Speak with intention</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-tight text-[color:var(--ink)] md:text-7xl">
            Build real public speaking confidence, one timed challenge at a time.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-[color:var(--ink-soft)]">
            Practice spontaneous speaking with a topic wheel, structured prep windows, and session analytics built
            around clarity, pacing, and confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signin"
              className="rounded-full bg-[color:var(--ink)] px-6 py-3 text-sm font-medium text-white shadow-[0_10px_24px_rgba(30,27,22,0.25)] transition hover:bg-black"
            >
              Start Free Practice
            </Link>
            <Link
              href="/dashboard"
              className="glass-chip rounded-full px-6 py-3 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white/85"
            >
              Explore Dashboard
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Structured speaking loops"
            description="Pick 1, 3, 5, or 10-minute prep and speaking windows to mimic real interview and stage constraints."
          />
          <FeatureCard
            title="AI-guided improvement"
            description="Every session is scored with practical feedback on structure, clarity, and delivery quality."
          />
          <FeatureCard
            title="Progress you can measure"
            description="Track speech speed, volume consistency, and pronunciation trendlines over time."
          />
        </section>

        <section className="mt-8 rounded-3xl border border-white/30 bg-[linear-gradient(140deg,rgba(30,27,22,0.84),rgba(56,44,28,0.76))] p-8 text-white backdrop-blur-xl md:p-10">
          <h2 className="font-display text-4xl">Why public speaking matters</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Blurb
              title="Career acceleration"
              body="People who communicate ideas clearly are trusted with larger responsibilities and leadership opportunities."
            />
            <Blurb
              title="Stronger influence"
              body="Speaking skills help you frame arguments, inspire action, and connect with audiences under pressure."
            />
            <Blurb
              title="Higher confidence"
              body="Regular timed practice reduces anxiety and helps your voice stay steady in difficult conversations."
            />
            <Blurb
              title="Clearer thinking"
              body="Preparing and delivering speeches trains your ability to organize ideas quickly and communicate with precision."
            />
          </div>
        </section>
      </main>
    </div>
  );
}

type FeatureCardProps = {
  title: string;
  description: string;
};

function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <article className="glass-surface fade-rise rounded-2xl p-5">
      <h2 className="font-display text-2xl text-[color:var(--ink)]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{description}</p>
    </article>
  );
}

type BlurbProps = {
  title: string;
  body: string;
};

function Blurb({ title, body }: BlurbProps) {
  return (
    <div className="rounded-2xl border border-white/35 bg-white/10 p-4 backdrop-blur-md">
      <p className="font-display text-2xl">{title}</p>
      <p className="mt-2 text-sm text-white/80">{body}</p>
    </div>
  );
}
