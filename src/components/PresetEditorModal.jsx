import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  X,
  Search,
  ArrowUp,
  ArrowDown,
  Flame,
  Dumbbell,
  Snowflake,
  Minus,
} from 'lucide-react';
import Modal from './ui/Modal.jsx';
import { useStore } from '../lib/store.js';
import { cx, DAY_TAGS } from '../lib/utils.js';

const SECTIONS = [
  { key: 'warmUp', label: 'Warm Up', icon: Flame },
  { key: 'resistance', label: 'Resistance', icon: Dumbbell },
  { key: 'coolDown', label: 'Cool Down', icon: Snowflake },
];

function makeRow(lib) {
  return {
    rowId: 'r' + Math.random().toString(36).slice(2, 8),
    libraryId: lib.id,
    name: lib.name,
    mainMuscle: lib.mainMuscle,
    subMuscles: lib.subMuscles || [],
    type: lib.type,
    restSeconds: 90,
    setCount: 3,
    betweenRestSeconds: 120,
  };
}

function ExercisePicker({ library, existingIds, onPick, onClose }) {
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('all');
  const muscles = useMemo(
    () => ['all', ...new Set(library.map((l) => l.mainMuscle).filter(Boolean))],
    [library]
  );
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return library
      .filter((l) => muscle === 'all' || l.mainMuscle === muscle)
      .filter((l) => !s || l.name.toLowerCase().includes(s))
      .slice(0, 30);
  }, [library, q, muscle]);
  return (
    <div className="card p-3 mt-1.5 space-y-2.5 bg-bg-elevated/40">
      <div className="flex items-center justify-between gap-2">
        <div className="section-title">Pick an exercise</div>
        <button
          onClick={onClose}
          className="text-txt-muted hover:text-txt-primary"
          aria-label="Close picker"
        >
          <X size={14} />
        </button>
      </div>
      <div className="relative">
        <Search
          size={12}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary"
        />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search exercises…"
          className="w-full bg-bg-base border border-border rounded-btn h-9 pl-8 pr-3 text-[12px] outline-none focus:border-brand-lime"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {muscles.map((m) => (
          <button
            key={m}
            onClick={() => setMuscle(m)}
            className={cx(
              'h-6 px-2 rounded-pill text-[9px] uppercase tracking-wider font-semibold border transition-colors',
              muscle === m
                ? 'bg-brand-lime text-black border-brand-lime'
                : 'border-border text-txt-secondary hover:text-txt-primary'
            )}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-3 text-[11px] text-txt-muted">
            No matches.
          </div>
        ) : (
          filtered.map((l) => (
            <button
              key={l.id}
              onClick={() => onPick(l)}
              className="w-full flex items-center gap-2 p-2 rounded-btn hover:bg-bg-elevated border border-transparent hover:border-border transition-colors text-left"
            >
              <div
                className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 border border-border bg-bg-elevated"
              >
                <span className="text-[9px] tabular font-bold text-brand-lime">
                  {l.type}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate">
                  {l.name}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-txt-muted truncate">
                  {l.mainMuscle}
                </div>
              </div>
              <Plus size={12} className="text-brand-lime" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function NumberStepper({ value, onChange, min = 0, max = 20, step = 1, suffix }) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <div
      className="flex items-center rounded-btn border border-border overflow-hidden tabular"
      style={{ background: 'var(--c-input-bg)' }}
    >
      <button
        onClick={dec}
        disabled={value <= min}
        className="w-8 h-9 flex items-center justify-center text-txt-secondary hover:text-brand-lime disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Decrease"
      >
        <Minus size={12} />
      </button>
      <div className="px-2 h-9 flex items-center justify-center font-display font-bold text-[13px] min-w-[44px] text-center">
        {value}
        {suffix && (
          <span className="text-[10px] text-txt-muted ml-0.5">{suffix}</span>
        )}
      </div>
      <button
        onClick={inc}
        disabled={value >= max}
        className="w-8 h-9 flex items-center justify-center text-txt-secondary hover:text-brand-lime disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Increase"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

function SectionEditor({ sectionKey, label, Icon, rows, onChange, library }) {
  const [picking, setPicking] = useState(false);
  const existingIds = rows.map((r) => r.libraryId);

  const add = (lib) => {
    onChange([...rows, makeRow(lib)]);
    setPicking(false);
  };
  const patch = (rowId, p) =>
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...p } : r)));
  const remove = (rowId) => onChange(rows.filter((r) => r.rowId !== rowId));
  const move = (rowId, dir) => {
    const i = rows.findIndex((r) => r.rowId === rowId);
    if (i < 0) return;
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const totalSets = rows.reduce((a, r) => a + (r.setCount || 0), 0);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-brand-lime" />
          <div className="section-title">{label}</div>
          <span
            className="text-[10px] tabular px-1.5 rounded text-txt-secondary"
            style={{ background: 'var(--c-avatar-bg)' }}
          >
            {rows.length} ex · {totalSets} sets
          </span>
        </div>
        <button
          onClick={() => setPicking((p) => !p)}
          className={cx(
            'h-8 px-2.5 rounded-btn text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1 transition-colors',
            picking
              ? 'bg-bg-elevated text-txt-primary border border-border'
              : 'bg-brand-lime text-black'
          )}
        >
          {picking ? (
            <>
              <X size={11} /> Close
            </>
          ) : (
            <>
              <Plus size={11} /> Add
            </>
          )}
        </button>
      </div>

      {rows.length === 0 && !picking && (
        <div className="text-center py-4 text-[11px] text-txt-muted">
          No exercises in this section.
        </div>
      )}

      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={r.rowId}>
            <div
              className="flex items-center gap-2 p-2 rounded-btn border border-border"
              style={{ background: 'var(--c-bg-surface)' }}
            >
              <div className="w-6 text-[10px] tabular font-bold text-txt-muted text-center">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold truncate">
                  {r.name}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-txt-muted truncate">
                  {r.mainMuscle} · {r.type}
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-[8px] uppercase tracking-wider text-txt-muted">
                  Sets
                </div>
                <NumberStepper
                  value={r.setCount}
                  onChange={(v) => patch(r.rowId, { setCount: v })}
                  min={0}
                  max={20}
                />
              </div>

              <div className="flex flex-col items-center">
                <div className="text-[8px] uppercase tracking-wider text-txt-muted">
                  Rest
                </div>
                <NumberStepper
                  value={r.restSeconds}
                  onChange={(v) => patch(r.rowId, { restSeconds: v })}
                  min={0}
                  max={600}
                  step={15}
                  suffix="s"
                />
              </div>

              <div className="flex flex-col">
                <button
                  onClick={() => move(r.rowId, 'up')}
                  disabled={i === 0}
                  className="w-6 h-4 flex items-center justify-center text-txt-secondary hover:text-brand-lime disabled:opacity-25"
                  aria-label="Move up"
                >
                  <ArrowUp size={10} />
                </button>
                <button
                  onClick={() => move(r.rowId, 'down')}
                  disabled={i === rows.length - 1}
                  className="w-6 h-4 flex items-center justify-center text-txt-secondary hover:text-brand-lime disabled:opacity-25"
                  aria-label="Move down"
                >
                  <ArrowDown size={10} />
                </button>
              </div>

              <button
                onClick={() => remove(r.rowId)}
                className="w-6 h-7 flex items-center justify-center text-txt-muted hover:text-brand-red"
                aria-label="Remove exercise"
                title="Remove"
              >
                <X size={14} />
              </button>
            </div>

            {i < rows.length - 1 && (
              <div className="flex items-center gap-2 pl-8 pr-2 py-1.5">
                <div
                  className="h-px flex-1"
                  style={{ background: '#26262A' }}
                />
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-txt-muted">
                  <span>Rest between</span>
                  <NumberStepper
                    value={r.betweenRestSeconds ?? 0}
                    onChange={(v) =>
                      patch(r.rowId, { betweenRestSeconds: v })
                    }
                    min={0}
                    max={600}
                    step={15}
                    suffix="s"
                  />
                </div>
                <div
                  className="h-px flex-1"
                  style={{ background: '#26262A' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {picking && (
        <ExercisePicker
          library={library}
          existingIds={existingIds}
          onPick={add}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

// Convert preset.sections (which have libraryId, name, ... and setCount) to
// editor rows (the same shape plus a unique rowId for editor-local keys).
function sectionsToRows(sections) {
  const out = {};
  for (const k of ['warmUp', 'resistance', 'coolDown']) {
    out[k] = (sections?.[k] || []).map((e) => ({
      rowId: 'r' + Math.random().toString(36).slice(2, 8),
      libraryId: e.libraryId,
      name: e.name,
      mainMuscle: e.mainMuscle,
      subMuscles: e.subMuscles || [],
      type: e.type,
      restSeconds: e.restSeconds ?? 90,
      setCount: e.setCount ?? 0,
      betweenRestSeconds: e.betweenRestSeconds ?? 120,
    }));
  }
  return out;
}

function rowsToSections(rows) {
  const out = {};
  for (const k of ['warmUp', 'resistance', 'coolDown']) {
    out[k] = (rows[k] || []).map((r) => ({
      libraryId: r.libraryId,
      name: r.name,
      mainMuscle: r.mainMuscle,
      subMuscles: r.subMuscles || [],
      type: r.type,
      restSeconds: r.restSeconds ?? 90,
      setCount: r.setCount ?? 0,
      betweenRestSeconds: r.betweenRestSeconds ?? 120,
    }));
  }
  return out;
}

export default function PresetEditorModal({
  open,
  onClose,
  preset, // null = creating new, otherwise existing preset
  onSave, // (preset) => Promise
}) {
  const { library } = useStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [rows, setRows] = useState({ warmUp: [], resistance: [], coolDown: [] });
  const [busy, setBusy] = useState(false);
  const isEditing = !!preset;

  useEffect(() => {
    if (open) {
      setName(preset?.name || '');
      setDescription(preset?.description || '');
      setTags(preset?.tags || []);
      setRows(sectionsToRows(preset?.sections));
      setBusy(false);
    }
  }, [open, preset]);

  const totalEx =
    rows.warmUp.length + rows.resistance.length + rows.coolDown.length;
  const totalSets = [...rows.warmUp, ...rows.resistance, ...rows.coolDown].reduce(
    (a, r) => a + (r.setCount || 0),
    0
  );

  const toggleTag = (t) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const submit = async () => {
    if (!name.trim() || totalEx === 0 || busy) return;
    setBusy(true);
    await onSave({
      id: preset?.id,
      name: name.trim(),
      description: description.trim(),
      tags,
      sections: rowsToSections(rows),
    });
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit preset' : 'New workout preset'}
      maxWidth="720px"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || totalEx === 0 || busy}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            {busy ? 'Saving…' : isEditing ? 'Save changes' : 'Create preset'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Identity row */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="section-title block mb-1.5">Name</label>
            <input
              autoFocus
              className="input"
              placeholder="e.g., Push Day — Hypertrophy"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-3 text-xs text-txt-secondary tabular sm:pl-2 sm:border-l sm:border-border">
            <div>
              <div className="section-title">Ex</div>
              <div className="font-display font-bold text-lg text-txt-primary tabular">
                {totalEx}
              </div>
            </div>
            <div>
              <div className="section-title">Sets</div>
              <div className="font-display font-bold text-lg text-txt-primary tabular">
                {totalSets}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="section-title block mb-1.5">
            Description · optional
          </label>
          <textarea
            className="input resize-none"
            style={{ minHeight: 56 }}
            placeholder="Who this is for, what it focuses on…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="section-title block mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_TAGS.map((t) => {
              const on = tags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={cx(
                    'h-7 px-2.5 rounded-pill text-[10px] uppercase tracking-wider font-semibold border transition-colors',
                    on
                      ? 'bg-brand-lime text-black border-brand-lime'
                      : 'border-border text-txt-secondary hover:text-txt-primary'
                  )}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {SECTIONS.map((s) => (
          <SectionEditor
            key={s.key}
            sectionKey={s.key}
            label={s.label}
            Icon={s.icon}
            rows={rows[s.key]}
            onChange={(next) => setRows((r) => ({ ...r, [s.key]: next }))}
            library={library}
          />
        ))}

        <div className="text-[11px] text-txt-muted">
          Set values (weight, reps, completion) aren't stored on the preset —
          only the structure. Loading this preset into a client's day creates
          empty sets ready to log during the session.
        </div>
      </div>
    </Modal>
  );
}
