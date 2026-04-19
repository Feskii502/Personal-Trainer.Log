import { useState } from 'react';
import Modal from './ui/Modal.jsx';
import { PHASES, WEEK_TAGS, cx } from '../lib/utils.js';
import { addWeek } from '../lib/store.js';

export default function AddWeekModal({ open, onClose, clientId, onCreated }) {
  const [phase, setPhase] = useState(null);
  const [tags, setTags] = useState([]);

  const toggle = (t) =>
    setTags((a) => (a.includes(t) ? a.filter((x) => x !== t) : [...a, t]));

  const submit = () => {
    if (!phase) return;
    const id = addWeek(clientId, phase, tags);
    setPhase(null);
    setTags([]);
    onCreated?.(id);
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Week"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary disabled:opacity-40"
            disabled={!phase}
            onClick={submit}
          >
            Create Week
          </button>
        </>
      }
    >
      <div className="section-title mb-3">Training Phase</div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {PHASES.map((p) => {
          const active = phase === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setPhase(p.key)}
              className="relative rounded-card border p-5 text-left transition-transform active:scale-[0.98]"
              style={{
                minHeight: 120,
                background: active ? `${p.color}0F` : '#141416',
                borderColor: active ? p.color : '#26262A',
                boxShadow: active ? `inset 0 0 0 1px ${p.color}` : 'none',
              }}
            >
              <div
                className="w-3 h-3 rounded-full mb-3"
                style={{ background: p.color }}
              />
              <div
                className="font-display text-lg md:text-xl font-semibold tracking-tight"
                style={{ color: active ? p.color : '#F5F5F7' }}
              >
                {p.key}
              </div>
              <div className="text-xs text-txt-secondary mt-1">
                {p.key === 'Endurance' && 'Higher reps, shorter rest'}
                {p.key === 'Hypertrophy' && 'Muscle building volume'}
                {p.key === 'Strength' && 'Heavy, low reps'}
                {p.key === 'Power' && 'Explosive, max intent'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="section-title mb-3">Tags · select any that apply</div>
      <div className="flex flex-wrap gap-2">
        {WEEK_TAGS.map((t) => {
          const active = tags.includes(t);
          return (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={cx('chip', active && 'chip-active')}
            >
              {t}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
