import { ArrowLeft, Plus, X, Home } from 'lucide-react';
import { cx, initialsOf, phaseColor } from '../lib/utils.js';
import Logo from './ui/Logo.jsx';

// Persistent top bar showing all active client sessions, like browser tabs.
// Always visible across views once at least one session has been opened.
export default function SessionTabBar({
  sessions,
  clients,
  activeClientId,
  onSwitch,
  onClose,
  onAdd,
  onHome,
  onBack,
  showBack = false,
}) {
  const list = sessions || [];
  return (
    <div
      className="sticky top-0 z-40 border-b border-border flex items-stretch flex-shrink-0"
      style={{
        background: 'rgba(10,10,11,0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        height: 52,
      }}
    >
      <div className="flex items-center gap-2 px-3 sm:px-4 border-r border-border flex-shrink-0">
        {showBack && (
          <button
            onClick={onBack}
            className="btn-icon text-txt-secondary hover:text-txt-primary"
            aria-label="Back"
            title="Back"
            style={{ minWidth: 36, minHeight: 36 }}
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <button
          onClick={onHome}
          className="flex items-center gap-2 group"
          title="Dashboard"
        >
          <div
            className="flex items-center justify-center transition-colors"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#1C1C1F',
              border: '1px solid #26262A',
            }}
          >
            <Logo size={20} />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-[9px] uppercase tracking-[0.2em] text-txt-muted leading-none">
              FITATS
            </div>
            <div className="text-[11px] font-semibold leading-tight group-hover:text-brand-lime transition-colors">
              Dashboard
            </div>
          </div>
        </button>
      </div>

      <div className="flex-1 flex items-stretch overflow-x-auto min-w-0 no-scrollbar">
        {list.length === 0 && (
          <div className="flex items-center px-4 text-[11px] uppercase tracking-wider text-txt-muted">
            No active sessions
          </div>
        )}
        {list.map((s) => {
          const c = clients.find((x) => x.id === s.clientId);
          const w = c?.weeks?.find((wk) => wk.id === s.weekId);
          const d = w?.days?.find((dd) => dd.id === s.dayId);
          if (!c) return null;
          const active = s.clientId === activeClientId;
          const phaseHex = phaseColor(w?.phase);
          return (
            <div
              key={s.clientId}
              onClick={() => onSwitch(s)}
              className={cx(
                'group flex items-center gap-2.5 pl-3 pr-2 border-r border-border cursor-pointer transition-colors flex-shrink-0',
                active ? '' : 'hover:bg-bg-surface'
              )}
              style={
                active
                  ? {
                      background: '#141416',
                      boxShadow: 'inset 0 -2px 0 #D4FF3A',
                    }
                  : {}
              }
            >
              <div
                className="rounded-full flex items-center justify-center font-display font-bold text-[10px] flex-shrink-0 relative"
                style={{
                  width: 26,
                  height: 26,
                  background: '#1C1C1F',
                  color: '#D4FF3A',
                  border: '1px solid #26262A',
                }}
              >
                {initialsOf(c.name)}
                <span
                  className="absolute -bottom-0.5 -right-0.5 rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    background: phaseHex,
                    border: '2px solid #0A0A0B',
                  }}
                />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold leading-tight truncate max-w-[120px]">
                  {c.name}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-txt-muted leading-tight">
                  {w ? `Wk${w.number} · D${d?.dayNumber || '?'}` : '—'}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(s.clientId);
                }}
                className="ml-1 w-5 h-5 rounded flex items-center justify-center text-txt-muted hover:text-brand-red hover:bg-[#FF4D3A14] opacity-50 group-hover:opacity-100"
                aria-label="Close session"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
        <button
          onClick={onAdd}
          className="px-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-txt-secondary hover:text-txt-primary hover:bg-bg-surface flex-shrink-0"
          aria-label="Add tab"
          title="Add another client as a tab"
        >
          <Plus size={14} className="text-brand-lime" />
          <span className="hidden sm:inline">Add Tab</span>
        </button>
      </div>
    </div>
  );
}
