import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Settings,
  Calendar,
  X,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../lib/store.js';
import { supabase } from '../lib/supabase.js';
import { useSessions } from '../hooks/useSessions.js';
import {
  cx,
  daysUntil,
  initialsOf,
  phaseColor,
} from '../lib/utils.js';
import NewClientModal from './NewClientModal.jsx';
import ScheduleSessionModal from './ScheduleSessionModal.jsx';

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
  const used = totalSessionsLogged(client);
  const usedInCycle = used % PACKAGE_SIZE;
  const remaining = PACKAGE_SIZE - usedInCycle;
  const du = daysUntil(client.expiryDate);
  return { used, remaining, packageSize: PACKAGE_SIZE, du };
}

function rosterStats(clients) {
  let active = 0;
  let expiring = 0;
  let expired = 0;
  for (const c of clients) {
    const du = daysUntil(c.expiryDate);
    if (du < 0) expired++;
    else if (du <= 30) expiring++;
    else active++;
  }
  return { total: clients.length, active, expiring, expired };
}

// Get start (Sunday) of current week, ISO string.
function weekRangeIso() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString(), startDate: start };
}

// ---------- atoms ----------
function SectionTitle({ children, className = '' }) {
  return (
    <div className={cx('section-title', className)}>{children}</div>
  );
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

function PhaseDot({ phase, size = 8 }) {
  return (
    <span
      className="inline-block rounded-full"
      style={{
        width: size,
        height: size,
        background: phaseColor(phase),
      }}
    />
  );
}

// ---------- Topbar ----------
function Topbar({ now, onOpenSettings, onSignOut, userEmail, userName }) {
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
    <header className="flex items-center justify-between gap-4 mb-7">
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: '#0A0A0B',
            border: '1px solid #26262A',
          }}
        >
          <div
            className="font-display font-bold tracking-tight"
            style={{ color: '#D4FF3A', fontSize: 22, lineHeight: 1 }}
          >
            F<span style={{ color: '#F5F5F7' }}>·</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-txt-muted">
            FITATS
          </div>
          <div className="font-display font-semibold tracking-tight text-[18px] sm:text-[20px]">
            Dashboard
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden md:block text-right">
          <div className="text-[11px] tabular text-txt-secondary">{dateStr}</div>
          <div
            className="font-display font-semibold tabular tracking-tight text-[15px]"
            style={{ color: '#D4FF3A' }}
          >
            {timeStr}
          </div>
        </div>
        <button
          onClick={onOpenSettings}
          className="btn-icon text-txt-secondary hover:text-txt-primary border border-border"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={18} />
        </button>
        <div
          className="rounded-full overflow-hidden flex items-center justify-center font-display font-bold text-sm"
          style={{
            width: 38,
            height: 38,
            background: '#1C1C1F',
            border: '1px solid #26262A',
            color: '#D4FF3A',
          }}
          title={userEmail || ''}
        >
          {initials || '·'}
        </div>
      </div>
    </header>
  );
}

// ---------- KPI ----------
function KPI({ label, value, sub, footer }) {
  return (
    <div
      className="card p-5 flex flex-col gap-3 relative overflow-hidden"
      style={{ minHeight: 168 }}
    >
      <SectionTitle>{label}</SectionTitle>
      <div
        className="font-display font-bold tracking-tight tabular"
        style={{ fontSize: 56, lineHeight: 1, color: '#F5F5F7' }}
      >
        {value}
      </div>
      {sub && <div className="text-sm text-txt-secondary">{sub}</div>}
      <div className="flex-1" />
      {footer}
    </div>
  );
}

function KpiRow({ clients }) {
  const r = useMemo(() => rosterStats(clients), [clients]);
  const sessionsThisWeek = useMemo(() => {
    let done = 0;
    for (const c of clients) {
      const wi = (c.weeks?.length || 0) - 1;
      done += sessionsLoggedInWeek(c, wi);
    }
    return done;
  }, [clients]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <KPI
        label="Clients"
        value={r.total}
        sub={
          <span>
            <span style={{ color: '#3ADBC7' }} className="tabular font-semibold">
              {r.active}
            </span>{' '}
            active ·{' '}
            <span style={{ color: '#FF8A3A' }} className="tabular font-semibold">
              {r.expiring}
            </span>{' '}
            expiring ·{' '}
            <span style={{ color: '#FF4D3A' }} className="tabular font-semibold">
              {r.expired}
            </span>{' '}
            expired
          </span>
        }
        footer={
          <div className="flex items-center gap-1.5">
            {clients.slice(0, 6).map((c) => (
              <div
                key={c.id}
                className="rounded-full font-display font-bold flex items-center justify-center text-[10px]"
                style={{
                  width: 28,
                  height: 28,
                  background: '#1C1C1F',
                  color: '#D4FF3A',
                  border: '1px solid #26262A',
                }}
              >
                {initialsOf(c.name) || '·'}
              </div>
            ))}
            {clients.length > 6 && (
              <div className="text-[10px] text-txt-muted tabular">
                +{clients.length - 6}
              </div>
            )}
          </div>
        }
      />
      <KPI
        label="Sessions Done · This Week"
        value={sessionsThisWeek}
        sub={
          <span>
            from logged workouts across the roster
          </span>
        }
      />
    </div>
  );
}

