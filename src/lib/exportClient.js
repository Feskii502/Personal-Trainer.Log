import * as XLSX from 'xlsx';
import { calcBMI, fmtDate, DAY_NAMES } from './utils.js';

const SECTION_LABELS = {
  warmUp: 'Warm Up',
  resistance: 'Resistance',
  coolDown: 'Cool Down',
};

function dayStats(day) {
  let total = 0;
  let done = 0;
  let volume = 0;
  for (const k of ['warmUp', 'resistance', 'coolDown']) {
    for (const ex of day.sections[k]) {
      for (const s of ex.sets) {
        total++;
        if (s.completed) done++;
        if (s.weight && s.reps) volume += s.weight * s.reps;
      }
    }
  }
  return { total, done, volume };
}

function summarySheet(client) {
  let sessionsLogged = 0;
  let totalSets = 0;
  let completedSets = 0;
  let totalVolume = 0;
  for (const w of client.weeks || []) {
    for (const d of w.days) {
      const ds = dayStats(d);
      totalSets += ds.total;
      completedSets += ds.done;
      totalVolume += ds.volume;
      if (ds.total > 0 && ds.done >= ds.total) sessionsLogged++;
    }
  }
  const lastPhase =
    client.weeks?.[client.weeks.length - 1]?.phase || '';
  const rows = [
    ['Client', client.name || ''],
    ['Joined', client.signupDate ? fmtDate(client.signupDate) : ''],
    ['Expires', client.expiryDate ? fmtDate(client.expiryDate) : ''],
    ['Height (cm)', client.height ?? ''],
    ['Current Phase', lastPhase],
    [],
    ['Weeks logged', client.weeks?.length || 0],
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
  ws['!cols'] = [{ wch: 28 }, { wch: 30 }];
  return ws;
}

function workoutsSheet(client) {
  const header = [
    'Week',
    'Phase',
    'Day #',
    'Day',
    'Day Tags',
    'Section',
    'Exercise Order',
    'Exercise',
    'Main Muscle',
    'Sub Muscles',
    'Type',
    'Set #',
    'Weight (kg)',
    'Reps',
    'Duration (s)',
    'Completed',
    'Elapsed (s)',
    'Drop Sets',
    'Rest (s)',
  ];
  const rows = [header];
  for (const w of client.weeks || []) {
    for (const d of w.days) {
      for (const sectionKey of ['warmUp', 'resistance', 'coolDown']) {
        const list = d.sections[sectionKey];
        list.forEach((ex, exIdx) => {
          if (ex.sets.length === 0) {
            rows.push([
              w.number,
              w.phase,
              d.dayNumber,
              DAY_NAMES[d.dayNumber - 1] || '',
              (d.tags || []).join(', '),
              SECTION_LABELS[sectionKey],
              exIdx + 1,
              ex.name,
              ex.mainMuscle || '',
              (ex.subMuscles || []).join(', '),
              ex.type || '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              ex.restSeconds ?? '',
            ]);
            return;
          }
          ex.sets.forEach((s) => {
            rows.push([
              w.number,
              w.phase,
              d.dayNumber,
              DAY_NAMES[d.dayNumber - 1] || '',
              (d.tags || []).join(', '),
              SECTION_LABELS[sectionKey],
              exIdx + 1,
              ex.name,
              ex.mainMuscle || '',
              (ex.subMuscles || []).join(', '),
              ex.type || '',
              s.setNumber,
              s.weight ?? '',
              s.reps ?? '',
              s.duration ?? '',
              s.completed ? 'YES' : 'no',
              s.elapsedSeconds ?? '',
              (s.dropSets || []).length,
              ex.restSeconds ?? '',
            ]);
          });
        });
      }
    }
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 6 },
    { wch: 6 },
    { wch: 16 },
    { wch: 12 },
    { wch: 9 },
    { wch: 28 },
    { wch: 14 },
    { wch: 20 },
    { wch: 8 },
    { wch: 6 },
    { wch: 11 },
    { wch: 6 },
    { wch: 12 },
    { wch: 10 },
    { wch: 11 },
    { wch: 10 },
    { wch: 8 },
  ];
  ws['!freeze'] = { ySplit: 1 };
  return ws;
}

