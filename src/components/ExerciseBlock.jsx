import { useState } from 'react';
import {
  Play,
  Square,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  X,
  Timer,
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
} from '../lib/store.js';
import {
  cx,
  fmtSeconds,
  isTimed,
  hasWeight,
} from '../lib/utils.js';
import {
  startSet,
  stopSet,
  isSetRunning,
  getSetElapsed,
  startRest,
  stopRest,
  getRestRemaining,
  useTimerStore,
  useRefresh,
} from '../hooks/useTimers.js';
import RestRing from './ui/RestRing.jsx';
import HistoryPanel from './HistoryPanel.jsx';

function NumInput({ value, onChange, placeholder, suffix }) {
  return (
    <div className="relative">
      <input
        inputMode="decimal"
        type="number"
        className="input-num"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? null : Number(v));
        }}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-txt-muted tabular">
          {suffix}
        </span>
      )}
    </div>
  );
}

function SetRow({
  clientId,
  weekId,
  dayId,
  section,
  exercise,
  set,
  prevTimerId,
}) {
  const timed = isTimed(exercise.type);
  const weighted = hasWeight(exercise.type);
  useTimerStore();
  useRefresh(250);

  const running = isSetRunning(set.id);
  const elapsed = getSetElapsed(set.id);

  const patch = (p) =>
    updateSet(clientId, weekId, dayId, section, exercise.id, set.id, p);

  const start = () => {
    startSet(set.id);
    stopRest(`rest:${exercise.id}`);
  };

  const stop = () => {
    const secs = stopSet(set.id);
    const p = { completed: true, elapsedSeconds: secs };
    if (timed) p.duration = secs;
    patch(p);
    startRest(`rest:${exercise.id}`, exercise.restSeconds || 90);
  };

  const remove = () =>
    removeSet(clientId, weekId, dayId, section, exercise.id, set.id);

  return (
    <div
      className={cx(
        'rounded-btn transition-colors',
        running && 'animate-pulse-lime'
      )}
      style={{
        background: running ? '#D4FF3A0A' : set.setNumber % 2 ? '#141416' : '#17171A',
        border: running ? '1px solid #D4FF3A' : '1px solid #26262A',
      }}
    >
      <div
        className="grid items-center gap-2 p-3"
        style={{
          gridTemplateColumns:
            'minmax(44px,56px) minmax(90px,1fr) minmax(90px,1fr) minmax(160px,auto) auto auto',
        }}
      >
        <div className="tabular font-display font-bold text-lg text-txt-secondary pl-2">
          #{set.setNumber}
        </div>

        {weighted ? (
          <NumInput
            value={set.weight}
            placeholder="kg"
            suffix={exercise.type === '-kg' ? '-kg' : 'kg'}
            onChange={(v) => patch({ weight: v })}
          />
        ) : (
          <div />
        )}

        {timed ? (
          <NumInput
            value={set.duration}
            placeholder="sec"
            suffix="s"
            onChange={(v) => patch({ duration: v })}
          />
        ) : (
          <NumInput
            value={set.reps}
            placeholder="reps"
            onChange={(v) => patch({ reps: v })}
          />
        )}

        <div className="flex items-center gap-2">
          {running ? (
            <button
              onClick={stop}
              className="btn-danger btn-sm tabular"
              style={{ minWidth: 120 }}
            >
              <Square size={14} fill="currentColor" />
              {fmtSeconds(elapsed)}
            </button>
          ) : (
            <button
              onClick={start}
              className="btn-sm tabular border border-brand-lime text-brand-lime bg-transparent"
              style={{ minWidth: 120 }}
            >
              <Play size={14} fill="currentColor" />
              {set.completed && set.elapsedSeconds
                ? fmtSeconds(set.elapsedSeconds)
                : 'Start'}
            </button>
          )}
          <button
            onClick={() =>
              addDropSet(clientId, weekId, dayId, section, exercise.id, set.id)
            }
            className="btn-icon text-txt-secondary hover:text-brand-lime"
            aria-label="Add drop set"
            title="Add drop set"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        <div />
        <button
          onClick={remove}
          className="btn-icon text-txt-muted hover:text-brand-red"
          aria-label="Remove set"
        >
          <X size={18} />
        </button>
      </div>

      {set.dropSets?.length > 0 && (
        <div className="px-3 pb-3 pl-10 space-y-2">
          {set.dropSets.map((ds) => (
            <div
              key={ds.id}
              className="grid items-center gap-2"
              style={{
                gridTemplateColumns: 'auto minmax(90px,1fr) minmax(90px,1fr) auto',
              }}
            >
              <span className="text-[10px] uppercase tracking-wider font-semibold text-txt-muted">
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
                className="btn-icon text-txt-muted hover:text-brand-red"
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
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RestCountdown({ exerciseId }) {
  useTimerStore();
  useRefresh(250);
  const { remaining, total, active } = getRestRemaining(`rest:${exerciseId}`);
  if (!active) return null;
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-btn"
      style={{
        background: '#D4FF3A0A',
        border: '1px solid #D4FF3A33',
      }}
    >
      <RestRing remaining={remaining} total={total} size={100} stroke={8} />
      <div className="flex-1">
        <div className="section-title" style={{ color: '#D4FF3A' }}>
          Resting
        </div>
        <div className="text-sm text-txt-secondary tabular mt-1">
          Next set in {fmtSeconds(remaining)}
        </div>
      </div>
      <button
        className="btn-secondary btn-sm"
        onClick={() => stopRest(`rest:${exerciseId}`)}
      >
        Skip
      </button>
    </div>
  );
}

export default function ExerciseBlock({
  client,
  weekId,
  dayId,
  section,
  exercise,
  canMoveUp,
  canMoveDown,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const weighted = hasWeight(exercise.type);
  const timed = isTimed(exercise.type);

  return (
    <div className="card overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-4 border-b border-border">
        <div className="min-w-0">
          <div className="font-display text-lg md:text-xl font-semibold tracking-tight truncate">
            {exercise.name}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-txt-secondary uppercase tracking-wide">
              {exercise.mainMuscle}
            </span>
            {exercise.subMuscles?.length > 0 && (
              <span className="text-xs text-txt-muted">
                · {exercise.subMuscles.join(', ')}
              </span>
            )}
            <span
              className="text-[10px] tabular font-semibold uppercase px-1.5 py-0.5 rounded"
              style={{
                color: '#D4FF3A',
                background: '#D4FF3A14',
              }}
            >
              {exercise.type}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center rounded-btn border border-border overflow-hidden">
            <button
              onClick={() =>
                moveExercise(client.id, weekId, dayId, section, exercise.id, 'up')
              }
              disabled={!canMoveUp}
              className="btn-icon text-txt-secondary disabled:text-txt-muted/50 disabled:cursor-not-allowed"
              aria-label="Move up"
              title="Move up"
            >
              <ArrowUp size={18} />
            </button>
            <div className="w-px h-6 bg-border" />
            <button
              onClick={() =>
                moveExercise(client.id, weekId, dayId, section, exercise.id, 'down')
              }
              disabled={!canMoveDown}
              className="btn-icon text-txt-secondary disabled:text-txt-muted/50 disabled:cursor-not-allowed"
              aria-label="Move down"
              title="Move down"
            >
              <ArrowDown size={18} />
            </button>
          </div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="btn-sm btn-secondary"
          >
            <TrendingUp size={14} />
            History
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() =>
              removeExercise(client.id, weekId, dayId, section, exercise.id)
            }
            className="btn-icon text-txt-muted hover:text-brand-red"
            aria-label="Remove exercise"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="p-5 border-b border-border bg-bg-base">
          <HistoryPanel client={client} exercise={exercise} />
        </div>
      )}

      <div className="p-5 space-y-3">
        {/* Column headers */}
        <div
          className="hidden md:grid gap-2 px-3 text-[10px] uppercase tracking-wider font-semibold text-txt-muted"
          style={{
            gridTemplateColumns:
              'minmax(44px,56px) minmax(90px,1fr) minmax(90px,1fr) minmax(160px,auto) auto auto',
          }}
        >
          <div>Set</div>
          <div className="text-center">{weighted ? 'Weight' : ''}</div>
          <div className="text-center">{timed ? 'Time' : 'Reps'}</div>
          <div>Timer</div>
          <div />
          <div />
        </div>

        {exercise.sets.length === 0 ? (
          <div className="text-center py-6 text-txt-secondary text-sm">
            No sets yet.
          </div>
        ) : (
          exercise.sets.map((s) => (
            <SetRow
              key={s.id}
              clientId={client.id}
              weekId={weekId}
              dayId={dayId}
              section={section}
              exercise={exercise}
              set={s}
            />
          ))
        )}

        <RestCountdown exerciseId={exercise.id} />

        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <button
            className="btn-secondary btn-sm"
            onClick={() =>
              addSet(client.id, weekId, dayId, section, exercise.id)
            }
          >
            <Plus size={16} /> Add Set
          </button>
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-txt-secondary" />
            <span className="text-xs text-txt-secondary uppercase tracking-wide">
              Rest
            </span>
            <input
              type="number"
              inputMode="numeric"
              className="input tabular text-center"
              style={{ width: 90, minHeight: 40, padding: '4px 10px' }}
              value={exercise.restSeconds ?? 90}
              onChange={(e) =>
                updateExercise(
                  client.id,
                  weekId,
                  dayId,
                  section,
                  exercise.id,
                  {
                    restSeconds: Math.max(0, Number(e.target.value) || 0),
                  }
                )
              }
            />
            <span className="text-xs text-txt-muted">sec</span>
          </div>
        </div>
      </div>
    </div>
  );
}
