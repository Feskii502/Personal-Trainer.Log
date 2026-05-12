import { cx } from '../../lib/utils.js';

// Reusable bottom dock. Pass an array of items: {key, label, icon, onClick,
// active, primary}. `primary` items render as the lime accent style;
// otherwise outlined.
export default function Dock({ items }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border"
      style={{
        background: 'rgba(10,10,11,0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-[1480px] mx-auto px-3 sm:px-4 py-2 flex items-stretch gap-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const disabled = item.disabled;
          return (
            <button
              key={item.key}
              onClick={item.onClick}
              disabled={disabled}
              className={cx(
                'flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-btn text-[10px] sm:text-xs uppercase tracking-wider font-semibold transition-colors',
                disabled && 'opacity-40 cursor-not-allowed',
                !disabled &&
                  (item.active
                    ? 'bg-brand-lime text-black'
                    : item.primary
                    ? 'border border-brand-lime text-brand-lime hover:bg-[#D4FF3A14]'
                    : 'border border-border text-txt-secondary hover:text-txt-primary hover:border-[#3a3a40]')
              )}
              style={{ minHeight: 52, padding: '6px 10px' }}
              title={item.label}
            >
              <Icon size={16} />
              <span className="leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
