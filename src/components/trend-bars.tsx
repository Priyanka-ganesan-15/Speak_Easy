type TrendRow = {
  week: string;
  speed: number;
  volume: number;
  pronunciation: number;
};

type TrendBarsProps = {
  rows: TrendRow[];
};

export function TrendBars({ rows }: TrendBarsProps) {
  return (
    <div className="glass-surface rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5">
      <h3 className="font-display text-xl text-[color:var(--ink)]">Progress Trends</h3>
      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Weekly snapshots from your recent sessions</p>
      <div className="mt-6 space-y-4">
        {rows.map((row) => (
          <div key={row.week}>
            <p className="mb-2 text-xs uppercase tracking-wide text-[color:var(--ink-soft)]">{row.week}</p>
            <div className="space-y-2">
              <Bar label="Speed" value={row.speed} max={180} color="bg-amber-500" />
              <Bar label="Volume" value={row.volume} max={100} color="bg-sky-500" />
              <Bar label="Pronunciation" value={row.pronunciation} max={100} color="bg-emerald-500" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type BarProps = {
  label: string;
  value: number;
  max: number;
  color: string;
};

function Bar({ label, value, max, color }: BarProps) {
  const width = `${Math.min(100, (value / max) * 100)}%`;

  return (
    <div className="grid grid-cols-[90px_1fr_55px] items-center gap-3 text-sm">
      <span className="text-[color:var(--ink-soft)]">{label}</span>
      <div className="h-2 rounded-full bg-black/10">
        <div className={`h-2 rounded-full ${color} transition-all duration-700`} style={{ width }} />
      </div>
      <span className="text-right font-medium text-[color:var(--ink)]">{value}</span>
    </div>
  );
}
