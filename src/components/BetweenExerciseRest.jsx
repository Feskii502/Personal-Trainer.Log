import { useState } from 'react';
import { Play, Square, Timer } from 'lucide-react';
import {
  startRest,
  stopRest,
  getRestRemaining,
  useTimerStore,
  useRefresh,
} from '../hooks/useTimers.js';
import { fmtSeconds } from '../lib/utils.js';

export default function BetweenExerciseRest({ dayId, defaultSeconds = 120 }) {
  const key = `between:${dayId}`;
  const [duration, setDuration] = useState(defaultSeconds);
  useTimerStore();
  useRefresh(250);
  const { remaining, total, active } = getRestRemaining(key);

  if (active) {
    const pct = total > 0 ? (remaining / total) * 100 : 0;
    return (
      <div
        className="rounded-full relative overflow-hidden flex items-center gap-3 p-1.5 pr-3"
        style={{
          background: 'rgba(255,138,58,0.06)',
          border: '1px solid rgba(255,138,58,0.35)',
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{
            background: 'rgba(255,138,58,0.14)',
            width: `${pct}%`,
            transition: 'width 250ms linear',
          }}
        />
        <div
          className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#FF8A3A14', color: '#FF8A3A' }}
        >
          <Timer size={16} />
        </div>
        <div className="relative flex-1 min-w-0">
          <div
            className="text-[9px] uppercase tracking-[0.22em] font-semibold"
            style={{ color: '#FF8A3A' }}
          >
            Between exercises
          </div>
          <div
            className="font-display font-semibold tabular text-[16px] leading-tight"
            style={{ color: '#FF8A3A' }}
          >
            {fmtSeconds(remaining)}
          </div>
        </div>
        <button
          onClick={() => stopRest(key)}
          className="relative h-9 px-3 rounded-full text-[11px] font-semibold uppercase tracking-wider text-txt-secondary hover:text-txt-primary border border-border bg-bg-base/40 flex items-center gap-1.5 flex-shrink-0"
        >
          <Square size={11} fill="currentColor" /> Skip
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-full flex items-center gap-2 px-3 py-1.5 flex-wrap"
      style={{
        background: 'var(--c-soft-bg-idle)',
        border: '1px dashed var(--c-border)',
      }}
    >
      <Timer size={14} className="text-txt-muted" />
      <span className="text-[10px] uppercase tracking-[0.22em] font-semibold text-txt-muted">
        Between rest
      </span>
      <input
        type="number"
        inputMode="numeric"
        className="bg-bg-base border border-border rounded-full tabular text-center text-[12px] text-txt-primary"
        style={{ width: 64, height: 30, padding: '0 8px' }}
        value={duration}
        onChange={(e) => setDuration(Math.max(0, Number(e.target.value) || 0))}
        aria-label="Between-exercise rest seconds"
      />
      <span className="text-[10px] text-txt-muted">sec</span>
      <button
        onClick={() =>
          startRest(key, duration, { kind: 'between' })
        }
        className="ml-auto h-8 px-3 rounded-full text-[11px] font-semibold uppercase tracking-wider border border-brand-lime/60 text-brand-lime hover:bg-brand-lime/[0.06] flex items-center gap-1.5"
      >
        <Play size={11} fill="currentColor" /> Start
      </button>
    </div>
  );
}
