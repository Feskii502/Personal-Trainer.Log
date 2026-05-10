import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  User as UserIcon,
  Download,
  LogOut,
  Save,
  Mail,
  Lock,
  ChevronRight,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import { useStore } from '../lib/store.js';
import { supabase } from '../lib/supabase.js';
import { cx, initialsOf, phaseColor } from '../lib/utils.js';
import ExportClientModal from './ExportClientModal.jsx';

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
  const [activeClient, setActiveClient] = useState(null);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(s));
  }, [clients, q]);

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
              Pick a client below, choose which weeks to include, and download
              an .xlsx with a Summary sheet, one sheet per week (exercises,
              sets, reps and time side-by-side), and a Metrics sheet.
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients…"
            className="w-full bg-bg-base border border-border rounded-btn h-10 pl-9 pr-3 text-[13px] outline-none focus:border-brand-lime"
          />
        </div>

        {clients.length === 0 ? (
          <div className="text-center py-8 text-sm text-txt-muted">
            No clients yet — add one from the dashboard to enable exports.
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-txt-muted">
            No clients match.
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((c) => {
              const phase = c.weeks?.[c.weeks.length - 1]?.phase;
              const phaseHex = phaseColor(phase);
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveClient(c)}
                  className="group w-full flex items-center gap-3 p-3 rounded-btn border border-border hover:border-[#3a3a40] hover:bg-[#16161A] transition-colors text-left"
                >
                  <div
                    className="rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0 relative"
                    style={{
                      width: 38,
                      height: 38,
                      background: '#1C1C1F',
                      color: '#D4FF3A',
                      border: '1px solid #26262A',
                    }}
                  >
                    {initialsOf(c.name) || '·'}
                    {phase && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 rounded-full"
                        style={{
                          width: 11,
                          height: 11,
                          background: phaseHex,
                          border: '2px solid #141416',
                        }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">
                      {c.name}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-txt-muted truncate">
                      {phase || 'no phase'} ·{' '}
                      {c.weeks?.length || 0} wk logged
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-txt-secondary group-hover:text-brand-lime flex-shrink-0">
                    <Download size={14} />
                    <span className="hidden sm:inline">Export</span>
                    <ChevronRight size={14} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ExportClientModal
        open={!!activeClient}
        onClose={() => setActiveClient(null)}
        client={activeClient}
      />
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
