// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SessionRow = {
  id: string;
  user_id: string;
  audio_url: string | null;
  speech_seconds: number | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function markFailed(
  admin: ReturnType<typeof createClient>,
  sessionId: string,
  message: string,
) {
  await admin
    .from("practice_sessions")
    .update({
      transcription_status: "failed",
      transcription_error: message,
    })
    .eq("id", sessionId);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Missing Supabase environment variables" }, 500);
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization token" }, 401);
  }

  const token = authHeader.slice("Bearer ".length);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);

  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const payload = await request.json().catch(() => ({}));
  const sessionId = typeof payload?.sessionId === "string" ? payload.sessionId : null;
  console.log("[transcribe] sessionId:", sessionId, "userId:", user.id);
  if (!sessionId) {
    return json({ error: "Missing sessionId" }, 400);
  }

  const { data: session, error: sessionError } = await admin
    .from("practice_sessions")
    .select("id, user_id, audio_url, speech_seconds")
    .eq("id", sessionId)
    .single<SessionRow>();

  console.log("[transcribe] session:", session, "sessionError:", sessionError?.message);

  if (sessionError || !session) {
    return json({ error: "Session not found" }, 404);
  }

  if (session.user_id !== user.id) {
    return json({ error: "Forbidden" }, 403);
  }

  if (!session.audio_url) {
    console.log("[transcribe] no audio_url on session");
    await markFailed(admin, session.id, "No audio file available for transcription.");
    return json({ error: "No audio file available" }, 400);
  }

  await admin
    .from("practice_sessions")
    .update({ transcription_status: "pending", transcription_error: null })
    .eq("id", session.id);

  if (!openAiKey) {
    await markFailed(admin, session.id, "OPENAI_API_KEY is not configured.");
    return json({ error: "Transcription provider not configured" }, 500);
  }

  const { data: audioBlob, error: downloadError } = await admin.storage
    .from("session-audio")
    .download(session.audio_url);

  console.log("[transcribe] download error:", downloadError?.message, "blob size:", (audioBlob as Blob | null)?.size);

  if (downloadError || !audioBlob) {
    const message = downloadError?.message ?? "Could not download audio file.";
    await markFailed(admin, session.id, message);
    return json({ error: message }, 500);
  }

  const transcriptionForm = new FormData();
  transcriptionForm.append("model", "whisper-1");
  transcriptionForm.append("response_format", "json");
  transcriptionForm.append("file", audioBlob, "session-audio.webm");

  const openAiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
    },
    body: transcriptionForm,
  });

  if (!openAiResponse.ok) {
    const providerError = await openAiResponse.text();
    console.log("[transcribe] openai error:", openAiResponse.status, providerError);
    let message = `Transcription provider error: ${providerError}`;
    try {
      const parsed = JSON.parse(providerError) as {
        error?: { code?: string; message?: string; type?: string };
      };
      const providerCode = parsed?.error?.code;
      if (openAiResponse.status === 429 && providerCode === "insufficient_quota") {
        message = "OpenAI quota exceeded. Add billing/credits to your OpenAI account, then retry transcription.";
      }
    } catch {
      // Keep raw provider error text when the response is not JSON.
    }
    await markFailed(admin, session.id, message);
    return json({ error: message }, 500);
  }

  const transcriptionData = await openAiResponse.json();
  const transcript = typeof transcriptionData?.text === "string" ? transcriptionData.text.trim() : "";

  const wordCount = transcript.length > 0 ? transcript.split(/\s+/).filter(Boolean).length : 0;
  const speechSeconds = session.speech_seconds ?? 0;
  const finalWpm = speechSeconds > 0 && wordCount > 0
    ? Number(((wordCount / speechSeconds) * 60).toFixed(2))
    : null;

  const { error: updateError } = await admin
    .from("practice_sessions")
    .update({
      transcribed_text: transcript || null,
      final_wpm: finalWpm,
      transcription_status: "ready",
      transcription_error: null,
    })
    .eq("id", session.id);

  if (updateError) {
    await markFailed(admin, session.id, updateError.message);
    return json({ error: updateError.message }, 500);
  }

  return json({
    success: true,
    sessionId: session.id,
    transcriptLength: transcript.length,
    finalWpm,
  });
});
