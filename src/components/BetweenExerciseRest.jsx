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

export default function BetweenExerciseRest({ dayId }) {
  const key = `between:${dayId}`;
  const [duration, setDuration] = useState(120);
  useTimerStore();
  useRefresh(250);
  const { remaining, total, active } = getRestRemaining(key);

  if (active) {
    const pct = total > 0 ? (remaining / total) * 100 : 0;
    return (
      <div
        className="rounded-card p-5 relative overflow-hidden"
        style={{
          background: '#FF8A3A0D',
          border: '1px solid #FF8A3A33',
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0"
          style={{
            background: '#FF8A3A22',
            width: `${pct}%`,
            transition: 'width 250ms linear',
          }}
        />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Timer size={22} style={{ color: '#FF8A3A' }} />
            <div>
              <div
                className="section-title"
                style={{ color: '#FF8A3A' }}
              >
                Between Exercises
              </div>
              <div
                className="font-display font-bold tabular leading-none mt-1"
                style={{ fontSize: 44, color: '#FF8A3A' }}
              >
                {fmtSeconds(remaining)}
              </div>
            </div>
          </div>
          <button className="btn-secondary" onClick={() => stopRest(key)}>
            <Square size={16} /> Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-card p-4 flex items-center gap-3 flex-wrap"
      style={{
        background: '#141416',
        border: '1px dashed #26262A',
      }}
    >
      <Timer size={18} className="text-txt-secondary" />
      <span className="section-title">Between-Exercise Rest</span>
      <input
        type="number"
        inputMode="numeric"
        className="input tabular text-center"
        style={{ width: 90, minHeight: 40, padding: '4px 10px' }}
        value={duration}
        onChange={(e) => setDuration(Math.max(0, Number(e.target.value) || 0))}
      />
      <span className="text-xs text-txt-muted">sec</span>
      <button
        className="btn-sm tabular border border-brand-lime text-brand-lime bg-transparent rounded-btn ml-auto"
        style={{ minHeight: 40, padding: '0 14px' }}
        onClick={() => startRest(key, duration)}
      >
        <Play size={14} fill="currentColor" /> Start
      </button>
    </div>
  );
}
