import { ArrowLeft, Trash2 } from 'lucide-react';
import { useStore, deleteWeek, updateWeek } from '../lib/store.js';
import { DAY_NAMES } from '../lib/utils.js';
import PhaseBadge from './ui/PhaseBadge.jsx';
import TagEditor from './ui/TagEditor.jsx';

function DayCard({ day, onOpen }) {
  const total =
    day.sections.warmUp.length +
    day.sections.resistance.length +
    day.sections.coolDown.length;
  const hasContent = total > 0;

  return (
    <button
      onClick={onOpen}
      className="card p-4 md:p-5 text-left transition-transform active:scale-[0.97] hover:border-[#333338] flex flex-col gap-3"
      style={{ minHeight: 150 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="section-title">Day</div>
          <div className="font-display text-2xl md:text-3xl font-bold tabular">
            {day.dayNumber}
          </div>
        </div>
        {hasContent && (
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: '#D4FF3A' }}
          />
        )}
      </div>
      <div className="section-title text-txt-secondary">
        {DAY_NAMES[day.dayNumber - 1]}
      </div>
      <div className="text-xs text-txt-secondary tabular mt-auto">
        {hasContent ? `${total} exercises` : 'Empty'}
      </div>
    </button>
  );
}

export default function WeekView({ clientId, weekId, onBack, onOpenDay }) {
  const { clients } = useStore();
  const client = clients.find((c) => c.id === clientId);
  const week = client?.weeks.find((w) => w.id === weekId);

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

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 pt-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <button className="btn-icon text-txt-secondary" onClick={onBack}>
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div className="section-title">{client.name}</div>
          </div>
          <button
            className="btn-icon text-txt-secondary hover:text-brand-red"
            onClick={() => {
              if (confirm(`Delete week ${week.number}?`)) {
                deleteWeek(clientId, weekId);
                onBack();
              }
            }}
            aria-label="Delete week"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="flex items-end gap-4 flex-wrap mb-6">
          <div>
            <div className="section-title">Week</div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tabular tracking-tight">
              {week.number}
            </h1>
          </div>
          <PhaseBadge phase={week.phase} />
        </div>

        <div className="card p-4 mb-8">
          <div className="section-title mb-3">Tags</div>
          <TagEditor
            value={week.tags || []}
            onChange={(tags) => updateWeek(clientId, weekId, { tags })}
          />
        </div>

        {/* Landscape / large: 7 columns. Portrait: 4 + 3. */}
        <div className="hidden lg:grid grid-cols-7 gap-4">
          {week.days.map((d) => (
            <DayCard key={d.id} day={d} onOpen={() => onOpenDay(d.id)} />
          ))}
        </div>
        <div className="grid lg:hidden grid-cols-4 gap-3">
          {week.days.slice(0, 4).map((d) => (
            <DayCard key={d.id} day={d} onOpen={() => onOpenDay(d.id)} />
          ))}
        </div>
        <div className="grid lg:hidden grid-cols-3 gap-3 mt-3">
          {week.days.slice(4).map((d) => (
            <DayCard key={d.id} day={d} onOpen={() => onOpenDay(d.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}
