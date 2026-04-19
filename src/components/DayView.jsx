import { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Flame, Dumbbell, Snowflake } from 'lucide-react';
import { useStore, updateDay } from '../lib/store.js';
import { DAY_NAMES, cx } from '../lib/utils.js';
import PhaseBadge from './ui/PhaseBadge.jsx';
import TagEditor from './ui/TagEditor.jsx';
import AddExerciseModal from './AddExerciseModal.jsx';
import ExerciseBlock from './ExerciseBlock.jsx';
import BetweenExerciseRest from './BetweenExerciseRest.jsx';

const SECTIONS = [
  { key: 'warmUp', label: 'Warm Up', icon: Flame },
  { key: 'resistance', label: 'Resistance', icon: Dumbbell },
  { key: 'coolDown', label: 'Cool Down', icon: Snowflake },
];

function SessionSummary({ day }) {
  const stats = useMemo(() => {
    let sets = 0;
    let completed = 0;
    let seconds = 0;
    for (const k of ['warmUp', 'resistance', 'coolDown']) {
      for (const ex of day.sections[k]) {
        for (const s of ex.sets) {
          sets++;
          if (s.completed) completed++;
          seconds += s.elapsedSeconds || 0;
        }
      }
    }
    return { sets, completed, seconds };
  }, [day]);

  const m = Math.floor(stats.seconds / 60);
  const s = stats.seconds % 60;

  return (
    <div className="card p-4">
      <div className="section-title mb-3">Session Summary</div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-xs text-txt-secondary uppercase tracking-wide">
            Sets
          </div>
          <div className="font-display text-2xl font-bold tabular mt-1">
            {stats.completed}
            <span className="text-txt-muted text-base">/{stats.sets}</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-txt-secondary uppercase tracking-wide">
            Time
          </div>
          <div className="font-display text-2xl font-bold tabular mt-1">
            {m}:{String(s).padStart(2, '0')}
          </div>
        </div>
        <div>
          <div className="text-xs text-txt-secondary uppercase tracking-wide">
            Ex
          </div>
          <div className="font-display text-2xl font-bold tabular mt-1">
            {day.sections.warmUp.length +
              day.sections.resistance.length +
              day.sections.coolDown.length}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionNav({ day, active, onSelect, orientation = 'v' }) {
  return (
    <div
      className={cx(
        orientation === 'v' ? 'flex flex-col gap-2' : 'flex gap-2 overflow-x-auto no-scrollbar'
      )}
    >
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const count = day.sections[s.key].length;
        const isActive = active === s.key;
        return (
          <button
            key={s.key}
            onClick={() => onSelect(s.key)}
            className={cx(
              'flex items-center gap-3 px-4 rounded-btn text-sm font-semibold transition-colors w-full',
              isActive
                ? 'bg-bg-elevated text-brand-lime border border-border'
                : 'text-txt-secondary hover:text-txt-primary border border-transparent'
            )}
            style={{ minHeight: 52 }}
          >
            <Icon size={18} />
            <span className="flex-1 text-left">{s.label}</span>
            <span
              className="tabular text-xs px-2 py-0.5 rounded-pill"
              style={{
                background: isActive ? '#D4FF3A14' : '#1C1C1F',
                color: isActive ? '#D4FF3A' : '#8A8A90',
                border: '1px solid #26262A',
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function DayView({ clientId, weekId, dayId, onBack }) {
  const { clients } = useStore();
  const client = clients.find((c) => c.id === clientId);
  const week = client?.weeks.find((w) => w.id === weekId);
  const day = week?.days.find((d) => d.id === dayId);

  const [section, setSection] = useState('resistance');
  const [addOpen, setAddOpen] = useState(false);

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

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <button className="btn-icon text-txt-secondary" onClick={onBack}>
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-3">
            <span className="section-title">{client.name}</span>
            <span className="text-txt-muted">·</span>
            <span className="section-title">Week {week.number}</span>
          </div>
          <div style={{ width: 44 }} />
        </div>

        <div className="flex items-end gap-4 flex-wrap mb-5">
          <div>
            <div className="section-title">
              Day {day.dayNumber} · {DAY_NAMES[day.dayNumber - 1]}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              {sectionLabel}
            </h1>
          </div>
          <PhaseBadge phase={week.phase} />
        </div>

        <div className="card p-4 mb-6">
          <div className="section-title mb-3">Day Tags · select any that apply</div>
          <TagEditor
            value={day.tags || []}
            onChange={(tags) => updateDay(clientId, weekId, dayId, { tags })}
          />
        </div>

        {/* Landscape split-pane */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
            <div className="card p-4">
              <div className="section-title mb-3">Sections</div>
              <SectionNav day={day} active={section} onSelect={setSection} />
            </div>
            <SessionSummary day={day} />
          </aside>

          <section className="min-w-0">
            {/* Mobile/portrait section tabs */}
            <div className="lg:hidden mb-4">
              <div className="flex gap-2 bg-bg-surface border border-border rounded-btn p-1">
                {SECTIONS.map((s) => {
                  const Icon = s.icon;
                  const active = section === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setSection(s.key)}
                      className={cx(
                        'flex-1 flex items-center justify-center gap-2 rounded-btn text-sm font-semibold',
                        active
                          ? 'bg-bg-elevated text-brand-lime'
                          : 'text-txt-secondary'
                      )}
                      style={{ minHeight: 48 }}
                      aria-label={s.label}
                    >
                      <Icon size={16} />
                      <span className="hidden sm:inline">{s.label}</span>
                      <span className="tabular text-[10px] text-txt-muted ml-1">
                        {day.sections[s.key].length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="section-title">
                {exercises.length} exercise{exercises.length === 1 ? '' : 's'}
              </div>
              <button
                className="btn-primary btn-sm"
                onClick={() => setAddOpen(true)}
              >
                <Plus size={18} /> Add Exercise
              </button>
            </div>

            {exercises.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="font-display text-lg mb-1">
                  No exercises in {sectionLabel.toLowerCase()} yet
                </div>
                <div className="text-txt-secondary mb-5">
                  Add exercises from the library or create a new one.
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus size={20} /> Add Exercise
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
                    {section === 'resistance' &&
                      idx < exercises.length - 1 && (
                        <BetweenExerciseRest dayId={dayId} />
                      )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <AddExerciseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        clientId={clientId}
        weekId={weekId}
        dayId={dayId}
        section={section}
      />
    </div>
  );
}
