interface Props {
  label: string;
  value: string;
  detail?: string;
  /** 0–1 progress; omit for no bar */
  progress?: number | null;
  status?: 'open' | 'done' | 'provisional' | 'warn';
}

export function MetricChip({ label, value, detail, progress, status = 'open' }: Props) {
  const pct =
    progress == null || !Number.isFinite(progress)
      ? null
      : Math.min(100, Math.max(0, progress * 100));

  return (
    <div className={`metric-chip metric-chip--${status}`}>
      <div className="metric-chip-top">
        <span className="metric-chip-label">{label}</span>
        {status === 'provisional' && (
          <span className="badge badge-warn" style={{ minHeight: 22, padding: '0 8px' }}>
            Est.
          </span>
        )}
        {status === 'done' && (
          <span className="dim" style={{ fontSize: 'var(--text-caption)', fontWeight: 600 }}>
            Done
          </span>
        )}
      </div>
      <div className="metric-chip-value mono">{value}</div>
      {detail && <div className="metric-chip-detail">{detail}</div>}
      {pct != null && (
        <div
          className="metric-chip-track"
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} progress`}
        >
          <div className="metric-chip-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
