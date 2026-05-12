import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Settings,
  Users,
  CalendarDays,
  Dumbbell,
  ChevronRight,
  Bookmark,
  ArrowUpRight,
  Trash2,
} from 'lucide-react';
import { useStore } from '../lib/store.js';
import { supabase } from '../lib/supabase.js';
import { useSessions } from '../hooks/useSessions.js';
import { useWorkoutPresets } from '../hooks/useWorkoutPresets.js';
import {
  cx,
  daysUntil,
  initialsOf,
  phaseColor,
} from '../lib/utils.js';
import NewClientModal from './NewClientModal.jsx';
import ScheduleSessionModal from './ScheduleSessionModal.jsx';
import PresetEditorModal from './PresetEditorModal.jsx';
import AddExerciseModal from './AddExerciseModal.jsx';

// ---------- helpers ----------
const PACKAGE_SIZE = 10;

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

function sessionsLoggedInWeek(client, weekIdx) {
  const w = client.weeks?.[weekIdx];
  if (!w) return 0;
  let count = 0;
  for (const d of w.days) {
    const s = dayStats(d);
    if (s.sets > 0 && s.completed >= s.sets) count++;
  }
  return count;
}

function totalSessionsLogged(client) {
  let count = 0;
  for (const w of client.weeks || []) {
    for (const d of w.days) {
      const s = dayStats(d);
      if (s.sets > 0 && s.completed >= s.sets) count++;
    }
  }
  return count;
}

function subscriptionFor(client) {
  const pkg = client.sessionsPackage ?? PACKAGE_SIZE;
  const remaining =
    typeof client.sessionsRemaining === 'number'
      ? Math.max(0, client.sessionsRemaining)
      : pkg - (totalSessionsLogged(client) % pkg);
  return { remaining, packageSize: pkg, du: daysUntil(client.expiryDate) };
}

function startOfWeek() {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() - now.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekRangeIso() {
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString(), startDate: start };
}

function presetTotals(p) {
  const sec = p.sections || {};
  let ex = 0;
  let sets = 0;
  for (const k of ['warmUp', 'resistance', 'coolDown']) {
    for (const e of sec[k] || []) {
      ex++;
      sets += e.setCount || 0;
    }
  }
  return { ex, sets };
}

// Lime-accented ordinals for the upcoming-session strip.
const ORDINALS = ['1st', '2nd', '3rd'];

// ---------- atoms ----------
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

function PhaseDot({ phase, size = 7 }) {
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: phaseColor(phase),
      }}
    />
  );
}

// ---------- Topbar ----------
function Topbar({ now, onOpenSettings, userEmail, userName }) {
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const initials = userName
    ? initialsOf(userName)
    : (userEmail || '').slice(0, 2).toUpperCase();
  return (
    <header className="flex items-center justify-between gap-4 mb-10">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-txt-muted">
          {dateStr}
        </div>
        <div
          className="font-display tabular text-[16px] font-semibold mt-0.5"
          style={{ color: 'var(--c-txt-primary)' }}
        >
          {timeStr}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="inline-flex items-center justify-center text-txt-secondary hover:text-txt-primary border border-border rounded-full transition-colors"
          style={{ width: 40, height: 40, minWidth: 40, minHeight: 40 }}
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={16} />
        </button>
        <div
          className="rounded-full overflow-hidden flex items-center justify-center font-display font-bold text-[12px]"
          style={{
            width: 40,
            height: 40,
            background: '#1C1C1F',
            border: '1px solid #26262A',
            color: '#F5F5F7',
          }}
          title={userName || userEmail || ''}
        >
          {initials || '·'}
        </div>
      </div>
    </header>
  );
}

// ---------- Greeting ----------
function Greeting({ name, page, clientCount, sessionCount }) {
  const sub =
    page === 'clients'
      ? `${clientCount} client${clientCount === 1 ? '' : 's'} on the roster.`
      : page === 'schedule'
      ? `${sessionCount} session${sessionCount === 1 ? '' : 's'} scheduled this week.`
      : 'Library, presets and templates.';
  return (
    <div className="mb-10">
      <h1
        className="font-display font-semibold tracking-tight"
        style={{
          fontSize: 'clamp(38px, 5.5vw, 64px)',
          lineHeight: 1.02,
          letterSpacing: '-0.02em',
        }}
      >
        Hey {name}.
      </h1>
      <div className="text-txt-secondary text-[15px] mt-3 max-w-lg">{sub}</div>
    </div>
  );
}

