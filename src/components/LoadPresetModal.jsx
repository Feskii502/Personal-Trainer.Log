import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import { useWorkoutPresets } from '../hooks/useWorkoutPresets.js';
import { loadPresetIntoDay } from '../lib/store.js';
import { cx } from '../lib/utils.js';

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

export default function LoadPresetModal({
  open,
  onClose,
  clientId,
  weekId,
  dayId,
}) {
  const { presets, loading } = useWorkoutPresets();
  const [pickedId, setPickedId] = useState(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return presets;
    return presets.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.description?.toLowerCase().includes(s) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(s))
    );
  }, [presets, q]);

  const apply = () => {
    const p = presets.find((x) => x.id === pickedId);
    if (!p) return;
    setBusy(true);
    loadPresetIntoDay(clientId, weekId, dayId, p.sections, 'replace');
    setBusy(false);
    setPickedId(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Load workout preset"
      maxWidth="560px"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={apply}
            disabled={!pickedId || busy}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            {busy ? 'Applying…' : 'Load preset'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-[11px] text-txt-muted">
          Pick a preset and the current day's exercises will be replaced
          with the preset's structure. Sets start empty so you can log them
          live during the session.
        </div>

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-secondary"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search presets by name, tag, description…"
            className="w-full bg-bg-base border border-border rounded-btn h-10 pl-9 pr-3 text-sm outline-none focus:border-brand-lime"
          />
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-txt-muted">
            Loading presets…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-txt-muted">
            {presets.length === 0
              ? "You don't have any saved presets yet. Save the current day as a preset first."
              : 'No presets match.'}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
            {filtered.map((p) => {
              const totals = presetTotals(p);
              const isOn = p.id === pickedId;
              return (
                <button
                  key={p.id}
                  onClick={() => setPickedId(p.id)}
                  className={cx(
                    'w-full flex items-center gap-3 p-3 rounded-btn border text-left transition-colors',
                    isOn
                      ? 'border-brand-lime bg-[rgba(212,255,58,0.06)]'
                      : 'border-border hover:border-[#3a3a40]'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-sm font-semibold truncate">
                        {p.name || 'Untitled'}
                      </div>
                      {p.tags?.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded text-brand-lime"
                          style={{ background: '#D4FF3A14' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    {p.description && (
                      <div className="text-[11px] text-txt-secondary mt-0.5 truncate">
                        {p.description}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-[11px] flex-shrink-0">
                    <div className="tabular text-txt-primary font-semibold">
                      {totals.ex} ex
                    </div>
                    <div className="tabular text-txt-muted">{totals.sets} sets</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
