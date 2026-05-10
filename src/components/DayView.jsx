import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Flame,
  Dumbbell,
  Snowflake,
  Search,
  X,
  GripVertical,
} from 'lucide-react';
import {
  useStore,
  updateDay,
  addExerciseToDay,
} from '../lib/store.js';
import {
  DAY_NAMES,
  cx,
  daysUntil,
  fmtSeconds,
  initialsOf,
  phaseColor,
} from '../lib/utils.js';
import {
  getActiveRest,
  stopRest,
  useTimerStore,
  useRefresh,
} from '../hooks/useTimers.js';
import TagEditor from './ui/TagEditor.jsx';
import RestRing from './ui/RestRing.jsx';
import AddExerciseModal from './AddExerciseModal.jsx';
import ExerciseBlock from './ExerciseBlock.jsx';
import BetweenExerciseRest from './BetweenExerciseRest.jsx';
import ReorderExercisesModal from './ReorderExercisesModal.jsx';

const SECTIONS = [
  { key: 'warmUp', label: 'Warm Up', icon: Flame },
  { key: 'resistance', label: 'Resistance', icon: Dumbbell },
  { key: 'coolDown', label: 'Cool Down', icon: Snowflake },
];

const fmtVol = (kg) =>
  kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;

function SectionPills({ day, active, onPick }) {
  return (
    <div className="flex items-center bg-bg-elevated/60 border border-border rounded-btn p-1">
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const count = day.sections[s.key].length;
        const isActive = s.key === active;
        return (
          <button
            key={s.key}
            onClick={() => onPick(s.key)}
            className={cx(
              'flex-1 h-11 rounded-btn text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors',
              isActive
                ? 'bg-brand-lime text-black'
                : 'text-txt-secondary hover:text-txt-primary'
            )}
          >
            <Icon size={14} />
            <span>{s.label}</span>
            <span
              className={cx(
                'tabular text-[10px] px-1.5 rounded',
                isActive ? 'bg-black/15' : 'bg-bg-elevated'
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SessionStats({ day }) {
  const stats = useMemo(() => {
    let sets = 0;
    let completed = 0;
    let seconds = 0;
    let volume = 0;
    let exercises = 0;
    for (const k of ['warmUp', 'resistance', 'coolDown']) {
      exercises += day.sections[k].length;
      for (const ex of day.sections[k]) {
        for (const s of ex.sets) {
          sets++;
          if (s.completed) completed++;
          seconds += s.elapsedSeconds || 0;
          if (s.weight && s.reps) volume += s.weight * s.reps;
        }
      }
    }
    return { sets, completed, seconds, volume, exercises };
  }, [day]);
  const pct =
    stats.sets > 0 ? Math.round((stats.completed / stats.sets) * 100) : 0;
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="section-title">Session</div>
        <span
          className="font-display tabular font-bold text-xl"
          style={{
            color: pct === 100 && stats.sets > 0 ? '#D4FF3A' : '#F5F5F7',
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden mb-3"
        style={{ background: '#1C1C1F' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: pct + '%', background: '#D4FF3A' }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Sets', value: `${stats.completed}/${stats.sets}` },
          { label: 'Ex', value: stats.exercises },
          { label: 'Volume', value: fmtVol(stats.volume) },
          { label: 'Time', value: fmtSeconds(stats.seconds) },
        ].map((x) => (
          <div key={x.label}>
            <div className="text-[9px] uppercase tracking-wider text-txt-muted">
              {x.label}
            </div>
            <div className="font-display tabular font-bold text-sm">
              {x.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StickyRest() {
  useTimerStore();
  useRefresh(250);
  const active = getActiveRest();
  if (!active) return null;
  return (
    <div
      className="sticky z-30 -mx-1 px-1 pt-1 pb-2"
      style={{
        top: 56,
        background:
          'linear-gradient(to bottom, rgba(10,10,11,0.95) 75%, transparent)',
      }}
    >
      <div
        className="card p-4 flex items-center gap-4"
        style={{
          borderColor: '#D4FF3A55',
          background:
            'linear-gradient(135deg, rgba(212,255,58,0.05), transparent 60%), #141416',
        }}
      >
        <RestRing
          remaining={active.remaining}
          total={active.total}
          size={72}
          stroke={6}
        />
        <div className="flex-1 min-w-0">
          <div
            className="text-[10px] uppercase tracking-[0.2em] font-semibold"
            style={{ color: '#D4FF3A' }}
          >
            ● Resting
          </div>
          <div className="font-display font-bold tracking-tight text-xl tabular text-txt-primary">
            {fmtSeconds(active.remaining)}
          </div>
          <div className="text-[11px] text-txt-secondary mt-0.5">
            until next set
          </div>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => stopRest(active.id)}>
          Skip
        </button>
      </div>
    </div>
  );
}

function QuickAddPanel({ libraryExercises, onAdd, onCreateNew, currentSection }) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('all');
  const muscles = useMemo(
    () => ['all', ...new Set(libraryExercises.map((l) => l.mainMuscle))],
    [libraryExercises]
  );
  const filtered = useMemo(
    () =>
      libraryExercises
        .filter(
          (l) =>
            (muscle === 'all' || l.mainMuscle === muscle) &&
            (q === '' ||
              l.name.toLowerCase().includes(q.toLowerCase()) ||
              (l.mainMuscle || '').toLowerCase().includes(q.toLowerCase()))
        )
        .slice(0, 12),
    [libraryExercises, q, muscle]
  );
  const sectionLabel = SECTIONS.find((s) => s.key === currentSection)?.label;
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="section-title">Quick add to {sectionLabel}</div>
        <span className="text-[10px] tabular text-txt-muted">
          {libraryExercises.length} library
        </span>
      </div>
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search exercises…"
          className="w-full bg-bg-elevated/60 border border-border rounded-btn h-10 pl-9 pr-3 text-sm outline-none focus:border-brand-lime"
        />
      </div>
      <div className="flex gap-1 flex-wrap">
        {muscles.map((m) => (
          <button
            key={m}
            onClick={() => setMuscle(m)}
            className={cx(
              'h-7 px-2.5 rounded-pill text-[10px] uppercase tracking-wider font-semibold border transition-colors',
              muscle === m
                ? 'bg-brand-lime text-black border-brand-lime'
                : 'border-border text-txt-secondary hover:text-txt-primary'
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {filtered.map((l) => (
          <button
            key={l.id}
            onClick={() => onAdd(l)}
            className="group flex items-center gap-3 p-2.5 rounded-btn hover:bg-bg-elevated border border-transparent hover:border-border transition-colors text-left"
          >
            <div
              className="w-8 h-8 rounded-btn flex items-center justify-center flex-shrink-0 border border-border bg-bg-elevated"
            >
              <span className="text-[10px] tabular font-bold text-brand-lime">
                {l.type}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{l.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-txt-muted truncate">
                {l.mainMuscle}
                {l.subMuscles?.length > 0 &&
                  ` · ${l.subMuscles.slice(0, 2).join(', ')}`}
              </div>
            </div>
            <div className="text-lg text-txt-muted group-hover:text-brand-lime transition-colors">
              +
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="py-6 text-center text-xs text-txt-muted">
            No matches
          </div>
        )}
      </div>
      <button
        onClick={onCreateNew}
        className="w-full mt-1 h-10 rounded-btn border border-dashed border-border text-xs uppercase tracking-wider font-semibold text-txt-secondary hover:text-brand-lime hover:border-brand-lime"
      >
        + Create new exercise
      </button>
    </div>
  );
}


export default function DayView({
  clientId,
  weekId,
  dayId,
  onBack,
  activeSessions = [],
  onSwitchSession,
  onCloseSession,
  onAddClient,
}) {
  const { clients, library } = useStore();
  const client = clients.find((c) => c.id === clientId);
  const week = client?.weeks.find((w) => w.id === weekId);
  const day = week?.days.find((d) => d.id === dayId);

  const [section, setSection] = useState('resistance');
  const [picker, setPicker] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);

  if (!day) {
    return (
      <div className="p-8">
        <button className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="mt-10 text-center text-txt-secondary">Day not found.</div>
      </div>
    );
  }

  const exercises = day.sections[section];
  const sectionLabel = SECTIONS.find((s) => s.key === section).label;
  const du = client.expiryDate ? daysUntil(client.expiryDate) : null;
  const phaseHex = phaseColor(week.phase);

  const handleAdd = (lib) => {
    addExerciseToDay(clientId, weekId, dayId, section, lib);
    setPicker(false);
  };

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-20">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={onBack}
            className="btn-icon text-txt-secondary hover:text-txt-primary"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-txt-secondary">
            <span>Wk {week.number}</span>
            <span className="text-txt-muted">·</span>
            <span>
              Day {day.dayNumber} · {DAY_NAMES[day.dayNumber - 1]}
            </span>
          </div>
          <div style={{ width: 44 }} />
        </div>

        {/* Header card: avatar + identity + pill tabs */}
        <div className="card p-4 sm:p-5 mb-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="rounded-full flex items-center justify-center font-display font-bold relative flex-shrink-0"
              style={{
                width: 48,
                height: 48,
                background: '#1C1C1F',
                color: '#D4FF3A',
                border: '1px solid #26262A',
                fontSize: 16,
              }}
            >
              {initialsOf(client.name)}
              <span
                className="absolute -bottom-0.5 -right-0.5 rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  background: phaseHex,
                  border: '2px solid #141416',
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold tracking-tight text-lg sm:text-xl truncate">
                {client.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-txt-secondary flex-wrap">
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: phaseHex,
                  }}
                />
                <span className="uppercase tracking-wide">{week.phase}</span>
                <span className="text-txt-muted">
                  · Wk {week.number} · Day {day.dayNumber}
                </span>
                {du !== null && Number.isFinite(du) && (
                  <span className="text-txt-muted">
                    · {du > 0 ? `${du}d left` : 'Expired'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <SectionPills day={day} active={section} onPick={setSection} />
        </div>

        <StickyRest />

        <div className="space-y-4">
          <SessionStats day={day} />

          <div className="card p-4">
            <div className="section-title mb-3">
              Day Tags · select any that apply
            </div>
            <TagEditor
              value={day.tags || []}
              onChange={(tags) =>
                updateDay(clientId, weekId, dayId, { tags })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="section-title">
              {exercises.length} exercise
              {exercises.length === 1 ? '' : 's'} · {sectionLabel}
            </div>
            <div className="flex items-center gap-2">
              {exercises.length > 1 && (
                <button
                  onClick={() => setReorderOpen(true)}
                  className="h-10 px-3 rounded-btn text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 border border-border text-txt-secondary hover:text-txt-primary hover:border-[#3a3a40]"
                >
                  <GripVertical size={14} /> Reorder
                </button>
              )}
              <button
                onClick={() => setPicker((p) => !p)}
                className={cx(
                  'h-10 px-3 rounded-btn text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 transition-colors',
                  picker
                    ? 'bg-bg-elevated text-txt-primary border border-border'
                    : 'bg-brand-lime text-black'
                )}
              >
                {picker ? (
                  <>
                    <X size={14} /> Close
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Quick Add
                  </>
                )}
              </button>
            </div>
          </div>

          {picker && (
            <QuickAddPanel
              libraryExercises={library}
              onAdd={handleAdd}
              onCreateNew={() => {
                setPicker(false);
                setCreateOpen(true);
              }}
              currentSection={section}
            />
          )}

          {exercises.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-base font-semibold mb-1">
                No exercises in this section
              </div>
              <div className="text-xs text-txt-secondary mb-4">
                Quick-add above or create a new one.
              </div>
              <button
                onClick={() => setPicker(true)}
                className="btn-primary btn-sm"
              >
                <Plus size={16} /> Add Exercise
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {exercises.map((ex, idx) => (
                <div key={ex.id} className="space-y-4">
                  <ExerciseBlock
                    client={client}
                    weekId={weekId}
                    dayId={dayId}
                    section={section}
                    exercise={ex}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < exercises.length - 1}
                  />
                  {section === 'resistance' && idx < exercises.length - 1 && (
                    <BetweenExerciseRest dayId={dayId} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ReorderExercisesModal
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        clientId={clientId}
        weekId={weekId}
        dayId={dayId}
        section={section}
        exercises={exercises}
      />

      <AddExerciseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        clientId={clientId}
        weekId={weekId}
        dayId={dayId}
        section={section}
      />
    </div>
  );
}
