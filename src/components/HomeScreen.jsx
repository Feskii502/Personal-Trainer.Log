import { useMemo, useState } from 'react';
import { Plus, Search, NotebookPen, Settings } from 'lucide-react';
import { useStore } from '../lib/store.js';
import { daysUntil, fmtDate, initialsOf } from '../lib/utils.js';
import NewClientModal from './NewClientModal.jsx';

function ClientCard({ client, onOpen }) {
  const du = daysUntil(client.expiryDate);
  const expired = du < 0;
  const expiring = du >= 0 && du <= 30;
  const weeksCount = client.weeks?.length || 0;

  return (
    <button
      onClick={() => onOpen(client.id)}
      className="card text-left p-5 sm:p-6 flex flex-col gap-5 transition-transform active:scale-[0.98] hover:border-[#333338]"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex items-center justify-center rounded-full font-display font-bold"
          style={{
            width: 56,
            height: 56,
            background: '#1C1C1F',
            color: '#D4FF3A',
            fontSize: 20,
            letterSpacing: '0.05em',
            border: '1px solid #26262A',
          }}
        >
          {initialsOf(client.name) || '—'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl sm:text-2xl font-semibold tracking-tight truncate">
            {client.name}
          </div>
          <div className="text-txt-secondary text-sm mt-1">
            Expires {fmtDate(client.expiryDate)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-txt-secondary text-sm">
          <NotebookPen size={16} />
          <span className="tabular">
            {weeksCount} {weeksCount === 1 ? 'week' : 'weeks'} logged
          </span>
        </div>
        {expired ? (
          <span
            className="chip"
            style={{
              color: '#FF4D3A',
              background: '#FF4D3A14',
              borderColor: '#FF4D3A33',
            }}
          >
            Expired
          </span>
        ) : expiring ? (
          <span
            className="chip"
            style={{
              color: '#FF8A3A',
              background: '#FF8A3A14',
              borderColor: '#FF8A3A33',
            }}
          >
            Expiring Soon
          </span>
        ) : (
          <span className="chip text-txt-secondary">Active</span>
        )}
      </div>
    </button>
  );
}

export default function HomeScreen({ onOpenClient, onOpenSettings }) {
  const { clients } = useStore();
  const [q, setQ] = useState('');
  const [openNew, setOpenNew] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(s));
  }, [clients, q]);

  return (
    <div className="min-h-full">
      <div className="max-w-[1200px] mx-auto px-6 md:px-8 pt-8 pb-24">
        <header className="flex flex-col gap-6 mb-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <div className="section-title mb-1">Coach Workbook</div>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
                Clients
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary"
                onClick={onOpenSettings}
                aria-label="Settings"
                title="Settings"
              >
                <Settings size={18} />
                Settings
              </button>
              <button
                className="btn-primary"
                onClick={() => setOpenNew(true)}
              >
                <Plus size={20} />
                New Client
              </button>
            </div>
          </div>

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
        </header>

        {filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="font-display text-xl mb-2">No clients yet</div>
            <div className="text-txt-secondary mb-5">
              Add your first client to start logging sessions.
            </div>
            <button
              className="btn-primary"
              onClick={() => setOpenNew(true)}
            >
              <Plus size={20} />
              New Client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                onOpen={onOpenClient}
              />
            ))}
          </div>
        )}
      </div>

      <NewClientModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        onCreated={(id) => onOpenClient(id)}
      />
    </div>
  );
}