function dropSetsSheet(client) {
  const header = [
    'Week',
    'Day #',
    'Section',
    'Exercise',
    'Set #',
    'Drop #',
    'Weight (kg)',
    'Reps',
  ];
  const rows = [header];
  for (const w of client.weeks || []) {
    for (const d of w.days) {
      for (const sectionKey of ['warmUp', 'resistance', 'coolDown']) {
        for (const ex of d.sections[sectionKey]) {
          for (const s of ex.sets) {
            (s.dropSets || []).forEach((ds, i) => {
              rows.push([
                w.number,
                d.dayNumber,
                SECTION_LABELS[sectionKey],
                ex.name,
                s.setNumber,
                i + 1,
                ds.weight ?? '',
                ds.reps ?? '',
              ]);
            });
          }
        }
      }
    }
  }
  if (rows.length === 1) return null;
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 6 },
    { wch: 12 },
    { wch: 28 },
    { wch: 6 },
    { wch: 6 },
    { wch: 11 },
    { wch: 6 },
  ];
  return ws;
}

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

function safeName(s) {
  return (s || 'client').replace(/[\\/?*\[\]:]/g, '').slice(0, 28);
}

export function exportClientWorkbook(client) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summarySheet(client), 'Summary');
  XLSX.utils.book_append_sheet(wb, workoutsSheet(client), 'Workouts');
  const drops = dropSetsSheet(client);
  if (drops) XLSX.utils.book_append_sheet(wb, drops, 'Drop Sets');
  const metrics = metricsSheet(client);
  if (metrics) XLSX.utils.book_append_sheet(wb, metrics, 'Metrics');
  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Fitats — ${safeName(client.name)} — ${today}.xlsx`);
}

export function exportAllClientsWorkbook(clients) {
  const wb = XLSX.utils.book_new();

  // Roster summary sheet up front.
  const rosterHeader = [
    'Client',
    'Joined',
    'Expires',
    'Height (cm)',
    'Current Phase',
    'Weeks',
    'Sessions Logged',
    'Total Sets',
    'Completed Sets',
    'Completion %',
    'Total Volume (kg×reps)',
  ];
  const rosterRows = [rosterHeader];
  for (const c of clients) {
    let sessions = 0;
    let total = 0;
    let done = 0;
    let vol = 0;
    for (const w of c.weeks || []) {
      for (const d of w.days) {
        const ds = dayStats(d);
        total += ds.total;
        done += ds.done;
        vol += ds.volume;
        if (ds.total > 0 && ds.done >= ds.total) sessions++;
      }
    }
    rosterRows.push([
      c.name,
      c.signupDate ? fmtDate(c.signupDate) : '',
      c.expiryDate ? fmtDate(c.expiryDate) : '',
      c.height ?? '',
      c.weeks?.[c.weeks.length - 1]?.phase || '',
      c.weeks?.length || 0,
      sessions,
      total,
      done,
      total > 0 ? `${Math.round((done / total) * 100)}%` : '—',
      Math.round(vol),
    ]);
  }
  const rosterWs = XLSX.utils.aoa_to_sheet(rosterRows);
  rosterWs['!cols'] = rosterHeader.map((h) => ({ wch: Math.max(12, h.length + 2) }));
  XLSX.utils.book_append_sheet(wb, rosterWs, 'Roster');

  // One workouts sheet per client, named with their first name.
  const used = new Set();
  for (const c of clients) {
    let name = safeName((c.name || '').split(' ')[0]) || 'Client';
    let n = 1;
    while (used.has(name.toLowerCase())) {
      n++;
      name = safeName((c.name || '').split(' ')[0]) + ' ' + n;
    }
    used.add(name.toLowerCase());
    XLSX.utils.book_append_sheet(wb, workoutsSheet(c), name.slice(0, 31));
  }

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Fitats — All clients — ${today}.xlsx`);
}
