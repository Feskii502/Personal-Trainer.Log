import { fmtSeconds } from '../../lib/utils.js';

export default function RestRing({
  remaining,
  total,
  size = 140,
  stroke = 10,
  color = '#D4FF3A',
  label = 'REST',
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const dash = c * pct;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke="#26262A"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          stroke={color}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 250ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="tabular font-bold leading-none"
          style={{ fontSize: size * 0.28, color }}
        >
          {fmtSeconds(remaining)}
        </div>
        <div className="section-title mt-1" style={{ fontSize: 10 }}>
          {label}
        </div>
      </div>
    </div>
  );
}
