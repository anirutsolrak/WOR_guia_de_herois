export function RateBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="ratebar" aria-label={`taxa ${value}`}>
      <div className="ratebar-track">
        <div className="ratebar-fill" data-testid="ratebar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="ratebar-value">{value.toFixed(1)}</span>
    </div>
  );
}
