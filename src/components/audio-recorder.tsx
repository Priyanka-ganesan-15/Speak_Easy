"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";

export type AudioRecorderHandle = {
  getAnalyserNode: () => AnalyserNode | null;
};

type AudioRecorderProps = {
  active: boolean;
  onAudioReady: (blob: Blob | null) => void;
  onError?: (message: string | null) => void;
};

export const AudioRecorder = forwardRef<AudioRecorderHandle, AudioRecorderProps>(
  function AudioRecorder({ active, onAudioReady, onError }, ref) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [status, setStatus] = useState<"idle" | "recording" | "stopping" | "unsupported">("idle");

  useImperativeHandle(ref, () => ({
    getAnalyserNode: () => analyserRef.current,
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("unsupported");
      onError?.("Audio recording is not supported in this browser.");
    }
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    async function startRecording() {
      if (!active) return;
      if (status === "unsupported") return;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") return;

      try {
        onError?.(null);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        chunksRef.current = [];

        // Set up Web Audio API for live analysis
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;

        const preferredMimeType = "audio/webm";
        const recorder = MediaRecorder.isTypeSupported(preferredMimeType)
          ? new MediaRecorder(stream, { mimeType: preferredMimeType })
          : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          const hasAudio = chunksRef.current.length > 0;
          const audioBlob = hasAudio
            ? new Blob(chunksRef.current, { type: recorder.mimeType || preferredMimeType })
            : null;
          onAudioReady(audioBlob);

          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          mediaRecorderRef.current = null;
          chunksRef.current = [];
          analyserRef.current = null;
          audioContextRef.current?.close();
          audioContextRef.current = null;
          setStatus("idle");
        };

        recorder.start();
        setStatus("recording");
      } catch {
        onError?.("Microphone permission was denied. Enable it to capture session audio.");
        setStatus("idle");
      }
    }

    function stopRecording() {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return;
      if (recorder.state === "inactive") return;

      setStatus("stopping");
      recorder.stop();
    }

    if (active) {
      void startRecording();
    } else {
      stopRecording();
    }

    return () => {
      cancelled = true;
    };
  }, [active, onAudioReady, onError, status]);

  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // no-op during teardown
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (status === "unsupported") {
    return (
      <div className="glass-chip rounded-full px-3 py-1 text-xs font-semibold text-amber-700">
        Recording unavailable
      </div>
    );
  }

  if (status === "recording") {
    return (
      <div className="glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-rose-700">
        <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
        Recording speech
      </div>
    );
  }

  if (status === "stopping") {
    return (
      <div className="glass-chip rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--ink-soft)]">
        Finalizing audio...
      </div>
    );
  }

  return null;
});
