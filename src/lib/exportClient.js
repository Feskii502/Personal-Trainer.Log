import * as XLSX from 'xlsx';
import { calcBMI, fmtDate, DAY_NAMES } from './utils.js';

const SECTION_LABELS = {
  warmUp: 'Warm Up',
  resistance: 'Resistance',
  coolDown: 'Cool Down',
};

const MAX_SET_COLS = 6;

// ---------- helpers ----------
function fmtSet(s, exType) {
  if (!s) return '';
  const isTimed = exType === 'time' || exType === 'timed' || exType === 'timed+kg';
  const hasWeight = ['+kg', '-kg', 'timed+kg'].includes(exType);
  const w = s.weight;
  const r = s.reps;
  const d = s.duration;
  if (w == null && r == null && d == null) return '—';
  const parts = [];
  if (hasWeight && w != null) parts.push(`${w}kg`);
  if (isTimed && d != null) parts.push(`${d}s`);
  if (!isTimed && r != null) parts.push(`×${r}`);
  if (isTimed && hasWeight && r != null) parts.push(`(${r}r)`);
  let main = parts.join(' ');
  if (!main) main = '—';
  if (s.dropSets?.length) {
    const drops = s.dropSets
      .map((ds) => {
        const dp = [];
        if (hasWeight && ds.weight != null) dp.push(`${ds.weight}kg`);
        if (ds.reps != null) dp.push(`×${ds.reps}`);
        return dp.length ? dp.join(' ') : null;
      })
      .filter(Boolean);
    if (drops.length) main += ' → ' + drops.join(' → ');
  }
  if (s.completed) main = '✓ ' + main;
  return main;
}

function dayHasContent(d) {
  return (
    d.sections.warmUp.length +
      d.sections.resistance.length +
      d.sections.coolDown.length >
    0
  );
}

function dayStats(d) {
  let total = 0;
  let done = 0;
  let vol = 0;
  for (const k of ['warmUp', 'resistance', 'coolDown']) {
    for (const ex of d.sections[k]) {
      for (const s of ex.sets) {
        total++;
        if (s.completed) done++;
        if (s.weight && s.reps) vol += s.weight * s.reps;
      }
    }
  }
  return { total, done, vol };
}

// ---------- summary sheet ----------
function summarySheet(client, weeks) {
  let sessionsLogged = 0;
  let totalSets = 0;
  let completedSets = 0;
  let totalVolume = 0;
  for (const w of weeks) {
    for (const d of w.days) {
      const ds = dayStats(d);
      totalSets += ds.total;
      completedSets += ds.done;
      totalVolume += ds.vol;
      if (ds.total > 0 && ds.done >= ds.total) sessionsLogged++;
    }
  }
  const rows = [
    [`Fitats — Export`],
    [],
    ['Client', client.name || ''],
    ['Joined', client.signupDate ? fmtDate(client.signupDate) : ''],
    ['Expires', client.expiryDate ? fmtDate(client.expiryDate) : ''],
    ['Height (cm)', client.height ?? ''],
    [],
    ['Weeks included', weeks.length],
    ['Sessions completed', sessionsLogged],
    ['Total sets', totalSets],
    ['Completed sets', completedSets],
    [
      'Completion %',
      totalSets > 0
        ? `${Math.round((completedSets / totalSets) * 100)}%`
        : '—',
    ],
    ['Total volume (kg×reps)', Math.round(totalVolume)],
    [],
    ['Exported on', fmtDate(new Date().toISOString())],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 28 }, { wch: 36 }];
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  return ws;
}

