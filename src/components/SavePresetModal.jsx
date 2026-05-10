import { useEffect, useMemo, useState } from 'react';
import Modal from './ui/Modal.jsx';
import { cx, DAY_TAGS } from '../lib/utils.js';
import { useStore, captureDayAsPreset } from '../lib/store.js';

export default function SavePresetModal({
  open,
  onClose,
  clientId,
  weekId,
  dayId,
  onSave,
}) {
  const store = useStore();
  const captured = useMemo(() => {
    if (!open) return null;
    return captureDayAsPreset(store, clientId, weekId, dayId);
  }, [open, store, clientId, weekId, dayId]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setTags(captured?.suggestedTags || []);
      setBusy(false);
    }
  }, [open, captured]);

  if (!open) return null;

  const exTotal =
    (captured?.sections.warmUp.length || 0) +
    (captured?.sections.resistance.length || 0) +
    (captured?.sections.coolDown.length || 0);
  const setTotal = ['warmUp', 'resistance', 'coolDown'].reduce(
    (acc, k) =>
      acc +
      (captured?.sections[k] || []).reduce((a, e) => a + (e.setCount || 0), 0),
    0
  );

  const toggleTag = (t) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const submit = async () => {
    if (!name.trim() || !captured || busy) return;
    setBusy(true);
    await onSave({
      name: name.trim(),
      description: description.trim(),
      tags,
      sections: captured.sections,
    });
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save as workout preset"
      maxWidth="540px"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || busy || exTotal === 0}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save preset'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {exTotal === 0 ? (
          <div className="text-sm text-txt-muted text-center py-4">
            This day has no exercises yet. Add some first, then save as a
            preset.
          </div>
        ) : (
          <>
            <div className="card p-4">
              <div className="section-title mb-2">What you're saving</div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-txt-muted">
                    Exercises
                  </div>
                  <div className="font-display tabular font-bold text-xl">
                    {exTotal}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-txt-muted">
                    Sets
                  </div>
                  <div className="font-display tabular font-bold text-xl">
                    {setTotal}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-txt-muted">
                    Sections
                  </div>
                  <div className="font-display tabular font-bold text-xl">
                    {[
                      captured.sections.warmUp.length > 0 ? 'W' : null,
                      captured.sections.resistance.length > 0 ? 'R' : null,
                      captured.sections.coolDown.length > 0 ? 'C' : null,
                    ]
                      .filter(Boolean)
                      .join('·') || '—'}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="section-title block mb-2">Name</label>
              <input
                autoFocus
                className="input"
                placeholder="e.g., Push Day — Hypertrophy"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="section-title block mb-2">
                Description · optional
              </label>
              <textarea
                className="input resize-none"
                style={{ minHeight: 60 }}
                placeholder="Who this is for, what it focuses on…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="section-title block mb-2">Tags</label>
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

            <div className="text-[11px] text-txt-muted">
              Weight, reps, completion state and drop sets are <span className="text-txt-secondary">not</span> saved — only the
              exercise structure, set counts and rest. Apply this preset to a
              client's day and you'll get empty sets to fill during the session.
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
