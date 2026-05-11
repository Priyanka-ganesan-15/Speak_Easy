export type WhisperSegment = {
  start: number; // seconds
  end: number;
  text: string;
};

export type FillerHit = {
  phrase: string;
  count: number;
};

export type DeliveryReport = {
  wpm: number;
  wpmRating: "slow" | "good" | "fast"; // <120 slow, 120-180 good, >180 fast
  pauseCount: number; // gaps > 2s between segments
  totalSilenceSeconds: number;
  volumeVariation: number; // 0–1, stddev of RMS buckets
  volumeRating: "monotone" | "moderate" | "dynamic";
  pitchVariation: number; // 0–1, stddev of pitch Hz buckets (0 if unsupported)
  pitchRating: "flat" | "moderate" | "expressive";
  fillerSounds: FillerHit[]; // um/uh from transcript tokens
  fillerSoundsPerMin: number;
};

export type ContentReport = {
  wordCount: number;
  uniqueWordRatio: number; // type-token ratio, 0–1
  avgSentenceLength: number;
  sentenceLengthRating: "choppy" | "good" | "long"; // <8 choppy, 8-20 good, >20 long
  topicRelevanceScore: number; // 0–100, keyword overlap with topic
  fillerWords: FillerHit[];
  fillerWordsPerMin: number;
  clarityScore: number; // 0–100 composite
};

export type SummaryScores = {
  overall: number; // 0–100
  delivery: number; // 0–100
  content: number; // 0–100
  finalWpm: number;
};

export type AnalysisReport = {
  delivery: DeliveryReport;
  content: ContentReport;
  summary: SummaryScores;
  transcript: string;
  segments: WhisperSegment[];
  analysedAt: string; // ISO timestamp
};
