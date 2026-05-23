import { useMemo } from 'react';
import { ArrowLeft, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { useStore, deleteWeek } from '../lib/store.js';
import {
  DAY_NAMES,
  cx,
  initialsOf,
  phaseColor,
} from '../lib/utils.js';

function dayStats(day) {
  let total = 0;
  let done = 0;
  for (const k of ['warmUp', 'resistance', 'coolDown']) {
    for (const ex of day.sections[k]) {
      for (const s of ex.sets) {
        total++;
        if (s.completed) done++;
      }
    }
  }
  return { total, done };
}

function DayCard({ day, onOpen, phaseHex }) {
  const exCount =
    day.sections.warmUp.length +
    day.sections.resistance.length +
    day.sections.coolDown.length;
  const hasContent = exCount > 0;
  const { total, done } = dayStats(day);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done >= total;

  return (
    <button
      onClick={onOpen}
      className="card text-left transition-all active:scale-[0.98] hover:border-[#3a3a40] flex flex-col p-4 sm:p-5 relative overflow-hidden"
      style={{ minHeight: 156 }}
    >
      {hasContent && (
        <div
          className="absolute top-0 left-0 right-0"
          style={{ height: 2, background: complete ? '#3ADBC7' : phaseHex }}
        />
      )}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-baseline gap-1.5">
          <div className="font-display tabular font-bold text-3xl leading-none">
            {day.dayNumber}
          </div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-txt-muted">
            {DAY_NAMES[day.dayNumber - 1]}
          </div>
        </div>
        {hasContent ? (
          day.completed || complete ? (
            <CheckCircle2 size={18} className="text-[#3ADBC7]" />
          ) : (
            <Circle size={18} className="text-txt-muted" />
          )
        ) : null}
      </div>

      {day.title && (
        <div className="font-display font-semibold text-[13px] sm:text-sm leading-snug truncate mb-1.5">
          {day.title}
        </div>
      )}

      <div className="mt-auto">
        <div className="text-[11px] tabular text-txt-secondary mb-1.5">
          {hasContent ? (
            <>
              {exCount} exercise{exCount === 1 ? '' : 's'} · {done}/{total} sets
            </>
          ) : (
            'Empty'
          )}
        </div>
        {hasContent && (
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: '#1C1C1F' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: pct + '%',
                background: complete ? '#3ADBC7' : phaseHex,
              }}
            />
          </div>
        )}
      </div>
    </button>
  );
}

export default function WeekView({ clientId, weekId, onBack, onOpenDay }) {
  const { clients } = useStore();
  const client = clients.find((c) => c.id === clientId);
  const week = client?.weeks.find((w) => w.id === weekId);

  const stats = useMemo(() => {
    if (!week) return null;
    let totalEx = 0;
    let totalSets = 0;
    let doneSets = 0;
    let activeDays = 0;
    for (const d of week.days) {
      const ds = dayStats(d);
      totalSets += ds.total;
      doneSets += ds.done;
      const ex =
        d.sections.warmUp.length +
        d.sections.resistance.length +
        d.sections.coolDown.length;
      totalEx += ex;
      if (ex > 0) activeDays++;
    }
    return { totalEx, totalSets, doneSets, activeDays };
  }, [week]);

  if (!week) {
    return (
      <div className="p-8">
        <button className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="mt-10 text-center text-txt-secondary">Week not found.</div>
      </div>
    );
  }

  const phaseHex = phaseColor(week.phase);
  const pct =
    stats.totalSets > 0
      ? Math.round((stats.doneSets / stats.totalSets) * 100)
      : 0;

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-20 space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="btn-icon text-txt-secondary hover:text-txt-primary"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="section-title">{client.name}</div>
          <button
            className="btn-icon text-txt-muted hover:text-brand-red"
            onClick={() => {
              if (confirm(`Delete week ${week.number}?`)) {
                deleteWeek(clientId, weekId);
                onBack();
              }
            }}
            aria-label="Delete week"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Week header card */}
        <div className="card p-5 sm:p-6 relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0"
            style={{ height: 3, background: phaseHex }}
          />
          <div className="flex items-start gap-4 flex-wrap">
            <div
              className="rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0 relative"
              style={{
                width: 48,
                height: 48,
                background: '#1C1C1F',
                color: 'var(--c-brand-lime)',
                border: '1px solid #26262A',
              }}
            >
              {initialsOf(client.name) || '·'}
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
              <div className="section-title">Week</div>
              <div className="flex items-center gap-3 flex-wrap mt-0.5">
                <h1 className="font-display text-3xl sm:text-4xl font-bold tabular tracking-tight leading-none">
                  {week.number}
                </h1>
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 10, height: 10, background: phaseHex }}
                  />
                  <span className="text-sm uppercase tracking-wide font-semibold">
                    {week.phase}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-[10px] uppercase tracking-wider text-txt-muted">
                Progress
              </div>
              <div
                className="font-display tabular font-bold text-2xl mt-0.5"
                style={{ color: pct === 100 ? phaseHex : '#F5F5F7' }}
              >
                {pct}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-border">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-txt-muted">
                Active days
              </div>
              <div className="font-display tabular font-bold text-xl mt-0.5">
                {stats.activeDays}
                <span className="text-txt-muted text-sm">/7</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-txt-muted">
                Exercises
              </div>
              <div className="font-display tabular font-bold text-xl mt-0.5">
                {stats.totalEx}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-txt-muted">
                Sets
              </div>
              <div className="font-display tabular font-bold text-xl mt-0.5">
                {stats.doneSets}
                <span className="text-txt-muted text-sm">/{stats.totalSets}</span>
              </div>
            </div>
          </div>

          <div
            className="h-1.5 rounded-full overflow-hidden mt-4"
            style={{ background: '#1C1C1F' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: pct + '%',
                background: pct === 100 ? '#3ADBC7' : phaseHex,
              }}
            />
          </div>
        </div>

        {/* Days grid: 7 cols on lg, 1 column on phone, 2/4 in between */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {week.days.map((d) => (
            <DayCard
              key={d.id}
              day={d}
              onOpen={() => onOpenDay(d.id)}
              phaseHex={phaseHex}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
