import { uid } from './utils.js';
import { DEFAULT_LIBRARY } from './exerciseLibrary.js';

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

const emptyDay = (n) => ({
  id: uid(),
  dayNumber: n,
  tags: [],
  sections: { warmUp: [], resistance: [], coolDown: [] },
});

const emptyWeek = (number, phase) => ({
  id: uid(),
  number,
  phase,
  days: Array.from({ length: 7 }, (_, i) => emptyDay(i + 1)),
});

const findLib = (name) => DEFAULT_LIBRARY.find((e) => e.name === name);

const exerciseFromLib = (name, restSeconds = 90) => {
  const l = findLib(name);
  if (!l) return null;
  return {
    id: uid(),
    libraryId: l.id,
    name: l.name,
    mainMuscle: l.mainMuscle,
    subMuscles: l.subMuscles,
    type: l.type,
    restSeconds,
    sets: [],
  };
};

const mkSet = (setNumber, weight, reps, elapsedSeconds = 45) => ({
  id: uid(),
  setNumber,
  weight,
  reps,
  duration: null,
  completed: true,
  elapsedSeconds,
  dropSets: [],
});

const mkHistoricalExercise = (name, sessions, restSeconds = 90) => {
  const l = findLib(name);
  if (!l) return null;
  const base = {
    id: uid(),
    libraryId: l.id,
    name: l.name,
    mainMuscle: l.mainMuscle,
    subMuscles: l.subMuscles,
    type: l.type,
    restSeconds,
    sets: sessions[sessions.length - 1].sets.map((s, i) =>
      mkSet(i + 1, s.weight, s.reps, 40 + i * 5)
    ),
    sessionHistory: sessions.slice(0, -1).map((sess) => ({
      id: uid(),
      date: sess.date,
      sets: sess.sets.map((s, i) => ({
        setNumber: i + 1,
        weight: s.weight,
        reps: s.reps,
      })),
    })),
  };
  return base;
};

export const makeSeed = () => {
  const client1Weeks = [];

  const w1 = emptyWeek(1, 'Hypertrophy');
  const monday = w1.days[0];
  monday.sections.warmUp.push(exerciseFromLib('Jump Rope', 60));
  monday.sections.warmUp[0].sets = [
    {
      id: uid(),
      setNumber: 1,
      weight: null,
      reps: null,
      duration: 120,
      completed: true,
      elapsedSeconds: 120,
      dropSets: [],
    },
  ];

  const bench = mkHistoricalExercise('Barbell Bench Press', [
    {
      date: daysFromNow(-21),
      sets: [
        { weight: 60, reps: 10 },
        { weight: 65, reps: 8 },
        { weight: 70, reps: 6 },
      ],
    },
    {
      date: daysFromNow(-14),
      sets: [
        { weight: 62.5, reps: 10 },
        { weight: 67.5, reps: 8 },
        { weight: 72.5, reps: 6 },
      ],
    },
    {
      date: daysFromNow(-7),
      sets: [
        { weight: 65, reps: 10 },
        { weight: 70, reps: 8 },
        { weight: 75, reps: 6 },
      ],
    },
    {
      date: daysFromNow(0),
      sets: [
        { weight: 67.5, reps: 10 },
        { weight: 72.5, reps: 8 },
        { weight: 77.5, reps: 6 },
      ],
    },
  ]);
  monday.sections.resistance.push(bench);

  const row = mkHistoricalExercise(
    'Barbell Row',
    [
      {
        date: daysFromNow(-14),
        sets: [
          { weight: 50, reps: 10 },
          { weight: 55, reps: 8 },
        ],
      },
      {
        date: daysFromNow(-7),
        sets: [
          { weight: 55, reps: 10 },
          { weight: 60, reps: 8 },
        ],
      },
      {
        date: daysFromNow(0),
        sets: [
          { weight: 60, reps: 10 },
          { weight: 65, reps: 8 },
        ],
      },
    ],
    120
  );
  monday.sections.resistance.push(row);

  const plank = exerciseFromLib('Plank', 60);
  plank.sets = [
    {
      id: uid(),
      setNumber: 1,
      weight: null,
      reps: null,
      duration: 60,
      completed: true,
      elapsedSeconds: 60,
      dropSets: [],
    },
  ];
  monday.sections.coolDown.push(plank);

  client1Weeks.push(w1);

  // Tag the seeded Monday (push + core) and leave other days untagged for demo.
  monday.tags = ['Push', 'Core'];
  w1.days[1].tags = ['Pull'];
  w1.days[2].tags = ['Legs', 'Core'];

  const client1 = {
    id: uid(),
    name: 'Marcus Chen',
    signupDate: daysFromNow(-30),
    expiryDate: daysFromNow(60),
    height: 178,
    trainingNotes:
      'Currently in hypertrophy block. 4-day upper/lower split. Shoulder mobility is a focus — avoid heavy overhead work. Progress overload weekly on main lifts.',
    dietNotes:
      '2800 kcal target. Protein: 180g. No gluten. Takes creatine 5g/day and whey post-workout.',
    weeks: client1Weeks,
    metrics: [
      { id: uid(), date: daysFromNow(-28), weight: 82.5, bodyFatPct: 18.0 },
      { id: uid(), date: daysFromNow(-21), weight: 82.1, bodyFatPct: 17.6 },
      { id: uid(), date: daysFromNow(-14), weight: 81.7, bodyFatPct: 17.2 },
      { id: uid(), date: daysFromNow(-7), weight: 81.4, bodyFatPct: 16.8 },
      { id: uid(), date: daysFromNow(0), weight: 81.0, bodyFatPct: 16.4 },
    ],
  };

  const seededWeek2 = emptyWeek(1, 'Strength');
  seededWeek2.days[0].tags = ['Legs', 'Lower Body'];
  seededWeek2.days[3].tags = ['Full Body'];

  const client2 = {
    id: uid(),
    name: 'Sofia Alvarez',
    signupDate: daysFromNow(-150),
    expiryDate: daysFromNow(14),
    height: 165,
    trainingNotes:
      'Strength phase. Focus on squat, deadlift, bench. Working on brace mechanics. Mild knee valgus on squats — cue knees out.',
    dietNotes:
      '2100 kcal. Mini-cut through end of month. Vegetarian. Protein target 140g from whey + tofu + eggs.',
    weeks: [seededWeek2],
    metrics: [
      { id: uid(), date: daysFromNow(-28), weight: 64.0, bodyFatPct: 24.0 },
      { id: uid(), date: daysFromNow(-14), weight: 63.2, bodyFatPct: 23.2 },
      { id: uid(), date: daysFromNow(0), weight: 62.5, bodyFatPct: 22.5 },
    ],
  };

  return {
    clients: [client1, client2],
    library: DEFAULT_LIBRARY,
  };
};
