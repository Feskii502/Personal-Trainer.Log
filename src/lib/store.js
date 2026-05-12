import { useEffect, useState } from 'react';
import {
  emptyState,
  fetchState,
  persistState,
  resetLastSaved,
} from './storage.js';
import { uid } from './utils.js';

let state = emptyState();
let loaded = false;
let pendingSave = false;
const listeners = new Set();

let saveTimer = null;
const scheduleSave = () => {
  if (!loaded) return;
  pendingSave = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    pendingSave = false;
    persistState(state);
  }, 400);
};

export const flushSave = () => {
  if (!loaded || !pendingSave) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingSave = false;
  persistState(state);
};

export const applyRemoteState = (next) => {
  if (!loaded) return;
  if (pendingSave) return; // our local edits haven't flushed; ignore echo
  try {
    if (JSON.stringify(next) === JSON.stringify(state)) return;
  } catch {
    /* fall through and apply */
  }
  state = next;
  listeners.forEach((l) => l(state));
};

const emit = () => {
  scheduleSave();
  listeners.forEach((l) => l(state));
};

export const getState = () => state;

export const initStore = async () => {
  loaded = false;
  const next = await fetchState();
  state = next;
  loaded = true;
  listeners.forEach((l) => l(state));
  return state;
};

export const resetStore = () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  loaded = false;
  pendingSave = false;
  state = emptyState();
  resetLastSaved();
  listeners.forEach((l) => l(state));
};

if (typeof window !== 'undefined') {
  const flushIfHidden = () => {
    if (document.visibilityState === 'hidden') flushSave();
  };
  window.addEventListener('beforeunload', flushSave);
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', flushIfHidden);
}

export const useStore = () => {
  const [s, setS] = useState(state);
  useEffect(() => {
    const fn = (ns) => setS(ns);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return s;
};

const update = (fn) => {
  state = fn(state);
  emit();
};

// ---------- Clients ----------
export const addClient = ({
  name,
  signupDate,
  expiryDate,
  height,
  sessionsRemaining,
  sessionsPackage,
}) => {
  const client = {
    id: uid(),
    name,
    signupDate: signupDate || new Date().toISOString(),
    expiryDate: expiryDate || null,
    height: height ?? null,
    sessionsRemaining: sessionsRemaining ?? null,
    sessionsPackage: sessionsPackage ?? 10,
    trainingNotes: '',
    dietNotes: '',
    weeks: [],
    metrics: [],
  };
  update((s) => ({ ...s, clients: [...s.clients, client] }));
  return client.id;
};

// Mark a day complete and decrement the client's remaining session count.
// Coach hits this at the end of a workout; clamps at 0.
export const completeSession = (clientId, weekId, dayId) => {
  update((s) => ({
    ...s,
    clients: s.clients.map((c) => {
      if (c.id !== clientId) return c;
      const currentRem =
        typeof c.sessionsRemaining === 'number' ? c.sessionsRemaining : null;
      const nextRem =
        currentRem != null ? Math.max(0, currentRem - 1) : currentRem;
      return {
        ...c,
        sessionsRemaining: nextRem,
        weeks: c.weeks.map((w) =>
          w.id !== weekId
            ? w
            : {
                ...w,
                days: w.days.map((d) =>
                  d.id !== dayId
                    ? d
                    : { ...d, completed: true, completedAt: new Date().toISOString() }
                ),
              }
        ),
      };
    }),
  }));
};

export const updateClient = (id, patch) => {
  update((s) => ({
    ...s,
    clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  }));
};

export const deleteClient = (id) => {
  update((s) => ({ ...s, clients: s.clients.filter((c) => c.id !== id) }));
};

// ---------- Weeks ----------
const makeDay = (n) => ({
  id: uid(),
  dayNumber: n,
  tags: [],
  sections: { warmUp: [], resistance: [], coolDown: [] },
});

export const addWeek = (clientId, phase) => {
  let newId;
  update((s) => ({
    ...s,
    clients: s.clients.map((c) => {
      if (c.id !== clientId) return c;
      const number = (c.weeks?.length || 0) + 1;
      const week = {
        id: uid(),
        number,
        phase,
        days: Array.from({ length: 7 }, (_, i) => makeDay(i + 1)),
      };
      newId = week.id;
      return { ...c, weeks: [...(c.weeks || []), week] };
    }),
  }));
  return newId;
};

export const updateDay = (clientId, weekId, dayId, patch) => {
  update((s) =>
    mapDay(s, clientId, weekId, dayId, (d) => ({ ...d, ...patch }))
  );
};

export const updateWeek = (clientId, weekId, patch) => {
  update((s) => ({
    ...s,
    clients: s.clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            weeks: c.weeks.map((w) =>
              w.id === weekId ? { ...w, ...patch } : w
            ),
          }
        : c
    ),
  }));
};

