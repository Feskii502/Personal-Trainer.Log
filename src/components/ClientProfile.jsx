import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  NotebookPen,
  Apple,
  Dumbbell,
  LineChart as LineChartIcon,
} from 'lucide-react';
import { useStore, updateClient, deleteClient, deleteWeek } from '../lib/store.js';
import { daysUntil, fmtDate, initialsOf, cx } from '../lib/utils.js';
import AddWeekModal from './AddWeekModal.jsx';
import PhaseBadge from './ui/PhaseBadge.jsx';
import ProgressTab from './ProgressTab.jsx';

const TABS = [
  { key: 'notes', label: 'Notes', icon: NotebookPen },
  { key: 'diet', label: 'Diet', icon: Apple },
  { key: 'progress', label: 'Progress', icon: LineChartIcon },
  { key: 'weeks', label: 'Weeks', icon: Dumbbell },
];

function NotesTab({ client }) {
  const [training, setTraining] = useState(client.trainingNotes || '');
  const [weaknesses, setWeaknesses] = useState(client.weaknesses || '');

  useEffect(() => {
    setTraining(client.trainingNotes || '');
    setWeaknesses(client.weaknesses || '');
  }, [client.id]);

  useEffect(() => {
    const t = setTimeout(
      () => updateClient(client.id, { trainingNotes: training, weaknesses }),
      250
    );
    return () => clearTimeout(t);
  }, [training, weaknesses]); // eslint-disable-line

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-5">
        <div className="section-title mb-3">Training Notes</div>
        <textarea
          className="input resize-none w-full"
          style={{ minHeight: 280 }}
          placeholder="Schedule, current phase, focus areas..."
          value={training}
          onChange={(e) => setTraining(e.target.value)}
        />
      </div>
      <div className="card p-5">
        <div className="section-title mb-3">Weaknesses & Watchouts</div>
        <textarea
          className="input resize-none w-full"
          style={{ minHeight: 280 }}
          placeholder="Mobility limitations, injury history, form cues..."
          value={weaknesses}
          onChange={(e) => setWeaknesses(e.target.value)}
        />
      </div>
    </div>
  );
}

function DietTab({ client }) {
  const [diet, setDiet] = useState(client.dietNotes || '');
  useEffect(() => setDiet(client.dietNotes || ''), [client.id]);
  useEffect(() => {
    const t = setTimeout(
      () => updateClient(client.id, { dietNotes: diet }),
      250
    );
    return () => clearTimeout(t);
  }, [diet]); // eslint-disable-line

  return (
    <div className="card p-5">
      <div className="section-title mb-3">Diet & Nutrition</div>
      <textarea
        className="input resize-none w-full"
        style={{ minHeight: 360 }}
        placeholder="Macros, restrictions, supplements, meal timing..."
        value={diet}
        onChange={(e) => setDiet(e.target.value)}
      />
    </div>
  );
}

