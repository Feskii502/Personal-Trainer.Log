import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  Edit3,
  Check,
  X,
  Users,
  Dumbbell,
} from 'lucide-react';
import {
  useStore,
  addLibraryExercise,
  updateLibraryExercise,
  removeLibraryExercise,
  updateClient,
  deleteClient,
} from '../lib/store.js';
import {
  MUSCLE_GROUPS,
  EXERCISE_TYPES,
  cx,
  fmtDate,
} from '../lib/utils.js';

const toDateInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

function ExercisesTab() {
  const { library } = useStore();
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState({
    name: '',
    mainMuscle: MUSCLE_GROUPS[0],
    subMuscles: [],
    type: '+kg',
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return library
      .filter((ex) => (!muscle || ex.mainMuscle === muscle))
      .filter((ex) => !s || ex.name.toLowerCase().includes(s));
  }, [library, q, muscle]);

  const startEdit = (ex) => {
    setEditingId(ex.id);
    setDraft({ ...ex });
  };

  const saveEdit = () => {
    if (!draft.name.trim()) return;
    updateLibraryExercise(editingId, {
      name: draft.name.trim(),
      mainMuscle: draft.mainMuscle,
      subMuscles: draft.subMuscles,
      type: draft.type,
    });
    setEditingId(null);
    setDraft(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const createNew = () => {
    if (!newDraft.name.trim()) return;
    addLibraryExercise({
      name: newDraft.name.trim(),
      mainMuscle: newDraft.mainMuscle,
      subMuscles: newDraft.subMuscles,
      type: newDraft.type,
    });
    setNewDraft({
      name: '',
      mainMuscle: MUSCLE_GROUPS[0],
      subMuscles: [],
      type: '+kg',
    });
    setCreating(false);
  };

  const toggleSub = (arr, m, setter) => {
    setter(arr.includes(m) ? arr.filter((x) => x !== m) : [...arr, m]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-secondary"
          />
          <input
            className="input pl-11"
            placeholder="Search exercises..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => setCreating((v) => !v)}>
          <Plus size={18} /> New Exercise
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        <button
          className={cx('chip shrink-0', !muscle && 'chip-active')}
          onClick={() => setMuscle(null)}
        >
          All
        </button>
        {MUSCLE_GROUPS.map((m) => (
          <button
            key={m}
            className={cx('chip shrink-0', muscle === m && 'chip-active')}
            onClick={() => setMuscle(m === muscle ? null : m)}
          >
            {m}
          </button>
        ))}
      </div>

      {creating && (
        <div className="card p-5 space-y-4">
          <div className="section-title">New Exercise</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              autoFocus
              className="input"
              placeholder="Name"
              value={newDraft.name}
              onChange={(e) =>
                setNewDraft((d) => ({ ...d, name: e.target.value }))
              }
            />
            <select
              className="input"
              value={newDraft.mainMuscle}
              onChange={(e) =>
                setNewDraft((d) => ({ ...d, mainMuscle: e.target.value }))
              }
            >
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="section-title mb-2">Sub Muscles</div>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.filter((m) => m !== newDraft.mainMuscle).map((m) => {
                const active = newDraft.subMuscles.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() =>
                      toggleSub(newDraft.subMuscles, m, (arr) =>
                        setNewDraft((d) => ({ ...d, subMuscles: arr }))
                      )
                    }
                    className={cx('chip', active && 'chip-active')}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="section-title mb-2">Type</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-bg-surface border border-border rounded-btn p-1">
              {EXERCISE_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setNewDraft((d) => ({ ...d, type: t.key }))}
                  className={cx(
                    'rounded-btn text-sm font-semibold',
                    newDraft.type === t.key
                      ? 'bg-bg-elevated text-brand-lime'
                      : 'text-txt-secondary'
                  )}
                  style={{ minHeight: 44 }}
                >
                  {t.key}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setCreating(false)}>
              Cancel
            </button>
            <button
              className="btn-primary disabled:opacity-40"
              disabled={!newDraft.name.trim()}
              onClick={createNew}
            >
              <Plus size={18} /> Create
            </button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-border">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-txt-secondary">
            No exercises match.
          </div>
        )}
        {filtered.map((ex) => {
          const isEditing = editingId === ex.id;
          if (isEditing) {
            return (
              <div key={ex.id} className="p-4 space-y-3 bg-bg-elevated">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px] gap-3">
                  <input
                    className="input"
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                  />
                  <select
                    className="input"
                    value={draft.mainMuscle}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, mainMuscle: e.target.value }))
                    }
                  >
                    {MUSCLE_GROUPS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input tabular"
                    value={draft.type}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, type: e.target.value }))
                    }
                  >
                    {EXERCISE_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.key}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MUSCLE_GROUPS.filter((m) => m !== draft.mainMuscle).map(
                    (m) => {
                      const active = (draft.subMuscles || []).includes(m);
                      return (
                        <button
                          key={m}
                          onClick={() =>
                            toggleSub(draft.subMuscles || [], m, (arr) =>
                              setDraft((d) => ({ ...d, subMuscles: arr }))
                            )
                          }
                          className={cx('chip', active && 'chip-active')}
                        >
                          {m}
                        </button>
                      );
                    }
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button className="btn-secondary btn-sm" onClick={cancelEdit}>
                    <X size={14} /> Cancel
                  </button>
                  <button className="btn-primary btn-sm" onClick={saveEdit}>
                    <Check size={14} /> Save
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={ex.id}
              className="p-4 flex items-center gap-3 flex-wrap"
            >
              <div className="flex-1 min-w-[180px]">
                <div className="font-semibold">{ex.name}</div>
                <div className="text-xs text-txt-secondary mt-0.5 uppercase tracking-wide flex items-center gap-2 flex-wrap">
                  <span>{ex.mainMuscle}</span>
                  {ex.subMuscles?.length > 0 && (
                    <span className="text-txt-muted">
                      · {ex.subMuscles.join(', ')}
                    </span>
                  )}
                  <span
                    className="text-[10px] tabular font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      color: '#D4FF3A',
                      background: '#D4FF3A14',
                    }}
                  >
                    {ex.type}
                  </span>
                </div>
              </div>
              <button
                className="btn-icon text-txt-secondary hover:text-brand-lime"
                onClick={() => startEdit(ex)}
                aria-label="Edit"
              >
                <Edit3 size={18} />
              </button>
              <button
                className="btn-icon text-txt-muted hover:text-brand-red"
                onClick={() => {
                  if (
                    confirm(
                      `Delete "${ex.name}" from library? Existing logged sessions keep their data.`
                    )
                  ) {
                    removeLibraryExercise(ex.id);
                  }
                }}
                aria-label="Delete"
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClientRow({ client, onOpen }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(client.name);
  const [signup, setSignup] = useState(toDateInput(client.signupDate));
  const [exp, setExp] = useState(toDateInput(client.expiryDate));

  const save = () => {
    if (!name.trim()) return;
    updateClient(client.id, {
      name: name.trim(),
      signupDate: signup ? new Date(signup).toISOString() : client.signupDate,
      expiryDate: exp ? new Date(exp).toISOString() : null,
    });
    setEditing(false);
  };

  const cancel = () => {
    setName(client.name);
    setSignup(toDateInput(client.signupDate));
    setExp(toDateInput(client.expiryDate));
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="p-4 space-y-3 bg-bg-elevated">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-3">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
          <div>
            <label className="section-title block mb-1">Signup</label>
            <input
              type="date"
              className="input"
              value={signup}
              onChange={(e) => setSignup(e.target.value)}
            />
          </div>
          <div>
            <label className="section-title block mb-1">Expiry</label>
            <input
              type="date"
              className="input"
              value={exp}
              onChange={(e) => setExp(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-txt-muted">
            Height is locked at {client.height ? `${client.height} cm` : 'not set'}
            .
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary btn-sm" onClick={cancel}>
              <X size={14} /> Cancel
            </button>
            <button className="btn-primary btn-sm" onClick={save}>
              <Check size={14} /> Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex items-center gap-4 flex-wrap">
      <button
        onClick={() => onOpen(client.id)}
        className="flex-1 min-w-[200px] text-left"
      >
        <div className="font-semibold">{client.name}</div>
        <div className="text-xs text-txt-secondary mt-0.5 flex items-center gap-3 flex-wrap">
          <span>Signup {fmtDate(client.signupDate)}</span>
          <span className="text-txt-muted">·</span>
          <span>Expires {fmtDate(client.expiryDate)}</span>
          {client.height && (
            <>
              <span className="text-txt-muted">·</span>
              <span className="tabular">{client.height} cm</span>
            </>
          )}
        </div>
      </button>
      <button
        className="btn-icon text-txt-secondary hover:text-brand-lime"
        onClick={() => setEditing(true)}
        aria-label="Edit"
      >
        <Edit3 size={18} />
      </button>
      <button
        className="btn-icon text-txt-muted hover:text-brand-red"
        onClick={() => {
          if (confirm(`Delete ${client.name}? This cannot be undone.`)) {
            deleteClient(client.id);
          }
        }}
        aria-label="Delete"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

function ClientsTab({ onOpenClient }) {
  const { clients } = useStore();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(s));
  }, [clients, q]);

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-txt-secondary"
        />
        <input
          className="input pl-11"
          placeholder="Search clients..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="card divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-txt-secondary">
            No clients match.
          </div>
        ) : (
          filtered.map((c) => (
            <ClientRow key={c.id} client={c} onOpen={onOpenClient} />
          ))
        )}
      </div>
    </div>
  );
}

const TABS = [
  { key: 'exercises', label: 'Exercises', icon: Dumbbell },
  { key: 'clients', label: 'Clients', icon: Users },
];

export default function SettingsView({ onBack, onOpenClient }) {
  const [tab, setTab] = useState('exercises');

  return (
    <div className="min-h-full">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 pt-6 pb-20">
        <div className="flex items-center justify-between mb-6">
          <button className="btn-icon text-txt-secondary" onClick={onBack}>
            <ArrowLeft size={22} />
          </button>
          <div className="section-title">Settings</div>
          <div style={{ width: 44 }} />
        </div>

        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-6">
          Settings
        </h1>

        <div className="mb-6">
          <div className="flex gap-2 bg-bg-surface border border-border rounded-btn p-1 max-w-md">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cx(
                    'flex-1 flex items-center justify-center gap-2 rounded-btn text-sm font-semibold',
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

        {tab === 'exercises' && <ExercisesTab />}
        {tab === 'clients' && <ClientsTab onOpenClient={onOpenClient} />}
      </div>
    </div>
  );
}