export const deleteWeek = (clientId, weekId) => {
  update((s) => ({
    ...s,
    clients: s.clients.map((c) =>
      c.id === clientId
        ? { ...c, weeks: c.weeks.filter((w) => w.id !== weekId) }
        : c
    ),
  }));
};

// ---------- Exercises inside a day ----------
const mapDay = (s, clientId, weekId, dayId, fn) => ({
  ...s,
  clients: s.clients.map((c) =>
    c.id === clientId
      ? {
          ...c,
          weeks: c.weeks.map((w) =>
            w.id === weekId
              ? {
                  ...w,
                  days: w.days.map((d) => (d.id === dayId ? fn(d) : d)),
                }
              : w
          ),
        }
      : c
  ),
});

export const addExerciseToDay = (
  clientId,
  weekId,
  dayId,
  section,
  libEntry
) => {
  const ex = {
    id: uid(),
    libraryId: libEntry.id,
    name: libEntry.name,
    mainMuscle: libEntry.mainMuscle,
    subMuscles: libEntry.subMuscles || [],
    type: libEntry.type,
    restSeconds: 90,
    sets: [],
  };
  update((s) =>
    mapDay(s, clientId, weekId, dayId, (d) => ({
      ...d,
      sections: {
        ...d.sections,
        [section]: [...d.sections[section], ex],
      },
    }))
  );
  return ex.id;
};

// Capture a day's current exercises as a reusable preset template.
// Strips client-specific runtime state (completion flags, elapsed time, weight,
// reps, drop sets) so it lands clean in another client's day.
export const captureDayAsPreset = (state, clientId, weekId, dayId) => {
  const c = state.clients.find((x) => x.id === clientId);
  const w = c?.weeks.find((x) => x.id === weekId);
  const d = w?.days.find((x) => x.id === dayId);
  if (!d) return null;
  const blank = (ex) => ({
    libraryId: ex.libraryId,
    name: ex.name,
    mainMuscle: ex.mainMuscle,
    subMuscles: ex.subMuscles || [],
    type: ex.type,
    restSeconds: ex.restSeconds ?? 90,
    betweenRestSeconds: ex.betweenRestSeconds ?? null,
    setCount: ex.sets?.length || 0,
  });
  return {
    sections: {
      warmUp: d.sections.warmUp.map(blank),
      resistance: d.sections.resistance.map(blank),
      coolDown: d.sections.coolDown.map(blank),
    },
    suggestedTags: d.tags || [],
  };
};

