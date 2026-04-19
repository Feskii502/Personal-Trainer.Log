import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '../lib/store.js';
import { isTimed, hasWeight, fmtDate } from '../lib/utils.js';

// Aggregate history for a library exercise across the client's weeks.
// Includes seed sessionHistory (frozen past sessions) if present on the current exercise.
function gatherSessions(client, libraryId, current) {
  const sessions = [];

  if (current?.sessionHistory?.length) {
    for (const s of current.sessionHistory) {
      sessions.push({
        date: new Date(s.date).getTime(),
        sets: s.sets.map((x) => ({ weight: x.weight, reps: x.reps })),
      });
    }
  }

  for (const w of client.weeks || []) {
    for (const d of w.days) {
      for (const section of ['warmUp', 'resistance', 'coolDown']) {
        for (const ex of d.sections[section]) {
          if (ex.libraryId !== libraryId) continue;
          if (ex.id === current.id) continue; // current is rendered separately below
          const completed = ex.sets.filter((s) => s.completed);
          if (!completed.length) continue;
          sessions.push({
            date: w.createdAt
              ? new Date(w.createdAt).getTime()
              : Date.now() - (client.weeks.length - w.number) * 7 * 86400000,
            sets: completed.map((s) => ({
              weight: s.weight,
              reps: s.reps,
              duration: s.duration,
            })),
          });
        }
      }
    }
  }

  // Add current session (if any completed sets exist on the current exercise)
  const currentCompleted = current.sets.filter((s) => s.completed);
  if (currentCompleted.length) {
    sessions.push({
      date: Date.now(),
      sets: currentCompleted.map((s) => ({
        weight: s.weight,
        reps: s.reps,
        duration: s.duration,
      })),
      current: true,
    });
  }

  sessions.sort((a, b) => a.date - b.date);
  return sessions;
}

export default function HistoryPanel({ client, exercise }) {
  const sessions = useMemo(
    () => gatherSessions(client, exercise.libraryId, exercise),
    [client, exercise]
  );

  const timed = isTimed(exercise.type);
  const weighted = hasWeight(exercise.type);

  const chartData = sessions.map((s, i) => {
    const topWeight = weighted
      ? Math.max(0, ...s.sets.map((x) => x.weight || 0))
      : 0;
    const totalReps = s.sets.reduce((a, x) => a + (x.reps || 0), 0);
    const volume = weighted
      ? s.sets.reduce((a, x) => a + (x.weight || 0) * (x.reps || 0), 0)
      : 0;
    const totalDuration = timed
      ? s.sets.reduce((a, x) => a + (x.duration || 0), 0)
      : 0;
    return {
      label: `#${i + 1}`,
      date: fmtDate(new Date(s.date).toISOString()),
      topWeight,
      totalReps,
      volume,
      totalDuration,
    };
  });

  if (sessions.length === 0) {
    return (
      <div className="text-txt-secondary text-sm p-4">
        No history yet — log your first session to see progress.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="card p-4">
        <div className="section-title mb-3">
          {timed ? 'Total Duration (s)' : 'Top Weight (kg)'}
        </div>
        <div className="h-[200px] sm:h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
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
            />
            <Line
              type="monotone"
              dataKey={timed ? 'totalDuration' : 'topWeight'}
              stroke="#D4FF3A"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#D4FF3A', stroke: '#D4FF3A' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <div className="section-title mb-3">Session Log</div>
        <div className="max-h-[260px] overflow-y-auto pr-1 modal-scroll">
          {[...sessions].reverse().map((s, i) => (
            <div
              key={i}
              className="py-3 border-b border-border last:border-b-0"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-sm font-semibold">
                  {fmtDate(new Date(s.date).toISOString())}
                  {s.current && (
                    <span
                      className="ml-2 text-[10px] tabular font-semibold px-1.5 py-0.5 rounded uppercase"
                      style={{ color: '#D4FF3A', background: '#D4FF3A14' }}
                    >
                      Current
                    </span>
                  )}
                </div>
                <div className="text-xs text-txt-secondary tabular">
                  {s.sets.length} sets
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.sets.map((x, j) => (
                  <span
                    key={j}
                    className="text-xs tabular px-2 py-0.5 rounded"
                    style={{
                      background: '#1C1C1F',
                      border: '1px solid #26262A',
                      color: '#F5F5F7',
                    }}
                  >
                    {weighted && x.weight != null ? `${x.weight}kg ` : ''}
                    {timed && x.duration != null
                      ? `${x.duration}s`
                      : x.reps != null
                      ? `× ${x.reps}`
                      : ''}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
