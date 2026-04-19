import { useEffect, useState } from 'react';
import { loadState, saveState } from './storage.js';
import { uid } from './utils.js';

let state = loadState();
const listeners = new Set();

const emit = () => {
  saveState(state);
  listeners.forEach((l) => l(state));
};

export const getState = () => state;

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
export const addClient = ({ name, signupDate, expiryDate, height }) => {
  const client = {
    id: uid(),
    name,
    signupDate: signupDate || new Date().toISOString(),
    expiryDate: expiryDate || null,
    height: height ?? null,
    trainingNotes: '',
    dietNotes: '',
    weeks: [],
    metrics: [],
  };
  update((s) => ({ ...s, clients: [...s.clients, client] }));
  return client.id;
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
  sections: { warmUp: [], resistance: [], coolDown: [] },
});

export const addWeek = (clientId, phase, tags = []) => {
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
        tags,
        days: Array.from({ length: 7 }, (_, i) => makeDay(i + 1)),
      };
      newId = week.id;
      return { ...c, weeks: [...(c.weeks || []), week] };
    }),
  }));
  return newId;
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
