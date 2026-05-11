"use server";

import { createClient } from "@/lib/supabase/server";
import type { AnalysisReport } from "@/lib/analysis/types";

export async function saveSession(
  topic: string,
  prepSeconds: number,
  speechSeconds: number,
  wordCount: number | null,
  wpm: number | null,
  audioPath: string | null,
  analysis: AnalysisReport | null = null,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const transcriptionStatus = analysis
    ? "ready"
    : audioPath
      ? "not_requested"
      : "not_requested";

  const { error } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: user.id,
      topic,
      prep_seconds: prepSeconds,
      speech_seconds: speechSeconds,
      word_count: wordCount,
      wpm: wpm ?? null,
      final_wpm: analysis?.summary.finalWpm ?? wpm ?? null,
      audio_url: audioPath,
      transcribed_text: analysis?.transcript ?? null,
      transcription_status: transcriptionStatus,
      analysis_json: analysis ?? null,
      completed_at: new Date().toISOString(),
    });

  if (error) return { error: error.message };
  return { error: null };
}

