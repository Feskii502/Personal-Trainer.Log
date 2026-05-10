import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  User as UserIcon,
  Download,
  LogOut,
  Save,
  Mail,
  Lock,
  Check,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '../lib/store.js';
import { supabase } from '../lib/supabase.js';
import { cx, initialsOf, daysUntil } from '../lib/utils.js';
import {
  exportClientWorkbook,
  exportAllClientsWorkbook,
} from '../lib/exportClient.js';

const TABS = [
  { key: 'account', label: 'Account', icon: UserIcon },
  { key: 'export', label: 'Export', icon: Download },
];

function Banner({ kind, children, onDismiss }) {
  const tones = {
    info: { color: '#3ADBC7', bg: '#3ADBC714', border: '#3ADBC733' },
    success: { color: '#3ADBC7', bg: '#3ADBC714', border: '#3ADBC733' },
    error: { color: '#FF4D3A', bg: '#FF4D3A14', border: '#FF4D3A33' },
    warn: { color: '#FF8A3A', bg: '#FF8A3A14', border: '#FF8A3A33' },
  };
  const t = tones[kind] || tones.info;
  return (
    <div
      className="text-sm px-3 py-2 rounded-btn flex items-start gap-2"
      style={{ color: t.color, background: t.bg, border: `1px solid ${t.border}` }}
    >
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-[11px] uppercase tracking-wider hover:underline"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

function AccountTab() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState({});
  const [msg, setMsg] = useState(null); // { kind, text }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (!u) return;
      setUser(u);
      setName(u.user_metadata?.full_name || u.user_metadata?.name || '');
      setEmail(u.email || '');
    });
  }, []);

  const saveName = async () => {
    setBusy((b) => ({ ...b, name: true }));
    setMsg(null);
    const trimmed = name.trim();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    });
    setBusy((b) => ({ ...b, name: false }));
    if (error) setMsg({ kind: 'error', text: error.message });
    else setMsg({ kind: 'success', text: 'Name updated.' });
  };

  const saveEmail = async () => {
    setBusy((b) => ({ ...b, email: true }));
    setMsg(null);
    const trimmed = email.trim();
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setBusy((b) => ({ ...b, email: false }));
    if (error) setMsg({ kind: 'error', text: error.message });
    else
      setMsg({
        kind: 'info',
        text: 'Check your old and new inboxes — Supabase sends a confirmation link to both before switching.',
      });
  };

  const savePassword = async () => {
    setMsg(null);
    if (pw1.length < 8) {
      setMsg({ kind: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (pw1 !== pw2) {
      setMsg({ kind: 'error', text: "Passwords don't match." });
      return;
    }
    setBusy((b) => ({ ...b, pw: true }));
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setBusy((b) => ({ ...b, pw: false }));
    if (error) setMsg({ kind: 'error', text: error.message });
    else {
      setPw1('');
      setPw2('');
      setMsg({ kind: 'success', text: 'Password updated.' });
    }
  };

  const onSignOut = async () => {
    setBusy((b) => ({ ...b, out: true }));
    await supabase.auth.signOut();
  };

  return (
    <div className="space-y-5">
      {/* Identity card */}
      <div className="card p-5 sm:p-6 flex items-center gap-4">
        <div
          className="rounded-full flex items-center justify-center font-display font-bold text-xl flex-shrink-0"
          style={{
            width: 64,
            height: 64,
            background: '#1C1C1F',
            color: '#D4FF3A',
            border: '1px solid #26262A',
          }}
        >
          {initialsOf(name || email) || '·'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold tracking-tight text-xl truncate">
            {name || (email ? email.split('@')[0] : 'Coach')}
          </div>
          <div className="text-xs text-txt-secondary truncate">{email}</div>
        </div>
      </div>

      {msg && (
        <Banner kind={msg.kind} onDismiss={() => setMsg(null)}>
          {msg.text}
        </Banner>
      )}

      {/* Display name */}
      <div className="card p-5">
        <div className="section-title mb-3 flex items-center gap-1.5">
          <UserIcon size={12} /> Display name
        </div>
        <div className="text-xs text-txt-secondary mb-3">
          Shown on the dashboard greeting ("Hey [name].") and used for the
          avatar initials.
        </div>
        <div className="flex gap-2 items-end flex-wrap">
          <input
            className="input flex-1 min-w-[180px]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <button
            onClick={saveName}
            disabled={busy.name || !name.trim()}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            <Save size={14} /> {busy.name ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Email */}
      <div className="card p-5">
        <div className="section-title mb-3 flex items-center gap-1.5">
          <Mail size={12} /> Email
        </div>
        <div className="text-xs text-txt-secondary mb-3">
          Changing this sends confirmation links to both addresses before the
          switch takes effect.
        </div>
        <div className="flex gap-2 items-end flex-wrap">
          <input
            type="email"
            className="input flex-1 min-w-[180px]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <button
            onClick={saveEmail}
            disabled={
              busy.email || !email.trim() || email.trim() === user?.email
            }
            className="btn-secondary btn-sm disabled:opacity-50"
          >
            <Save size={14} /> {busy.email ? 'Sending...' : 'Update'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card p-5">
        <div className="section-title mb-3 flex items-center gap-1.5">
          <Lock size={12} /> Password
        </div>
        <div className="text-xs text-txt-secondary mb-3">
          Minimum 8 characters. You'll stay signed in after changing it.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="password"
            className="input"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
          />
          <input
            type="password"
            className="input"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={savePassword}
            disabled={busy.pw || !pw1 || !pw2}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            <Save size={14} /> {busy.pw ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </div>

      {/* Sign out */}
      <div className="card p-5">
        <div className="section-title mb-3">Session</div>
        <button
          onClick={onSignOut}
          disabled={busy.out}
          className="btn-secondary disabled:opacity-50"
        >
          <LogOut size={18} /> {busy.out ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

function ExportTab() {
  const { clients } = useStore();
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (id) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(clients.map((c) => c.id)));
  const clearAll = () => setSelected(new Set());

  const selectedClients = useMemo(
    () => clients.filter((c) => selected.has(c.id)),
    [clients, selected]
  );

  const totalSessions = useMemo(() => {
    let n = 0;
    for (const c of selectedClients) {
      for (const w of c.weeks || []) {
        for (const d of w.days) {
          let total = 0;
          let done = 0;
          for (const k of ['warmUp', 'resistance', 'coolDown']) {
            for (const ex of d.sections[k]) {
              for (const s of ex.sets) {
                total++;
                if (s.completed) done++;
              }
            }
          }
          if (total > 0 && done >= total) n++;
        }
      }
    }
    return n;
  }, [selectedClients]);

  const exportSelected = async () => {
    if (selectedClients.length === 0) return;
    setBusy(true);
    try {
      if (selectedClients.length === 1) {
        exportClientWorkbook(selectedClients[0]);
      } else {
        exportAllClientsWorkbook(selectedClients);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex-shrink-0 rounded-btn flex items-center justify-center"
            style={{
              width: 44,
              height: 44,
              background: '#D4FF3A14',
              border: '1px solid #D4FF3A33',
              color: '#D4FF3A',
            }}
          >
            <FileSpreadsheet size={20} />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-lg tracking-tight">
              Export to Excel
            </div>
            <div className="text-xs text-txt-secondary mt-0.5">
              Generates an .xlsx file with a Summary sheet, full Workout
              history (one row per set), Drop sets, and weight / body fat /
              BMI metrics. Opens in Excel, Numbers, or Google Sheets.
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="section-title">
            Choose clients · {selected.size} of {clients.length} selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="h-8 px-3 rounded-pill text-[11px] uppercase tracking-wider font-semibold border border-border text-txt-secondary hover:text-txt-primary"
            >
              Select all
            </button>
            <button
              onClick={clearAll}
              className="h-8 px-3 rounded-pill text-[11px] uppercase tracking-wider font-semibold border border-border text-txt-secondary hover:text-txt-primary"
            >
              Clear
            </button>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="text-center py-8 text-sm text-txt-muted">
            No clients to export yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[320px] overflow-y-auto pr-1">
            {clients.map((c) => {
              const isOn = selected.has(c.id);
              const phase = c.weeks?.[c.weeks.length - 1]?.phase;
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={cx(
                    'flex items-center gap-3 p-2.5 rounded-btn border text-left transition-colors',
                    isOn
                      ? 'border-brand-lime bg-[rgba(212,255,58,0.06)]'
                      : 'border-border hover:border-[#3a3a40]'
                  )}
                >
                  <div
                    className={cx(
                      'flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border',
                      isOn
                        ? 'bg-brand-lime border-brand-lime'
                        : 'border-border'
                    )}
                  >
                    {isOn && <Check size={14} strokeWidth={3} color="#0A0A0B" />}
                  </div>
                  <div
                    className="rounded-full flex items-center justify-center font-display font-bold text-[11px] flex-shrink-0"
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
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">
                      {c.name}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-txt-muted truncate">
                      {phase || 'no phase'} · {c.weeks?.length || 0} wk
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-5 pt-5 border-t border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-txt-secondary">
            {selected.size === 0 ? (
              'Pick at least one client to enable export.'
            ) : (
              <>
                <span className="tabular text-txt-primary font-semibold">
                  {selected.size}
                </span>{' '}
                client{selected.size === 1 ? '' : 's'} ·{' '}
                <span className="tabular text-txt-primary font-semibold">
                  {totalSessions}
                </span>{' '}
                completed session{totalSessions === 1 ? '' : 's'} included
              </>
            )}
          </div>
          <button
            onClick={exportSelected}
            disabled={busy || selected.size === 0}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            <Download size={14} />
            {busy
              ? 'Building...'
              : selected.size > 1
              ? `Download .xlsx (${selected.size} clients)`
              : 'Download .xlsx'}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="section-title mb-2 flex items-center gap-1.5">
          <AlertTriangle size={12} /> What's included
        </div>
        <ul className="text-xs text-txt-secondary space-y-1.5 list-disc pl-4">
          <li>
            <span className="text-txt-primary font-semibold">Summary</span> —
            client identity, expiry, height, current phase, sessions logged,
            total volume.
          </li>
          <li>
            <span className="text-txt-primary font-semibold">Workouts</span> —
            one row per set with week, day, section, exercise, weight, reps,
            duration, completion flag, rest, and timer elapsed.
          </li>
          <li>
            <span className="text-txt-primary font-semibold">Drop Sets</span> —
            separate sheet listing every drop set tied to its parent set
            (skipped if you have none).
          </li>
          <li>
            <span className="text-txt-primary font-semibold">Metrics</span> —
            weekly check-ins (weight, body fat %) with auto-computed BMI from
            the client's current height.
          </li>
          <li>
            Multi-client exports add a <span className="text-txt-primary font-semibold">Roster</span>{' '}
            sheet up front and one workout sheet per client.
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function SettingsView({ onBack }) {
  const [tab, setTab] = useState('account');

  return (
    <div className="min-h-full">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-20 space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="btn-icon text-txt-secondary hover:text-txt-primary"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="section-title">Settings</div>
          <div style={{ width: 44 }} />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          Settings
        </h1>

        <div className="card p-1 flex items-center gap-1 max-w-md">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cx(
                  'flex-1 h-11 px-4 rounded-btn text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors',
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

        {tab === 'account' && <AccountTab />}
        {tab === 'export' && <ExportTab />}
      </div>
    </div>
  );
}
