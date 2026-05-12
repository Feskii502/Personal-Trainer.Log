import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Flame,
  Dumbbell,
  Snowflake,
  GripVertical,
  BookmarkPlus,
  FolderOpen,
  PencilLine,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { useStore, updateDay, completeSession } from '../lib/store.js';
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
import AddExerciseModal from './AddExerciseModal.jsx';
import ExerciseBlock from './ExerciseBlock.jsx';
import BetweenExerciseRest from './BetweenExerciseRest.jsx';
import ReorderExercisesModal from './ReorderExercisesModal.jsx';
import SavePresetModal from './SavePresetModal.jsx';
import LoadPresetModal from './LoadPresetModal.jsx';
import { useWorkoutPresets } from '../hooks/useWorkoutPresets.js';

const SECTIONS = [
  { key: 'warmUp', label: 'Warm Up', Icon: Flame },
  { key: 'resistance', label: 'Resistance', Icon: Dumbbell },
  { key: 'coolDown', label: 'Cool Down', Icon: Snowflake },
];

const SECTION_LABEL = {
  warmUp: 'Warm Up',
  resistance: 'Resistance',
  coolDown: 'Cool Down',
};

const fmtVol = (kg) =>
  kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;

function SectionLabel({ children, className = '' }) {
  return (
    <div
      className={cx(
        'text-[10px] uppercase tracking-[0.22em] font-semibold text-txt-secondary',
        className
      )}
    >
      {children}
    </div>
  );
}

// ---------- Path bar (back / breadcrumb / settings) ----------
function PathBar({ onBack, weekNumber, dayNumber, onOpenSettings }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-7">
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-3 h-10 rounded-full text-txt-secondary hover:text-txt-primary border border-border bg-bg-elevated/40 hover:bg-bg-elevated transition-colors"
      >
        <ArrowLeft size={15} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
          Week
        </span>
      </button>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-txt-secondary font-semibold">
        <span>Wk {weekNumber}</span>
        <span className="text-txt-muted">/</span>
        <span>Day {dayNumber}</span>
        <span className="text-txt-muted">/</span>
        <span className="text-txt-muted">{DAY_NAMES[dayNumber - 1]}</span>
      </div>
      <button
        onClick={onOpenSettings}
        className="w-10 h-10 rounded-full flex items-center justify-center text-txt-secondary hover:text-txt-primary border border-border bg-bg-elevated/40 hover:bg-bg-elevated transition-colors"
        aria-label="Settings"
      >
        <Settings size={15} />
      </button>
    </div>
  );
}

