/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Transcription Web Worker
 * Loads Whisper tiny.en via @huggingface/transformers (WASM/ONNX),
 * accepts an ArrayBuffer of audio data, returns segments + transcript.
 *
 * Messages in:
 *   { type: "transcribe", audioBuffer: ArrayBuffer, sampleRate: number }
 *
 * Messages out:
 *   { type: "progress", stage: string, percent: number }
 *   { type: "result", transcript: string, segments: WhisperSegment[], pcmData: Float32Array, sampleRate: number }
 *   { type: "error", message: string }
 */

import { pipeline, env } from "@huggingface/transformers";

// Use WASM backend (no CUDA/GPU required) and cache models in browser
(env as any).allowLocalModels = false;
(env as any).useBrowserCache = true;

type WhisperSegment = { start: number; end: number; text: string };

let asr: any = null;

async function getModel() {
  if (asr) return asr;
  self.postMessage({ type: "progress", stage: "Loading speech model…", percent: 5 });
  asr = await pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-tiny.en",
    {
      // fp32 avoids the 4-bit NBits quantization incompatibility with the
      // WASM ONNX runtime bundled in @huggingface/transformers.
      dtype: "fp32",
      progress_callback: (info: any) => {
        if (info.status === "progress" && info.total) {
          const pct = Math.round((info.loaded / info.total) * 40) + 5;
          self.postMessage({ type: "progress", stage: "Downloading model…", percent: pct });
        }
      },
    },
  );
  return asr;
}

self.addEventListener("message", async (event: MessageEvent) => {
  const { type, audioBuffer, sampleRate } = event.data as {
    type: string;
    audioBuffer: ArrayBuffer;
    sampleRate: number;
  };

  if (type !== "transcribe") return;

  try {
    const model = await getModel();
    self.postMessage({ type: "progress", stage: "Transcribing audio…", percent: 50 });

    // Convert ArrayBuffer to Float32Array (raw PCM)
    const pcmData = new Float32Array(audioBuffer);

    const result = await model(pcmData, {
      // Don't pass language/task for English-only models — they reject it.
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
      sampling_rate: sampleRate,
    });

    self.postMessage({ type: "progress", stage: "Processing results…", percent: 90 });

    const transcript: string =
      typeof result.text === "string" ? result.text.trim() : "";

    const segments: WhisperSegment[] = Array.isArray(result.chunks)
      ? (result.chunks as any[]).map((c) => ({
          start: c.timestamp?.[0] ?? 0,
          end: c.timestamp?.[1] ?? 0,
          text: c.text ?? "",
        }))
      : [{ start: 0, end: pcmData.length / sampleRate, text: transcript }];

    self.postMessage({
      type: "result",
      transcript,
      segments,
      // Transfer pcmData back for delivery analysis (pitch/volume)
      pcmData: pcmData.buffer,
      sampleRate,
    }, { transfer: [pcmData.buffer] });
  } catch (err: any) {
    self.postMessage({ type: "error", message: err?.message ?? "Transcription failed" });
  }
});