// ---------- per-week sheet (grouped daily layout) ----------
function weekSheet(week) {
  const setCols = Array.from({ length: MAX_SET_COLS }, (_, i) => `Set ${i + 1}`);
  const header = ['Section', 'Exercise', 'Type', ...setCols, 'Rest'];

  const rows = [];

  // Title row
  rows.push([`Week ${week.number} — ${week.phase || ''}`]);
  rows.push([]);

  for (const d of week.days) {
    // Day header
    const tags = (d.tags || []).join(', ');
    const stats = dayStats(d);
    const pct =
      stats.total > 0
        ? `${Math.round((stats.done / stats.total) * 100)}%`
        : '—';
    rows.push([
      `${DAY_NAMES[d.dayNumber - 1] || `Day ${d.dayNumber}`} — Day ${d.dayNumber}`,
      tags ? `tags: ${tags}` : '',
      '',
      ...new Array(MAX_SET_COLS).fill(''),
      stats.total > 0 ? `${stats.done}/${stats.total} sets · ${pct}` : 'empty',
    ]);

    if (!dayHasContent(d)) {
      rows.push(['— rest day —']);
      rows.push([]);
      continue;
    }

    // Column headers
    rows.push(header);

    for (const sectionKey of ['warmUp', 'resistance', 'coolDown']) {
      const list = d.sections[sectionKey];
      if (list.length === 0) continue;
      for (const ex of list) {
        const setCells = Array.from({ length: MAX_SET_COLS }, (_, i) =>
          ex.sets[i] ? fmtSet(ex.sets[i], ex.type) : ''
        );
        rows.push([
          SECTION_LABELS[sectionKey],
          ex.name,
          ex.type || '',
          ...setCells,
          ex.restSeconds != null ? `${ex.restSeconds}s` : '',
        ]);
        // Overflow row if there are more than MAX_SET_COLS sets
        if (ex.sets.length > MAX_SET_COLS) {
          const overflow = ex.sets.slice(MAX_SET_COLS);
          for (let i = 0; i < overflow.length; i += MAX_SET_COLS) {
            const chunk = overflow.slice(i, i + MAX_SET_COLS);
            const overflowCells = Array.from(
              { length: MAX_SET_COLS },
              (_, k) =>
                chunk[k]
                  ? fmtSet(
                      { ...chunk[k], setNumber: chunk[k].setNumber },
                      ex.type
                    )
                  : ''
            );
            rows.push(['', `  ↳ (cont.)`, '', ...overflowCells, '']);
          }
        }
      }
    }

    rows.push([]); // spacer between days
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Column widths
  ws['!cols'] = [
    { wch: 12 }, // Section
    { wch: 30 }, // Exercise
    { wch: 8 }, // Type
    ...new Array(MAX_SET_COLS).fill({ wch: 16 }),
    { wch: 18 }, // Rest / completion
  ];

  // Merge the title row across all columns
  const totalCols = 3 + MAX_SET_COLS + 1;
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];

  return ws;
}

// ---------- metrics sheet ----------
function metricsSheet(client) {
  const header = ['Date', 'Weight (kg)', 'Body Fat %', 'BMI'];
  const rows = [header];
  const sorted = [...(client.metrics || [])].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );
  for (const m of sorted) {
    const bmi =
      m.weight && client.height ? calcBMI(m.weight, client.height) : null;
    rows.push([
      m.date ? fmtDate(m.date) : '',
      m.weight ?? '',
      m.bodyFatPct ?? '',
      bmi != null ? Number(bmi.toFixed(1)) : '',
    ]);
  }
  if (rows.length === 1) return null;
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 11 }, { wch: 8 }];
  return ws;
}

function safeName(s, n = 28) {
  return (s || 'client').replace(/[\\/?*\[\]:]/g, '').slice(0, n);
}

// ---------- main export ----------
export function exportClientWeeks(client, weeks) {
  const chosen = weeks.length > 0 ? weeks : [];
  if (chosen.length === 0) return;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summarySheet(client, chosen), 'Summary');

  const usedNames = new Set();
  for (const w of chosen) {
    let label = `Wk ${w.number} — ${w.phase || ''}`.trim();
    let candidate = safeName(label, 31);
    let n = 1;
    while (usedNames.has(candidate.toLowerCase())) {
      n++;
      candidate = safeName(`${label} (${n})`, 31);
    }
    usedNames.add(candidate.toLowerCase());
    XLSX.utils.book_append_sheet(wb, weekSheet(w), candidate);
  }

  const metrics = metricsSheet(client);
  if (metrics) XLSX.utils.book_append_sheet(wb, metrics, 'Metrics');

  const today = new Date().toISOString().slice(0, 10);
  const fname = `Fitats — ${safeName(client.name)} — ${today}.xlsx`;
  XLSX.writeFile(wb, fname);
}
