import { DEFAULT_LIBRARY } from './exerciseLibrary.js';
import { makeSeed } from './seed.js';

const KEY = 'coach-workbook:v3';

const empty = () => ({
  clients: [],
  library: DEFAULT_LIBRARY,
});

export const loadState = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seeded = makeSeed();
      localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return empty();
    return {
      clients: parsed.clients ?? [],
      library: parsed.library?.length ? parsed.library : DEFAULT_LIBRARY,
    };
  } catch {
    return empty();
  }
};

export const saveState = (state) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
};

export const resetState = () => {
  localStorage.removeItem(KEY);
};