// ---------- Weekly Schedule ----------
function WeeklySchedule({ sessions, clients, onAddSession, onOpenClient }) {
  const { startDate } = useMemo(() => weekRangeIso(), []);
  const days = useMemo(() => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      const slots = sessions
        .filter((s) => {
          const t = new Date(s.scheduledAt).getTime();
          return t >= startOfDay.getTime() && t <= endOfDay.getTime();
        })
        .sort((a, b) =>
          new Date(a.scheduledAt) - new Date(b.scheduledAt)
        );
      out.push({
        date: d,
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: d.getDate(),
        slots,
      });
    }
    return out;
  }, [sessions, startDate]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const total = sessions.length;

  return (
    <section className="card p-0">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
        <div className="min-w-0">
          <div className="font-display text-xl font-semibold tracking-tight">
            This week
          </div>
          <SectionTitle>Schedule across all clients</SectionTitle>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Chip color="#D4FF3A">{total} sessions</Chip>
          <button
            onClick={onAddSession}
            className="h-9 px-3 rounded-btn text-[12px] font-semibold uppercase tracking-wide flex items-center gap-1.5"
            style={{ background: '#D4FF3A', color: '#0A0A0B' }}
          >
            <Plus size={14} /> <span className="hidden sm:inline">Add session</span>
          </button>
        </div>
      </div>
      <div
        className="overflow-x-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          className="grid grid-cols-7 gap-px"
          style={{ background: '#1C1C1F', minWidth: 700 }}
        >
          {days.map((d) => {
            const isToday = d.date.getTime() === todayMs;
            return (
              <div key={d.date.toISOString()} className="flex flex-col bg-bg-surface">
                <div
                  className="px-3 py-3 border-b border-border flex items-center justify-between"
                  style={isToday ? { background: 'rgba(212,255,58,0.04)' } : {}}
                >
                  <div>
                    <div
                      className={cx(
                        'text-[10px] uppercase tracking-wider font-semibold',
                        !isToday && 'text-txt-muted'
                      )}
                      style={isToday ? { color: '#D4FF3A' } : {}}
                    >
                      {d.label}
                    </div>
                    <div className="font-display tabular font-bold text-[16px] leading-none mt-0.5">
                      {d.dayNum}
                    </div>
                  </div>
                  {d.slots.length > 0 && (
                    <div className="text-[10px] tabular text-txt-muted">
                      {d.slots.length}
                    </div>
                  )}
                </div>
                <div
                  className="flex-1 p-2 space-y-1.5"
                  style={{ minHeight: 140 }}
                >
                  {d.slots.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[10px] tabular text-txt-muted">
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
                      const todayItem = isToday;
                      const status = past
                        ? 'done'
                        : todayItem
                        ? 'today'
                        : 'upcoming';
                      return (
                        <button
                          key={slot.id}
                          onClick={() => c && onOpenClient(c.id)}
                          className="w-full text-left rounded-btn p-2 group cursor-pointer transition-colors"
                          style={{
                            background:
                              status === 'today' ? '#1C1C1F' : '#0F0F11',
                            border:
                              status === 'today'
                                ? '1px solid #D4FF3A55'
                                : '1px solid #26262A',
                            opacity: status === 'done' ? 0.55 : 1,
                          }}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <PhaseDot phase={phase} size={6} />
                            <span
                              className="text-[10px] tabular font-semibold"
                              style={{
                                color: status === 'today' ? '#D4FF3A' : '#8A8A90',
                              }}
                            >
                              {time}
                            </span>
                            {status === 'done' && (
                              <span
                                className="ml-auto text-[10px]"
                                style={{ color: '#3ADBC7' }}
                              >
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-semibold truncate">
                            {(c?.name || 'Unknown').split(' ')[0]}
                          </div>
                          <div className="text-[9px] tabular text-txt-muted truncate">
                            {phase || '—'}
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

// ---------- Roster ----------
function ClientRow({ client, onOpen }) {
  const sub = useMemo(() => subscriptionFor(client), [client]);
  const expired = sub.du < 0;
  const expiring = sub.du >= 0 && sub.du <= 14;
  const phase = client.weeks?.[client.weeks.length - 1]?.phase;
  const remainingPct = (sub.remaining / sub.packageSize) * 100;
  const remainingColor =
    sub.remaining <= 2 ? '#FF4D3A' : sub.remaining <= 4 ? '#FF8A3A' : '#D4FF3A';
  const joined = client.signupDate
    ? new Date(client.signupDate).toLocaleDateString(undefined, {
        month: 'short',
        year: '2-digit',
      })
    : '—';

  return (
    <button
      onClick={() => onOpen(client.id)}
      className="group w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 hover:bg-[#16161A] transition-colors text-left"
      style={{ minHeight: 72, borderBottom: '1px solid #1C1C1F' }}
    >
      <div
        className="rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0 relative"
        style={{
          width: 42,
          height: 42,
          background: '#1C1C1F',
          color: '#D4FF3A',
          border: '1px solid #26262A',
        }}
      >
        {initialsOf(client.name) || '·'}
        {phase && (
          <span
            className="absolute -bottom-0.5 -right-0.5 rounded-full"
            style={{
              width: 11,
              height: 11,
              background: phaseColor(phase),
              border: '2px solid #141416',
            }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="font-semibold truncate text-[15px]">{client.name}</div>
        </div>
        <div className="text-[11px] text-txt-muted truncate uppercase tracking-wide">
          {phase || 'no phase'} · joined {joined}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0" style={{ minWidth: 130 }}>
        {expired ? (
          <Chip color="#FF4D3A">Expired</Chip>
        ) : expiring ? (
          <Chip color="#FF8A3A">{sub.du}d left</Chip>
        ) : Number.isFinite(sub.du) ? (
          <Chip color="#3ADBC7">Active · {sub.du}d</Chip>
        ) : (
          <Chip color="#3ADBC7">Active</Chip>
        )}
      </div>
      <div
        className="flex items-center gap-3 flex-shrink-0"
        style={{ minWidth: 120 }}
      >
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-txt-muted">
            Sessions left
          </div>
          <div className="flex items-baseline gap-1 justify-end">
            <span
              className="font-display tabular font-bold text-[18px] leading-none"
              style={{ color: remainingColor }}
            >
              {sub.remaining}
            </span>
            <span className="text-[11px] tabular text-txt-muted">
              / {sub.packageSize}
            </span>
          </div>
        </div>
        <div
          className="w-16 h-1.5 rounded-full overflow-hidden hidden md:block"
          style={{ background: '#1C1C1F' }}
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
      <ChevronRight
        size={18}
        className="text-txt-muted group-hover:text-brand-lime transition-colors flex-shrink-0"
      />
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
    <section className="card p-0">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border flex-wrap">
        <div className="min-w-0">
          <div className="font-display text-xl font-semibold tracking-tight">
            Clients
          </div>
          <SectionTitle>
            {filtered.length} of {clients.length}
          </SectionTitle>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onNewClient}
            className="h-9 px-3 rounded-btn text-[12px] font-semibold uppercase tracking-wide flex items-center gap-1.5"
            style={{ background: '#D4FF3A', color: '#0A0A0B' }}
          >
            <Plus size={14} /> New client
          </button>
        </div>
      </div>
      <div
        className="px-5 py-3 border-b border-border flex items-center gap-2 flex-wrap"
        style={{ background: 'rgba(15,15,17,0.4)' }}
      >
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients…"
            className="w-full bg-bg-base border border-border rounded-btn h-9 pl-9 pr-3 text-[13px] outline-none focus:border-brand-lime"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k)}
              className={cx(
                'h-7 px-2.5 rounded-pill text-[10px] uppercase tracking-wider font-semibold border transition-colors',
                filter === f.k
                  ? 'bg-brand-lime text-black border-brand-lime'
                  : 'border-border text-txt-secondary hover:text-txt-primary'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-base font-semibold mb-1">No clients yet</div>
            <div className="text-xs text-txt-secondary mb-4">
              Add your first client to start logging sessions.
            </div>
            <button onClick={onNewClient} className="btn-primary btn-sm">
              <Plus size={16} /> New client
            </button>
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

// ---------- Exercise Library ----------
function ExerciseLibrary({ library, onOpenSettings }) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('all');
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
    <section className="card p-0">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border flex-wrap">
        <div className="min-w-0">
          <div className="font-display text-xl font-semibold tracking-tight">
            Exercise Library
          </div>
          <SectionTitle>
            {filtered.length} of {library.length} exercises
          </SectionTitle>
        </div>
        <button
          onClick={onOpenSettings}
          className="h-9 px-3 rounded-btn text-[12px] font-semibold uppercase tracking-wide flex items-center gap-1.5"
          style={{ background: '#D4FF3A', color: '#0A0A0B' }}
        >
          <Plus size={14} /> Manage
        </button>
      </div>

      <div
        className="px-5 py-3 border-b border-border space-y-3"
        style={{ background: 'rgba(15,15,17,0.4)' }}
      >
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises…"
            className="w-full bg-bg-base border border-border rounded-btn h-10 pl-9 pr-3 text-[13px] outline-none focus:border-brand-lime"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
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
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px"
        style={{ background: '#1C1C1F' }}
      >
        {filtered.map((l) => (
          <div
            key={l.id}
            className="group p-4 hover:bg-[#16161A] transition-colors cursor-pointer flex items-start gap-3"
            style={{ background: '#141416' }}
          >
            <div
              className="w-10 h-10 rounded-btn flex items-center justify-center flex-shrink-0 border border-border"
              style={{ background: '#0F0F11' }}
            >
              <span
                className="text-[11px] tabular font-bold"
                style={{ color: '#D4FF3A' }}
              >
                {l.type}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[14px] truncate">{l.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-txt-secondary mt-0.5">
                <span className="font-semibold text-txt-primary">
                  {l.mainMuscle}
                </span>
                {l.subMuscles?.length > 0 && (
                  <span className="text-txt-muted">
                    {' '}· {l.subMuscles.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div
            className="col-span-full p-8 text-center text-[12px] text-txt-muted"
            style={{ background: '#141416' }}
          >
            No exercises match.
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- main ----------
export default function HomeScreen({
  onOpenClient,
  onOpenSettings,
  activeSessions = [],
  onSwitchSession,
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

  const greetingDisplay = userName
    ? userName.split(' ')[0]
    : userEmail
    ? userEmail.split('@')[0].charAt(0).toUpperCase() +
      userEmail.split('@')[0].slice(1)
    : 'Coach';

  return (
    <div className="min-h-full">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 pb-24">
        <Topbar
          now={now}
          onOpenSettings={onOpenSettings}
          userEmail={userEmail}
          userName={userName}
        />

        {/* Active sessions strip */}
        {activeSessions.length > 0 && (
          <div className="card p-3 mb-5 flex items-center gap-3 flex-wrap">
            <SectionTitle>Active sessions</SectionTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {activeSessions.map((s) => {
                const c = clients.find((x) => x.id === s.clientId);
                if (!c) return null;
                const w = c.weeks?.find((wk) => wk.id === s.weekId);
                const phase = w?.phase;
                return (
                  <button
                    key={s.clientId}
                    onClick={() => onSwitchSession?.(s)}
                    className="flex items-center gap-2 h-8 pl-1.5 pr-3 rounded-pill border border-border bg-bg-elevated hover:border-brand-lime transition-colors"
                  >
                    <div
                      className="rounded-full flex items-center justify-center font-display font-bold text-[10px] flex-shrink-0 relative"
                      style={{
                        width: 22,
                        height: 22,
                        background: '#1C1C1F',
                        color: '#D4FF3A',
                        border: '1px solid #26262A',
                      }}
                    >
                      {initialsOf(c.name)}
                      {phase && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 rounded-full"
                          style={{
                            width: 7,
                            height: 7,
                            background: phaseColor(phase),
                            border: '1.5px solid #141416',
                          }}
                        />
                      )}
                    </div>
                    <span className="text-[12px] font-semibold">
                      {c.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Greeting */}
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <SectionTitle>Trainer dashboard</SectionTitle>
            <h1
              className="font-display font-bold tracking-tight"
              style={{
                fontSize: 'clamp(34px, 5vw, 56px)',
                lineHeight: 1,
                marginTop: 6,
              }}
            >
              Hey {greetingDisplay}.
            </h1>
            <div className="text-txt-secondary text-sm mt-3">
              Your roster, this week's sessions and the exercise library.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOpenSchedule(true)}
              className="btn-secondary btn-sm"
            >
              <Calendar size={14} /> Schedule
            </button>
            <button
              onClick={() => setOpenNew(true)}
              className="btn-primary btn-sm"
            >
              <Plus size={14} /> New client
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <KpiRow clients={clients} />
          <WeeklySchedule
            sessions={sessions}
            clients={clients}
            onAddSession={() => setOpenSchedule(true)}
            onOpenClient={onOpenClient}
          />
          <Roster
            clients={clients}
            onOpenClient={onOpenClient}
            onNewClient={() => setOpenNew(true)}
          />
          <ExerciseLibrary
            library={library}
            onOpenSettings={onOpenSettings}
          />
        </div>

        <footer className="mt-10 pt-6 border-t border-border flex items-center justify-between text-[11px] tabular text-txt-muted">
          <div>
            Fitats · dashboard · synced{' '}
            {now.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#D4FF3A' }}
            />
            realtime: clients · library_exercises · sessions
          </div>
        </footer>
      </div>

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
