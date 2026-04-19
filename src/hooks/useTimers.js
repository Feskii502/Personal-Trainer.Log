import { useCallback, useEffect, useRef, useState } from 'react';

// Global-ish timer store for active set timers and rest countdowns.
// Keys are arbitrary strings (e.g., set id, "rest:<exerciseId>", "between:<dayId>").
// Timestamps are wall-clock (Date.now) so nav between views doesn't lose time.

const listeners = new Set();
const state = {
  sets: {}, // id -> { startedAt }
  rests: {}, // id -> { startedAt, duration }
};

const emit = () => listeners.forEach((l) => l());

export const startSet = (id) => {
  state.sets[id] = { startedAt: Date.now() };
  emit();
};
export const stopSet = (id) => {
  const s = state.sets[id];
  if (!s) return 0;
  const elapsed = Math.floor((Date.now() - s.startedAt) / 1000);
  delete state.sets[id];
  emit();
  return elapsed;
};
export const getSetElapsed = (id) => {
  const s = state.sets[id];
  if (!s) return 0;
  return Math.floor((Date.now() - s.startedAt) / 1000);
};
export const isSetRunning = (id) => !!state.sets[id];

export const startRest = (id, duration) => {
  state.rests[id] = { startedAt: Date.now(), duration };
  emit();
};
export const stopRest = (id) => {
  delete state.rests[id];
  emit();
};
export const getRestRemaining = (id) => {
  const r = state.rests[id];
  if (!r) return { remaining: 0, total: 0, active: false };
  const elapsed = (Date.now() - r.startedAt) / 1000;
  const remaining = Math.max(0, r.duration - elapsed);
  return { remaining, total: r.duration, active: remaining > 0 };
};

export function useTimerStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
}

export function useAnyActive() {
  const [any, setAny] = useState(false);
  useEffect(() => {
    let id;
    const check = () => {
      const hasSet = Object.keys(state.sets).length > 0;
      const hasRest = Object.values(state.rests).some((r) => {
        const remaining = r.duration - (Date.now() - r.startedAt) / 1000;
        return remaining > 0;
      });
      setAny(hasSet || hasRest);
    };
    id = setInterval(check, 500);
    check();
    return () => clearInterval(id);
  }, []);
  return any;
}

// convenience: subscribe to tick every N ms
export function useRefresh(ms = 250) {
  const [, setTick] = useState(0);
  const ref = useRef();
  useEffect(() => {
    ref.current = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(ref.current);
  }, [ms]);
}
