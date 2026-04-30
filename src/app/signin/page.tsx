import Link from "next/link";
import { TopNav } from "@/components/top-nav";

const providers = [
  { name: "Continue with Google", style: "bg-white text-black border border-black/15" },
  { name: "Continue with Apple", style: "bg-black text-white" },
  { name: "Continue with Email", style: "bg-[color:var(--highlight)] text-black" },
  { name: "Magic Link via Email", style: "bg-[color:var(--ink)] text-white" },
];

export default function SignInPage() {
  return (
    <div className="min-h-screen glass-page">
      <TopNav />
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-5 pb-16 pt-10 md:grid-cols-[1.2fr_1fr] md:px-8">
        <section className="glass-surface-strong rounded-3xl p-8 md:p-10">
          <p className="text-sm uppercase tracking-[0.16em] text-[color:var(--ink-soft)]">Account Access</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-[color:var(--ink)]">Sign in to start your next speaking sprint.</h1>
          <p className="mt-4 text-[color:var(--ink-soft)]">
            Auth is currently mocked in UI mode. In the next phase we will connect these actions to Supabase Auth.
          </p>
          <div className="mt-8 space-y-3">
            {providers.map((provider) => (
              <button
                key={provider.name}
                type="button"
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-medium transition hover:opacity-90 ${provider.style}`}
              >
                {provider.name}
              </button>
            ))}
          </div>
          <p className="mt-6 text-sm text-[color:var(--ink-soft)]">
            By continuing, you agree to terms, privacy, and recording consent for coaching analytics.
          </p>
        </section>

        <aside className="glass-surface rounded-3xl p-6">
          <h2 className="font-display text-3xl text-[color:var(--ink)]">What happens after sign in</h2>
          <ul className="mt-4 space-y-3 text-sm text-[color:var(--ink-soft)]">
            <li>1. Spin from a 1000-topic library.</li>
            <li>2. Choose your prep and speaking durations.</li>
            <li>3. Record uninterrupted delivery.</li>
            <li>4. Review transcript, score, and coaching tips.</li>
            <li>5. Track pace, clarity, and pronunciation trends.</li>
          </ul>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full bg-[color:var(--ink)] px-5 py-2 text-sm font-medium text-white shadow-[0_10px_22px_rgba(30,27,22,0.24)] transition hover:bg-black"
          >
            Continue to Dashboard Mock
          </Link>
        </aside>
      </main>
    </div>
  );
}
