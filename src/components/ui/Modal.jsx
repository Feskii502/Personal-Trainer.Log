import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cx } from '../../lib/utils.js';

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = '640px',
  footer,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/70"
        style={{ backdropFilter: 'blur(6px)' }}
      />
      <div
        className={cx(
          'relative w-full bg-bg-elevated border border-border rounded-[16px] flex flex-col max-h-[90vh] animate-slide-up'
        )}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn-icon text-txt-secondary hover:text-txt-primary"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
        <div className="modal-scroll overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-border flex flex-wrap gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
