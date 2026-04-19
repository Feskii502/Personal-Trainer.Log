import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Plus, Trash2 } from 'lucide-react';
import { addMetric, removeMetric } from '../lib/store.js';
import { calcBMI, cx, fmtDate } from '../lib/utils.js';

const METRICS = [
  { key: 'weight', label: 'Weight', suffix: 'kg', color: '#D4FF3A' },
  { key: 'bmi', label: 'BMI', suffix: '', color: '#4A7DFF' },
  { key: 'bodyFatPct', label: 'Body Fat', suffix: '%', color: '#FF8A3A' },
];

const toDateInput = (d) => d.toISOString().slice(0, 10);

function AddForm({ clientId, onAdd }) {
  const [date, setDate] = useState(toDateInput(new Date()));
  const [weight, setWeight] = useState('');
  const [bf, setBf] = useState('');

  const submit = () => {
    if (weight === '' && bf === '') return;
    addMetric(clientId, {
      date: new Date(date).toISOString(),
      weight: weight === '' ? null : Number(weight),
      bodyFatPct: bf === '' ? null : Number(bf),
    });
    setWeight('');
    setBf('');
    onAdd?.();
  };

  return (
    <div className="card p-4">
      <div className="section-title mb-3">New Entry</div>
      <div className="grid grid-cols-2 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="section-title block mb-1.5">Date</label>
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="section-title block mb-1.5">Weight (kg)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            className="input tabular"
            placeholder="kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <div>
          <label className="section-title block mb-1.5">Body Fat %</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            className="input tabular"
            placeholder="%"
            value={bf}
            onChange={(e) => setBf(e.target.value)}
          />
        </div>
        <button
          className="btn-primary disabled:opacity-40"
          disabled={weight === '' && bf === ''}
          onClick={submit}
        >
          <Plus size={18} /> Add
        </button>
      </div>
    </div>
  );
}

function Chart({ data, dataKey, color, suffix }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="#26262A" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="#8A8A90"
          tick={{ fontSize: 11 }}
          axisLine={{ stroke: '#26262A' }}
          tickLine={false}
        />
        <YAxis
          stroke="#8A8A90"
          tick={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
          axisLine={{ stroke: '#26262A' }}
          tickLine={false}
          width={40}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            background: '#1C1C1F',
            border: '1px solid #26262A',
            borderRadius: 10,
            color: '#F5F5F7',
            fontSize: 12,
          }}
          labelStyle={{ color: '#8A8A90' }}
          formatter={(v) => (v == null ? '—' : `${v}${suffix}`)}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3, fill: color, stroke: color }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function ProgressTab({ client }) {
  const [selected, setSelected] = useState('weight');

  const entries = useMemo(
    () =>
      [...(client.metrics || [])].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      ),
    [client.metrics]
  );

  const data = entries.map((e) => ({
    label: fmtDate(e.date),
    weight: e.weight,
    bodyFatPct: e.bodyFatPct,
    bmi:
      e.weight && client.height
        ? Number(calcBMI(e.weight, client.height).toFixed(1))
        : null,
  }));

  const latest = entries[entries.length - 1];
  const latestBmi =
    latest?.weight && client.height
      ? calcBMI(latest.weight, client.height)
      : null;

  const metric = METRICS.find((m) => m.key === selected);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 max-sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="section-title">Height · fixed</div>
          <div className="font-display text-2xl font-bold tabular mt-1">
            {client.height ? `${client.height} cm` : '—'}
          </div>
        </div>
        <div className="card p-4">
          <div className="section-title">Weight</div>
          <div className="font-display text-2xl font-bold tabular mt-1">
            {latest?.weight != null ? `${latest.weight} kg` : '—'}
          </div>
        </div>
        <div className="card p-4">
          <div className="section-title">BMI</div>
          <div className="font-display text-2xl font-bold tabular mt-1">
            {latestBmi != null ? latestBmi.toFixed(1) : '—'}
          </div>
        </div>
        <div className="card p-4">
          <div className="section-title">Body Fat</div>
          <div className="font-display text-2xl font-bold tabular mt-1">
            {latest?.bodyFatPct != null ? `${latest.bodyFatPct}%` : '—'}
          </div>
        </div>
      </div>

      <AddForm clientId={client.id} />

      <div className="card p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="section-title">Trend</div>
          <div className="flex gap-1.5 bg-bg-surface border border-border rounded-btn p-1">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setSelected(m.key)}
                className={cx(
                  'px-3 rounded-btn text-xs font-semibold uppercase tracking-wide',
                  selected === m.key
                    ? 'bg-bg-elevated text-brand-lime'
                    : 'text-txt-secondary'
                )}
                style={{ minHeight: 36 }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        {data.length === 0 ? (
          <div className="text-center text-txt-secondary py-8">
            No entries yet. Add one above to start tracking.
          </div>
        ) : (
          <Chart
            data={data}
            dataKey={metric.key}
            color={metric.color}
            suffix={metric.suffix}
          />
        )}
      </div>

      <div className="card p-4">
        <div className="section-title mb-3">Entries</div>
        {entries.length === 0 ? (
          <div className="text-txt-secondary text-sm py-2">
            No weekly check-ins yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {[...entries].reverse().map((e) => {
              const bmi =
                e.weight && client.height
                  ? calcBMI(e.weight, client.height).toFixed(1)
                  : null;
              return (
                <div
                  key={e.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 py-3"
                >
                  <div className="text-sm font-semibold">{fmtDate(e.date)}</div>
                  <div className="text-sm tabular text-txt-secondary min-w-[70px] text-right">
                    {e.weight != null ? `${e.weight} kg` : '—'}
                  </div>
                  <div className="text-sm tabular text-txt-secondary min-w-[50px] text-right">
                    {bmi ? bmi : '—'}
                  </div>
                  <div className="text-sm tabular text-txt-secondary min-w-[60px] text-right">
                    {e.bodyFatPct != null ? `${e.bodyFatPct}%` : '—'}
                  </div>
                  <button
                    className="btn-icon text-txt-muted hover:text-brand-red"
                    onClick={() => removeMetric(client.id, e.id)}
                    aria-label="Delete entry"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
