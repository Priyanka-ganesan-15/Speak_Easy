import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { StatCard } from "@/components/stat-card";
import { TrendBars } from "@/components/trend-bars";
import { ViewportReveal } from "@/components/viewport-reveal";
import {
  coachingSignals,
  pauseDistribution,
  recentSessions,
  rubricScores,
  statsCards,
  trendData,
  userGoals,
  weeklyActuals,
  weeklyDeliverySeries,
} from "@/lib/mock-data";

const RING_R = 36;
const RING_C = 2 * Math.PI * RING_R;

export default function DashboardPage() {
  return (
    <div className="min-h-screen glass-page">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 md:px-8">
        <ViewportReveal delayMs={40}>
          <section className="glass-surface-strong anim-enter relative overflow-hidden rounded-3xl p-8 md:p-10" style={{ animationDelay: "60ms" }}>
          <div className="anim-float anim-glow pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[color:var(--highlight)]/35 blur-3xl" />
          <div className="anim-float anim-glow pointer-events-none absolute -bottom-24 right-32 h-56 w-56 rounded-full bg-sky-200/45 blur-3xl" style={{ animationDelay: "900ms" }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#00000026,transparent)]" />

          <p className="text-sm uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">Dashboard</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-[color:var(--ink)]">Welcome back, Priyanka.</h1>
          <p className="mt-4 max-w-2xl text-[color:var(--ink-soft)]">
            Your delivery quality is improving with stronger structure and fewer long pauses. Next focus area is vocal
            variety across the middle of longer talks.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="glass-chip anim-enter rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--ink)]" style={{ animationDelay: "200ms" }}>Streak: 6 days</span>
            <span className="glass-chip anim-enter rounded-full px-3 py-1 text-xs font-semibold text-emerald-700" style={{ animationDelay: "280ms" }}>Clarity +9 this month</span>
            <span className="glass-chip anim-enter rounded-full px-3 py-1 text-xs font-semibold text-amber-700" style={{ animationDelay: "360ms" }}>Filler words down</span>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/practice"
              className="anim-enter rounded-full bg-[color:var(--ink)] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.16)] transition-all hover:-translate-y-0.5 hover:bg-black"
              style={{ animationDelay: "420ms" }}
            >
              Start New Session
            </Link>
            <button
              type="button"
              className="glass-chip anim-enter rounded-full px-6 py-3 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white/80"
              style={{ animationDelay: "500ms" }}
            >
              Export Weekly Report
            </button>
          </div>
          </section>
        </ViewportReveal>

        <ViewportReveal delayMs={80}>
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statsCards.map((card, index) => (
              <div key={card.label} className="anim-enter" style={{ animationDelay: `${560 + index * 90}ms` }}>
                <StatCard label={card.label} value={card.value} delta={card.delta} />
              </div>
            ))}
          </section>
        </ViewportReveal>

        <ViewportReveal delayMs={100}>
          <WeeklyGoals />
        </ViewportReveal>

        <ViewportReveal delayMs={120}>
          <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <TrendBars rows={trendData} />
            <article className="glass-surface glass-hover anim-enter rounded-2xl p-5" style={{ animationDelay: "720ms" }}>
              <h2 className="font-display text-2xl text-[color:var(--ink)]">Coaching Signals</h2>
              <div className="mt-4 space-y-3">
                {coachingSignals.map((signal, index) => (
                  <div key={signal.title} className="glass-surface-soft anim-enter rounded-xl p-3" style={{ animationDelay: `${820 + index * 90}ms` }}>
                    <p className="text-sm font-semibold text-[color:var(--ink)]">{signal.title}</p>
                    <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{signal.detail}</p>
                    <p
                      className={`mt-2 text-xs uppercase tracking-wide ${
                        signal.tone === "positive" ? "text-emerald-700" : "text-amber-700"
                      }`}
                    >
                      {signal.tone === "positive" ? "Improving" : "Focus next"}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </ViewportReveal>

        <ViewportReveal delayMs={140}>
          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <DeliveryChart />
            <RubricBreakdown />
          </section>
        </ViewportReveal>

        <ViewportReveal delayMs={160}>
          <section className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <PauseChart />
            <article className="glass-surface glass-hover anim-enter rounded-2xl p-5" style={{ animationDelay: "980ms" }}>
              <h2 className="font-display text-2xl text-[color:var(--ink)]">Recent Sessions</h2>
              <div className="mt-4 space-y-3">
                {recentSessions.map((session, index) => (
                  <div key={`${session.date}-${session.topic}`} className="glass-surface-soft anim-enter rounded-xl p-3" style={{ animationDelay: `${1080 + index * 90}ms` }}>
                    <p className="text-xs uppercase tracking-wide text-[color:var(--ink-soft)]">{session.date}</p>
                    <p className="mt-1 text-sm font-medium text-[color:var(--ink)]">{session.topic}</p>
                    <p className="mt-2 text-xs text-[color:var(--ink-soft)]">
                      Score: {session.score}/100 · Duration: {session.duration}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </ViewportReveal>
      </main>
    </div>
  );
}

function GoalRing({
  label,
  actual,
  target,
  unit,
  color,
  delayMs = 0,
}: {
  label: string;
  actual: number;
  target: number;
  unit: string;
  color: string;
  delayMs?: number;
}) {
  const fraction = Math.min(actual / target, 1);
  const filled = fraction * RING_C;
  const pct = Math.round(fraction * 100);

  return (
    <div className="anim-enter flex flex-col items-center gap-3" style={{ animationDelay: `${delayMs}ms` }}>
      <div className="relative">
        <div className="absolute inset-5 rounded-full bg-white/65 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]" />
        <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
          <circle cx="48" cy="48" r={RING_R} fill="none" stroke="black" strokeOpacity="0.08" strokeWidth="8" />
          <circle
            cx="48"
            cy="48"
            r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${RING_C}`}
            className="line-draw"
            style={{ animationDelay: `${delayMs + 180}ms` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold leading-none text-[color:var(--ink)]">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[color:var(--ink)]">{label}</p>
        <p className="mt-0.5 text-xs text-[color:var(--ink-soft)]">
          {actual} <span className="text-[color:var(--ink-soft)]/60">/</span> {target} {unit}
        </p>
      </div>
    </div>
  );
}

function WeeklyGoals() {
  const totalMinutesGoal = userGoals.sessionsPerWeek * userGoals.minutesPerSession;

  const goals = [
    {
      label: "Sessions",
      actual: weeklyActuals.sessionsCompleted,
      target: userGoals.sessionsPerWeek,
      unit: "this week",
      color: "#ffbf47",
    },
    {
      label: "Minutes practiced",
      actual: weeklyActuals.minutesPracticed,
      target: totalMinutesGoal,
      unit: "min goal",
      color: "#219ebc",
    },
    {
      label: "Avg WPM",
      actual: weeklyActuals.avgWpm,
      target: userGoals.targetWpm,
      unit: "wpm goal",
      color: "#2a9d8f",
    },
  ];

  const allMet = goals.every((g) => g.actual >= g.target);

  return (
    <section className="glass-surface anim-enter mt-8 rounded-3xl p-6 md:p-8" style={{ animationDelay: "640ms" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-[color:var(--ink)]">This Week&apos;s Goals</h2>
          <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
            Targets set in{" "}
            <Link href="/settings" className="underline underline-offset-2 hover:text-[color:var(--ink)]">
              Settings / Practice Goals
            </Link>
          </p>
        </div>
        {allMet && (
          <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold text-emerald-700">
            All goals met
          </span>
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-8">
        {goals.map((g, index) => (
          <GoalRing key={g.label} {...g} delayMs={760 + index * 120} />
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {goals.map((g, index) => {
          const pct = Math.min(Math.round((g.actual / g.target) * 100), 100);
          const met = g.actual >= g.target;
          return (
            <div key={g.label} className="anim-enter" style={{ animationDelay: `${980 + index * 90}ms` }}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-[color:var(--ink-soft)]">{g.label}</span>
                <span className={`font-medium ${met ? "text-emerald-600" : "text-[color:var(--ink)]"}`}>
                  {g.actual} / {g.target} {g.unit}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/8">
                <div className="bar-reveal h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: g.color, animationDelay: `${1080 + index * 90}ms` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DeliveryChart() {
  const maxWpm = 170;
  const maxFiller = 3;

  const wpmPoints = weeklyDeliverySeries
    .map((item, idx) => {
      const x = (idx / (weeklyDeliverySeries.length - 1)) * 100;
      const y = 100 - (item.wordsPerMinute / maxWpm) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const fillerPoints = weeklyDeliverySeries
    .map((item, idx) => {
      const x = (idx / (weeklyDeliverySeries.length - 1)) * 100;
      const y = 100 - (item.fillerWordsPerMinute / maxFiller) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <article className="glass-surface glass-hover anim-enter rounded-2xl p-5" style={{ animationDelay: "840ms" }}>
      <h2 className="font-display text-2xl text-[color:var(--ink)]">Delivery Over 7 Days</h2>
      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Words per minute vs filler words per minute</p>

      <div className="glass-surface-soft anim-enter mt-4 rounded-xl p-3" style={{ animationDelay: "940ms" }}>
        <svg viewBox="0 0 100 100" className="h-48 w-full" preserveAspectRatio="none" aria-label="Delivery trend chart">
          <polyline fill="none" stroke="#fb8500" strokeWidth="2.5" points={wpmPoints} className="line-draw" />
          <polyline fill="none" stroke="#219ebc" strokeWidth="2.5" points={fillerPoints} className="line-draw line-draw-delay" />
        </svg>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-[color:var(--ink-soft)]">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#fb8500]" /> WPM
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#219ebc]" /> Filler / min
          </span>
        </div>
      </div>
    </article>
  );
}

function RubricBreakdown() {
  return (
    <article className="glass-surface glass-hover anim-enter rounded-2xl p-5" style={{ animationDelay: "900ms" }}>
      <h2 className="font-display text-2xl text-[color:var(--ink)]">Rubric Breakdown</h2>
      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">How your speech quality is scored</p>
      <div className="mt-5 space-y-3">
        {rubricScores.map((item, index) => (
          <div key={item.label} className="anim-enter" style={{ animationDelay: `${980 + index * 80}ms` }}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-[color:var(--ink-soft)]">{item.label}</span>
              <span className="font-medium text-[color:var(--ink)]">{item.score}</span>
            </div>
            <div className="h-2 rounded-full bg-black/10">
              <div
                className="bar-reveal h-2 rounded-full bg-[linear-gradient(90deg,#fb8500,#ffb703)]"
                style={{ width: `${item.score}%`, animationDelay: `${1060 + index * 80}ms` }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function PauseChart() {
  return (
    <article className="glass-surface glass-hover anim-enter rounded-2xl p-5" style={{ animationDelay: "940ms" }}>
      <h2 className="font-display text-2xl text-[color:var(--ink)]">Pause Distribution</h2>
      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Share of pauses by length during recent sessions</p>
      <div className="mt-5 grid grid-cols-[130px_1fr] items-center gap-4">
        <div
          className="anim-enter mx-auto h-28 w-28 rounded-full border border-black/10"
          style={{
            animationDelay: "1040ms",
            background: "conic-gradient(#2a9d8f 0% 54%, #ffb703 54% 85%, #fb8500 85% 95%, #d62828 95% 100%)",
          }}
        />
        <div className="space-y-2 text-sm">
          {pauseDistribution.map((bucket, idx) => {
            const colors = ["#2a9d8f", "#ffb703", "#fb8500", "#d62828"];
            return (
              <div key={bucket.bucket} className="anim-enter flex items-center justify-between text-[color:var(--ink-soft)]" style={{ animationDelay: `${1120 + idx * 80}ms` }}>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[idx] }} />
                  {bucket.bucket}
                </span>
                <span className="font-medium text-[color:var(--ink)]">{bucket.value}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}
