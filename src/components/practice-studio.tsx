"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SessionTimer } from "@/components/session-timer";
import { TopicWheel } from "@/components/topic-wheel";
import { AudioRecorder, type AudioRecorderHandle } from "@/components/audio-recorder";
import { LiveFeedback } from "@/components/live-feedback";
import { saveSession } from "@/app/practice/actions";
import { buildAnalysisReport } from "@/lib/analysis";
import type { AnalysisReport } from "@/lib/analysis/types";
import type { Topic } from "@/lib/mock-data";

type Props = {
  topics: Topic[];
};

type TranscribeWorkerMessage =
  | { type: "progress"; stage: string; percent: number }
  | { type: "result"; transcript: string; segments: { start: number; end: number; text: string }[]; pcmData: ArrayBuffer; sampleRate: number }
  | { type: "error"; message: string };

export function PracticeStudio({ topics }: Props) {
  const supabase = createClient();
  const selectedTopicRef = useRef<Topic>(topics[0]);
  const prepSecondsRef = useRef(3 * 60);
  const recorderRef = useRef<AudioRecorderHandle>(null);

  // Timer / recording
  const [timerPhase, setTimerPhase] = useState<"idle" | "prep" | "speech" | "completed">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Analysis / modal
  const [modal, setModal] = useState<{ speechSeconds: number } | null>(null);
  const [wordCount, setWordCount] = useState("");
  const [analysisStage, setAnalysisStage] = useState<string | null>(null);
  const [analysisPercent, setAnalysisPercent] = useState(0);
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "delivery" | "content">("overview");

  // Save
  const [saving, setSaving] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleTopicChange(topic: Topic) {
    selectedTopicRef.current = topic;
  }

  function handleSessionComplete(speechSeconds: number) {
    // Defer all state updates out of SessionTimer's interval tick so React 19
    // doesn't flag this as setState-during-render of another component.
    setTimeout(() => {
      setWordCount("");
      setSaveError(null);
      setSaved(false);
      setAnalysis(null);
      setActiveTab("overview");
      // Clear any stale blob from a prior session so the useEffect waits
      // for the fresh recorder.onstop before triggering analysis.
      setAudioBlob(null);
      setModal({ speechSeconds });
    }, 0);
  }

  // Trigger analysis when both modal and audioBlob are available.
  // audioBlob arrives async (recorder.onstop) so we can't read it in the
  // handleSessionComplete closure — watch them together here instead.
  const analysisStartedRef = useRef(false);
  useEffect(() => {
    if (!modal || !audioBlob || analysisStartedRef.current) return;
    analysisStartedRef.current = true;
    void runAnalysis(audioBlob, modal.speechSeconds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, audioBlob]);

  // Reset the guard when a new session starts.
  useEffect(() => {
    if (!modal) analysisStartedRef.current = false;
  }, [modal]);

  async function runAnalysis(blob: Blob, speechSeconds: number) {
    setAnalysisStage("Preparing audio…");
    setAnalysisPercent(2);
    try {
      // Decode compressed audio (webm/opus) → raw PCM, resampled to 16 kHz mono.
      // Must happen on the main thread — AudioContext is not available in workers.
      const rawBuffer = await blob.arrayBuffer();
      const decodeCtx = new AudioContext();
      let decoded: AudioBuffer;
      try {
        decoded = await decodeCtx.decodeAudioData(rawBuffer);
      } finally {
        decodeCtx.close();
      }
      const TARGET_SR = 16000;
      const offlineCtx = new OfflineAudioContext(
        1,
        Math.ceil(decoded.duration * TARGET_SR),
        TARGET_SR,
      );
      const src = offlineCtx.createBufferSource();
      src.buffer = decoded;
      src.connect(offlineCtx.destination);
      src.start();
      const rendered = await offlineCtx.startRendering();
      const pcm = rendered.getChannelData(0); // Float32Array, 16 kHz mono

      setAnalysisStage("Loading speech model…");
      setAnalysisPercent(10);

      const worker = new Worker(
        new URL("../workers/transcribe.worker.ts", import.meta.url),
        { type: "module" },
      );
      // Transfer the PCM buffer to the worker (zero-copy).
      const pcmBuffer = pcm.buffer.slice(0) as ArrayBuffer;
      await new Promise<void>((resolve, reject) => {
        worker.onmessage = (e: MessageEvent<TranscribeWorkerMessage>) => {
          const msg = e.data;
          if (msg.type === "progress") {
            setAnalysisStage(msg.stage);
            setAnalysisPercent(msg.percent);
          } else if (msg.type === "result") {
            const pcmData = new Float32Array(msg.pcmData);
            const report = buildAnalysisReport(
              msg.segments,
              msg.transcript,
              selectedTopicRef.current.title,
              speechSeconds,
              pcmData,
              msg.sampleRate,
            );
            setAnalysis(report);
            setAnalysisStage(null);
            setAnalysisPercent(100);
            worker.terminate();
            resolve();
          } else if (msg.type === "error") {
            setAnalysisStage(null);
            worker.terminate();
            reject(new Error(msg.message));
          }
        };
        worker.onerror = (err) => { worker.terminate(); reject(err); };
        worker.postMessage(
          { type: "transcribe", audioBuffer: pcmBuffer, sampleRate: TARGET_SR },
          [pcmBuffer],
        );
      });
    } catch (err) {
      setAnalysisStage(null);
      console.error("Analysis failed:", err);
    }
  }

  async function uploadAudioIfAvailable() {
    if (!audioBlob) return { error: null as string | null, path: null as string | null };
    setUploadingAudio(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setUploadingAudio(false);
      return { error: "Not authenticated", path: null };
    }
    const contentType = audioBlob.type || "audio/webm";
    const ext = contentType.includes("wav") ? "wav" : contentType.includes("mp4") ? "mp4" : contentType.includes("mpeg") ? "mp3" : "webm";
    const fileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const file = new File([audioBlob], `session-audio.${ext}`, { type: contentType });
    const { error: uploadError } = await supabase.storage
      .from("session-audio")
      .upload(fileName, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    setUploadingAudio(false);
    if (uploadError) return { error: uploadError.message, path: null };
    return { error: null, path: fileName };
  }

  async function handleSave() {
    if (!modal) return;
    setSaving(true);
    setSaveError(null);

    const derivedWordCount = analysis?.content.wordCount ?? null;
    const manualWordCount = wordCount.trim() !== "" ? Number(wordCount) : null;
    const finalWordCount = derivedWordCount ?? manualWordCount;
    const finalWpm = analysis?.summary.finalWpm
      ?? (manualWordCount && modal.speechSeconds > 0
        ? Math.round((manualWordCount / modal.speechSeconds) * 60)
        : null);

    const audioUpload = await uploadAudioIfAvailable();
    if (audioUpload.error) {
      setSaving(false);
      setSaveError(audioUpload.error);
      return;
    }

    const { error } = await saveSession(
      selectedTopicRef.current.title,
      prepSecondsRef.current,
      modal.speechSeconds,
      finalWordCount,
      finalWpm,
      audioUpload.path,
      analysis,
    );

    setSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      setSaved(true);
      setAudioBlob(null);
      setTimeout(() => setModal(null), 1400);
    }
  }

  function handleSkip() {
    setAudioBlob(null);
    setModal(null);
  }

  const analyserNode = recorderRef.current?.getAnalyserNode() ?? null;

  return (
    <>
      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <TopicWheel topics={topics} onTopicChange={handleTopicChange} />
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <AudioRecorder
              ref={recorderRef}
              active={timerPhase === "speech"}
              onAudioReady={setAudioBlob}
              onError={setAudioError}
            />
            {audioBlob && timerPhase !== "speech" && (
              <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold text-emerald-700">
                Audio captured
              </span>
            )}
          </div>
          {audioError && (
            <p className="text-xs text-amber-700">{audioError}</p>
          )}
          <SessionTimer
            onComplete={handleSessionComplete}
            onPhaseChange={setTimerPhase}
            onDurationsChange={(prepSeconds) => {
              prepSecondsRef.current = prepSeconds;
            }}
          />
          {timerPhase === "speech" && (
            <LiveFeedback analyserNode={analyserNode} active={true} />
          )}
        </div>
      </div>

      {/* ── post-session modal ─────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="glass-surface w-full max-w-lg rounded-3xl p-8 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">Session complete</p>
            <h2 className="mt-2 font-display text-3xl text-[color:var(--ink)]">Nice work!</h2>
            <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
              <strong>{Math.floor(modal.speechSeconds / 60)}m {modal.speechSeconds % 60}s</strong> on{" "}
              <strong className="text-[color:var(--ink)]">{selectedTopicRef.current.title}</strong>
            </p>

            {/* Analysis progress */}
            {analysisStage && (
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-[color:var(--ink-soft)]">
                  <span>{analysisStage}</span>
                  <span>{analysisPercent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[color:var(--highlight)] transition-all duration-300"
                    style={{ width: `${analysisPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Feedback tabs */}
            {analysis && (
              <div className="mt-5">
                <div className="flex gap-1 rounded-xl bg-white/30 p-1 text-xs font-medium">
                  {(["overview", "delivery", "content"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 rounded-lg px-3 py-1.5 capitalize transition ${activeTab === tab ? "bg-white shadow text-[color:var(--ink)]" : "text-[color:var(--ink-soft)] hover:text-[color:var(--ink)]"}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  {activeTab === "overview" && <OverviewTab analysis={analysis} />}
                  {activeTab === "delivery" && <DeliveryTab delivery={analysis.delivery} />}
                  {activeTab === "content" && <ContentTab content={analysis.content} transcript={analysis.transcript} />}
                </div>
              </div>
            )}

            {/* Manual word count fallback — only show when no audio was captured */}
            {!analysis && !analysisStage && !audioBlob && (
              <div className="mt-5 grid gap-1.5">
                <label className="text-sm font-medium text-[color:var(--ink)]">
                  How many words did you speak? <span className="text-[color:var(--ink-soft)]">(optional)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={wordCount}
                  onChange={(e) => setWordCount(e.target.value)}
                  placeholder="e.g. 420"
                  className="w-full rounded-xl border border-white/55 bg-white/55 px-4 py-2.5 text-sm text-[color:var(--ink)] outline-none ring-[color:var(--highlight)] backdrop-blur-sm transition placeholder:text-[color:var(--ink-soft)]/60 focus:ring-2"
                />
              </div>
            )}

            {saveError && (
              <p className="mt-3 text-sm text-rose-600">{saveError}</p>
            )}
            {uploadingAudio && (
              <p className="mt-3 text-sm text-[color:var(--ink-soft)]">Uploading audio…</p>
            )}

            <div className="mt-6 flex gap-3">
              {saved ? (
                <span className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                  <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Saved to history
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !!analysisStage}
                    className="rounded-full bg-[color:var(--ink)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving…" : analysisStage ? "Analysing…" : "Save session"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="glass-chip rounded-full px-5 py-2.5 text-sm font-medium text-[color:var(--ink-soft)] transition hover:bg-white/80"
                  >
                    Skip
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Feedback sub-components ────────────────────────────────────────────── */

function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color =
    score >= 75 ? "text-emerald-700 bg-emerald-100" :
    score >= 50 ? "text-amber-700 bg-amber-100" :
    "text-rose-700 bg-rose-100";
  const cls = size === "lg" ? "text-3xl font-bold px-4 py-2" : size === "sm" ? "text-xs px-2 py-0.5" : "text-sm font-semibold px-3 py-1";
  return <span className={`rounded-full ${color} ${cls}`}>{score}/100</span>;
}

function OverviewTab({ analysis }: { analysis: AnalysisReport }) {
  const { summary, delivery } = analysis;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-[color:var(--ink-soft)]">Overall score</p>
          <ScoreBadge score={summary.overall} size="lg" />
        </div>
        <div className="grid gap-2 text-right text-xs">
          <div><span className="text-[color:var(--ink-soft)]">Delivery </span><ScoreBadge score={summary.delivery} size="sm" /></div>
          <div><span className="text-[color:var(--ink-soft)]">Content </span><ScoreBadge score={summary.content} size="sm" /></div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <StatPill label="WPM" value={String(summary.finalWpm)} sub={delivery.wpmRating} />
        <StatPill label="Pauses" value={String(delivery.pauseCount)} sub={`${delivery.totalSilenceSeconds}s silent`} />
        <StatPill label="Fillers/min" value={String(Math.round((delivery.fillerSoundsPerMin + analysis.content.fillerWordsPerMin) * 10) / 10)} sub="sounds + words" />
      </div>
    </div>
  );
}

function DeliveryTab({ delivery }: { delivery: AnalysisReport["delivery"] }) {
  return (
    <div className="space-y-3 text-sm">
      <FeedbackRow label="Pace" value={`${delivery.wpm} WPM`} rating={delivery.wpmRating === "good" ? "good" : "warn"} note={delivery.wpmRating === "slow" ? "Try speaking faster" : delivery.wpmRating === "fast" ? "Slow down a little" : "Great pace!"} />
      <FeedbackRow label="Volume variation" value={`${Math.round(delivery.volumeVariation * 100)}%`} rating={delivery.volumeRating === "dynamic" ? "good" : delivery.volumeRating === "moderate" ? "ok" : "warn"} note={delivery.volumeRating === "monotone" ? "Add energy — vary your volume" : delivery.volumeRating === "moderate" ? "Good, push a bit more" : "Excellent dynamic range"} />
      <FeedbackRow label="Pitch variation" value={`${Math.round(delivery.pitchVariation * 100)}%`} rating={delivery.pitchRating === "expressive" ? "good" : delivery.pitchRating === "moderate" ? "ok" : "warn"} note={delivery.pitchRating === "flat" ? "Monotone delivery — vary your pitch" : delivery.pitchRating === "moderate" ? "Good — try more inflection" : "Very expressive!"} />
      <FeedbackRow label="Pauses" value={`${delivery.pauseCount} long pauses`} rating={delivery.pauseCount > 5 ? "warn" : "good"} note={`${delivery.totalSilenceSeconds}s total silence`} />
      {delivery.fillerSounds.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs">
          <p className="font-medium text-amber-800">Filler sounds: {delivery.fillerSoundsPerMin}/min</p>
          <p className="mt-0.5 text-amber-700">{delivery.fillerSounds.map(f => `"${f.phrase}" ×${f.count}`).join(" · ")}</p>
        </div>
      )}
    </div>
  );
}

function ContentTab({ content, transcript }: { content: AnalysisReport["content"]; transcript: string }) {
  return (
    <div className="space-y-3 text-sm">
      <FeedbackRow label="Clarity" value={`${content.clarityScore}/100`} rating={content.clarityScore >= 70 ? "good" : content.clarityScore >= 45 ? "ok" : "warn"} note="" />
      <FeedbackRow label="Topic relevance" value={`${content.topicRelevanceScore}%`} rating={content.topicRelevanceScore >= 60 ? "good" : content.topicRelevanceScore >= 30 ? "ok" : "warn"} note={content.topicRelevanceScore < 30 ? "Try staying closer to the topic" : ""} />
      <FeedbackRow label="Vocabulary" value={`${Math.round(content.uniqueWordRatio * 100)}% unique`} rating={content.uniqueWordRatio > 0.6 ? "good" : content.uniqueWordRatio > 0.4 ? "ok" : "warn"} note={content.uniqueWordRatio < 0.4 ? "Many repeated words — vary your vocabulary" : ""} />
      <FeedbackRow label="Sentence length" value={`~${content.avgSentenceLength} words avg`} rating={content.sentenceLengthRating === "good" ? "good" : "ok"} note={content.sentenceLengthRating === "choppy" ? "Short sentences — elaborate more" : content.sentenceLengthRating === "long" ? "Long sentences — break them up" : "Good sentence structure"} />
      {content.fillerWords.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs">
          <p className="font-medium text-amber-800">Filler words: {content.fillerWordsPerMin}/min</p>
          <p className="mt-0.5 text-amber-700">{content.fillerWords.slice(0, 5).map(f => `"${f.phrase}" ×${f.count}`).join(" · ")}</p>
        </div>
      )}
      {transcript && (
        <details className="rounded-xl bg-white/40 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-[color:var(--ink)]">Transcript</summary>
          <p className="mt-2 leading-relaxed text-[color:var(--ink-soft)]">{transcript}</p>
        </details>
      )}
    </div>
  );
}

function FeedbackRow({ label, value, rating, note }: { label: string; value: string; rating: "good" | "ok" | "warn"; note: string }) {
  const dot = rating === "good" ? "bg-emerald-400" : rating === "ok" ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div className="flex-1">
        <span className="font-medium text-[color:var(--ink)]">{label}</span>
        <span className="ml-2 text-[color:var(--ink-soft)]">{value}</span>
        {note && <p className="text-xs text-[color:var(--ink-soft)]">{note}</p>}
      </div>
    </div>
  );
}

function StatPill({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-white/40 px-2 py-2">
      <p className="text-[color:var(--ink-soft)]">{label}</p>
      <p className="font-bold text-[color:var(--ink)]">{value}</p>
      <p className="text-[color:var(--ink-soft)]">{sub}</p>
    </div>
  );
}