// ---------- Hero ----------
function Hero({ client, week, day, onTitleChange }) {
  const phaseHex = phaseColor(week.phase);
  const du = client.expiryDate ? daysUntil(client.expiryDate) : null;
  const expiring = du !== null && du <= 14;
  const expired = du !== null && du < 0;

  return (
    <div
      className="card overflow-hidden relative mb-3"
      style={{
        background: `linear-gradient(135deg, ${phaseHex}10 0%, transparent 45%), var(--c-bg-surface)`,
      }}
    >
      <div
        className="absolute top-0 left-0 bottom-0"
        style={{ width: 3, background: phaseHex }}
      />
      <div className="p-5 sm:p-6 pl-6 sm:pl-7">
        <div className="flex items-start gap-4 mb-6">
          <div
            className="rounded-full flex items-center justify-center font-display font-bold relative flex-shrink-0"
            style={{
              width: 56,
              height: 56,
              background: '#0F0F11',
              color: '#F5F5F7',
              border: '1px solid #26262A',
              fontSize: 18,
            }}
          >
            {initialsOf(client.name)}
            <span
              className="absolute -bottom-0.5 -right-0.5 rounded-full"
              style={{
                width: 14,
                height: 14,
                background: phaseHex,
                border: '2.5px solid var(--c-bg-surface)',
              }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold tracking-tight text-[22px] sm:text-[26px] leading-tight truncate">
              {client.name}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-txt-secondary flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 h-6 rounded-full text-[10px] uppercase tracking-[0.18em] font-semibold border"
                style={{ color: phaseHex, borderColor: phaseHex + '44' }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{ width: 6, height: 6, background: phaseHex }}
                />
                {week.phase}
              </span>
              <span className="text-txt-muted tabular">
                Wk {week.number} · Day {day.dayNumber} ·{' '}
                {DAY_NAMES[day.dayNumber - 1]}
              </span>
              {du !== null && Number.isFinite(du) && (
                <span
                  className="tabular"
                  style={{
                    color: expired
                      ? '#FF4D3A'
                      : expiring
                      ? '#FF8A3A'
                      : 'var(--c-txt-muted)',
                  }}
                >
                  · {expired ? 'Expired' : `${du}d left`}
                </span>
              )}
            </div>
          </div>

          {typeof client.sessionsRemaining === 'number' && (
            <div className="text-right hidden sm:block flex-shrink-0">
              <SectionLabel>Sessions</SectionLabel>
              <div className="font-display font-semibold tabular leading-none mt-1 flex items-baseline gap-1 justify-end">
                <span
                  style={{
                    fontSize: 24,
                    color:
                      client.sessionsRemaining <= 2 ? '#FF4D3A' : '#F5F5F7',
                  }}
                >
                  {client.sessionsRemaining}
                </span>
                <span className="text-[12px] text-txt-muted">
                  / {client.sessionsPackage || 10}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <SectionLabel className="flex items-center gap-1.5">
            <PencilLine size={11} /> Day title
          </SectionLabel>
          <input
            type="text"
            value={day.title || ''}
            onChange={(e) =>
              onTitleChange(e.target.value)
            }
            placeholder="Push Day · Upper Body Strength"
            className="w-full bg-transparent border-0 outline-none font-display font-semibold tracking-tight placeholder:text-txt-muted/50 text-txt-primary"
            style={{
              fontSize: 'clamp(26px, 3.5vw, 38px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- Sticky rest pill ----------
function StickyRest() {
  useTimerStore();
  useRefresh(250);
  const active = getActiveRest();
  if (!active) return null;
  const remaining = Math.max(0, active.remaining);
  const pct = active.total > 0 ? remaining / active.total : 0;
  const r = 28;
  const c = 2 * Math.PI * r;
  const label =
    active.kind === 'between'
      ? `before ${active.exerciseName || 'next exercise'}`
      : active.nextSet
      ? `until set ${active.nextSet}${
          active.exerciseName ? ' of ' + active.exerciseName : ''
        }`
      : 'until next set';

  return (
    <div
      className="sticky z-30 -mx-1 px-1 pt-2 pb-2"
      style={{ top: 52 }}
    >
      <div
        className="rounded-full flex items-center gap-3 p-1.5 pr-2"
        style={{
          background: 'rgba(20,20,22,0.78)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(212,255,58,0.35)',
          boxShadow:
            '0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 12px 32px -8px rgba(0,0,0,0.6), 0 0 32px -4px rgba(212,255,58,0.18)',
        }}
      >
        <svg width="56" height="56" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#26262A"
            strokeWidth="4"
          />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke="#D4FF3A"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            transform="rotate(-90 32 32)"
            style={{ transition: 'stroke-dashoffset .25s linear' }}
          />
          <text
            x="32"
            y="37"
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill="#D4FF3A"
            fontFamily="Space Grotesk"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {Math.ceil(remaining)}
          </text>
        </svg>
        <div className="flex-1 min-w-0">
          <div
            className="text-[9px] uppercase tracking-[0.22em] font-semibold flex items-center gap-1.5"
            style={{ color: '#D4FF3A' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#D4FF3A' }}
            />
            Resting
          </div>
          <div className="font-display font-semibold tabular text-[20px] leading-tight tracking-tight">
            {fmtSeconds(remaining)}
          </div>
          <div className="text-[10px] text-txt-secondary truncate">{label}</div>
        </div>
        <button
          onClick={() => stopRest(active.id)}
          className="h-9 px-4 rounded-full text-[11px] font-semibold uppercase tracking-wider text-txt-secondary hover:text-txt-primary border border-border bg-bg-base/60 transition-colors flex-shrink-0"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// ---------- Section pills ----------
function SectionPills({ day, active, onPick }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {SECTIONS.map((s) => {
        const isActive = s.key === active;
        const count = day.sections[s.key].length;
        return (
          <button
            key={s.key}
            onClick={() => onPick(s.key)}
            className={cx(
              'h-11 px-4 rounded-full text-[12px] font-semibold uppercase tracking-wider transition-colors flex items-center gap-2',
              isActive
                ? 'bg-brand-lime text-black'
                : 'text-txt-secondary hover:text-txt-primary bg-bg-elevated/60 border border-border'
            )}
          >
            <s.Icon size={14} />
            <span>{s.label}</span>
            <span
              className={cx(
                'text-[10px] tabular px-1.5 py-0.5 rounded-full',
                isActive ? 'bg-black/15' : 'bg-bg-base/60 text-txt-muted'
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

// ---------- Stats strip ----------
function StatsStrip({ day }) {
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

  const pct = stats.sets > 0 ? Math.round((stats.completed / stats.sets) * 100) : 0;
  const r = 22;
  const c = 2 * Math.PI * r;

  return (
    <div className="card p-4 flex items-center gap-5 flex-wrap">
      <div className="flex items-center gap-3 pr-5 border-r border-border">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="#1C1C1F" strokeWidth="4" />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={pct === 100 ? '#3ADBC7' : '#D4FF3A'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
            transform="rotate(-90 28 28)"
          />
        </svg>
        <div>
          <div
            className="font-display tabular font-bold leading-none"
            style={{
              fontSize: 22,
              color: pct === 100 ? '#3ADBC7' : '#F5F5F7',
            }}
          >
            {pct}
            <span className="text-[14px] text-txt-muted">%</span>
          </div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-txt-muted mt-1">
            Complete
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 min-w-[260px]">
        {[
          {
            label: 'Sets',
            value: (
              <span>
                <span className="text-txt-primary">{stats.completed}</span>
                <span className="text-txt-muted">/{stats.sets}</span>
              </span>
            ),
          },
          { label: 'Exercises', value: stats.exercises },
          { label: 'Volume', value: fmtVol(stats.volume) },
          { label: 'Elapsed', value: fmtSeconds(stats.seconds) },
        ].map((x) => (
          <div key={x.label}>
            <SectionLabel>{x.label}</SectionLabel>
            <div className="font-display tabular font-semibold text-[18px] leading-none mt-1.5 text-txt-primary">
              {x.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Complete session — button only ----------
function CompleteCard({ day, clientId, weekId, dayId }) {
  const totalEx =
    day.sections.warmUp.length +
    day.sections.resistance.length +
    day.sections.coolDown.length;
  if (totalEx === 0) return null;
  const done = day.completed;
  return (
    <div className="flex justify-end">
      <button
        onClick={() => {
          if (done) return;
          if (confirm('Mark this session complete?')) {
            completeSession(clientId, weekId, dayId);
          }
        }}
        disabled={done}
        className={cx(
          'h-11 px-5 rounded-full text-[12px] font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors flex-shrink-0',
          done
            ? 'bg-bg-elevated text-txt-secondary cursor-default border border-border'
            : 'bg-brand-lime text-black hover:opacity-90'
        )}
      >
        <CheckCircle2 size={14} />
        {done ? 'Session complete' : 'Complete session'}
      </button>
    </div>
  );
}

// ---------- Floating dock — workout actions ----------
function FloatingDock({ canSave, canReorder, onLoad, onSave, onAdd, onReorder }) {
  const items = [
    { key: 'load', label: 'Load', Icon: FolderOpen, onClick: onLoad },
    {
      key: 'save',
      label: 'Save',
      Icon: BookmarkPlus,
      onClick: onSave,
      disabled: !canSave,
    },
    { key: 'add', label: 'Add', Icon: Plus, onClick: onAdd, primary: true },
    {
      key: 'reorder',
      label: 'Reorder',
      Icon: GripVertical,
      onClick: onReorder,
      disabled: !canReorder,
    },
  ];
  return (
    <div
      className="fixed z-30 left-1/2 -translate-x-1/2"
      style={{ bottom: 'max(20px, env(safe-area-inset-bottom))' }}
    >
      <div
        className="flex items-center gap-1 p-1.5 rounded-full"
        style={{
          background: 'rgba(20,20,22,0.55)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow:
            '0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 18px 50px -12px rgba(0,0,0,0.7), 0 6px 18px -8px rgba(0,0,0,0.5)',
        }}
      >
        {items.map((it) => {
          const disabled = it.disabled;
          return (
            <button
              key={it.key}
              onClick={it.onClick}
              disabled={disabled}
              className={cx(
                'flex items-center gap-2 h-11 px-4 rounded-full transition-all duration-200 ease-out',
                disabled && 'opacity-30 cursor-not-allowed',
                !disabled &&
                  (it.primary
                    ? 'text-bg-base'
                    : 'text-txt-secondary hover:text-txt-primary')
              )}
              style={
                !disabled && it.primary
                  ? {
                      background: '#D4FF3A',
                      color: '#0A0A0B',
                      boxShadow:
                        '0 6px 16px -4px rgba(212,255,58,0.45), 0 0 0 0.5px rgba(255,255,255,0.1) inset',
                    }
                  : {}
              }
              aria-label={it.label}
              title={it.label}
            >
              <it.Icon size={15} />
              <span className="text-[12px] font-semibold tracking-tight">
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- DayView ----------
export default function DayView({
  clientId,
  weekId,
  dayId,
  onBack,
  onOpenSettings,
}) {
  const { clients } = useStore();
  const client = clients.find((c) => c.id === clientId);
  const week = client?.weeks.find((w) => w.id === weekId);
  const day = week?.days.find((d) => d.id === dayId);

  const [section, setSection] = useState('resistance');
  const [createOpen, setCreateOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [loadPresetOpen, setLoadPresetOpen] = useState(false);
  const { add: addPreset } = useWorkoutPresets();

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
  const sectionLabel = SECTION_LABEL[section];

  const canSave =
    day.sections.warmUp.length +
      day.sections.resistance.length +
      day.sections.coolDown.length >
    0;
  const canReorder = exercises.length >= 2;

  return (
    <div className="min-h-full pb-32">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-12 pt-7">
        <PathBar
          onBack={onBack}
          weekNumber={week.number}
          dayNumber={day.dayNumber}
          onOpenSettings={onOpenSettings}
        />
        <Hero
          client={client}
          week={week}
          day={day}
          onTitleChange={(title) =>
            updateDay(clientId, weekId, dayId, { title })
          }
        />
        <StickyRest />

        <div className="space-y-4 mt-3">
          <SectionPills day={day} active={section} onPick={setSection} />
          <StatsStrip day={day} />

          <div className="flex items-baseline justify-between pt-2">
            <h2 className="font-display font-semibold text-[20px] tracking-tight">
              {sectionLabel}
            </h2>
            <span className="text-[11px] tabular text-txt-muted uppercase tracking-[0.18em]">
              {exercises.length} exercise
              {exercises.length === 1 ? '' : 's'}
            </span>
          </div>

          {exercises.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="font-display font-semibold text-[16px] mb-1">
                No exercises in {sectionLabel.toLowerCase()}
              </div>
              <div className="text-[12px] text-txt-secondary">
                Tap{' '}
                <span className="font-semibold" style={{ color: '#D4FF3A' }}>
                  Add
                </span>{' '}
                in the dock below, or load a saved preset.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {exercises.map((ex, i) => (
                <div key={ex.id} className="space-y-3">
                  <ExerciseBlock
                    client={client}
                    weekId={weekId}
                    dayId={dayId}
                    section={section}
                    exercise={ex}
                    canMoveUp={i > 0}
                    canMoveDown={i < exercises.length - 1}
                    isLastExercise={i === exercises.length - 1}
                    idx={i}
                  />
                  {section === 'resistance' && i < exercises.length - 1 && (
                    <BetweenExerciseRest
                      dayId={dayId}
                      defaultSeconds={ex.betweenRestSeconds || 120}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <CompleteCard
            day={day}
            clientId={clientId}
            weekId={weekId}
            dayId={dayId}
          />
        </div>
      </div>

      <FloatingDock
        canSave={canSave}
        canReorder={canReorder}
        onLoad={() => setLoadPresetOpen(true)}
        onSave={() => setSavePresetOpen(true)}
        onAdd={() => setCreateOpen(true)}
        onReorder={() => setReorderOpen(true)}
      />

      <ReorderExercisesModal
        open={reorderOpen}
        onClose={() => setReorderOpen(false)}
        clientId={clientId}
        weekId={weekId}
        dayId={dayId}
        section={section}
        exercises={exercises}
      />

      <SavePresetModal
        open={savePresetOpen}
        onClose={() => setSavePresetOpen(false)}
        clientId={clientId}
        weekId={weekId}
        dayId={dayId}
        onSave={async (preset) => {
          await addPreset(preset);
        }}
      />

      <LoadPresetModal
        open={loadPresetOpen}
        onClose={() => setLoadPresetOpen(false)}
        clientId={clientId}
        weekId={weekId}
        dayId={dayId}
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
