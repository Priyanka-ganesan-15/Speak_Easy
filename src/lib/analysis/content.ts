import nlp from "compromise";
import type { FillerHit, ContentReport } from "./types";

const FILLER_WORDS = [
  "um", "uh", "like", "you know", "kind of", "sort of",
  "basically", "literally", "actually", "honestly", "right",
  "so", "well", "okay", "i mean",
];

function detectFillerWords(text: string, speechSeconds: number): {
  hits: FillerHit[];
  perMin: number;
} {
  const lower = text.toLowerCase();
  const counts = new Map<string, number>();

  // Multi-word phrases first
  for (const phrase of FILLER_WORDS) {
    const re = new RegExp(`\\b${phrase.replace(/\s+/g, "\\s+")}\\b`, "gi");
    const matches = lower.match(re);
    if (matches && matches.length > 0) {
      counts.set(phrase, matches.length);
    }
  }

  const hits = Array.from(counts.entries())
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count);

  const totalFillers = hits.reduce((a, b) => a + b.count, 0);
  const perMin =
    speechSeconds > 0
      ? Math.round((totalFillers / speechSeconds) * 60 * 10) / 10
      : 0;

  return { hits, perMin };
}

function topicRelevanceScore(text: string, topic: string): number {
  const topicWords = topic
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3); // ignore short stop words

  if (topicWords.length === 0) return 50;

  const textWords = new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter(Boolean),
  );

  const matched = topicWords.filter((w) => textWords.has(w)).length;
  // Bonus: if any topic word appears multiple times, weight higher
  const score = Math.round((matched / topicWords.length) * 100);
  // Floor at 10 if transcript exists, to avoid falsely penalising paraphrase
  return Math.max(Math.min(score, 100), text.length > 50 ? 10 : 0);
}

export function scoreContent(
  transcript: string,
  topic: string,
  speechSeconds: number,
): ContentReport {
  const words = transcript
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const wordCount = words.length;

  // Type-token ratio (unique / total)
  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")));
  const uniqueWordRatio =
    wordCount > 0
      ? Math.round((uniqueWords.size / wordCount) * 100) / 100
      : 0;

  // NLP sentence analysis via compromise
  const doc = nlp(transcript);
  const sentences = doc.sentences().out("array") as string[];
  const sentenceLengths = sentences.map(
    (s: string) => s.trim().split(/\s+/).filter(Boolean).length,
  );
  const avgSentenceLength =
    sentenceLengths.length > 0
      ? Math.round(
          sentenceLengths.reduce((a: number, b: number) => a + b, 0) /
            sentenceLengths.length,
        )
      : 0;

  const sentenceLengthRating =
    avgSentenceLength < 8
      ? "choppy"
      : avgSentenceLength > 20
        ? "long"
        : "good";

  const topicScore = topicRelevanceScore(transcript, topic);

  const { hits: fillerWords, perMin: fillerWordsPerMin } = detectFillerWords(
    transcript,
    speechSeconds,
  );

  // Clarity score: penalise fillers, reward vocabulary richness and good sentence length
  const fillerPenalty = Math.min(fillerWordsPerMin * 4, 40);
  const vocabBonus = Math.round(uniqueWordRatio * 30);
  const sentenceBonus = sentenceLengthRating === "good" ? 20 : 10;
  const clarityScore = Math.max(
    0,
    Math.min(100, 50 + vocabBonus + sentenceBonus - fillerPenalty),
  );

  return {
    wordCount,
    uniqueWordRatio,
    avgSentenceLength,
    sentenceLengthRating,
    topicRelevanceScore: topicScore,
    fillerWords,
    fillerWordsPerMin,
    clarityScore,
  };
}