// Load a preset into a day. Modes:
//   'replace' — wipe the day's existing exercises and replace with preset
//   'append'  — keep existing exercises, add preset exercises after them
// Set values (weight, reps, completed) start empty; coach fills during session.
export const loadPresetIntoDay = (
  clientId,
  weekId,
  dayId,
  presetSections,
  mode = 'replace'
) => {
  const buildExercise = (tpl) => ({
    id: uid(),
    libraryId: tpl.libraryId,
    name: tpl.name,
    mainMuscle: tpl.mainMuscle,
    subMuscles: tpl.subMuscles || [],
    type: tpl.type,
    restSeconds: tpl.restSeconds ?? 90,
    betweenRestSeconds: tpl.betweenRestSeconds ?? null,
    sets: Array.from({ length: tpl.setCount || 0 }, (_, i) => ({
      id: uid(),
      setNumber: i + 1,
      weight: null,
      reps: null,
      duration: null,
      completed: false,
      elapsedSeconds: 0,
      dropSets: [],
    })),
  });

  update((s) =>
    mapDay(s, clientId, weekId, dayId, (d) => {
      const nextSection = (key) => {
        const incoming = (presetSections[key] || []).map(buildExercise);
        if (mode === 'append') return [...d.sections[key], ...incoming];
        return incoming;
      };
      return {
        ...d,
        sections: {
          warmUp: nextSection('warmUp'),
          resistance: nextSection('resistance'),
          coolDown: nextSection('coolDown'),
        },
      };
    })
  );
};

export const setExerciseOrder = (clientId, weekId, dayId, section, orderedIds) => {
  update((s) =>
    mapDay(s, clientId, weekId, dayId, (d) => {
      const list = d.sections[section];
      const byId = new Map(list.map((e) => [e.id, e]));
      const next = orderedIds.map((id) => byId.get(id)).filter(Boolean);
      // Append any exercises that weren't in orderedIds (defensive).
      for (const e of list) {
        if (!orderedIds.includes(e.id)) next.push(e);
      }
      return {
        ...d,
        sections: { ...d.sections, [section]: next },
      };
    })
  );
};

