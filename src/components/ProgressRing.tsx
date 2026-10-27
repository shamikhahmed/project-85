interface Props {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  glow?: boolean;
}

export function ProgressRing({
  value,
  max = 100,
  size = 128,
  stroke = 9,
  label,
  sublabel,
  color = 'var(--accent)',
  glow = true,
}: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const gradId = `ring-grad-${Math.round(size)}-${Math.round(pct)}`;

  return (
    <div
      className={`ring-wrap${glow ? ' ring-glow' : ''}`}
      role="img"
      aria-label={`${label ?? 'Progress'}: ${Math.round(pct)}%`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-strong)" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
          opacity={0.9}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset var(--motion-base) var(--ease-out)' }}
        />
      </svg>
      <div className="ring-center">
        {label && <div className="mono ring-label">{label}</div>}
        {sublabel && <div className="muted ring-sub">{sublabel}</div>}
      </div>
    </div>
  );
}
