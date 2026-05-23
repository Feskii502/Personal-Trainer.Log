import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  NotebookPen,
  Apple,
  Dumbbell,
  LineChart as LineChartIcon,
  ChevronRight,
} from 'lucide-react';
import {
  useStore,
  updateClient,
  deleteClient,
} from '../lib/store.js';
import {
  daysUntil,
  fmtDate,
  initialsOf,
  cx,
  phaseColor,
} from '../lib/utils.js';
import AddWeekModal from './AddWeekModal.jsx';
import ProgressTab from './ProgressTab.jsx';

const PACKAGE_SIZE = 10;

const TABS = [
  { key: 'weeks', label: 'Weeks', icon: Dumbbell },
  { key: 'progress', label: 'Progress', icon: LineChartIcon },
  { key: 'notes', label: 'Notes', icon: NotebookPen },
  { key: 'diet', label: 'Diet', icon: Apple },
];

function dayStats(day) {
  let sets = 0;
  let completed = 0;
  for (const k of ['warmUp', 'resistance', 'coolDown']) {
    for (const ex of day.sections[k]) {
      for (const s of ex.sets) {
        sets++;
        if (s.completed) completed++;
      }
    }
  }
  return { sets, completed };
}

function clientStats(client) {
  let sessionsLogged = 0;
  let totalSets = 0;
  let completedSets = 0;
  let totalVolume = 0;
  for (const w of client.weeks || []) {
    for (const d of w.days) {
      const ds = dayStats(d);
      totalSets += ds.sets;
      completedSets += ds.completed;
      if (ds.sets > 0 && ds.completed >= ds.sets) sessionsLogged++;
      for (const k of ['warmUp', 'resistance', 'coolDown']) {
        for (const ex of d.sections[k]) {
          for (const s of ex.sets) {
            if (s.weight && s.reps) totalVolume += s.weight * s.reps;
          }
        }
      }
    }
  }
  const pkg = client.sessionsPackage ?? PACKAGE_SIZE;
  const sessionsLeft =
    typeof client.sessionsRemaining === 'number'
      ? Math.max(0, client.sessionsRemaining)
      : pkg - (sessionsLogged % pkg);
  return {
    sessionsLogged,
    totalSets,
    completedSets,
    totalVolume,
    sessionsLeft,
    packageSize: pkg,
  };
}

const fmtVol = (kg) =>
  kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;

function SectionTitle({ children, className = '' }) {
  return <div className={cx('section-title', className)}>{children}</div>;
}

function Chip({ children, color = '#8A8A90' }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 h-6 rounded-pill text-[11px] font-semibold tabular border"
      style={{
        color,
        background: color + '1F',
        borderColor: color + '40',
      }}
    >
      {children}
    </span>
  );
}

function EditableSessionsLeft({ client, stats }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(stats.sessionsLeft));
  useEffect(() => setVal(String(stats.sessionsLeft)), [stats.sessionsLeft]);
  const commit = () => {
    const n = Math.max(0, Number(val) || 0);
    updateClient(client.id, { sessionsRemaining: n });
    setEditing(false);
  };
  const remainingColor =
    stats.sessionsLeft <= 2
      ? '#FF4D3A'
      : stats.sessionsLeft <= 4
      ? '#FF8A3A'
      : 'var(--c-brand-lime)';
  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        inputMode="numeric"
        min="0"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setVal(String(stats.sessionsLeft));
            setEditing(false);
          }
        }}
        className="bg-transparent outline-none border-b border-brand-lime font-display tabular font-bold text-2xl w-14 text-center"
        style={{ color: remainingColor }}
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="font-display tabular font-bold text-2xl leading-none hover:opacity-80 transition-opacity"
      style={{ color: remainingColor }}
      title="Edit sessions remaining"
    >
      {stats.sessionsLeft}
    </button>
  );
}

function EditableHeight({ client }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(client.height ?? '');
  useEffect(() => setVal(client.height ?? ''), [client.height, client.id]);
  const commit = () => {
    const v = String(val).trim();
    updateClient(client.id, { height: v === '' ? null : Number(v) });
    setEditing(false);
  };
  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        inputMode="decimal"
        step="0.1"
        placeholder="cm"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setVal(client.height ?? '');
            setEditing(false);
          }
        }}
        className="bg-transparent outline-none border-b border-brand-lime text-txt-muted tabular w-16"
      />
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="text-txt-muted hover:text-brand-lime transition-colors"
      title="Edit height"
    >
      {client.height ? `${client.height} cm` : '+ Add height'}
    </button>
  );
}

