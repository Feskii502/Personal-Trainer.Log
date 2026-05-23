import { useEffect, useMemo, useState } from 'react';
import Modal from './ui/Modal.jsx';
import { initialsOf, phaseColor, cx } from '../lib/utils.js';

function isoToDateInput(iso) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function defaultsForToday() {
  const now = new Date();
  const date = isoToDateInput(now.toISOString());
  // round up to next half-hour
  const rounded = new Date(now);
  rounded.setMinutes(rounded.getMinutes() + (30 - (rounded.getMinutes() % 30)));
  rounded.setSeconds(0, 0);
  const time = `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

export default function ScheduleSessionModal({
  open,
  onClose,
  clients,
  onCreate,
}) {
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(() => defaultsForToday().date);
  const [time, setTime] = useState(() => defaultsForToday().time);
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      const d = defaultsForToday();
      setDate(d.date);
      setTime(d.time);
      setDuration(60);
      setClientId(clients[0]?.id || '');
      setBusy(false);
    }
  }, [open, clients]);

  const phase = useMemo(() => {
    const c = clients.find((x) => x.id === clientId);
    return c?.weeks?.[c.weeks.length - 1]?.phase;
  }, [clientId, clients]);

  const submit = async () => {
    if (!clientId || busy) return;
    setBusy(true);
    const [h, m] = time.split(':').map(Number);
    const dt = new Date(date + 'T00:00:00');
    dt.setHours(h, m, 0, 0);
    await onCreate({
      clientId,
      scheduledAt: dt.toISOString(),
      durationMinutes: duration,
    });
    setBusy(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule a session"
      maxWidth="520px"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary btn-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!clientId || busy}
            className="btn-primary btn-sm disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Add session'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="section-title block mb-2">Client</label>
          <div className="grid grid-cols-1 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
            {clients.length === 0 && (
              <div className="text-xs text-txt-muted">No clients yet.</div>
            )}
            {clients.map((c) => {
              const isActive = c.id === clientId;
              const ph = c.weeks?.[c.weeks.length - 1]?.phase;
              return (
                <button
                  key={c.id}
                  onClick={() => setClientId(c.id)}
                  className={cx(
                    'flex items-center gap-3 p-2.5 rounded-btn border text-left transition-colors',
                    isActive
                      ? 'border-brand-lime bg-[rgba(212,255,58,0.06)]'
                      : 'border-border hover:border-[#3a3a40]'
                  )}
                >
                  <div
                    className="rounded-full flex items-center justify-center font-display font-bold text-[11px] flex-shrink-0 relative"
                    style={{
                      width: 32,
                      height: 32,
                      background: 'var(--c-avatar-bg)',
                      color: 'var(--c-brand-lime)',
                      border: '1px solid var(--c-avatar-border)',
                    }}
                  >
                    {initialsOf(c.name) || '·'}
                    {ph && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          background: phaseColor(ph),
                          border: '2px solid #1C1C1F',
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {c.name}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-txt-muted truncate">
                      {ph || 'no phase'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-title block mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="section-title block mb-2">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="section-title block mb-2">Duration</label>
          <div className="flex gap-2 flex-wrap">
            {[30, 45, 60, 75, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cx(
                  'h-9 px-3 rounded-pill text-xs font-semibold border transition-colors',
                  duration === d
                    ? 'bg-brand-lime text-black border-brand-lime'
                    : 'border-border text-txt-secondary hover:text-txt-primary'
                )}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