function WeeksTab({ client, onOpenWeek }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="section-title">Training Weeks</div>
        <button className="btn-primary btn-sm" onClick={() => setOpen(true)}>
          <Plus size={18} />
          Add Week
        </button>
      </div>

      {(!client.weeks || client.weeks.length === 0) && (
        <div className="card p-10 text-center">
          <div className="font-display text-lg mb-1">No weeks yet</div>
          <div className="text-txt-secondary mb-5">
            Create a week and select a training phase to get started.
          </div>
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={20} /> Add Week
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {client.weeks?.map((w) => {
          const totalExercises = w.days.reduce(
            (a, d) =>
              a +
              d.sections.warmUp.length +
              d.sections.resistance.length +
              d.sections.coolDown.length,
            0
          );
          return (
            <button
              key={w.id}
              onClick={() => onOpenWeek(w.id)}
              className="card p-5 text-left transition-transform active:scale-[0.98] hover:border-[#333338] flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="section-title">Week</div>
                  <div className="font-display text-3xl font-bold tabular">
                    {w.number}
                  </div>
                </div>
                <PhaseBadge phase={w.phase} />
              </div>
              <div className="text-sm text-txt-secondary tabular">
                {totalExercises} exercise{totalExercises === 1 ? '' : 's'} logged
              </div>
            </button>
          );
        })}
      </div>

      <AddWeekModal
        open={open}
        clientId={client.id}
        onClose={() => setOpen(false)}
        onCreated={(id) => onOpenWeek(id)}
      />
    </div>
  );
}

export default function ClientProfile({ clientId, onBack, onOpenWeek }) {
  const { clients } = useStore();
  const client = clients.find((c) => c.id === clientId);
  const [tab, setTab] = useState('notes');

  if (!client) {
    return (
      <div className="p-8">
        <button className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
        <div className="mt-10 text-center text-txt-secondary">
          Client not found.
        </div>
      </div>
    );
  }

  const du = daysUntil(client.expiryDate);
  const expired = du < 0;
  const expiring = du >= 0 && du <= 30;

  const Sidebar = (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div
          className="flex items-center justify-center rounded-full font-display font-bold"
          style={{
            width: 64,
            height: 64,
            background: '#1C1C1F',
            color: '#D4FF3A',
            fontSize: 22,
            border: '1px solid #26262A',
          }}
        >
          {initialsOf(client.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-2xl font-semibold tracking-tight truncate">
            {client.name}
          </div>
          <div className="text-txt-secondary text-sm flex items-center gap-1.5 mt-0.5">
            <Calendar size={14} /> {fmtDate(client.signupDate)}
          </div>
        </div>
      </div>

      <div className="card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="section-title">Expiry</span>
          <span className="text-sm tabular text-txt-primary">
            {fmtDate(client.expiryDate)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="section-title">Status</span>
          {expired ? (
            <span
              className="chip"
              style={{
                color: '#FF4D3A',
                background: '#FF4D3A14',
                borderColor: '#FF4D3A33',
              }}
            >
              Expired
            </span>
          ) : expiring ? (
            <span
              className="chip"
              style={{
                color: '#FF8A3A',
                background: '#FF8A3A14',
                borderColor: '#FF8A3A33',
              }}
            >
              {du}d left
            </span>
          ) : (
            <span className="chip text-txt-secondary">Active</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="section-title">Height</span>
          <span className="text-sm tabular">
            {client.height ? `${client.height} cm` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="section-title">Weeks</span>
          <span className="text-sm tabular">
            {client.weeks?.length || 0}
          </span>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cx(
                'flex items-center gap-3 px-4 rounded-btn text-sm font-semibold transition-colors',
                active
                  ? 'bg-bg-elevated text-brand-lime border border-border'
                  : 'text-txt-secondary hover:text-txt-primary'
              )}
              style={{ minHeight: 48 }}
            >
              <Icon size={18} />
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-border">
        <button
          className="btn-secondary w-full text-brand-red border-brand-red/40"
          onClick={() => {
            if (confirm(`Delete ${client.name}? This cannot be undone.`)) {
              deleteClient(client.id);
              onBack();
            }
          }}
        >
          <Trash2 size={18} /> Delete Client
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-full">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 pt-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <button className="btn-icon text-txt-secondary" onClick={onBack}>
            <ArrowLeft size={22} />
          </button>
          <div className="section-title">Client Profile</div>
          <div style={{ width: 44 }} />
        </div>

        {/* Mobile: stacked. Tablet landscape: split pane. */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="card p-5">{Sidebar}</div>
          </aside>

          <section>
            {/* Portrait / small: top tab bar */}
            <div className="lg:hidden mb-5">
              <div className="flex gap-2 bg-bg-surface border border-border rounded-btn p-1">
                {TABS.map((t) => {
                  const active = tab === t.key;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={cx(
                        'flex-1 flex items-center justify-center gap-2 rounded-btn text-sm font-semibold transition-colors',
                        active
                          ? 'bg-bg-elevated text-brand-lime'
                          : 'text-txt-secondary'
                      )}
                      style={{ minHeight: 48 }}
                    >
                      <Icon size={16} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {tab === 'notes' && <NotesTab client={client} />}
            {tab === 'diet' && <DietTab client={client} />}
            {tab === 'progress' && <ProgressTab client={client} />}
            {tab === 'weeks' && (
              <WeeksTab client={client} onOpenWeek={onOpenWeek} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
