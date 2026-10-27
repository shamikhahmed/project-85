interface Props {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  stroke = 8,
  label,
  sublabel,
  color = 'var(--accent)',
}: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div
      className="ring-wrap"
      role="img"
      aria-label={`${label ?? 'Progress'}: ${Math.round(pct)}%`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="ring-center">
        {label && <div className="mono ring-label">{label}</div>}
        {sublabel && <div className="muted ring-sub">{sublabel}</div>}
      </div>
      <style>{`
        .ring-wrap { position: relative; display: inline-grid; place-items: center; }
        .ring-center {
          position: absolute; inset: 0; display: grid; place-content: center; text-align: center;
        }
        .ring-label { font-size: 1.1rem; font-weight: 700; }
        .ring-sub { font-size: 0.7rem; }
      `}</style>
    </div>
  );
}