function HeaderCard({ client, stats, onDelete }) {
  const phase = client.weeks?.[client.weeks.length - 1]?.phase;
  const phaseHex = phaseColor(phase);
  const du = daysUntil(client.expiryDate);
  const expired = du < 0;
  const expiring = du >= 0 && du <= 30;
  const pkgSize = stats.packageSize ?? PACKAGE_SIZE;
  const remainingPct = (stats.sessionsLeft / pkgSize) * 100;
  const remainingColor =
    stats.sessionsLeft <= 2
      ? '#FF4D3A'
      : stats.sessionsLeft <= 4
      ? '#FF8A3A'
      : 'var(--c-brand-lime)';

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start gap-4 flex-wrap">
        <div
          className="rounded-full flex items-center justify-center font-display font-bold relative flex-shrink-0"
          style={{
            width: 64,
            height: 64,
            background: 'var(--c-avatar-bg)',
            color: 'var(--c-brand-lime)',
            border: '1px solid var(--c-avatar-border)',
            fontSize: 22,
          }}
        >
          {initialsOf(client.name) || '·'}
          {phase && (
            <span
              className="absolute -bottom-0.5 -right-0.5 rounded-full"
              style={{
                width: 16,
                height: 16,
                background: phaseHex,
                border: '2px solid var(--c-bg-surface)',
              }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold tracking-tight text-2xl sm:text-3xl truncate">
              {client.name}
            </h1>
            {expired ? (
              <Chip color="#FF4D3A">Expired</Chip>
            ) : expiring ? (
              <Chip color="#FF8A3A">{du}d left</Chip>
            ) : Number.isFinite(du) ? (
              <Chip color="#3ADBC7">Active · {du}d</Chip>
            ) : (
              <Chip color="#3ADBC7">Active</Chip>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-txt-secondary flex-wrap">
            {phase && (
              <>
                <span
                  className="inline-block rounded-full"
                  style={{ width: 8, height: 8, background: phaseHex }}
                />
                <span className="uppercase tracking-wide">{phase}</span>
                <span className="text-txt-muted">·</span>
              </>
            )}
            <span className="text-txt-muted">
              joined {fmtDate(client.signupDate)}
            </span>
            <span className="text-txt-muted">·</span>
            <EditableHeight client={client} />
          </div>
        </div>
        <button
          onClick={onDelete}
          className="btn-icon text-txt-muted hover:text-brand-red"
          aria-label="Delete client"
          title="Delete client"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border"
      >
        <div>
          <div className="text-[10px] uppercase tracking-wider text-txt-muted">
            Weeks
          </div>
          <div className="font-display tabular font-bold text-2xl mt-0.5">
            {client.weeks?.length || 0}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-txt-muted">
            Sessions
          </div>
          <div className="font-display tabular font-bold text-2xl mt-0.5">
            {stats.sessionsLogged}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-txt-muted">
            Volume
          </div>
          <div className="font-display tabular font-bold text-2xl mt-0.5">
            {fmtVol(stats.totalVolume)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-txt-muted flex items-center gap-1.5">
            Sessions left
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <EditableSessionsLeft client={client} stats={stats} />
            <span className="text-[11px] tabular text-txt-muted">
              / {pkgSize}
            </span>
          </div>
          <div
            className="h-1 rounded-full overflow-hidden mt-2"
            style={{ background: 'var(--c-avatar-bg)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: remainingPct + '%',
                background: remainingColor,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TabNav({ active, onPick }) {
  return (
    <div className="card p-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onPick(t.key)}
            className={cx(
              'flex-1 sm:flex-none h-11 px-4 rounded-btn text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors flex-shrink-0',
              isActive
                ? 'bg-brand-lime text-black'
                : 'text-txt-secondary hover:text-txt-primary'
            )}
          >
            <Icon size={14} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="card p-5">
        <SectionTitle className="mb-3">Training Notes</SectionTitle>
        <textarea
          className="input resize-none w-full"
          style={{ minHeight: 280 }}
          placeholder="Schedule, current phase, focus areas..."
          value={training}
          onChange={(e) => setTraining(e.target.value)}
        />
      </div>
      <div className="card p-5">
        <SectionTitle className="mb-3">Weaknesses & Watchouts</SectionTitle>
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
      <SectionTitle className="mb-3">Diet & Nutrition</SectionTitle>
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

function WeekCard({ week, onOpen }) {
  const phaseHex = phaseColor(week.phase);
  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    let exercises = 0;
    let volume = 0;
    for (const d of week.days) {
      for (const k of ['warmUp', 'resistance', 'coolDown']) {
        exercises += d.sections[k].length;
        for (const ex of d.sections[k]) {
          for (const s of ex.sets) {
            total++;
            if (s.completed) done++;
            if (s.weight && s.reps) volume += s.weight * s.reps;
          }
        }
      }
    }
    return { total, done, exercises, volume };
  }, [week]);
  const pct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <button
      onClick={onOpen}
      className="card p-5 text-left flex flex-col gap-4 transition-all hover:border-[#3a3a40] active:scale-[0.99] relative overflow-hidden"
    >
      <div
        className="absolute top-0 left-0 right-0"
        style={{ height: 3, background: phaseHex }}
      />
      <div className="flex items-start justify-between">
        <div>
          <SectionTitle>Week</SectionTitle>
          <div className="font-display text-3xl font-bold tabular leading-none mt-1">
            {week.number}
          </div>
        </div>
        <div className="text-right">
          <SectionTitle>Phase</SectionTitle>
          <div className="flex items-center gap-1.5 mt-1.5 justify-end">
            <span
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: phaseHex }}
            />
            <span className="text-[12px] uppercase tracking-wide font-semibold">
              {week.phase}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-txt-muted">
            Exercises
          </div>
          <div className="font-display tabular font-bold text-base mt-0.5">
            {stats.exercises}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-txt-muted">
            Sets
          </div>
          <div className="font-display tabular font-bold text-base mt-0.5">
            {stats.done}
            <span className="text-txt-muted text-[12px]">/{stats.total}</span>
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-txt-muted">
            Volume
          </div>
          <div className="font-display tabular font-bold text-base mt-0.5">
            {fmtVol(stats.volume)}
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-txt-muted mb-1">
          <span>Progress</span>
          <span className="tabular" style={{ color: pct === 100 ? phaseHex : '#8A8A90' }}>
            {pct}%
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--c-avatar-bg)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: pct + '%', background: phaseHex }}
          />
        </div>
      </div>
    </button>
  );
}

function WeeksTab({ client, onOpenWeek }) {
  const [open, setOpen] = useState(false);
  const hasWeeks = client.weeks && client.weeks.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <SectionTitle>Training Weeks</SectionTitle>
        <button className="btn-primary btn-sm" onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add Week
        </button>
      </div>

      {!hasWeeks ? (
        <div className="card p-10 text-center">
          <div className="font-display text-lg mb-1">No weeks yet</div>
          <div className="text-txt-secondary mb-5 text-sm">
            Create a week and select a training phase to get started.
          </div>
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus size={18} /> Add Week
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {client.weeks.map((w) => (
            <WeekCard key={w.id} week={w} onOpen={() => onOpenWeek(w.id)} />
          ))}
        </div>
      )}

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
  const [tab, setTab] = useState('weeks');

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

  const stats = clientStats(client);

  const onDelete = () => {
    if (confirm(`Delete ${client.name}? This cannot be undone.`)) {
      deleteClient(client.id);
      onBack();
    }
  };

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
          <SectionTitle>Client Profile</SectionTitle>
          <div style={{ width: 44 }} />
        </div>

        <HeaderCard client={client} stats={stats} onDelete={onDelete} />

        <TabNav active={tab} onPick={setTab} />

        <div>
          {tab === 'weeks' && (
            <WeeksTab client={client} onOpenWeek={onOpenWeek} />
          )}
          {tab === 'progress' && <ProgressTab client={client} />}
          {tab === 'notes' && <NotesTab client={client} />}
          {tab === 'diet' && <DietTab client={client} />}
        </div>
      </div>
    </div>
  );
}
