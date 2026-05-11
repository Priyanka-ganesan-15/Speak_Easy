import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { StatCard } from "@/components/stat-card";
import { TrendBars } from "@/components/trend-bars";
import { ViewportReveal } from "@/components/viewport-reveal";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisReport } from "@/lib/analysis/types";

export const dynamic = 'force-dynamic';

const RING_R = 36;
const RING_C = 2 * Math.PI * RING_R;

type CoachingSignal = {
  title: string;
  detail: string;
  tone: "positive" | "focus";
};

type WeeklyDeliveryPoint = {
  day: string;
  wordsPerMinute: number;
  fillerWordsPerMinute: number;
};

type RubricScore = {
  label: string;
  score: number;
};

type PauseBucket = {
  bucket: "< 1s" | "1-2s" | "2-3s" | "> 3s";
  value: number;
};

function avg(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // ── fetch authenticated user ──────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();

  // ── profile ───────────────────────────────────────────────────────────────
  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name").eq("id", user.id).single()
    : { data: null };

  const displayName = profile?.display_name?.split(" ")[0] ?? "there";

  // ── goals ─────────────────────────────────────────────────────────────────
  const { data: goalsRow } = user
    ? await supabase.from("user_goals").select("target_wpm, sessions_per_week, minutes_per_session").eq("user_id", user.id).single()
    : { data: null };

  const userGoals = goalsRow
    ? { targetWpm: goalsRow.target_wpm, sessionsPerWeek: goalsRow.sessions_per_week, minutesPerSession: goalsRow.minutes_per_session }
    : { targetWpm: 140, sessionsPerWeek: 3, minutesPerSession: 10 };

  // ── weekly actuals (current ISO week) ────────────────────────────────────
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { data: weekSessions } = user
    ? await supabase
        .from("practice_sessions")
        .select("speech_seconds, wpm, final_wpm")
        .eq("user_id", user.id)
        .gte("completed_at", weekStart.toISOString())
    : { data: [] };

  const sessionsArr = weekSessions ?? [];
  const weeklyActuals = {
    sessionsCompleted: sessionsArr.length,
    minutesPracticed: Math.round(sessionsArr.reduce((s, r) => s + (r.speech_seconds ?? 0), 0) / 60),
    avgWpm: sessionsArr.length
      ? Math.round(sessionsArr.reduce((s, r) => s + (r.final_wpm ?? r.wpm ?? 0), 0) / sessionsArr.length)
      : 0,
  };

  // ── recent sessions (last 5) ──────────────────────────────────────────────
  const { data: sessionsData } = user
    ? await supabase
        .from("practice_sessions")
        .select("id, topic, wpm, final_wpm, transcription_status, speech_seconds, completed_at, analysis_json")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const recentSessions = (sessionsData ?? []).map((s) => {
    const analysis = s.analysis_json as AnalysisReport | null;
    const overallScore = analysis?.summary.overall
      ?? ((s.final_wpm ?? s.wpm) ? Math.round(Math.min(((s.final_wpm ?? s.wpm ?? 0) / 160) * 100, 100)) : 0);
    const chips: string[] = [];
    if (analysis) {
      chips.push(`${analysis.summary.finalWpm} WPM`);
      if (analysis.content.fillerWordsPerMin > 0) chips.push(`${analysis.content.fillerWordsPerMin} fillers/min`);
      if (analysis.delivery.volumeRating === "monotone") chips.push("Monotone");
      if (analysis.delivery.wpmRating !== "good") chips.push(analysis.delivery.wpmRating === "slow" ? "Slow pace" : "Fast pace");
    }
    return {
      id: s.id,
      date: new Date(s.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      topic: s.topic,
      transcriptionStatus: s.transcription_status,
      overallScore,
      deliveryScore: analysis?.summary.delivery ?? null,
      contentScore: analysis?.summary.content ?? null,
      wpmLabel:
        s.transcription_status === "pending"
          ? "Processing"
          : s.transcription_status === "failed"
            ? "Analysis failed"
            : s.final_wpm ?? s.wpm
              ? `${Math.round(s.final_wpm ?? s.wpm ?? 0)} WPM`
              : "Not measured",
      duration: `${Math.floor((s.speech_seconds ?? 0) / 60)}m ${(s.speech_seconds ?? 0) % 60}s`,
      chips,
      hasAnalysis: !!analysis,
    };
  });

  // ── analysis-driven insights (last 120 sessions) ─────────────────────────
  const { data: analyticsData } = user
    ? await supabase
        .from("practice_sessions")
        .select("completed_at, speech_seconds, wpm, final_wpm, analysis_json")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: true })
        .limit(120)
    : { data: [] };

  const analyticsSessions = (analyticsData ?? []).map((s) => ({
    completedAt: s.completed_at,
    speechSeconds: s.speech_seconds ?? 0,
    wpm: s.final_wpm ?? s.wpm ?? 0,
    analysis: (s.analysis_json as AnalysisReport | null) ?? null,
  }));

  const analyzed = analyticsSessions.filter((s) => s.analysis !== null);
  const analyzedReports = analyzed.map((s) => s.analysis as AnalysisReport);

  const avgOverall = Math.round(avg(analyzedReports.map((a) => a.summary.overall)));
  const avgFillerPerMin = Number(avg(analyzedReports.map((a) => a.content.fillerWordsPerMin)).toFixed(1));

  // Activity streak (consecutive active days based on most recent session day)
  const uniqueSessionDays = [...new Set(analyticsSessions.map((s) => s.completedAt.slice(0, 10)))]
    .map((d) => Math.floor(new Date(`${d}T00:00:00Z`).getTime() / 86400000))
    .sort((a, b) => b - a);
  let streakDays = 0;
  for (let i = 0; i < uniqueSessionDays.length; i += 1) {
    if (i === 0) {
      streakDays = 1;
      continue;
    }
    if (uniqueSessionDays[i - 1] - uniqueSessionDays[i] === 1) {
      streakDays += 1;
    } else {
      break;
    }
  }

  // 30-day deltas for hero chips
  const nowMs = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const last30Analyzed = analyzed.filter((s) => nowMs - new Date(s.completedAt).getTime() <= 30 * DAY_MS);
  const prev30Analyzed = analyzed.filter((s) => {
    const age = nowMs - new Date(s.completedAt).getTime();
    return age > 30 * DAY_MS && age <= 60 * DAY_MS;
  });

  const clarityLast30 = avg(last30Analyzed.map((s) => (s.analysis as AnalysisReport).content.clarityScore));
  const clarityPrev30 = avg(prev30Analyzed.map((s) => (s.analysis as AnalysisReport).content.clarityScore));
  const clarityDeltaMonth = Math.round(clarityLast30 - clarityPrev30);

  const fillerLast30 = avg(last30Analyzed.map((s) => (s.analysis as AnalysisReport).content.fillerWordsPerMin));
  const fillerPrev30 = avg(prev30Analyzed.map((s) => (s.analysis as AnalysisReport).content.fillerWordsPerMin));
  const fillerDeltaMonth = Number((fillerLast30 - fillerPrev30).toFixed(1));

  // ── stats cards ───────────────────────────────────────────────────────────
  const { data: allSessions } = user
    ? await supabase
        .from("practice_sessions")
        .select("wpm, final_wpm, speech_seconds")
        .eq("user_id", user.id)
    : { data: [] };

  const all = allSessions ?? [];
  const totalMinutes = Math.round(all.reduce((s, r) => s + (r.speech_seconds ?? 0), 0) / 60);
  const avgWpmAll = all.length
    ? Math.round(all.reduce((s, r) => s + (r.final_wpm ?? r.wpm ?? 0), 0) / all.length)
    : 0;

  const statsCards = [
    { label: "Total sessions", value: String(all.length), delta: `${weeklyActuals.sessionsCompleted} this week` },
    { label: "Avg WPM", value: avgWpmAll > 0 ? String(avgWpmAll) : "—", delta: "across all sessions" },
    { label: "Avg overall score", value: analyzed.length > 0 ? `${avgOverall}/100` : "—", delta: `${analyzed.length} analysed` },
    { label: "Avg fillers / min", value: analyzed.length > 0 ? String(avgFillerPerMin) : "—", delta: "lower is better" },
  ];

  // 7-day delivery series
  const today = new Date();
  const deliverySeries: WeeklyDeliveryPoint[] = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - idx));
    const key = date.toISOString().slice(0, 10);
    const dayRows = analyticsSessions.filter((s) => s.completedAt.slice(0, 10) === key);
    const dayAnalysed = dayRows.filter((s) => s.analysis !== null).map((s) => s.analysis as AnalysisReport);

    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      wordsPerMinute: Math.round(
        dayAnalysed.length > 0
          ? avg(dayAnalysed.map((a) => a.summary.finalWpm))
          : avg(dayRows.map((r) => r.wpm)),
      ),
      fillerWordsPerMinute: Number(
        (dayAnalysed.length > 0 ? avg(dayAnalysed.map((a) => a.content.fillerWordsPerMin)) : 0).toFixed(1),
      ),
    };
  });

  // Weekly trend bars (last 5 full/partial weeks)
  const weekStartLocal = new Date();
  weekStartLocal.setDate(weekStartLocal.getDate() - weekStartLocal.getDay());
  weekStartLocal.setHours(0, 0, 0, 0);

  const trendRows = Array.from({ length: 5 }).map((_, idx) => {
    const start = new Date(weekStartLocal);
    start.setDate(weekStartLocal.getDate() - (4 - idx) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const weekRows = analyticsSessions.filter((s) => {
      const d = new Date(s.completedAt);
      return d >= start && d < end;
    });
    const weekAnalysed = weekRows.filter((s) => s.analysis !== null).map((s) => s.analysis as AnalysisReport);

    return {
      week: `W${idx + 1}`,
      speed: Math.round(
        weekAnalysed.length > 0
          ? avg(weekAnalysed.map((a) => a.summary.finalWpm))
          : avg(weekRows.map((r) => r.wpm)),
      ),
      volume: Math.round(
        weekAnalysed.length > 0 ? avg(weekAnalysed.map((a) => a.delivery.volumeVariation * 100)) : 0,
      ),
      pronunciation: Math.round(
        weekAnalysed.length > 0 ? avg(weekAnalysed.map((a) => a.content.clarityScore)) : 0,
      ),
    };
  });

  const rubricScores: RubricScore[] = analyzed.length > 0
    ? [
        { label: "Structure", score: Math.round(avg(analyzedReports.map((a) => a.content.topicRelevanceScore))) },
        { label: "Clarity", score: Math.round(avg(analyzedReports.map((a) => a.content.clarityScore))) },
        {
          label: "Pacing",
          score: Math.round(avg(analyzedReports.map((a) => (a.delivery.wpmRating === "good" ? 85 : a.delivery.wpmRating === "slow" ? 65 : 60)))),
        },
        {
          label: "Vocal Variety",
          score: Math.round(avg(analyzedReports.map((a) => ((a.delivery.volumeVariation + a.delivery.pitchVariation) / 2) * 100))),
        },
        { label: "Confidence", score: Math.round(avg(analyzedReports.map((a) => a.summary.delivery))) },
      ]
    : [
        { label: "Structure", score: 0 },
        { label: "Clarity", score: 0 },
        { label: "Pacing", score: 0 },
        { label: "Vocal Variety", score: 0 },
        { label: "Confidence", score: 0 },
      ];

  const allPauseGaps = analyzedReports.flatMap((a) => {
    const segments = [...a.segments].sort((x, y) => x.start - y.start);
    const gaps: number[] = [];
    for (let i = 1; i < segments.length; i += 1) {
      const gap = segments[i].start - segments[i - 1].end;
      if (gap > 0) gaps.push(gap);
    }
    return gaps;
  });

  const pauseDistribution: PauseBucket[] = (() => {
    if (allPauseGaps.length === 0) {
      return [
        { bucket: "< 1s", value: 0 },
        { bucket: "1-2s", value: 0 },
        { bucket: "2-3s", value: 0 },
        { bucket: "> 3s", value: 0 },
      ];
    }
    const counts = [0, 0, 0, 0];
    for (const g of allPauseGaps) {
      if (g < 1) counts[0] += 1;
      else if (g < 2) counts[1] += 1;
      else if (g < 3) counts[2] += 1;
      else counts[3] += 1;
    }
    const total = counts.reduce((sum, c) => sum + c, 0);
    return [
      { bucket: "< 1s", value: Math.round((counts[0] / total) * 100) },
      { bucket: "1-2s", value: Math.round((counts[1] / total) * 100) },
      { bucket: "2-3s", value: Math.round((counts[2] / total) * 100) },
      { bucket: "> 3s", value: Math.round((counts[3] / total) * 100) },
    ];
  })();

  const coachingSignals: CoachingSignal[] = (() => {
    if (analyzed.length < 2) {
      return [
        {
          title: "Build analysis history",
          detail: "Complete a few more analysed sessions to unlock trend-based coaching.",
          tone: "focus",
        },
      ];
    }

    const half = Math.floor(analyzedReports.length / 2);
    const early = analyzedReports.slice(0, half);
    const recent = analyzedReports.slice(half);
    const clarityDelta = Math.round(avg(recent.map((a) => a.content.clarityScore)) - avg(early.map((a) => a.content.clarityScore)));
    const fillerDelta = Number((avg(recent.map((a) => a.content.fillerWordsPerMin)) - avg(early.map((a) => a.content.fillerWordsPerMin))).toFixed(1));
    const avgPitch = avg(recent.map((a) => a.delivery.pitchVariation * 100));
    const longPauseShare = pauseDistribution.find((p) => p.bucket === "> 3s")?.value ?? 0;

    return [
      clarityDelta >= 0
        ? {
            title: "Clarity is improving",
            detail: `Your clarity score is up ${clarityDelta} points versus earlier sessions.`,
            tone: "positive",
          }
        : {
            title: "Clarity slipped recently",
            detail: `Clarity is down ${Math.abs(clarityDelta)} points. Slow down and tighten sentence structure.`,
            tone: "focus",
          },
      fillerDelta <= 0
        ? {
            title: "Filler words are trending down",
            detail: `${Math.abs(fillerDelta).toFixed(1)} fewer fillers/min compared to earlier sessions.`,
            tone: "positive",
          }
        : {
            title: "Filler words increased",
            detail: `Filler usage is up ${fillerDelta.toFixed(1)} /min. Pause intentionally before key points.`,
            tone: "focus",
          },
      avgPitch < 35 || longPauseShare > 15
        ? {
            title: "Work on vocal variety and flow",
            detail: `Pitch variation (${Math.round(avgPitch)}%) or long pauses (${longPauseShare}%) suggest monotone stretches.`,
            tone: "focus",
          }
        : {
            title: "Strong delivery dynamics",
            detail: `Pitch variation and pause control are in a healthy range this week. Keep it up.`,
            tone: "positive",
          },
    ];
  })();
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
          <h1 className="mt-4 font-display text-5xl leading-tight text-[color:var(--ink)]">Welcome back, {displayName}.</h1>
          <p className="mt-4 max-w-2xl text-[color:var(--ink-soft)]">
            {analyzed.length > 0
              ? `Based on ${analyzed.length} analysed sessions, your average score is ${avgOverall}/100 and filler usage is ${avgFillerPerMin}/min.`
              : "Complete your first analysed session to unlock personalised coaching insights and delivery trends."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="glass-chip anim-enter rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--ink)]" style={{ animationDelay: "200ms" }}>
              Streak: {streakDays} {streakDays === 1 ? "day" : "days"}
            </span>
            <span
              className={`glass-chip anim-enter rounded-full px-3 py-1 text-xs font-semibold ${
                clarityDeltaMonth >= 0 ? "text-emerald-700" : "text-amber-700"
              }`}
              style={{ animationDelay: "280ms" }}
            >
              {prev30Analyzed.length > 0
                ? `Clarity ${clarityDeltaMonth >= 0 ? "+" : ""}${clarityDeltaMonth} this month`
                : `Clarity ${Math.round(clarityLast30 || 0)}/100 (30d)`}
            </span>
            <span
              className={`glass-chip anim-enter rounded-full px-3 py-1 text-xs font-semibold ${
                fillerDeltaMonth <= 0 ? "text-emerald-700" : "text-amber-700"
              }`}
              style={{ animationDelay: "360ms" }}
            >
              {prev30Analyzed.length > 0
                ? fillerDeltaMonth <= 0
                  ? `Filler words down ${Math.abs(fillerDeltaMonth)}/min`
                  : `Filler words up ${fillerDeltaMonth}/min`
                : `Filler avg ${Number(fillerLast30.toFixed(1)) || 0}/min`}
            </span>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/practice"
              className="anim-enter rounded-full bg-[color:var(--ink)] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(0,0,0,0.16)] transition-all hover:-translate-y-0.5 hover:bg-black"
              style={{ animationDelay: "420ms" }}
            >
              Start New Session
            </Link>
            <a
              href="/api/report"
              download
              className="glass-chip anim-enter rounded-full px-6 py-3 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white/80"
              style={{ animationDelay: "500ms" }}
            >
              Download Report
            </a>
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
          <WeeklyGoals userGoals={userGoals} weeklyActuals={weeklyActuals} />
        </ViewportReveal>

        <ViewportReveal delayMs={120}>
          <section className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <TrendBars rows={trendRows} />
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
            <DeliveryChart series={deliverySeries} />
            <RubricBreakdown scores={rubricScores} />
          </section>
        </ViewportReveal>

        <ViewportReveal delayMs={160}>
          <section className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <PauseChart distribution={pauseDistribution} />
            <article className="glass-surface glass-hover anim-enter rounded-2xl p-5" style={{ animationDelay: "980ms" }}>
              <h2 className="font-display text-2xl text-[color:var(--ink)]">Recent Sessions</h2>
              <div className="mt-4 space-y-3">
                {recentSessions.map((session, index) => (
                  <div key={session.id} className="glass-surface-soft anim-enter rounded-xl p-3" style={{ animationDelay: `${1080 + index * 90}ms` }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[color:var(--ink-soft)]">{session.date}</p>
                        <p className="mt-1 text-sm font-medium text-[color:var(--ink)]">{session.topic}</p>
                      </div>
                      {session.hasAnalysis && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                          session.overallScore >= 75 ? "bg-emerald-100 text-emerald-700" :
                          session.overallScore >= 50 ? "bg-amber-100 text-amber-700" :
                          "bg-rose-100 text-rose-700"
                        }`}>{session.overallScore}/100</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-[color:var(--ink-soft)]">{session.duration} · {session.wpmLabel}</p>
                    {session.hasAnalysis && session.deliveryScore !== null && (
                      <p className="mt-1 text-xs text-[color:var(--ink-soft)]">
                        Delivery {session.deliveryScore}/100 · Content {session.contentScore}/100
                      </p>
                    )}
                    {session.chips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {session.chips.map((chip) => (
                          <span key={chip} className="rounded-full bg-white/50 px-2 py-0.5 text-[11px] text-[color:var(--ink-soft)]">{chip}</span>
                        ))}
                      </div>
                    )}
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

function WeeklyGoals({
  userGoals,
  weeklyActuals,
}: {
  userGoals: { targetWpm: number; sessionsPerWeek: number; minutesPerSession: number };
  weeklyActuals: { sessionsCompleted: number; minutesPracticed: number; avgWpm: number };
}) {
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

function DeliveryChart({ series }: { series: WeeklyDeliveryPoint[] }) {
  const maxWpm = 170;
  const maxFiller = 3;

  const safeSeries = series.length > 1 ? series : [{ day: "N/A", wordsPerMinute: 0, fillerWordsPerMinute: 0 }, { day: "N/A", wordsPerMinute: 0, fillerWordsPerMinute: 0 }];

  const wpmPoints = safeSeries
    .map((item, idx) => {
      const x = (idx / (safeSeries.length - 1)) * 100;
      const y = 100 - (item.wordsPerMinute / maxWpm) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const fillerPoints = safeSeries
    .map((item, idx) => {
      const x = (idx / (safeSeries.length - 1)) * 100;
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

function RubricBreakdown({ scores }: { scores: RubricScore[] }) {
  return (
    <article className="glass-surface glass-hover anim-enter rounded-2xl p-5" style={{ animationDelay: "900ms" }}>
      <h2 className="font-display text-2xl text-[color:var(--ink)]">Rubric Breakdown</h2>
      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">How your speech quality is scored</p>
      <div className="mt-5 space-y-3">
        {scores.map((item, index) => (
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

function PauseChart({ distribution }: { distribution: PauseBucket[] }) {
  return (
    <article className="glass-surface glass-hover anim-enter rounded-2xl p-5" style={{ animationDelay: "940ms" }}>
      <h2 className="font-display text-2xl text-[color:var(--ink)]">Pause Distribution</h2>
      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Share of pauses by length during recent sessions</p>
      <div className="mt-5 grid grid-cols-[130px_1fr] items-center gap-4">
        <div
          className="anim-enter mx-auto h-28 w-28 rounded-full border border-black/10"
          style={{
            animationDelay: "1040ms",
            background: (() => {
              const [a, b, c, d] = distribution;
              const p1 = a?.value ?? 0;
              const p2 = p1 + (b?.value ?? 0);
              const p3 = p2 + (c?.value ?? 0);
              return `conic-gradient(#2a9d8f 0% ${p1}%, #ffb703 ${p1}% ${p2}%, #fb8500 ${p2}% ${p3}%, #d62828 ${p3}% 100%)`;
            })(),
          }}
        />
        <div className="space-y-2 text-sm">
          {distribution.map((bucket, idx) => {
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