// ---------- CLIENTS PAGE ----------
function StatCard({ label, value, hint, accent }) {
  return (
    <div className="card p-5 flex flex-col gap-2" style={{ minHeight: 124 }}>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex items-baseline gap-2 mt-1">
        <span
          className="font-display font-semibold tracking-tight tabular"
          style={{ fontSize: 42, lineHeight: 1, color: accent || '#F5F5F7' }}
        >
          {value}
        </span>
      </div>
      <div className="text-[12px] text-txt-secondary tabular mt-auto">
        {hint}
      </div>
    </div>
  );
}

function ClientsKPIs({ clients }) {
  const rs = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;
    let doneThisWeek = 0;
    for (const c of clients) {
      const du = daysUntil(c.expiryDate);
      if (du < 0) expired++;
      else if (du <= 14) expiring++;
      else active++;
      const wi = (c.weeks?.length || 0) - 1;
      doneThisWeek += sessionsLoggedInWeek(c, wi);
    }
    return { total: clients.length, active, expiring, expired, doneThisWeek };
  }, [clients]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <StatCard
        label="Total clients"
        value={rs.total}
        hint={`${rs.active} active · ${rs.expiring} expiring`}
      />
      <StatCard
        label="Done this week"
        value={rs.doneThisWeek}
        hint="completed sessions logged"
      />
    </div>
  );
}

function ClientRow({ client, onOpen }) {
  const sub = subscriptionFor(client);
  const expired = sub.du < 0;
  const expiring = sub.du >= 0 && sub.du <= 14;
  const phase = client.weeks?.[client.weeks.length - 1]?.phase;
  const lowSessions = sub.remaining <= 2;
  const warnSessions = sub.remaining <= 4 && sub.remaining > 2;
  const sessionColor = lowSessions
    ? '#FF4D3A'
    : warnSessions
    ? '#FF8A3A'
    : '#F5F5F7';

  return (
    <button
      onClick={() => onOpen(client.id)}
      className="group w-full flex items-center gap-4 px-5 py-4 transition-colors text-left border-b border-border last:border-b-0 hover:bg-bg-elevated/40"
    >
      <div
        className="rounded-full flex items-center justify-center font-display font-semibold text-[13px] flex-shrink-0 relative"
        style={{
          width: 40,
          height: 40,
          background: '#0F0F11',
          color: '#F5F5F7',
          border: '1px solid #26262A',
        }}
      >
        {initialsOf(client.name) || '·'}
        {phase && (
          <span
            className="absolute -bottom-0.5 -right-0.5 rounded-full"
            style={{
              width: 10,
              height: 10,
              background: phaseColor(phase),
              border: '2px solid #141416',
            }}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[15px] tracking-tight truncate">
          {client.name}
        </div>
        <div className="text-[12px] text-txt-secondary truncate mt-0.5 flex items-center gap-1.5">
          {phase && (
            <>
              <PhaseDot phase={phase} size={6} />
              <span>{phase}</span>
              <span className="text-txt-muted">·</span>
            </>
          )}
          <span className="tabular text-txt-muted">
            {client.weeks?.length || 0} weeks logged
          </span>
        </div>
      </div>

      <div
        className="hidden sm:block flex-shrink-0 text-right"
        style={{ minWidth: 100 }}
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-txt-muted">
          Status
        </div>
        <div
          className="mt-1 text-[13px] tabular font-medium"
          style={{
            color: expired ? '#FF4D3A' : expiring ? '#FF8A3A' : '#F5F5F7',
          }}
        >
          {expired ? 'Expired' : expiring ? `${sub.du}d left` : 'Active'}
        </div>
      </div>

      <div className="flex-shrink-0 text-right" style={{ minWidth: 90 }}>
        <div className="text-[10px] uppercase tracking-[0.18em] text-txt-muted">
          Sessions
        </div>
        <div className="mt-1 font-display tabular font-semibold leading-none flex items-baseline gap-1 justify-end">
          <span style={{ fontSize: 20, color: sessionColor }}>
            {sub.remaining}
          </span>
          <span className="text-[12px] text-txt-muted">
            / {sub.packageSize}
          </span>
        </div>
      </div>

      <div className="text-txt-muted group-hover:text-txt-primary transition-colors flex-shrink-0">
        <ChevronRight size={18} />
      </div>
    </button>
  );
}

function Roster({ clients, onOpenClient, onNewClient }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    let list = clients;
    if (filter === 'expiring')
      list = list.filter((c) => {
        const du = daysUntil(c.expiryDate);
        return du <= 14 && du >= 0;
      });
    if (filter === 'expired')
      list = list.filter((c) => daysUntil(c.expiryDate) < 0);
    if (filter === 'low')
      list = list.filter((c) => subscriptionFor(c).remaining <= 4);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((c) => c.name.toLowerCase().includes(s));
    return list;
  }, [clients, filter, q]);

  const FILTERS = [
    { k: 'all', label: 'All' },
    { k: 'expiring', label: 'Expiring' },
    { k: 'expired', label: 'Expired' },
    { k: 'low', label: 'Low sessions' },
  ];

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[22px] font-semibold tracking-tight">
            Roster
          </h2>
          <span className="text-[11px] tabular text-txt-muted">
            {filtered.length} of {clients.length}
          </span>
        </div>
        <button
          onClick={onNewClient}
          className="h-9 px-3.5 rounded-full text-[12px] font-semibold tracking-tight flex items-center gap-1.5 transition-colors"
          style={{ background: '#D4FF3A', color: '#0A0A0B' }}
        >
          <Plus size={13} /> New client
        </button>
      </div>

      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none">
            <Search size={13} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients"
            className="w-full border border-border rounded-full h-9 pl-9 pr-3 text-[13px] outline-none focus:border-txt-muted placeholder:text-txt-muted text-txt-primary"
            style={{ background: 'var(--c-bg-base)' }}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={cx(
                'h-9 px-3 rounded-full text-[11px] uppercase tracking-wider font-semibold transition-colors',
                filter === f.k
                  ? 'bg-brand-lime text-black'
                  : 'text-txt-secondary hover:text-txt-primary border border-border'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-[14px] font-semibold mb-1">No matches</div>
            <div className="text-[12px] text-txt-secondary">
              Try clearing your filters.
            </div>
          </div>
        ) : (
          filtered.map((c) => (
            <ClientRow key={c.id} client={c} onOpen={onOpenClient} />
          ))
        )}
      </div>
    </section>
  );
}

