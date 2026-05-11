"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  analyserNode: AnalyserNode | null;
  active: boolean;
  currentWpm?: number; // rolling WPM hint from parent if available
};

export function LiveFeedback({ analyserNode, active, currentWpm }: Props) {
  const [volume, setVolume] = useState(0); // 0–1
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    if (!active || !analyserNode) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setVolume(0);
      return;
    }

    bufferRef.current = new Float32Array(analyserNode.fftSize) as Float32Array<ArrayBuffer>;

    function tick() {
      if (!analyserNode || !bufferRef.current) return;
      analyserNode.getFloatTimeDomainData(bufferRef.current);
      // RMS amplitude
      let sum = 0;
      for (const v of bufferRef.current) sum += v * v;
      const rms = Math.sqrt(sum / bufferRef.current.length);
      // Normalize to 0–1 (typical speech peaks around 0.3)
      setVolume(Math.min(rms / 0.3, 1));
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, analyserNode]);

  if (!active) return null;

  const volumePercent = Math.round(volume * 100);
  const volumeLabel =
    volumePercent < 20 ? "Too quiet" : volumePercent < 70 ? "Good level" : "Very loud";
  const volumeColor =
    volumePercent < 20
      ? "bg-amber-400"
      : volumePercent < 70
        ? "bg-emerald-400"
        : "bg-rose-400";

  return (
    <div className="glass-surface inline-flex items-center gap-4 rounded-2xl px-4 py-2.5 text-xs">
      {/* Volume meter */}
      <div className="flex items-center gap-2">
        <span className="text-[color:var(--ink-soft)] font-medium">Volume</span>
        <div className="h-1.5 w-20 rounded-full bg-white/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-75 ${volumeColor}`}
            style={{ width: `${volumePercent}%` }}
          />
        </div>
        <span className="text-[color:var(--ink-soft)]">{volumeLabel}</span>
      </div>

      {/* Live WPM if available */}
      {currentWpm !== undefined && currentWpm > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[color:var(--ink-soft)] font-medium">Pace</span>
          <span
            className={
              currentWpm < 120
                ? "text-amber-600 font-semibold"
                : currentWpm > 180
                  ? "text-rose-600 font-semibold"
                  : "text-emerald-600 font-semibold"
            }
          >
            {currentWpm} WPM
          </span>
          <span className="text-[color:var(--ink-soft)]">
            {currentWpm < 120 ? "· slow down" : currentWpm > 180 ? "· too fast" : "· on track"}
          </span>
        </div>
      )}
    </div>
  );
}
