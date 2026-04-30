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
    <div className="glass-surface anim-enter rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5" style={{ animationDelay: "160ms" }}>
      <h3 className="font-display text-xl text-[color:var(--ink)]">Progress Trends</h3>
      <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Weekly snapshots from your recent sessions</p>
      <div className="mt-6 space-y-4">
        {rows.map((row, rowIndex) => (
          <div key={row.week} className="anim-enter" style={{ animationDelay: `${220 + rowIndex * 90}ms` }}>
            <p className="mb-2 text-xs uppercase tracking-wide text-[color:var(--ink-soft)]">{row.week}</p>
            <div className="space-y-2">
              <Bar label="Speed" value={row.speed} max={180} color="bg-amber-500" delayMs={rowIndex * 110 + 220} />
              <Bar label="Volume" value={row.volume} max={100} color="bg-sky-500" delayMs={rowIndex * 110 + 290} />
              <Bar label="Pronunciation" value={row.pronunciation} max={100} color="bg-emerald-500" delayMs={rowIndex * 110 + 360} />
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
  delayMs?: number;
};

function Bar({ label, value, max, color, delayMs = 0 }: BarProps) {
  const width = `${Math.min(100, (value / max) * 100)}%`;

  return (
    <div className="grid grid-cols-[90px_1fr_55px] items-center gap-3 text-sm">
      <span className="text-[color:var(--ink-soft)]">{label}</span>
      <div className="h-2 rounded-full bg-black/10">
        <div className={`bar-reveal h-2 rounded-full ${color} transition-all duration-700`} style={{ width, animationDelay: `${delayMs}ms` }} />
      </div>
      <span className="text-right font-medium text-[color:var(--ink)]">{value}</span>
    </div>
  );
}
