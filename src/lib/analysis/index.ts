import type { DeliveryReport, ContentReport, SummaryScores, AnalysisReport, WhisperSegment } from "./types";
import { scoreDelivery } from "./delivery";
import { scoreContent } from "./content";

export function buildAnalysisReport(
  segments: WhisperSegment[],
  transcript: string,
  topic: string,
  speechSeconds: number,
  pcmData: Float32Array | null,
  sampleRate: number,
): AnalysisReport {
  const delivery = scoreDelivery(segments, speechSeconds, pcmData, sampleRate);
  const content = scoreContent(transcript, topic, speechSeconds);
  const summary = buildSummary(delivery, content);
  return {
    delivery,
    content,
    summary,
    transcript,
    segments,
    analysedAt: new Date().toISOString(),
  };
}

function buildSummary(delivery: DeliveryReport, content: ContentReport): SummaryScores {
  // Delivery sub-score (0–100)
  const wpmScore = delivery.wpmRating === "good" ? 35 : delivery.wpmRating === "slow" ? 20 : 25;
  const volumeScore = delivery.volumeRating === "dynamic" ? 20 : delivery.volumeRating === "moderate" ? 14 : 8;
  const pitchScore = delivery.pitchRating === "expressive" ? 15 : delivery.pitchRating === "moderate" ? 10 : 5;
  const fillerDeliveryPenalty = Math.min(delivery.fillerSoundsPerMin * 3, 15);
  const pausePenalty = Math.min(delivery.pauseCount * 1.5, 15);
  const deliveryScore = Math.round(
    Math.max(0, Math.min(100, wpmScore + volumeScore + pitchScore - fillerDeliveryPenalty - pausePenalty + 25)),
  );

  // Content sub-score (0–100)
  const contentScore = Math.round(
    (content.clarityScore * 0.5) +
    (content.topicRelevanceScore * 0.3) +
    (content.uniqueWordRatio * 20),
  );

  const overall = Math.round(deliveryScore * 0.5 + contentScore * 0.5);

  return {
    overall: Math.max(0, Math.min(100, overall)),
    delivery: Math.max(0, Math.min(100, deliveryScore)),
    content: Math.max(0, Math.min(100, contentScore)),
    finalWpm: delivery.wpm,
  };
}

export { scoreDelivery, scoreContent };
export type { AnalysisReport, DeliveryReport, ContentReport, SummaryScores, WhisperSegment };
