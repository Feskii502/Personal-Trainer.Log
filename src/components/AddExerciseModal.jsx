import { useMemo, useState } from 'react';
import { Search, Plus, ArrowLeft } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import {
  useStore,
  addExerciseToDay,
  addLibraryExercise,
} from '../lib/store.js';
import { MUSCLE_GROUPS, EXERCISE_TYPES, cx } from '../lib/utils.js';

function CreateExerciseForm({ onDone, onCancel }) {
  const [name, setName] = useState('');
  const [main, setMain] = useState(MUSCLE_GROUPS[0]);
  const [subs, setSubs] = useState([]);
  const [type, setType] = useState('+kg');

  const toggle = (m) =>
    setSubs((a) => (a.includes(m) ? a.filter((x) => x !== m) : [...a, m]));

  const submit = () => {
    if (!name.trim()) return;
    const entry = addLibraryExercise({
      name: name.trim(),
      mainMuscle: main,
      subMuscles: subs,
      type,
    });
    onDone(entry);
  };

  return (
    <div className="space-y-5">
      <button
        className="text-txt-secondary text-sm inline-flex items-center gap-1.5"
        onClick={onCancel}
      >
        <ArrowLeft size={14} /> Back to library
      </button>
      <div>
        <label className="section-title block mb-2">Exercise Name</label>
        <input
          autoFocus
          className="input"
          placeholder="e.g., Bulgarian Split Squat"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="section-title block mb-2">Main Muscle</label>
        <select
          className="input"
          value={main}
          onChange={(e) => setMain(e.target.value)}
        >
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="section-title block mb-2">Sub Muscles</label>
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.filter((m) => m !== main).map((m) => {
            const active = subs.includes(m);
            return (
              <button
                key={m}
                onClick={() => toggle(m)}
                className={cx('chip', active && 'chip-active')}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="section-title block mb-2">Type</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-bg-surface border border-border rounded-btn p-1">
          {EXERCISE_TYPES.map((t) => {
            const active = type === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={cx(
                  'rounded-btn text-sm font-semibold transition-colors',
                  active
                    ? 'bg-bg-elevated text-brand-lime'
                    : 'text-txt-secondary'
                )}
                style={{ minHeight: 44 }}
              >
                {t.key}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-primary disabled:opacity-40"
          disabled={!name.trim()}
          onClick={submit}
        >
          Create & Add
        </button>
      </div>
    </div>
  );
}

export default function AddExerciseModal({
  open,
  onClose,
  clientId,
  weekId,
  dayId,
  section,
}) {
  const { library } = useStore();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return library.filter((ex) => {
      if (muscle && ex.mainMuscle !== muscle) return false;
      if (s && !ex.name.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [library, q, muscle]);

  const add = (ex) => {
    addExerciseToDay(clientId, weekId, dayId, section, ex);
    onClose?.();
    setQ('');
    setMuscle(null);
    setCreating(false);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setCreating(false);
      }}
      title={creating ? 'New Exercise' : 'Add Exercise'}
    >
      {creating ? (
        <CreateExerciseForm
          onDone={(ex) => add(ex)}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <div className="space-y-5">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-secondary"
            />
            <input
              className="input pl-11"
              placeholder="Search exercises..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            <button
              className={cx('chip shrink-0', !muscle && 'chip-active')}
              onClick={() => setMuscle(null)}
            >
              All
            </button>
            {MUSCLE_GROUPS.map((m) => (
              <button
                key={m}
                className={cx('chip shrink-0', muscle === m && 'chip-active')}
                onClick={() => setMuscle(m === muscle ? null : m)}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[52vh] overflow-y-auto pr-1 modal-scroll">
            {filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => add(ex)}
                className="card p-4 text-left transition-transform active:scale-[0.98] hover:border-[#333338]"
              >
                <div className="font-semibold text-[15px]">{ex.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-txt-secondary uppercase tracking-wide">
                    {ex.mainMuscle}
                  </span>
                  <span
                    className="text-[10px] tabular font-semibold uppercase px-1.5 py-0.5 rounded"
                    style={{
                      color: '#D4FF3A',
                      background: '#D4FF3A14',
                    }}
                  >
                    {ex.type}
                  </span>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-txt-secondary py-8">
                No exercises match.
              </div>
            )}
          </div>

          <button
            className="btn-secondary w-full"
            onClick={() => setCreating(true)}
          >
            <Plus size={18} />
            Create New Exercise
          </button>
        </div>
      )}
    </Modal>
  );
}
