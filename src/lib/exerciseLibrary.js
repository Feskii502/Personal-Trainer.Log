import { uid } from './utils.js';

const mk = (name, mainMuscle, subMuscles, type) => ({
  id: uid(),
  name,
  mainMuscle,
  subMuscles,
  type,
});

export const DEFAULT_LIBRARY = [
  mk('Barbell Bench Press', 'Chest', ['Triceps', 'Shoulders'], '+kg'),
  mk('Incline Dumbbell Press', 'Chest', ['Shoulders'], '+kg'),
  mk('Push-Up', 'Chest', ['Triceps', 'Core'], '+kg'),
  mk('Cable Fly', 'Chest', [], '+kg'),

  mk('Deadlift', 'Back', ['Glutes', 'Legs'], '+kg'),
  mk('Pull-Up', 'Back', ['Biceps'], '-kg'),
  mk('Barbell Row', 'Back', ['Biceps'], '+kg'),
  mk('Lat Pulldown', 'Back', ['Biceps'], '+kg'),
  mk('Seated Cable Row', 'Back', ['Biceps'], '+kg'),

  mk('Overhead Press', 'Shoulders', ['Triceps'], '+kg'),
  mk('Lateral Raise', 'Shoulders', [], '+kg'),
  mk('Face Pull', 'Shoulders', ['Back'], '+kg'),

  mk('Barbell Curl', 'Biceps', [], '+kg'),
  mk('Hammer Curl', 'Biceps', [], '+kg'),
  mk('Preacher Curl', 'Biceps', [], '+kg'),

  mk('Tricep Pushdown', 'Triceps', [], '+kg'),
  mk('Skull Crusher', 'Triceps', [], '+kg'),
  mk('Dips', 'Triceps', ['Chest'], '-kg'),

  mk('Back Squat', 'Legs', ['Glutes', 'Core'], '+kg'),
  mk('Front Squat', 'Legs', ['Core'], '+kg'),
  mk('Romanian Deadlift', 'Legs', ['Glutes', 'Back'], '+kg'),
  mk('Leg Press', 'Legs', ['Glutes'], '+kg'),
  mk('Leg Curl', 'Legs', [], '+kg'),
  mk('Leg Extension', 'Legs', [], '+kg'),
  mk('Walking Lunge', 'Legs', ['Glutes'], '+kg'),

  mk('Hip Thrust', 'Glutes', ['Legs'], '+kg'),
  mk('Cable Kickback', 'Glutes', [], '+kg'),

  mk('Plank', 'Core', [], 'timed'),
  mk('Hanging Leg Raise', 'Core', [], '+kg'),
  mk('Cable Crunch', 'Core', [], '+kg'),

  mk('Standing Calf Raise', 'Calves', [], '+kg'),
  mk('Seated Calf Raise', 'Calves', [], '+kg'),

  mk('Treadmill Run', 'Legs', ['Core'], 'timed'),
  mk('Jump Rope', 'Calves', ['Core'], 'timed'),
  mk('Farmer Carry', 'Core', ['Back', 'Legs'], 'timed+kg'),
  mk('Dead Hang', 'Back', ['Core'], 'timed'),
];
