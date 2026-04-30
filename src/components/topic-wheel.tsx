"use client";

import { useCallback, useRef, useState } from "react";
import type { Topic } from "@/lib/mock-data";

type TopicWheelProps = {
  topics: Topic[];
};

// ─── constants ───────────────────────────────────────────────────────────────
const VISIBLE = 7;        // must be odd
const HALF    = 3;        // (VISIBLE - 1) / 2
const ITEM_H  = 64;       // px per row
const SPIN_MS = 3000;

// Visual weight indexed by |distance from center| (0 = center, 1 = ±1 …)
const LEVELS = [
  { opacity: 1,    scale: 1,    fw: "700", size: "text-base" },
  { opacity: 0.42, scale: 0.91, fw: "400", size: "text-sm"   },
  { opacity: 0.18, scale: 0.83, fw: "400", size: "text-sm"   },
  { opacity: 0.07, scale: 0.76, fw: "400", size: "text-sm"   },
];

// Category colour tokens
const CAT: Record<string, { bg: string; text: string }> = {
  Leadership: { bg: "bg-violet-100", text: "text-violet-700" },
  Career:     { bg: "bg-sky-100",    text: "text-sky-700"    },
  Society:    { bg: "bg-rose-100",   text: "text-rose-700"   },
  Technology: { bg: "bg-cyan-100",   text: "text-cyan-700"   },
  Education:  { bg: "bg-lime-100",   text: "text-lime-700"   },
  Health:     { bg: "bg-green-100",  text: "text-green-700"  },
  Creativity: { bg: "bg-pink-100",   text: "text-pink-700"   },
  Ethics:     { bg: "bg-orange-100", text: "text-orange-700" },
  Future:     { bg: "bg-indigo-100", text: "text-indigo-700" },
  Business:   { bg: "bg-amber-100",  text: "text-amber-700"  },
};

function easeOutQuart(t: number) { return 1 - (1 - t) ** 4; }

// ─── component ───────────────────────────────────────────────────────────────
export function TopicWheel({ topics }: TopicWheelProps) {
  const [centerIdx, setCenterIdx] = useState(0);
  const [isSpinning, setIsSpinning]   = useState(false);
  const [justLanded, setJustLanded]   = useState(false);
  const rafRef    = useRef<number | null>(null);
  const startRef  = useRef(0);
  const originRef = useRef(0);
  const stepsRef  = useRef(0);

  const spin = useCallback(() => {
    if (isSpinning) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setJustLanded(false);
    setIsSpinning(true);

    const origin = centerIdx;
    const target = Math.floor(Math.random() * topics.length);
    // ≥4 full loops then land on target
    const steps = topics.length * 4 + ((target - origin + topics.length) % topics.length);

    startRef.current  = performance.now();
    originRef.current = origin;
    stepsRef.current  = steps;

    const tick = (now: number) => {
      const p = Math.min((now - startRef.current) / SPIN_MS, 1);
      const stepped = Math.round(easeOutQuart(p) * steps);
      setCenterIdx((originRef.current + stepped) % topics.length);

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setIsSpinning(false);
        setJustLanded(true);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [isSpinning, centerIdx, topics.length]);

  const selected  = topics[centerIdx];
  const catStyle  = CAT[selected.category] ?? { bg: "bg-gray-100", text: "text-gray-600" };

  // Build windowed item list centred on centerIdx
  const rows = Array.from({ length: VISIBLE }, (_, i) => {
    const offset = i - HALF;
    const idx    = (centerIdx + offset + topics.length * 100) % topics.length;
    return { topic: topics[idx], offset };
  });

  return (
    <section className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)]">

      {/* ── header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b border-black/8 bg-[color:var(--paper-soft)] px-6 py-4">
        <div>
          <h2 className="font-display text-2xl text-[color:var(--ink)]">Topic Reel</h2>
          <p className="text-sm text-[color:var(--ink-soft)]">1 000 prompts — spins to one at random</p>
        </div>
        <button
          type="button"
          onClick={spin}
          disabled={isSpinning}
          className="rounded-full bg-[color:var(--ink)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition-all hover:scale-105 hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSpinning ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Spinning…
            </span>
          ) : "Spin"}
        </button>
      </div>

      {/* ── drum picker ────────────────────────────────────────────────────── */}
      <div className="relative" style={{ height: VISIBLE * ITEM_H }}>

        {/* Amber selection ring behind the center row */}
        <div
          className="pointer-events-none absolute inset-x-3 z-10 rounded-2xl bg-[color:var(--highlight)]/18 ring-2 ring-[color:var(--highlight)]"
          style={{ top: HALF * ITEM_H, height: ITEM_H }}
        />

        {/* Top fade */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-32 bg-gradient-to-b from-white via-white/80 to-transparent" />
        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-white via-white/80 to-transparent" />

        {/* Separator lines (like the reference image) */}
        <div className="pointer-events-none absolute inset-x-3 z-30 h-px bg-[color:var(--highlight)]/60" style={{ top: HALF * ITEM_H }} />
        <div className="pointer-events-none absolute inset-x-3 z-30 h-px bg-[color:var(--highlight)]/60" style={{ top: (HALF + 1) * ITEM_H }} />

        {/* Rows */}
        {rows.map(({ topic, offset }) => {
          const dist  = Math.abs(offset);
          const level = LEVELS[Math.min(dist, LEVELS.length - 1)];
          return (
            <div
              key={`${topic.id}-${offset}`}
              className="absolute inset-x-0 flex items-center px-6"
              style={{
                top: (offset + HALF) * ITEM_H,
                height: ITEM_H,
                opacity: level.opacity,
                transform: `scale(${level.scale})`,
                transition: isSpinning ? "none" : "opacity 120ms ease, transform 120ms ease",
                transformOrigin: "center left",
              }}
            >
              <p
                className={`truncate leading-snug text-[color:var(--ink)] ${level.size}`}
                style={{ fontWeight: level.fw }}
              >
                {topic.title}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── result card ────────────────────────────────────────────────────── */}
      <div
        className={`m-4 rounded-2xl bg-[color:var(--ink)] p-5 text-white transition-all duration-500 ${
          justLanded
            ? "shadow-[0_0_0_3px_#ffbf47,0_14px_32px_rgba(0,0,0,0.16)]"
            : "shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">Your Topic</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${catStyle.bg} ${catStyle.text}`}>
            {selected.category}
          </span>
        </div>
        <h3 className="mt-3 line-clamp-2 min-h-[3.5rem] font-display text-2xl leading-snug">{selected.title}</h3>
        <p className={`mt-2 text-xs text-white/55 transition-opacity duration-300 ${justLanded ? "animate-pulse opacity-100" : "opacity-0"}`}>
          Ready — choose your prep time below ↓
        </p>
      </div>

    </section>
  );
}
