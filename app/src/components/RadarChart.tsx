export function computePolygon(values: number[], max: number, size: number): string {
  const c = size / 2;
  const r = c * 0.9;
  const n = values.length;
  return values.map((v, i) => {
    const ratio = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const x = c + r * ratio * Math.cos(angle);
    const y = c + r * ratio * Math.sin(angle);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

export function RadarChart({ values, labels, max, size = 320 }: {
  values: number[]; labels: string[]; max: number; size?: number;
}) {
  const c = size / 2;
  const r = c * 0.9;
  const n = values.length;
  const polygon = computePolygon(values, max, size);
  return (
    <div className="radar">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} className="radar-grid" fill="none" />
        <polygon points={polygon} className="radar-area" />
      </svg>
      {labels.map((lab, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = c + (r + 12) * Math.cos(angle);
        const y = c + (r + 12) * Math.sin(angle);
        return (
          <span key={i} className="radar-label"
            style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)' }}>
            {lab}
          </span>
        );
      })}
    </div>
  );
}
