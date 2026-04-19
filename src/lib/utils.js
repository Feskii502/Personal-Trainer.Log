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

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

export const WEEK_TAGS = [
  'Push',
  'Pull',
  'Legs',
  'Upper Back',
  'Lower Back',
  'Core',
  'Full Body',
];

// BMI = kg / m²
export const calcBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  return weightKg / (m * m);
};
