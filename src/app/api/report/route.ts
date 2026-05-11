import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { AnalysisReport } from "@/lib/analysis/types";

export const dynamic = "force-dynamic";

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function score_color(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

function bar(value: number, max: number, color: string): string {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return `
    <div class="bar-track">
      <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
    </div>`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Not authenticated", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name ?? user.email ?? "User";

  const { data: raw } = await supabase
    .from("practice_sessions")
    .select("id, topic, speech_seconds, wpm, final_wpm, transcription_status, completed_at, analysis_json")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(200);

  const sessions = (raw ?? []).map((s) => ({
    id: s.id as string,
    topic: s.topic as string,
    speechSeconds: (s.speech_seconds as number) ?? 0,
    completedAt: s.completed_at as string,
    wpm: (s.final_wpm ?? s.wpm ?? 0) as number,
    analysis: (s.analysis_json as AnalysisReport | null) ?? null,
  }));

  const analyzed = sessions.filter((s) => s.analysis !== null);
  const reports = analyzed.map((s) => s.analysis as AnalysisReport);

  const totalSessions = sessions.length;
  const totalMinutes = Math.round(sessions.reduce((sum, s) => sum + s.speechSeconds, 0) / 60);
  const avgWpm = Math.round(avg(sessions.filter((s) => s.wpm > 0).map((s) => s.wpm)));
  const avgOverall = Math.round(avg(reports.map((r) => r.summary.overall)));
  const avgDelivery = Math.round(avg(reports.map((r) => r.summary.delivery)));
  const avgContent = Math.round(avg(reports.map((r) => r.summary.content)));
  const avgClarity = Math.round(avg(reports.map((r) => r.content.clarityScore)));
  const avgFiller = Number(avg(reports.map((r) => r.content.fillerWordsPerMin)).toFixed(1));
  const avgFillerSounds = Number(avg(reports.map((r) => r.delivery.fillerSoundsPerMin)).toFixed(1));
  const avgPauseCount = Math.round(avg(reports.map((r) => r.delivery.pauseCount)));
  const avgTopicRelevance = Math.round(avg(reports.map((r) => r.content.topicRelevanceScore)));

  // Filler word totals
  const fillerMap = new Map<string, number>();
  for (const r of reports) {
    for (const f of r.content.fillerWords) {
      fillerMap.set(f.phrase, (fillerMap.get(f.phrase) ?? 0) + f.count);
    }
    for (const f of r.delivery.fillerSounds) {
      fillerMap.set(f.phrase, (fillerMap.get(f.phrase) ?? 0) + f.count);
    }
  }
  const topFillers = [...fillerMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Recent 5 weeks trend
  const NOW = Date.now();
  const DAY_MS = 86400000;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekTrends = Array.from({ length: 5 }).map((_, idx) => {
    const start = new Date(weekStart.getTime() - (4 - idx) * 7 * DAY_MS);
    const end = new Date(start.getTime() + 7 * DAY_MS);
    const weekReports = analyzed
      .filter((s) => { const d = new Date(s.completedAt); return d >= start && d < end; })
      .map((s) => s.analysis as AnalysisReport);
    return {
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      sessions: weekReports.length,
      avgScore: Math.round(avg(weekReports.map((r) => r.summary.overall))),
      avgWpm: Math.round(avg(weekReports.map((r) => r.summary.finalWpm))),
      avgFiller: Number(avg(weekReports.map((r) => r.content.fillerWordsPerMin)).toFixed(1)),
    };
  });

  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const sessionRows = sessions.slice(0, 50).map((s) => {
    const a = s.analysis;
    const dur = `${Math.floor(s.speechSeconds / 60)}m ${s.speechSeconds % 60}s`;
    const date = new Date(s.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `
      <tr>
        <td>${date}</td>
        <td class="topic-cell">${s.topic}</td>
        <td>${dur}</td>
        <td>${s.wpm > 0 ? Math.round(s.wpm) : "—"}</td>
        <td>${a ? `<span class="score-badge" style="background:${score_color(a.summary.overall)}22;color:${score_color(a.summary.overall)}">${a.summary.overall}/100</span>` : "—"}</td>
        <td>${a ? a.summary.delivery : "—"}</td>
        <td>${a ? a.summary.content : "—"}</td>
        <td>${a ? a.content.fillerWordsPerMin : "—"}</td>
        <td>${a ? a.delivery.pauseCount : "—"}</td>
      </tr>`;
  }).join("");

  const weekTrendRows = weekTrends.map((w) => `
    <tr>
      <td>${w.label}</td>
      <td>${w.sessions}</td>
      <td>${w.avgScore > 0 ? `<span class="score-badge" style="background:${score_color(w.avgScore)}22;color:${score_color(w.avgScore)}">${w.avgScore}/100</span>` : "—"}</td>
      <td>${w.avgWpm > 0 ? w.avgWpm : "—"}</td>
      <td>${w.avgFiller > 0 ? w.avgFiller : "—"}</td>
    </tr>`).join("");

  const fillerRows = topFillers.map(([phrase, count]) => `
    <tr>
      <td>"${phrase}"</td>
      <td>${count}</td>
      <td>${reports.length > 0 ? Number((count / reports.length).toFixed(1)) : 0} per session</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Speak Easy — Practice Report · ${reportDate}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
      max-width: 960px;
      margin: 0 auto;
    }
    h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    h2 { font-size: 18px; font-weight: 600; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #f0f0f0; }
    h3 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 6px; }
    .meta { color: #666; font-size: 13px; margin-top: 4px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
    .stat-box { background: #f9f9f9; border-radius: 10px; padding: 16px; }
    .stat-box .value { font-size: 28px; font-weight: 700; margin-top: 4px; }
    .stat-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; padding: 8px 10px; border-bottom: 2px solid #f0f0f0; }
    td { padding: 8px 10px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .topic-cell { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .score-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-weight: 600; font-size: 12px; }
    .bar-track { width: 100%; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .bar-fill { height: 8px; border-radius: 4px; }
    .rubric-row { margin-bottom: 10px; }
    .rubric-label { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; }
    .footer { margin-top: 40px; font-size: 11px; color: #bbb; text-align: center; }
    @media print {
      body { padding: 20px; font-size: 12px; }
      h2 { page-break-before: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <h1>Speak Easy — Practice Report</h1>
      <p class="meta">Prepared for ${displayName} · ${reportDate}</p>
    </div>
    <div style="text-align:right;font-size:12px;color:#888">
      <div>${totalSessions} total sessions</div>
      <div>${analyzed.length} analysed</div>
    </div>
  </div>

  <h2>Summary</h2>
  <div class="stats-grid">
    <div class="stat-box">
      <div class="label">Overall avg score</div>
      <div class="value" style="color:${score_color(avgOverall)}">${analyzed.length > 0 ? `${avgOverall}/100` : "—"}</div>
    </div>
    <div class="stat-box">
      <div class="label">Avg WPM</div>
      <div class="value">${avgWpm > 0 ? avgWpm : "—"}</div>
    </div>
    <div class="stat-box">
      <div class="label">Total minutes practiced</div>
      <div class="value">${totalMinutes}</div>
    </div>
    <div class="stat-box">
      <div class="label">Avg filler words / min</div>
      <div class="value">${analyzed.length > 0 ? avgFiller : "—"}</div>
    </div>
  </div>

  ${analyzed.length > 0 ? `
  <h2>Delivery & Content Averages</h2>
  <div class="two-col">
    <div>
      <h3>Delivery Breakdown</h3>
      <div class="rubric-row">
        <div class="rubric-label"><span>Delivery score</span><span>${avgDelivery}/100</span></div>
        ${bar(avgDelivery, 100, "#fb8500")}
      </div>
      <div class="rubric-row">
        <div class="rubric-label"><span>Filler sounds / min</span><span>${avgFillerSounds}</span></div>
        ${bar(Math.max(0, 3 - avgFillerSounds), 3, "#219ebc")}
      </div>
      <div class="rubric-row">
        <div class="rubric-label"><span>Avg long pauses</span><span>${avgPauseCount} per session</span></div>
        ${bar(Math.max(0, 10 - avgPauseCount), 10, "#2a9d8f")}
      </div>
    </div>
    <div>
      <h3>Content Breakdown</h3>
      <div class="rubric-row">
        <div class="rubric-label"><span>Content score</span><span>${avgContent}/100</span></div>
        ${bar(avgContent, 100, "#8b5cf6")}
      </div>
      <div class="rubric-row">
        <div class="rubric-label"><span>Clarity score</span><span>${avgClarity}/100</span></div>
        ${bar(avgClarity, 100, "#ec4899")}
      </div>
      <div class="rubric-row">
        <div class="rubric-label"><span>Topic relevance</span><span>${avgTopicRelevance}%</span></div>
        ${bar(avgTopicRelevance, 100, "#06b6d4")}
      </div>
    </div>
  </div>

  <h2>Weekly Trends (Last 5 Weeks)</h2>
  <table>
    <thead>
      <tr>
        <th>Week of</th><th>Sessions</th><th>Avg score</th><th>Avg WPM</th><th>Fillers / min</th>
      </tr>
    </thead>
    <tbody>${weekTrendRows}</tbody>
  </table>

  ${topFillers.length > 0 ? `
  <h2>Top Filler Words &amp; Sounds</h2>
  <table>
    <thead><tr><th>Phrase</th><th>Total uses</th><th>Rate</th></tr></thead>
    <tbody>${fillerRows}</tbody>
  </table>` : ""}
  ` : ""}

  <h2>All Sessions (last ${Math.min(sessions.length, 50)})</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Topic</th><th>Duration</th><th>WPM</th>
        <th>Overall</th><th>Delivery</th><th>Content</th>
        <th>Fillers/min</th><th>Long pauses</th>
      </tr>
    </thead>
    <tbody>${sessionRows}</tbody>
  </table>

  <div class="footer">Generated by Speak Easy · ${reportDate} · speakeasy.app</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="speak-easy-report-${new Date().toISOString().slice(0, 10)}.html"`,
    },
  });
}
