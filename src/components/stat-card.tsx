type StatCardProps = {
  label: string;
  value: string;
  delta: string;
};

export function StatCard({ label, value, delta }: StatCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-black/10 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf0_100%)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_rgba(0,0,0,0.12)]">
      <div className="absolute inset-x-5 top-0 h-1 rounded-b-full bg-[linear-gradient(90deg,#ffbf47,#fb8500)] opacity-80" />
      <p className="text-sm text-[color:var(--ink-soft)]">{label}</p>
      <p className="mt-3 font-display text-3xl text-[color:var(--ink)]">{value}</p>
      <p className="mt-2 text-sm font-medium text-emerald-700">{delta}</p>
    </article>
  );
}