// ---------- SCHEDULE PAGE ----------
function NextUpStrip({ sessions, clients, onOpenClient }) {
  const next = useMemo(() => {
    return sessions
      .filter((s) => new Date(s.scheduledAt).getTime() > Date.now())
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
      .slice(0, 3);
  }, [sessions]);

  if (next.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
      {next.map((s, i) => {
        const c = clients.find((x) => x.id === s.clientId);
        const phase = c?.weeks?.[c.weeks.length - 1]?.phase;
        const t = new Date(s.scheduledAt);
        const time = t.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        });
        const day = t.toLocaleDateString(undefined, { weekday: 'short' });
        const isFirst = i === 0;
        return (
          <button
            key={s.id}
            onClick={() => c && onOpenClient(c.id)}
            className="card text-left p-4 hover:bg-bg-elevated transition-colors group"
          >
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>
                {ORDINALS[i] || `${i + 1}th`} upcoming session
              </SectionLabel>
              {isFirst && (
                <span
                  className="text-[10px] uppercase tracking-[0.2em] font-semibold"
                  style={{ color: '#D4FF3A' }}
                >
                  ● Soonest
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display font-semibold tabular text-[28px] tracking-tight">
                {time}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-txt-muted">
                {day}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <PhaseDot phase={phase} size={7} />
              <span className="text-[14px] font-semibold tracking-tight truncate">
                {c?.name || '—'}
              </span>
              <ArrowUpRight
                size={14}
                className="ml-auto text-txt-muted group-hover:text-txt-primary transition-colors"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function WeeklySchedule({ sessions, clients, onOpenClient, onAddSession }) {
  const start = useMemo(() => startOfWeek(), []);
  const days = useMemo(() => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const s = new Date(d);
      s.setHours(0, 0, 0, 0);
      const e = new Date(d);
      e.setHours(23, 59, 59, 999);
      const slots = sessions
        .filter((x) => {
          const t = new Date(x.scheduledAt).getTime();
          return t >= s.getTime() && t <= e.getTime();
        })
        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      out.push({
        date: d,
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: d.getDate(),
        slots,
      });
    }
    return out;
  }, [sessions, start]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[22px] font-semibold tracking-tight">
            This week
          </h2>
          <span className="text-[11px] tabular text-txt-muted">
            {sessions.length} sessions
          </span>
        </div>
        <button
          onClick={onAddSession}
          className="h-9 px-3.5 rounded-full text-[12px] font-semibold tracking-tight flex items-center gap-1.5"
          style={{ background: '#D4FF3A', color: '#0A0A0B' }}
        >
          <Plus size={13} /> Schedule
        </button>
      </div>

      <div
        className="border-t border-border overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="grid grid-cols-7" style={{ minWidth: 760 }}>
          {days.map((d, i) => {
            const isToday = d.date.getTime() === todayMs;
            return (
              <div
                key={i}
                className="flex flex-col border-r border-border last:border-r-0"
              >
                <div className="px-3 pt-3 pb-2 border-b border-border flex items-baseline justify-between">
                  <div>
                    <div
                      className={cx(
                        'text-[10px] uppercase tracking-[0.2em] font-semibold',
                        isToday ? '' : 'text-txt-muted'
                      )}
                      style={isToday ? { color: '#D4FF3A' } : {}}
                    >
                      {d.label}
                    </div>
                    <div
                      className="font-display tabular font-semibold text-[18px] leading-none mt-1"
                      style={isToday ? { color: '#D4FF3A' } : {}}
                    >
                      {d.dayNum}
                    </div>
                  </div>
                  {isToday && (
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1"
                      style={{ background: '#D4FF3A' }}
                    />
                  )}
                </div>
                <div className="p-2 space-y-1.5" style={{ minHeight: 280 }}>
                  {d.slots.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[10px] uppercase tracking-wider text-txt-muted opacity-50">
                      —
                    </div>
                  ) : (
                    d.slots.map((slot) => {
                      const c = clients.find((x) => x.id === slot.clientId);
                      const phase = c?.weeks?.[c.weeks.length - 1]?.phase;
                      const t = new Date(slot.scheduledAt);
                      const time = t.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const past = t.getTime() < Date.now();
                      return (
                        <button
                          key={slot.id}
                          onClick={() => c && onOpenClient(c.id)}
                          className="w-full text-left rounded-lg p-2 transition-colors hover:bg-bg-elevated"
                          style={{
                            background: past
                              ? 'transparent'
                              : 'var(--c-bg-base)',
                            border: '1px solid #1C1C1F',
                            opacity: past ? 0.45 : 1,
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <PhaseDot phase={phase} size={6} />
                            <span className="text-[10px] tabular font-semibold text-txt-secondary">
                              {time}
                            </span>
                            {past && (
                              <span className="ml-auto text-[10px] text-txt-muted">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-[12px] font-semibold tracking-tight truncate text-txt-primary">
                            {(c?.name || 'Unknown').split(' ')[0]}
                          </div>
                          <div className="text-[10px] tabular text-txt-muted truncate mt-0.5">
                            {slot.durationMinutes}m
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------- EXERCISES PAGE ----------
// Type badge: pill-shaped so longer labels like "timed+kg" fit without
// getting clipped by a round circle.
function TypeBadge({ type }) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 rounded-full px-2.5"
      style={{
        height: 40,
        minWidth: 40,
        background: '#0F0F11',
        border: '1px solid #26262A',
      }}
    >
      <span className="text-[10px] tabular font-semibold text-txt-secondary whitespace-nowrap leading-none">
        {type}
      </span>
    </div>
  );
}

function ExerciseLibrarySection({ library }) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('all');
  const [openNew, setOpenNew] = useState(false);
  const muscles = useMemo(
    () => ['all', ...new Set(library.map((l) => l.mainMuscle).filter(Boolean))],
    [library]
  );
  const filtered = useMemo(
    () =>
      library.filter(
        (l) =>
          (muscle === 'all' || l.mainMuscle === muscle) &&
          (q === '' || l.name.toLowerCase().includes(q.toLowerCase()))
      ),
    [library, q, muscle]
  );

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[22px] font-semibold tracking-tight">
            Library
          </h2>
          <span className="text-[11px] tabular text-txt-muted">
            {filtered.length} of {library.length}
          </span>
        </div>
        <button
          onClick={() => setOpenNew(true)}
          className="h-9 px-3.5 rounded-full text-[12px] font-semibold tracking-tight flex items-center gap-1.5"
          style={{ background: '#D4FF3A', color: '#0A0A0B' }}
        >
          <Plus size={13} /> New exercise
        </button>
      </div>

      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted pointer-events-none">
            <Search size={13} />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises"
            className="w-full border border-border rounded-full h-9 pl-9 pr-3 text-[13px] outline-none focus:border-txt-muted placeholder:text-txt-muted text-txt-primary"
            style={{ background: 'var(--c-bg-base)' }}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {muscles.map((m) => (
            <button
              key={m}
              onClick={() => setMuscle(m)}
              className={cx(
                'h-9 px-3 rounded-full text-[11px] uppercase tracking-wider font-semibold transition-colors',
                muscle === m
                  ? 'bg-brand-lime text-black'
                  : 'text-txt-secondary hover:text-txt-primary border border-border'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div
        className="border-t border-border grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
        style={{ background: '#1C1C1F', gap: 1 }}
      >
        {filtered.map((l) => (
          <div
            key={l.id}
            className="group p-4 hover:bg-bg-elevated transition-colors cursor-pointer flex items-start gap-3"
            style={{ background: 'var(--c-bg-surface)' }}
          >
            <TypeBadge type={l.type} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[14px] truncate text-txt-primary">
                {l.name}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-txt-muted mt-1">
                <span className="text-txt-secondary font-semibold">
                  {l.mainMuscle}
                </span>
                {l.subMuscles?.length > 0 && (
                  <span> · {l.subMuscles.slice(0, 2).join(', ')}</span>
                )}
              </div>
            </div>
            <ArrowUpRight
              size={14}
              className="text-txt-muted opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div
            className="col-span-full p-8 text-center text-[12px] text-txt-muted"
            style={{ background: 'var(--c-bg-surface)' }}
          >
            No exercises match.
          </div>
        )}
      </div>

      <AddExerciseModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        libraryOnly
      />
    </section>
  );
}

function WorkoutPresetsSection() {
  const { presets, loading, add, patch, remove } = useWorkoutPresets();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const startNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const startEdit = (p) => {
    setEditing(p);
    setEditorOpen(true);
  };
  const handleSave = async (data) => {
    if (data.id) {
      await patch(data.id, {
        name: data.name,
        description: data.description,
        tags: data.tags,
        sections: data.sections,
      });
    } else {
      await add({
        name: data.name,
        description: data.description,
        tags: data.tags,
        sections: data.sections,
      });
    }
  };

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-[22px] font-semibold tracking-tight">
            Presets
          </h2>
          <span className="text-[11px] tabular text-txt-muted">
            {presets.length} saved
          </span>
        </div>
        <button
          onClick={startNew}
          className="h-9 px-3.5 rounded-full text-[12px] font-semibold tracking-tight flex items-center gap-1.5"
          style={{ background: '#D4FF3A', color: '#0A0A0B' }}
        >
          <Plus size={13} /> New preset
        </button>
      </div>

      {loading ? (
        <div className="border-t border-border p-10 text-center text-xs text-txt-muted">
          Loading presets…
        </div>
      ) : presets.length === 0 ? (
        <div className="border-t border-border p-10 text-center">
          <Bookmark
            size={28}
            className="mx-auto text-txt-muted mb-2"
            strokeWidth={1.5}
          />
          <div className="text-sm font-semibold mb-1">No presets yet</div>
          <div className="text-xs text-txt-secondary max-w-md mx-auto mb-4">
            Tap <span className="text-brand-lime font-semibold">New preset</span>{' '}
            above to build one from scratch, or open any client's day and
            save the structure you set up.
          </div>
        </div>
      ) : (
        <div
          className="border-t border-border grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
          style={{ background: '#1C1C1F', gap: 1 }}
        >
          {presets.map((p) => {
            const tot = presetTotals(p);
            return (
              <button
                key={p.id}
                onClick={() => startEdit(p)}
                className="group p-5 hover:bg-bg-elevated transition-colors flex flex-col gap-3 text-left relative"
                style={{ background: 'var(--c-bg-surface)', minHeight: 168 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-txt-muted">
                    <Bookmark size={16} />
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-txt-muted">
                      Sets
                    </div>
                    <div className="font-display tabular font-semibold text-[15px] leading-none mt-0.5">
                      {tot.sets}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="font-display font-semibold text-[16px] tracking-tight leading-tight group-hover:text-txt-primary">
                    {p.name || 'Untitled'}
                  </div>
                  {p.description && (
                    <div className="text-[12px] text-txt-secondary mt-1.5 line-clamp-2">
                      {p.description}
                    </div>
                  )}
                </div>
                {p.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-auto">
                    {p.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[9px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full text-txt-secondary border border-border"
                      >
                        {t}
                      </span>
                    ))}
                    {p.tags.length > 3 && (
                      <span className="text-[9px] text-txt-muted tabular self-center">
                        +{p.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete preset "${p.name}"?`)) remove(p.id);
                  }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-txt-muted hover:text-brand-red"
                  aria-label="Delete preset"
                >
                  <Trash2 size={13} />
                </button>
              </button>
            );
          })}
        </div>
      )}

      <PresetEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        preset={editing}
        onSave={handleSave}
      />
    </section>
  );
}

// ---------- Floating Dock ----------
function FloatingDock({ page, onChange }) {
  const items = [
    { key: 'clients', label: 'Clients', Icon: Users },
    { key: 'schedule', label: 'Schedule', Icon: CalendarDays },
    { key: 'exercises', label: 'Exercises', Icon: Dumbbell },
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
          const active = page === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={cx(
                'flex items-center gap-2 h-11 px-4 rounded-full transition-all duration-200 ease-out',
                active ? '' : 'text-txt-secondary hover:text-txt-primary'
              )}
              style={
                active
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
              aria-current={active ? 'page' : undefined}
            >
              <it.Icon size={16} />
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

// ---------- main ----------
export default function HomeScreen({
  onOpenClient,
  onOpenSettings,
}) {
  const { clients, library } = useStore();
  const [openNew, setOpenNew] = useState(false);
  const [openSchedule, setOpenSchedule] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data?.user?.email || '');
      const meta = data?.user?.user_metadata || {};
      setUserName(meta.full_name || meta.name || '');
    });
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const range = useMemo(() => weekRangeIso(), []);
  const { sessions, add: addSchedule } = useSessions(range.start, range.end);

  const greetingName = userName
    ? userName.split(' ')[0]
    : userEmail
    ? userEmail.split('@')[0].charAt(0).toUpperCase() +
      userEmail.split('@')[0].slice(1)
    : 'Coach';

  const [page, setPage] = useState('clients');

  return (
    <div className="min-h-full pb-32">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-12 pt-10">
        <Topbar
          now={now}
          onOpenSettings={onOpenSettings}
          userEmail={userEmail}
          userName={userName}
        />
        <Greeting
          name={greetingName}
          page={page}
          clientCount={clients.length}
          sessionCount={sessions.length}
        />

        {page === 'clients' && (
          <div className="space-y-6">
            <ClientsKPIs clients={clients} />
            <Roster
              clients={clients}
              onOpenClient={onOpenClient}
              onNewClient={() => setOpenNew(true)}
            />
          </div>
        )}

        {page === 'schedule' && (
          <div className="space-y-3">
            <NextUpStrip
              sessions={sessions}
              clients={clients}
              onOpenClient={onOpenClient}
            />
            <WeeklySchedule
              sessions={sessions}
              clients={clients}
              onOpenClient={onOpenClient}
              onAddSession={() => setOpenSchedule(true)}
            />
          </div>
        )}

        {page === 'exercises' && (
          <div className="space-y-6">
            <ExerciseLibrarySection library={library} />
            <WorkoutPresetsSection />
          </div>
        )}
      </div>

      <FloatingDock page={page} onChange={setPage} />

      <NewClientModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        onCreated={(id) => onOpenClient(id)}
      />
      <ScheduleSessionModal
        open={openSchedule}
        onClose={() => setOpenSchedule(false)}
        clients={clients}
        onCreate={async ({ clientId, scheduledAt, durationMinutes }) => {
          await addSchedule({ clientId, scheduledAt, durationMinutes });
          setOpenSchedule(false);
        }}
      />
    </div>
  );
}
