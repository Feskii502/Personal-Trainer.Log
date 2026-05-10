import { useEffect, useState } from 'react';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import { setExerciseOrder } from '../lib/store.js';
import { cx } from '../lib/utils.js';

const SECTION_LABELS = {
  warmUp: 'Warm Up',
  resistance: 'Resistance',
  coolDown: 'Cool Down',
};

export default function ReorderExercisesModal({
  open,
  onClose,
  clientId,
  weekId,
  dayId,
  section,
  exercises,
}) {
  const [order, setOrder] = useState(() => exercises.map((e) => e.id));
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  useEffect(() => {
    if (open) setOrder(exercises.map((e) => e.id));
  }, [open, exercises]);

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const orderedItems = order.map((id) => byId.get(id)).filter(Boolean);

  const move = (from, to) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setOrder(next);
  };

  const onDragStart = (idx) => (e) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox.
    try {
      e.dataTransfer.setData('text/plain', String(idx));
    } catch {
      /* noop */
    }
  };

  const onDragOver = (idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const onDrop = (idx) => (e) => {
    e.preventDefault();
    if (dragIdx == null) return;
    move(dragIdx, idx);
    setDragIdx(null);
    setOverIdx(null);
  };

  const onDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  const save = () => {
    setExerciseOrder(clientId, weekId, dayId, section, order);
    onClose();
  };

  const reset = () => setOrder(exercises.map((e) => e.id));
  const isDirty =
    order.length !== exercises.length ||
    order.some((id, i) => exercises[i]?.id !== id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reorder · ${SECTION_LABELS[section] || ''}`}
      maxWidth="480px"
      footer={
        <>
          <button onClick={reset} className="btn-secondary btn-sm">
            Reset
          </button>
          <button
            onClick={save}
            disabled={!isDirty}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            Save order
          </button>
        </>
      }
    >
      <div className="space-y-2">
        <div className="text-xs text-txt-secondary">
          Drag the handle to reorder, or use the up/down arrows.
        </div>

        {orderedItems.length === 0 && (
          <div className="text-center text-xs text-txt-muted py-6">
            No exercises in this section.
          </div>
        )}

        <div className="space-y-1.5">
          {orderedItems.map((ex, i) => {
            const isDragging = dragIdx === i;
            const isOver = overIdx === i && dragIdx !== i;
            return (
              <div
                key={ex.id}
                draggable
                onDragStart={onDragStart(i)}
                onDragOver={onDragOver(i)}
                onDrop={onDrop(i)}
                onDragEnd={onDragEnd}
                className={cx(
                  'flex items-center gap-2 p-2.5 rounded-btn border bg-bg-elevated transition-colors select-none',
                  isDragging && 'opacity-40',
                  isOver && 'border-brand-lime',
                  !isDragging && !isOver && 'border-border'
                )}
              >
                <button
                  className="cursor-grab active:cursor-grabbing text-txt-muted hover:text-txt-primary"
                  aria-label="Drag handle"
                  title="Drag to reorder"
                >
                  <GripVertical size={18} />
                </button>
                <div className="w-7 text-[11px] tabular font-bold text-txt-muted text-center">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {ex.name}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-txt-muted truncate">
                    {ex.mainMuscle}
                    {ex.subMuscles?.length > 0 &&
                      ` · ${ex.subMuscles.slice(0, 2).join(', ')}`}
                  </div>
                </div>
                <span
                  className="text-[9px] tabular font-bold uppercase px-1.5 py-0.5 rounded text-brand-lime"
                  style={{ background: '#D4FF3A14' }}
                >
                  {ex.type}
                </span>
                <div className="flex flex-col">
                  <button
                    onClick={() => move(i, i - 1)}
                    disabled={i === 0}
                    className="w-7 h-5 rounded flex items-center justify-center text-txt-secondary hover:text-brand-lime disabled:opacity-25 disabled:cursor-not-allowed"
                    aria-label="Move up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => move(i, i + 1)}
                    disabled={i === orderedItems.length - 1}
                    className="w-7 h-5 rounded flex items-center justify-center text-txt-secondary hover:text-brand-lime disabled:opacity-25 disabled:cursor-not-allowed"
                    aria-label="Move down"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
