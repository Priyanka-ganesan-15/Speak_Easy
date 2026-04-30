type StatCardProps = {
  label: string;
  value: string;
  delta: string;
};

export function StatCard({ label, value, delta }: StatCardProps) {
  return (
    <article className="glass-surface group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1">
      <div className="absolute inset-x-5 top-0 h-1 rounded-b-full bg-[linear-gradient(90deg,#67e8f9,#f9a8d4)] opacity-80" />
      <p className="text-sm text-[color:var(--ink-soft)]">{label}</p>
      <p className="mt-3 font-display text-3xl text-[color:var(--ink)]">{value}</p>
      <p className="mt-2 text-sm font-medium text-emerald-700">{delta}</p>
    </article>
  );
}
