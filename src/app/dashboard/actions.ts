"use server";

// Transcription retry is no longer needed — analysis now runs client-side.
// This file is kept as a placeholder for future server-side dashboard actions.

export async function retryTranscription(_formData: FormData): Promise<void> {
  // No-op: analysis pipeline is browser-based. Sessions analysed going forward
  // will have analysis_json populated client-side before save.
}
