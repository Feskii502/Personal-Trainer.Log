import { DAY_TAGS, cx } from '../../lib/utils.js';

export default function TagEditor({ value = [], onChange, compact = false }) {
  const toggle = (t) =>
    onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);

  return (
    <div className={cx('flex flex-wrap', compact ? 'gap-1.5' : 'gap-2')}>
      {DAY_TAGS.map((t) => {
        const active = value.includes(t);
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
  );
}

export function TagList({ tags = [], size = 'sm' }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center rounded-pill uppercase tracking-wider font-semibold"
          style={{
            fontSize: size === 'sm' ? 10 : 11,
            padding: '2px 10px',
            color: '#8A8A90',
            background: '#1C1C1F',
            border: '1px solid #26262A',
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
