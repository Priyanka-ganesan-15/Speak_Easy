"use client";

import { useEffect, useMemo, useState } from "react";

const durationOptions = [1, 3, 5, 10];

type SessionPhase = "idle" | "prep" | "speech" | "completed";

type SessionTimerProps = {
  onComplete?: (speechSeconds: number) => void;
  onPhaseChange?: (phase: SessionPhase) => void;
  onDurationsChange?: (prepSeconds: number, speechSeconds: number) => void;
};

function formatTime(totalSeconds: number) {
  const min = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const sec = (totalSeconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

export function SessionTimer({ onComplete, onPhaseChange, onDurationsChange }: SessionTimerProps) {
  const [prepMinutes, setPrepMinutes] = useState(3);
  const [speechMinutes, setSpeechMinutes] = useState(3);
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [remaining, setRemaining] = useState(prepMinutes * 60);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  useEffect(() => {
    onDurationsChange?.(prepMinutes * 60, speechMinutes * 60);
  }, [onDurationsChange, prepMinutes, speechMinutes]);

  useEffect(() => {
    if (phase !== "prep" && phase !== "speech") return;

    const interval = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          if (phase === "prep") {
            setPhase("speech");
            return speechMinutes * 60;
          }

          setPhase("completed");
          onComplete?.(speechMinutes * 60);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, speechMinutes]);

  const phaseLabel = useMemo(() => {
    if (phase === "idle") return "Ready";
    if (phase === "prep") return "Planning";
    if (phase === "speech") return "Speaking";
    return "Completed";
  }, [phase]);

  const startSession = () => {
    setPhase("prep");
    setRemaining(prepMinutes * 60);
  };

  const resetSession = () => {
    setPhase("idle");
    setRemaining(prepMinutes * 60);
  };

  const changePrep = (value: number) => {
    setPrepMinutes(value);
    if (phase === "idle") {
      setRemaining(value * 60);
    }
  };

  return (
    <section className="glass-surface rounded-3xl p-6">
      <h2 className="font-display text-2xl text-[color:var(--ink)]">Session Engine</h2>
      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Pick durations and run a full prep-to-speech cycle.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <DurationPicker label="Prep Time" value={prepMinutes} onChange={changePrep} disabled={phase !== "idle"} />
        <DurationPicker
          label="Speech Time"
          value={speechMinutes}
          onChange={setSpeechMinutes}
          disabled={phase !== "idle"}
        />
      </div>

      <div className="glass-surface-soft mt-6 rounded-2xl p-5 text-center">
        <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">Current Phase</p>
        <p className="mt-2 font-display text-3xl text-[color:var(--ink)]">{phaseLabel}</p>
        <p className="mt-2 text-5xl font-bold text-[color:var(--ink)]">{formatTime(Math.max(0, remaining))}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startSession}
          disabled={phase === "prep" || phase === "speech"}
          className="rounded-full bg-[color:var(--ink)] px-5 py-2 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start Session
        </button>
        <button
          type="button"
          onClick={resetSession}
          className="glass-chip rounded-full px-5 py-2 text-sm font-medium text-[color:var(--ink)] transition hover:bg-white/80"
        >
          Reset
        </button>
      </div>
    </section>
  );
}

type DurationPickerProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
};

function DurationPicker({ label, value, onChange, disabled }: DurationPickerProps) {
  return (
    <div className="glass-surface-soft rounded-2xl p-4">
      <p className="text-sm text-[color:var(--ink-soft)]">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {durationOptions.map((option) => (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              value === option
                ? "bg-[color:var(--highlight)] text-black"
                : "glass-chip text-[color:var(--ink-soft)] hover:bg-white/80"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {option} min
          </button>
        ))}
      </div>
    </div>
  );
}
