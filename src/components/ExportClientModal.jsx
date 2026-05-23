import { useEffect, useMemo, useState } from 'react';
import { Download, Check } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import {
  cx,
  initialsOf,
  phaseColor,
  DAY_NAMES,
} from '../lib/utils.js';
import { exportClientWeeks } from '../lib/exportClient.js';

function dayStats(d) {
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
  return { total, done };
}

function weekStats(w) {
  let exCount = 0;
  let setTotal = 0;
  let setDone = 0;
  let activeDays = 0;
  for (const d of w.days) {
    for (const k of ['warmUp', 'resistance', 'coolDown']) {
      exCount += d.sections[k].length;
    }
    const ds = dayStats(d);
    setTotal += ds.total;
    setDone += ds.done;
    if (ds.total > 0) activeDays++;
  }
  return { exCount, setTotal, setDone, activeDays };
}

export default function ExportClientModal({ open, onClose, client }) {
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  // Reset selection each time we open
  useEffect(() => {
    if (open && client) {
      setSelected(new Set((client.weeks || []).map((w) => w.id)));
      setBusy(false);
    }
  }, [open, client?.id]);

  const weeks = client?.weeks || [];
  const phase = weeks[weeks.length - 1]?.phase;
  const phaseHex = phaseColor(phase);

  const ordered = useMemo(
    () => [...weeks].sort((a, b) => a.number - b.number),
    [weeks]
  );

  const toggle = (id) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(weeks.map((w) => w.id)));
  const clearAll = () => setSelected(new Set());

  const chosen = useMemo(
    () => ordered.filter((w) => selected.has(w.id)),
    [ordered, selected]
  );

  const totals = useMemo(() => {
    let ex = 0;
    let sets = 0;
    let done = 0;
    for (const w of chosen) {
      const ws = weekStats(w);
      ex += ws.exCount;
      sets += ws.setTotal;
      done += ws.setDone;
    }
    return { ex, sets, done };
  }, [chosen]);

  const submit = async () => {
    if (chosen.length === 0 || busy || !client) return;
    setBusy(true);
    try {
      exportClientWeeks(client, chosen);
    } finally {
      setBusy(false);
    }
  };

  if (!client) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export workout history"
      maxWidth="560px"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={chosen.length === 0 || busy}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            <Download size={14} />
            {busy
              ? 'Building…'
              : `Download .xlsx (${chosen.length} wk)`}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Client identity */}
        <div className="flex items-center gap-3 pb-1">
          <div
            className="rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0 relative"
            style={{
              width: 44,
              height: 44,
              background: '#1C1C1F',
              color: 'var(--c-brand-lime)',
              border: '1px solid #26262A',
            }}
          >
            {initialsOf(client.name) || '·'}
            {phase && (
              <span
                className="absolute -bottom-0.5 -right-0.5 rounded-full"
                style={{
                  width: 12,
                  height: 12,
                  background: phaseHex,
                  border: '2px solid #141416',
                }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold tracking-tight text-base truncate">
              {client.name}
            </div>
            <div className="text-[11px] text-txt-secondary truncate">
              {weeks.length} week{weeks.length === 1 ? '' : 's'} logged ·{' '}
              {phase || 'no phase'}
            </div>
          </div>
        </div>

        {/* Week picker */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="section-title">
              Choose weeks · {selected.size} of {weeks.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                disabled={weeks.length === 0}
                className="h-7 px-2.5 rounded-pill text-[10px] uppercase tracking-wider font-semibold border border-border text-txt-secondary hover:text-txt-primary disabled:opacity-40"
              >
                Select all
              </button>
              <button
                onClick={clearAll}
                disabled={selected.size === 0}
                className="h-7 px-2.5 rounded-pill text-[10px] uppercase tracking-wider font-semibold border border-border text-txt-secondary hover:text-txt-primary disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>

          {weeks.length === 0 ? (
            <div className="card p-6 text-center text-xs text-txt-muted">
              No weeks logged for this client yet.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
              {ordered.map((w) => {
                const isOn = selected.has(w.id);
                const ws = weekStats(w);
                const wPhase = w.phase;
                const wHex = phaseColor(wPhase);
                const pct =
                  ws.setTotal > 0
                    ? Math.round((ws.setDone / ws.setTotal) * 100)
                    : 0;
                return (
                  <button
                    key={w.id}
                    onClick={() => toggle(w.id)}
                    className={cx(
                      'w-full flex items-center gap-3 p-3 rounded-btn border text-left transition-colors',
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
                      {isOn && (
                        <Check size={14} strokeWidth={3} color="#0A0A0B" />
                      )}
                    </div>
                    <div
                      className="rounded-md flex items-center justify-center font-display tabular font-bold text-[13px] flex-shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        background: '#1C1C1F',
                        color: '#F5F5F7',
                        border: '1px solid #26262A',
                      }}
                    >
                      {w.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block rounded-full"
                          style={{
                            width: 8,
                            height: 8,
                            background: wHex,
                          }}
                        />
                        <span className="text-xs uppercase tracking-wide font-semibold">
                          {wPhase || 'no phase'}
                        </span>
                      </div>
                      <div className="text-[10px] tabular text-txt-muted mt-0.5">
                        {ws.activeDays} active day
                        {ws.activeDays === 1 ? '' : 's'} ·{' '}
                        {ws.exCount} exercise{ws.exCount === 1 ? '' : 's'} ·{' '}
                        {ws.setDone}/{ws.setTotal} sets
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div
                        className="font-display tabular font-bold text-sm"
                        style={{
                          color: pct === 100 && ws.setTotal > 0 ? wHex : '#F5F5F7',
                        }}
                      >
                        {pct}%
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary line */}
        <div className="card p-3 flex items-center gap-4 text-xs text-txt-secondary flex-wrap">
          <span>
            <span className="tabular text-txt-primary font-semibold">
              {chosen.length}
            </span>{' '}
            week{chosen.length === 1 ? '' : 's'}
          </span>
          <span className="text-txt-muted">·</span>
          <span>
            <span className="tabular text-txt-primary font-semibold">
              {totals.ex}
            </span>{' '}
            exercise{totals.ex === 1 ? '' : 's'}
          </span>
          <span className="text-txt-muted">·</span>
          <span>
            <span className="tabular text-txt-primary font-semibold">
              {totals.done}
            </span>
            /{totals.sets} sets
          </span>
        </div>

        <div className="text-[11px] text-txt-muted">
          The export includes a Summary sheet, one sheet per selected week
          (grouped by day with exercises, sets, reps and time side-by-side),
          and a Metrics sheet if you have weight / body-fat check-ins.
        </div>
      </div>
    </Modal>
  );
}
