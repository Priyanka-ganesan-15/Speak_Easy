import type { WhisperSegment, FillerHit, DeliveryReport } from "./types";

const FILLER_SOUNDS = ["um", "uh", "hmm", "mm", "er", "ah"];

/** Detect filler sounds (non-word tokens) from Whisper segment text */
function detectFillerSounds(segments: WhisperSegment[]): FillerHit[] {
  const counts = new Map<string, number>();
  for (const seg of segments) {
    const tokens = seg.text
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);
    for (const token of tokens) {
      if (FILLER_SOUNDS.includes(token)) {
        counts.set(token, (counts.get(token) ?? 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count);
}

/** Count pauses (gaps > 2s between consecutive segments) */
function detectPauses(segments: WhisperSegment[]): {
  count: number;
  totalSilenceSeconds: number;
} {
  let count = 0;
  let totalSilenceSeconds = 0;
  for (let i = 1; i < segments.length; i++) {
    const gap = segments[i].start - segments[i - 1].end;
    if (gap > 2) {
      count++;
      totalSilenceSeconds += gap;
    }
  }
  return { count, totalSilenceSeconds: Math.round(totalSilenceSeconds * 10) / 10 };
}

/**
 * Compute volume variation from raw PCM float32 samples.
 * Splits into 200ms windows and computes stddev of RMS values.
 * Returns 0–1 (0 = completely flat, 1 = highly dynamic).
 */
function computeVolumeVariation(
  pcmData: Float32Array,
  sampleRate: number,
): number {
  const windowSize = Math.floor(sampleRate * 0.2);
  const rmsValues: number[] = [];
  for (let i = 0; i + windowSize < pcmData.length; i += windowSize) {
    let sum = 0;
    for (let j = i; j < i + windowSize; j++) {
      sum += pcmData[j] * pcmData[j];
    }
    rmsValues.push(Math.sqrt(sum / windowSize));
  }
  if (rmsValues.length < 2) return 0;
  const mean = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length;
  const variance =
    rmsValues.reduce((a, b) => a + (b - mean) ** 2, 0) / rmsValues.length;
  // Normalize: stddev > 0.1 is considered highly dynamic
  return Math.min(Math.sqrt(variance) / 0.1, 1);
}

/**
 * Compute pitch variation via autocorrelation on 30ms windows.
 * Returns 0–1 (0 = flat, 1 = expressive). Returns 0 on failure.
 */
function computePitchVariation(
  pcmData: Float32Array,
  sampleRate: number,
): number {
  const windowSize = Math.floor(sampleRate * 0.03); // 30ms
  const minPeriod = Math.floor(sampleRate / 300); // 300 Hz max
  const maxPeriod = Math.floor(sampleRate / 80); // 80 Hz min
  const pitches: number[] = [];

  for (let offset = 0; offset + windowSize < pcmData.length; offset += windowSize) {
    let bestCorr = 0;
    let bestPeriod = 0;
    for (let period = minPeriod; period <= maxPeriod; period++) {
      let corr = 0;
      for (let j = 0; j < windowSize - period; j++) {
        corr += pcmData[offset + j] * pcmData[offset + j + period];
      }
      if (corr > bestCorr) {
        bestCorr = corr;
        bestPeriod = period;
      }
    }
    if (bestPeriod > 0 && bestCorr > 0.01) {
      pitches.push(sampleRate / bestPeriod);
    }
  }

  if (pitches.length < 2) return 0;
  const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;
  const variance =
    pitches.reduce((a, b) => a + (b - mean) ** 2, 0) / pitches.length;
  // Normalize: stddev > 40 Hz is considered expressive
  return Math.min(Math.sqrt(variance) / 40, 1);
}

export function scoreDelivery(
  segments: WhisperSegment[],
  speechSeconds: number,
  pcmData: Float32Array | null,
  sampleRate: number,
): DeliveryReport {
  const fullText = segments.map((s) => s.text).join(" ");
  const wordCount = fullText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const wpm =
    speechSeconds > 0 ? Math.round((wordCount / speechSeconds) * 60) : 0;

  const wpmRating =
    wpm < 120 ? "slow" : wpm > 180 ? "fast" : "good";

  const { count: pauseCount, totalSilenceSeconds } = detectPauses(segments);
  const fillerSounds = detectFillerSounds(segments);
  const fillerSoundsPerMin =
    speechSeconds > 0
      ? Math.round(
          (fillerSounds.reduce((a, b) => a + b.count, 0) /
            speechSeconds) *
            60 *
            10,
        ) / 10
      : 0;

  const volumeVariation =
    pcmData ? computeVolumeVariation(pcmData, sampleRate) : 0;
  const volumeRating =
    volumeVariation < 0.25
      ? "monotone"
      : volumeVariation < 0.65
        ? "moderate"
        : "dynamic";

  const pitchVariation =
    pcmData ? computePitchVariation(pcmData, sampleRate) : 0;
  const pitchRating =
    pitchVariation < 0.25
      ? "flat"
      : pitchVariation < 0.65
        ? "moderate"
        : "expressive";

  return {
    wpm,
    wpmRating,
    pauseCount,
    totalSilenceSeconds,
    volumeVariation: Math.round(volumeVariation * 100) / 100,
    volumeRating,
    pitchVariation: Math.round(pitchVariation * 100) / 100,
    pitchRating,
    fillerSounds,
    fillerSoundsPerMin,
  };
}
