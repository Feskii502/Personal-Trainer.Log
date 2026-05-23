import { useMemo, useState } from 'react';
import {
  Play,
  Square,
  Plus,
  Trash2,
  TrendingUp,
  X,
  ChevronUp,
  ChevronDown,
  Check,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  addSet,
  updateSet,
  removeSet,
  addDropSet,
  updateDropSet,
  removeDropSet,
  removeExercise,
  updateExercise,
  moveExercise,
  flushSave,
} from '../lib/store.js';
import {
  cx,
  fmtSeconds,
  isTimed,
  hasWeight,
  previousSetsFor,
  fmtPrevSet,
} from '../lib/utils.js';
import {
  startSet,
  stopSet,
  isSetRunning,
  getSetElapsed,
  startRest,
  stopRest,
  useTimerStore,
  useRefresh,
} from '../hooks/useTimers.js';
import HistoryPanel from './HistoryPanel.jsx';

// ---------- Number input (text+decimal, scroll-safe) ----------
function NumInput({ value, onChange, placeholder, suffix, ariaLabel }) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        pattern="[0-9]*\.?[0-9]*"
        autoComplete="off"
        aria-label={ariaLabel}
        className="w-full bg-bg-base border border-border rounded-btn h-10 px-2 pr-6 text-[13px] tabular font-semibold outline-none focus:border-brand-lime text-txt-primary placeholder:text-txt-muted/60 text-center"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return onChange(null);
          if (!/^\d*\.?\d*$/.test(raw)) return;
          if (raw === '.' || raw.endsWith('.')) return onChange(Number(raw) || 0);
          onChange(Number(raw));
        }}
      />
      {suffix && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-txt-muted tabular pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

// ---------- Set row ----------
function SetRow({
  clientId,
  weekId,
  dayId,
  section,
  exercise,
  set,
  isLastSet,
  isLastExercise,
  prev, // previous-session value for this set number
}) {
  const timed = isTimed(exercise.type);
  const weighted = hasWeight(exercise.type);
  useTimerStore();
  useRefresh(250);

  const running = isSetRunning(set.id);
  const elapsed = getSetElapsed(set.id);
  const prevText = useMemo(
    () => fmtPrevSet(prev, exercise.type),
    [prev, exercise.type]
  );

  const patch = (p) =>
    updateSet(clientId, weekId, dayId, section, exercise.id, set.id, p);

  const start = () => {
    startSet(set.id);
    stopRest(`rest:${exercise.id}`);
  };

  const stop = () => {
    const secs = Math.max(1, stopSet(set.id));
    const p = { completed: true, elapsedSeconds: secs };
    if (timed) p.duration = secs;
    patch(p);
    flushSave();

    if (isLastSet) {
      if (!isLastExercise) {
        const betweenSeconds = exercise.betweenRestSeconds ?? 120;
        if (betweenSeconds > 0) {
          startRest(`between:${dayId}`, betweenSeconds, {
            kind: 'between',
            exerciseName: exercise.name,
          });
        }
      }
    } else {
      startRest(`rest:${exercise.id}`, exercise.restSeconds || 90, {
        kind: 'set',
        exerciseName: exercise.name,
        nextSet: set.setNumber + 1,
      });
    }
  };

  const toggleDone = () => {
    patch({ completed: !set.completed });
    flushSave();
  };

  const remove = () =>
    removeSet(clientId, weekId, dayId, section, exercise.id, set.id);

  const setIdxCell = (
    <div className="font-display tabular font-bold text-[15px] leading-none text-txt-secondary text-center">
      #{set.setNumber}
    </div>
  );

  const prevCell = (
    <div className="flex flex-col items-start">
      <div className="text-[8px] uppercase tracking-wider text-txt-muted leading-none mb-0.5">
        Prev
      </div>
      <div
        className={cx(
          'text-[11px] tabular leading-none whitespace-nowrap',
          prevText ? 'text-txt-secondary' : 'text-txt-muted'
        )}
      >
        {prevText || '—'}
      </div>
    </div>
  );

  const weightInput = weighted ? (
    <NumInput
      value={set.weight}
      placeholder="kg"
      suffix={exercise.type === '-kg' ? '-kg' : 'kg'}
      onChange={(v) => patch({ weight: v })}
      ariaLabel="Weight"
    />
  ) : (
    <div />
  );

  const repsInput = timed ? (
    <NumInput
      value={set.duration}
      placeholder="sec"
      suffix="s"
      onChange={(v) => patch({ duration: v })}
      ariaLabel="Duration"
    />
  ) : (
    <NumInput
      value={set.reps}
      placeholder="reps"
      onChange={(v) => patch({ reps: v })}
      ariaLabel="Reps"
    />
  );

  const timerBtn = running ? (
    <button
      onClick={stop}
      className="h-11 px-3 rounded-btn flex items-center justify-center gap-2 font-display font-bold tabular text-[14px] bg-brand-red text-black w-full sm:w-auto"
      style={{ minWidth: 110 }}
    >
      <Square size={12} fill="currentColor" />
      {fmtSeconds(elapsed)}
    </button>
  ) : (
    <button
      onClick={start}
      className="h-11 px-3 rounded-btn flex items-center justify-center gap-2 font-display font-semibold tabular text-[13px] border border-brand-lime/60 text-brand-lime bg-transparent hover:bg-brand-lime/[0.06] w-full sm:w-auto"
      style={{ minWidth: 110 }}
    >
      <Play size={11} fill="currentColor" />
      {set.completed
        ? set.elapsedSeconds != null && set.elapsedSeconds > 0
          ? fmtSeconds(set.elapsedSeconds)
          : 'Done'
        : 'Start'}
    </button>
  );

  const checkBtn = (
    <button
      onClick={toggleDone}
      aria-label={set.completed ? 'Mark set incomplete' : 'Mark set complete'}
      title={set.completed ? 'Mark incomplete' : 'Mark complete'}
      className="inline-flex items-center justify-center rounded-full transition-colors flex-shrink-0"
      style={{
        width: 36,
        height: 36,
        background: set.completed ? '#3ADBC714' : 'transparent',
        border: set.completed ? '1px solid #3ADBC766' : '1px solid #3a3a40',
        color: set.completed ? '#3ADBC7' : '#8A8A90',
      }}
    >
      <Check size={16} strokeWidth={3} />
    </button>
  );

  const dropBtn = (
    <button
      onClick={() =>
        addDropSet(clientId, weekId, dayId, section, exercise.id, set.id)
      }
      className="w-9 h-9 inline-flex items-center justify-center rounded-full border border-border text-txt-secondary hover:text-brand-lime hover:border-brand-lime"
      aria-label="Add drop set"
      title="Add drop set"
    >
      <ChevronDown size={14} />
    </button>
  );

  const deleteBtn = (
    <button
      onClick={remove}
      className="w-9 h-9 inline-flex items-center justify-center rounded-full text-txt-muted hover:text-brand-red"
      aria-label="Remove set"
    >
      <X size={14} />
    </button>
  );

  return (
    <div
      className={cx('rounded-btn transition-colors px-2 py-2')}
      style={{
        background: running ? 'rgba(212,255,58,0.05)' : 'transparent',
      }}
    >
      {/* Phone: two rows. Row 1: #, prev, weight, reps. Row 2: drop, timer, check, X. */}
      <div className="sm:hidden space-y-3">
        <div
          className="grid items-center gap-3"
          style={{ gridTemplateColumns: '32px 1fr 1fr 1fr' }}
        >
          {setIdxCell}
          {prevCell}
          {weightInput}
          {repsInput}
        </div>
        <div className="flex items-center gap-3">
          {dropBtn}
          <div className="flex-1">{timerBtn}</div>
          {checkBtn}
          {deleteBtn}
        </div>
      </div>

      {/* Desktop: one row. # | prev | weight | reps | drop | timer | check | X */}
      <div
        className="hidden sm:grid items-center gap-3"
        style={{
          gridTemplateColumns:
            '36px 96px minmax(80px,110px) minmax(80px,110px) auto auto auto auto',
        }}
      >
        {setIdxCell}
        {prevCell}
        {weightInput}
        {repsInput}
        {dropBtn}
        {timerBtn}
        {checkBtn}
        {deleteBtn}
      </div>

      {/* Drop sets */}
      {set.dropSets?.length > 0 && (
        <div className="mt-2 sm:pl-[140px] space-y-1.5">
          {set.dropSets.map((ds) => (
            <div
              key={ds.id}
              className="grid items-center gap-2"
              style={{
                gridTemplateColumns: 'auto minmax(0,1fr) minmax(0,1fr) auto',
              }}
            >
              <span className="text-[9px] uppercase tracking-wider font-semibold text-txt-muted">
                Drop
              </span>
              {weighted ? (
                <NumInput
                  value={ds.weight}
                  placeholder="kg"
                  suffix="kg"
                  onChange={(v) =>
                    updateDropSet(
                      clientId,
                      weekId,
                      dayId,
                      section,
                      exercise.id,
                      set.id,
                      ds.id,
                      { weight: v }
                    )
                  }
                />
              ) : (
                <div />
              )}
              <NumInput
                value={ds.reps}
                placeholder="reps"
                onChange={(v) =>
                  updateDropSet(
                    clientId,
                    weekId,
                    dayId,
                    section,
                    exercise.id,
                    set.id,
                    ds.id,
                    { reps: v }
                  )
                }
              />
              <button
                className="w-8 h-8 inline-flex items-center justify-center rounded-full text-txt-muted hover:text-brand-red"
                onClick={() =>
                  removeDropSet(
                    clientId,
                    weekId,
                    dayId,
                    section,
                    exercise.id,
                    set.id,
                    ds.id
                  )
                }
                aria-label="Remove drop set"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- ExerciseBlock ----------
export default function ExerciseBlock({
  client,
  weekId,
  dayId,
  section,
  exercise,
  canMoveUp,
  canMoveDown,
  isLastExercise = false,
  idx = 0,
}) {
  const [showHistory, setShowHistory] = useState(false);

  const completed = exercise.sets.filter((s) => s.completed).length;
  const total = exercise.sets.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const allDone = total > 0 && completed === total;

  const prevByNumber = useMemo(
    () => previousSetsFor(client, exercise.libraryId, dayId),
    [client, exercise.libraryId, dayId]
  );

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-4 border-b border-border flex-wrap">
        <div className="font-display tabular font-semibold text-txt-muted text-[14px] w-7 flex-shrink-0">
          {String(idx + 1).padStart(2, '0')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-display font-semibold text-[16px] tracking-tight truncate">
              {exercise.name}
            </div>
            <span className="text-[9px] tabular font-semibold uppercase px-2 py-0.5 rounded-full border border-border text-txt-secondary">
              {exercise.type}
            </span>
          </div>
          <div className="text-[11px] text-txt-secondary mt-1">
            <span className="font-semibold text-txt-primary uppercase tracking-wide">
              {exercise.mainMuscle}
            </span>
            {exercise.subMuscles?.length > 0 && (
              <span className="text-txt-muted">
                {' '}· {exercise.subMuscles.join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div
            className="font-display tabular font-semibold text-[15px] leading-none"
            style={{ color: allDone ? '#3ADBC7' : '#F5F5F7' }}
          >
            {completed}
            <span className="text-txt-muted text-[12px]">/{total}</span>
          </div>
          <div className="text-[9px] uppercase tracking-wider text-txt-muted mt-1">
            Sets
          </div>
        </div>

        {/* Inline reorder + history + remove buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() =>
              moveExercise(client.id, weekId, dayId, section, exercise.id, 'up')
            }
            disabled={!canMoveUp}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full text-txt-secondary hover:text-txt-primary disabled:opacity-25 disabled:cursor-not-allowed"
            aria-label="Move up"
            title="Move up"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={() =>
              moveExercise(client.id, weekId, dayId, section, exercise.id, 'down')
            }
            disabled={!canMoveDown}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full text-txt-secondary hover:text-txt-primary disabled:opacity-25 disabled:cursor-not-allowed"
            aria-label="Move down"
            title="Move down"
          >
            <ArrowDown size={14} />
          </button>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="h-8 px-2.5 rounded-full text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 text-txt-secondary hover:text-txt-primary border border-border"
            title="Toggle history"
          >
            <TrendingUp size={12} />
            <span className="hidden sm:inline">History</span>
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            onClick={() =>
              removeExercise(client.id, weekId, dayId, section, exercise.id)
            }
            className="w-8 h-8 inline-flex items-center justify-center rounded-full text-txt-muted hover:text-brand-red"
            aria-label="Remove exercise"
            title="Remove exercise"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5" style={{ background: '#1C1C1F' }}>
        <div
          className="h-full transition-all"
          style={{
            width: pct + '%',
            background: allDone ? '#3ADBC7' : '#D4FF3A',
          }}
        />
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="px-5 py-4 border-b border-border bg-bg-base/40">
          <HistoryPanel client={client} exercise={exercise} />
        </div>
      )}

      {/* Set rows */}
      <div className="px-3 sm:px-5 py-3 space-y-1.5">
        {exercise.sets.length === 0 ? (
          <div className="text-center py-4 text-txt-muted text-[12px]">
            No sets yet.
          </div>
        ) : (
          exercise.sets.map((s, i) => (
            <SetRow
              key={s.id}
              clientId={client.id}
              weekId={weekId}
              dayId={dayId}
              section={section}
              exercise={exercise}
              set={s}
              isLastSet={i === exercise.sets.length - 1}
              isLastExercise={isLastExercise}
              prev={prevByNumber[s.setNumber]}
            />
          ))
        )}

        {/* Footer: Add Set + rest seconds */}
        <div className="flex items-center justify-between gap-3 pt-3 mt-1 border-t border-border flex-wrap">
          <button
            className="h-9 px-3 rounded-full text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 border border-border text-txt-secondary hover:text-txt-primary hover:border-txt-muted"
            onClick={() => addSet(client.id, weekId, dayId, section, exercise.id)}
          >
            <Plus size={12} /> Add Set
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-txt-muted">
              Rest
            </span>
            <input
              type="number"
              inputMode="numeric"
              className="bg-bg-base border border-border rounded-btn tabular text-center text-[12px]"
              style={{ width: 64, height: 32, padding: '0 8px' }}
              value={exercise.restSeconds ?? 90}
              onChange={(e) =>
                updateExercise(client.id, weekId, dayId, section, exercise.id, {
                  restSeconds: Math.max(0, Number(e.target.value) || 0),
                })
              }
              aria-label="Rest seconds"
            />
            <span className="text-[10px] text-txt-muted">sec</span>
          </div>
        </div>
      </div>
    </div>
  );
}