export const moveExercise = (clientId, weekId, dayId, section, exId, dir) => {
  update((s) =>
    mapDay(s, clientId, weekId, dayId, (d) => {
      const arr = [...d.sections[section]];
      const i = arr.findIndex((e) => e.id === exId);
      if (i < 0) return d;
      const j = i + (dir === 'up' ? -1 : 1);
      if (j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return {
        ...d,
        sections: { ...d.sections, [section]: arr },
      };
    })
  );
};

export const removeExercise = (clientId, weekId, dayId, section, exId) => {
  update((s) =>
    mapDay(s, clientId, weekId, dayId, (d) => ({
      ...d,
      sections: {
        ...d.sections,
        [section]: d.sections[section].filter((e) => e.id !== exId),
      },
    }))
  );
};

export const updateExercise = (
  clientId,
  weekId,
  dayId,
  section,
  exId,
  patch
) => {
  update((s) =>
    mapDay(s, clientId, weekId, dayId, (d) => ({
      ...d,
      sections: {
        ...d.sections,
        [section]: d.sections[section].map((e) =>
          e.id === exId ? { ...e, ...patch } : e
        ),
      },
    }))
  );
};

// ---------- Sets ----------
const mapExercise = (s, clientId, weekId, dayId, section, exId, fn) =>
  mapDay(s, clientId, weekId, dayId, (d) => ({
    ...d,
    sections: {
      ...d.sections,
      [section]: d.sections[section].map((e) => (e.id === exId ? fn(e) : e)),
    },
  }));

export const addSet = (clientId, weekId, dayId, section, exId) => {
  let newId;
  update((s) =>
    mapExercise(s, clientId, weekId, dayId, section, exId, (e) => {
      const setNumber = e.sets.length + 1;
      const set = {
        id: uid(),
        setNumber,
        weight: null,
        reps: null,
        duration: null,
        completed: false,
        elapsedSeconds: 0,
        dropSets: [],
      };
      newId = set.id;
      return { ...e, sets: [...e.sets, set] };
    })
  );
  return newId;
};

export const updateSet = (
  clientId,
  weekId,
  dayId,
  section,
  exId,
  setId,
  patch
) => {
  update((s) =>
    mapExercise(s, clientId, weekId, dayId, section, exId, (e) => ({
      ...e,
      sets: e.sets.map((x) => (x.id === setId ? { ...x, ...patch } : x)),
    }))
  );
};

export const removeSet = (clientId, weekId, dayId, section, exId, setId) => {
  update((s) =>
    mapExercise(s, clientId, weekId, dayId, section, exId, (e) => ({
      ...e,
      sets: e.sets
        .filter((x) => x.id !== setId)
        .map((x, i) => ({ ...x, setNumber: i + 1 })),
    }))
  );
};

export const addDropSet = (
  clientId,
  weekId,
  dayId,
  section,
  exId,
  setId
) => {
  update((s) =>
    mapExercise(s, clientId, weekId, dayId, section, exId, (e) => ({
      ...e,
      sets: e.sets.map((x) =>
        x.id === setId
          ? {
              ...x,
              dropSets: [
                ...(x.dropSets || []),
                { id: uid(), weight: null, reps: null },
              ],
            }
          : x
      ),
    }))
  );
};

export const updateDropSet = (
  clientId,
  weekId,
  dayId,
  section,
  exId,
  setId,
  dropId,
  patch
) => {
  update((s) =>
    mapExercise(s, clientId, weekId, dayId, section, exId, (e) => ({
      ...e,
      sets: e.sets.map((x) =>
        x.id === setId
          ? {
              ...x,
              dropSets: (x.dropSets || []).map((ds) =>
                ds.id === dropId ? { ...ds, ...patch } : ds
              ),
            }
          : x
      ),
    }))
  );
};

export const removeDropSet = (
  clientId,
  weekId,
  dayId,
  section,
  exId,
  setId,
  dropId
) => {
  update((s) =>
    mapExercise(s, clientId, weekId, dayId, section, exId, (e) => ({
      ...e,
      sets: e.sets.map((x) =>
        x.id === setId
          ? {
              ...x,
              dropSets: (x.dropSets || []).filter((ds) => ds.id !== dropId),
            }
          : x
      ),
    }))
  );
};

// ---------- Library ----------
export const addLibraryExercise = ({ name, mainMuscle, subMuscles, type }) => {
  const ex = { id: uid(), name, mainMuscle, subMuscles, type };
  update((s) => ({ ...s, library: [...s.library, ex] }));
  return ex;
};

export const updateLibraryExercise = (id, patch) => {
  update((s) => ({
    ...s,
    library: s.library.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    // Propagate the rename/retype to any day exercises that reference this library entry,
    // so existing workouts stay in sync.
    clients: s.clients.map((c) => ({
      ...c,
      weeks: c.weeks.map((w) => ({
        ...w,
        days: w.days.map((d) => ({
          ...d,
          sections: {
            warmUp: d.sections.warmUp.map((ex) =>
              ex.libraryId === id ? { ...ex, ...patch } : ex
            ),
            resistance: d.sections.resistance.map((ex) =>
              ex.libraryId === id ? { ...ex, ...patch } : ex
            ),
            coolDown: d.sections.coolDown.map((ex) =>
              ex.libraryId === id ? { ...ex, ...patch } : ex
            ),
          },
        })),
      })),
    })),
  }));
};

export const removeLibraryExercise = (id) => {
  update((s) => ({ ...s, library: s.library.filter((e) => e.id !== id) }));
};

// ---------- Metrics ----------
export const addMetric = (clientId, { date, weight, bodyFatPct }) => {
  const entry = {
    id: uid(),
    date: date || new Date().toISOString(),
    weight: weight ?? null,
    bodyFatPct: bodyFatPct ?? null,
  };
  update((s) => ({
    ...s,
    clients: s.clients.map((c) =>
      c.id === clientId
        ? { ...c, metrics: [...(c.metrics || []), entry] }
        : c
    ),
  }));
  return entry.id;
};

export const updateMetric = (clientId, metricId, patch) => {
  update((s) => ({
    ...s,
    clients: s.clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            metrics: (c.metrics || []).map((m) =>
              m.id === metricId ? { ...m, ...patch } : m
            ),
          }
        : c
    ),
  }));
};

export const removeMetric = (clientId, metricId) => {
  update((s) => ({
    ...s,
    clients: s.clients.map((c) =>
      c.id === clientId
        ? {
            ...c,
            metrics: (c.metrics || []).filter((m) => m.id !== metricId),
          }
        : c
    ),
  }));
};
