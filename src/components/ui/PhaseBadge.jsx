import { phaseColor } from '../../lib/utils.js';

export default function PhaseBadge({ phase, size = 'md' }) {
  const c = phaseColor(phase);
  const height = size === 'sm' ? 28 : 34;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-pill px-3 uppercase tracking-wider text-[11px] font-semibold"
      style={{
        height,
        color: c,
        background: `${c}14`,
        border: `1px solid ${c}33`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: c }}
      />
      {phase}
    </span>
  );
}
