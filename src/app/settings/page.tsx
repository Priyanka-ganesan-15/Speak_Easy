"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { createClient } from "@/lib/supabase/client";

// ─── tiny reusable primitives ─────────────────────────────────────────────────

function SectionCard({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-surface rounded-3xl p-6 md:p-8">
      <div className="mb-6 border-b border-white/35 pb-5">
        <h2 className="font-display text-xl text-[color:var(--ink)]">{title}</h2>
        {description && <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-[color:var(--ink)]">{label}</label>
      {children}
      {hint && <p className="text-xs text-[color:var(--ink-soft)]">{hint}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-white/55 bg-white/55 px-4 py-2.5 text-sm text-[color:var(--ink)] outline-none ring-[color:var(--highlight)] backdrop-blur-sm transition placeholder:text-[color:var(--ink-soft)]/60 focus:ring-2 disabled:cursor-not-allowed disabled:bg-white/35 disabled:text-[color:var(--ink-soft)]"
    />
  );
}

function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span className="text-sm text-[color:var(--ink)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-none cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--highlight)] ${
          enabled ? "bg-[color:var(--ink)]" : "bg-black/20"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

function SaveButton({ onClick, saved }: { onClick: () => void; saved: boolean }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onClick}
        className="rounded-full bg-[color:var(--ink)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.14)] transition-all hover:bg-black active:scale-95"
      >
        Save changes
      </button>
      {saved && (
        <span className="flex items-center gap-1.5 text-sm text-emerald-600">
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Saved
        </span>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();

  // Lazy-initialize the Supabase client — only in the browser to avoid SSR init
  const getSupabase = () => createClient();

  // Profile
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail]             = useState("");
  const [bio, setBio]                 = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  // Goals
  const [goalWpm, setGoalWpm]           = useState("140");
  const [goalSessions, setGoalSessions] = useState("3");
  const [goalMinutes, setGoalMinutes]   = useState("10");
  const [goalSaved, setGoalSaved]       = useState(false);

  // Notifications
  const [emailDigest, setEmailDigest]         = useState(true);
  const [sessionReminder, setSessionReminder] = useState(true);
  const [milestones, setMilestones]           = useState(true);
  const [notifSaved, setNotifSaved]           = useState(false);

  // Privacy
  const [publicProfile, setPublicProfile] = useState(false);
  const [shareProgress, setShareProgress] = useState(false);
  const [privacySaved, setPrivacySaved]   = useState(false);

  const [userId, setUserId] = useState<string | null>(null);

  // ── load data on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (profile) setDisplayName(profile.display_name ?? "");

      const { data: goals } = await supabase
        .from("user_goals")
        .select("target_wpm, sessions_per_week, minutes_per_session")
        .eq("user_id", user.id)
        .single();
      if (goals) {
        setGoalWpm(String(goals.target_wpm));
        setGoalSessions(String(goals.sessions_per_week));
        setGoalMinutes(String(goals.minutes_per_session));
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function flash(setSaved: (v: boolean) => void) {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function saveProfile() {
    if (!userId) return;
    const supabase = getSupabase();
    await supabase
      .from("profiles")
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq("id", userId);
    flash(setProfileSaved);
  }

  async function saveGoals() {
    if (!userId) return;
    const supabase = getSupabase();
    await supabase.from("user_goals").upsert({
      user_id: userId,
      target_wpm: Number(goalWpm) || 140,
      sessions_per_week: Number(goalSessions) || 3,
      minutes_per_session: Number(goalMinutes) || 10,
      updated_at: new Date().toISOString(),
    });
    flash(setGoalSaved);
  }

  async function handleSignOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen glass-page">
      <TopNav />

      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-10 md:px-8">

        {/* ── page header ───────────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">Account</p>
          <h1 className="mt-2 font-display text-4xl text-[color:var(--ink)]">Settings</h1>
        </div>

        <div className="flex flex-col gap-6">

          {/* ── profile ───────────────────────────────────────────────── */}
          <SectionCard title="Profile" description="How you appear across Speak Easy.">
            {/* Avatar */}
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--ink)] text-2xl font-bold text-[color:var(--highlight)]">
                {displayName.charAt(0) || "?"}
              </div>
              <div>
                <button
                  type="button"
                  className="rounded-full border border-black/20 px-4 py-1.5 text-xs font-medium text-[color:var(--ink)] transition hover:bg-black/5"
                >
                  Upload photo
                </button>
                <p className="mt-1 text-xs text-[color:var(--ink-soft)]">JPG or PNG, max 2 MB</p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Display name">
                <TextInput value={displayName} onChange={setDisplayName} placeholder="Your name" />
              </Field>
              <Field label="Email" hint="Managed by your sign-in provider.">
                <TextInput value={email} onChange={() => {}} disabled />
              </Field>
              <Field label="Bio" hint="Short tagline shown on your profile.">
                <TextInput value={bio} onChange={setBio} placeholder="e.g. TEDx speaker in training" />
              </Field>
            </div>

            <div className="mt-6">
              <SaveButton onClick={saveProfile} saved={profileSaved} />
            </div>
          </SectionCard>

          {/* ── practice goals ────────────────────────────────────────── */}
          <SectionCard title="Practice Goals" description="Weekly targets used to compute your progress rings.">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Target WPM" hint="Words per minute aim.">
                <TextInput value={goalWpm} onChange={setGoalWpm} type="number" placeholder="140" />
              </Field>
              <Field label="Sessions / week" hint="Minimum practice sessions.">
                <TextInput value={goalSessions} onChange={setGoalSessions} type="number" placeholder="3" />
              </Field>
              <Field label="Minutes / session" hint="Minimum session length.">
                <TextInput value={goalMinutes} onChange={setGoalMinutes} type="number" placeholder="10" />
              </Field>
            </div>
            <div className="mt-6">
              <SaveButton onClick={saveGoals} saved={goalSaved} />
            </div>
          </SectionCard>

          {/* ── notifications ─────────────────────────────────────────── */}
          <SectionCard title="Notifications" description="Choose what Speak Easy sends you.">
            <div className="flex flex-col gap-4">
              <Toggle enabled={emailDigest}     onChange={setEmailDigest}     label="Weekly progress digest email" />
              <Toggle enabled={sessionReminder} onChange={setSessionReminder} label="Daily practice reminder" />
              <Toggle enabled={milestones}      onChange={setMilestones}      label="Milestone and achievement alerts" />
            </div>
            <div className="mt-6">
              <SaveButton onClick={() => flash(setNotifSaved)} saved={notifSaved} />
            </div>
          </SectionCard>

          {/* ── privacy ───────────────────────────────────────────────── */}
          <SectionCard title="Privacy" description="Control who can see your activity.">
            <div className="flex flex-col gap-4">
              <Toggle enabled={publicProfile}  onChange={setPublicProfile}  label="Public profile page" />
              <Toggle enabled={shareProgress}  onChange={setShareProgress}  label="Share progress with coaches" />
            </div>
            <div className="mt-6">
              <SaveButton onClick={() => flash(setPrivacySaved)} saved={privacySaved} />
            </div>
          </SectionCard>

          {/* ── danger zone ───────────────────────────────────────────── */}
          <SectionCard title="Danger Zone">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[color:var(--ink)]">Delete account</p>
                <p className="mt-0.5 text-xs text-[color:var(--ink-soft)]">
                  Permanently removes your profile, sessions, and all data.
                </p>
              </div>
              <button
                type="button"
                className="flex-none rounded-full border border-rose-300 px-5 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 active:scale-95"
              >
                Delete account
              </button>
            </div>
            <div className="mt-5 flex flex-col gap-4 border-t border-black/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[color:var(--ink)]">Sign out everywhere</p>
                <p className="mt-0.5 text-xs text-[color:var(--ink-soft)]">
                  Revokes all active sessions on every device.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex-none rounded-full border border-black/20 px-5 py-2 text-center text-sm font-semibold text-[color:var(--ink)] transition hover:bg-black/5 active:scale-95"
              >
                Sign out
              </button>
            </div>
          </SectionCard>

        </div>
      </main>
    </div>
  );
}
