export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const cx = (...a) => a.filter(Boolean).join(' ');

export const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const daysUntil = (iso) => {
  if (!iso) return Infinity;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

export const fmtSeconds = (s) => {
  const total = Math.max(0, Math.floor(s));
  const m = Math.floor(total / 60);
  const r = total % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

export const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export const PHASES = [
  { key: 'Endurance', color: '#3ADBC7' },
  { key: 'Hypertrophy', color: '#4A7DFF' },
  { key: 'Strength', color: '#E94FA1' },
  { key: 'Power', color: '#FF8A3A' },
];

export const phaseColor = (p) =>
  PHASES.find((x) => x.key === p)?.color || '#8A8A90';

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Glutes',
  'Core',
  'Calves',
];

export const EXERCISE_TYPES = [
  { key: '+kg', label: 'Weighted (+kg)' },
  { key: '-kg', label: 'Assisted (-kg)' },
  { key: 'timed', label: 'Timed' },
  { key: 'timed+kg', label: 'Timed + Weight' },
];

export const isTimed = (t) => t === 'timed' || t === 'timed+kg';
export const hasWeight = (t) =>
  t === '+kg' || t === '-kg' || t === 'timed+kg';

export const DAY_TAGS = [
  'Push',
  'Pull',
  'Legs',
  'Upper Body',
  'Lower Body',
  'Core',
  'Full Body',
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Traps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
];

// BMI = kg / m²
export const calcBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
};

// Walk the client's history from newest → oldest and return the most recent
// completed sets for the given exercise (matched by libraryId), keyed by set
// number. Used to show "PREV 80×10" hints next to each set in the current day.
export const previousSetsFor = (client, libraryId, excludeDayId) => {
  if (!client?.weeks || !libraryId) return {};
  for (let wi = client.weeks.length - 1; wi >= 0; wi--) {
    const w = client.weeks[wi];
    if (!w?.days) continue;
    for (let di = w.days.length - 1; di >= 0; di--) {
      const d = w.days[di];
      if (d.id === excludeDayId) continue;
      for (const k of ['warmUp', 'resistance', 'coolDown']) {
        for (const ex of d.sections[k]) {
          if (ex.libraryId !== libraryId) continue;
          const map = {};
          for (const s of ex.sets) {
            if (!s.completed) continue;
            map[s.setNumber] = {
              weight: s.weight,
              reps: s.reps,
              duration: s.duration,
            };
          }
          if (Object.keys(map).length > 0) return map;
        }
      }
    }
  }
  return {};
};

export const fmtPrevSet = (prev, type) => {
  if (!prev) return '';
  const isTimed = type === 'time' || type === 'timed' || type === 'timed+kg';
  const hasWeight = ['+kg', '-kg', 'timed+kg'].includes(type);
  const parts = [];
  if (hasWeight && prev.weight != null) parts.push(`${prev.weight}kg`);
  if (isTimed && prev.duration != null) parts.push(`${prev.duration}s`);
  if (!isTimed && prev.reps != null) parts.push(`×${prev.reps}`);
  return parts.join(' ');
};
