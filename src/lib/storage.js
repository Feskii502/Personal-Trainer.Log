import { supabase } from './supabase.js';
import { DEFAULT_LIBRARY } from './exerciseLibrary.js';

export const emptyState = () => ({
  clients: [],
  library: DEFAULT_LIBRARY,
});

// Snapshot of what we last successfully wrote — used to diff so we only upsert
// rows that actually changed and delete rows that disappeared locally.
let lastSaved = { clients: [], library: [] };

export const resetLastSaved = () => {
  lastSaved = { clients: [], library: [] };
};

const libRowToObj = (row) => ({
  id: row.id,
  name: row.name,
  mainMuscle: row.main_muscle,
  subMuscles: row.sub_muscles || [],
  type: row.type,
});

const libObjToRow = (userId, ex) => ({
  id: ex.id,
  user_id: userId,
  name: ex.name ?? '',
  main_muscle: ex.mainMuscle ?? null,
  sub_muscles: ex.subMuscles || [],
  type: ex.type ?? null,
  updated_at: new Date().toISOString(),
});

const clientObjToRow = (userId, client) => ({
  id: client.id,
  user_id: userId,
  name: client.name ?? '',
  data: client,
  updated_at: new Date().toISOString(),
});

export const fetchState = async () => {
  const { data: user } = await supabase.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return emptyState();

  const [clientsRes, libraryRes] = await Promise.all([
    supabase.from('clients').select('data').eq('user_id', userId),
    supabase.from('library_exercises').select('*').eq('user_id', userId),
  ]);

  if (clientsRes.error) console.error('fetchState clients error:', clientsRes.error);
  if (libraryRes.error) console.error('fetchState library error:', libraryRes.error);

  const clients = (clientsRes.data || []).map((r) => r.data).filter(Boolean);
  let library = (libraryRes.data || []).map(libRowToObj);

  // First-run seed: empty library AND no clients → populate DEFAULT_LIBRARY.
  if (library.length === 0 && clients.length === 0) {
    const rows = DEFAULT_LIBRARY.map((ex) => libObjToRow(userId, ex));
    const { error } = await supabase.from('library_exercises').insert(rows);
    if (error) console.error('seed library error:', error);
    library = DEFAULT_LIBRARY;
  }

  lastSaved = {
    clients: clients.map((c) => ({ id: c.id, json: JSON.stringify(c) })),
    library: library.map((e) => ({ id: e.id, json: JSON.stringify(e) })),
  };

  return { clients, library };
};

const diffEntities = (prev, next, toJson) => {
  const prevMap = new Map(prev.map((p) => [p.id, p.json]));
  const nextMap = new Map(next.map((n) => [n.id, toJson(n)]));
  const upserts = [];
  const deletes = [];
  for (const [id, json] of nextMap) {
    if (prevMap.get(id) !== json) upserts.push(id);
  }
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) deletes.push(id);
  }
  return { upserts, deletes };
};

export const persistState = async (state) => {
  const { data: user } = await supabase.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return;

  const toJson = (x) => JSON.stringify(x);

  const clientsDiff = diffEntities(lastSaved.clients, state.clients, toJson);
  const libraryDiff = diffEntities(lastSaved.library, state.library, toJson);

  const writes = [];

  if (clientsDiff.upserts.length) {
    const byId = new Map(state.clients.map((c) => [c.id, c]));
    const rows = clientsDiff.upserts.map((id) =>
      clientObjToRow(userId, byId.get(id))
    );
    writes.push(
      supabase
        .from('clients')
        .upsert(rows, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('clients upsert error:', error);
        })
    );
  }
  if (clientsDiff.deletes.length) {
    writes.push(
      supabase
        .from('clients')
        .delete()
        .in('id', clientsDiff.deletes)
        .then(({ error }) => {
          if (error) console.error('clients delete error:', error);
        })
    );
  }

  if (libraryDiff.upserts.length) {
    const byId = new Map(state.library.map((e) => [e.id, e]));
    const rows = libraryDiff.upserts.map((id) =>
      libObjToRow(userId, byId.get(id))
    );
    writes.push(
      supabase
        .from('library_exercises')
        .upsert(rows, { onConflict: 'id' })
        .then(({ error }) => {
          if (error) console.error('library upsert error:', error);
        })
    );
  }
  if (libraryDiff.deletes.length) {
    writes.push(
      supabase
        .from('library_exercises')
        .delete()
        .in('id', libraryDiff.deletes)
        .then(({ error }) => {
          if (error) console.error('library delete error:', error);
        })
    );
  }

  if (!writes.length) return;
  await Promise.all(writes);

  lastSaved = {
    clients: state.clients.map((c) => ({ id: c.id, json: JSON.stringify(c) })),
    library: state.library.map((e) => ({ id: e.id, json: JSON.stringify(e) })),
  };
};

// ---------- Sessions (scheduled appointments) ----------

const sessionRowToObj = (row) => ({
  id: row.id,
  clientId: row.client_id,
  scheduledAt: row.scheduled_at,
  durationMinutes: row.duration_minutes,
  status: row.status,
  notes: row.notes || '',
});

export const fetchSessions = async (rangeStart, rangeEnd) => {
  const { data: user } = await supabase.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return [];
  let q = supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: true });
  if (rangeStart) q = q.gte('scheduled_at', rangeStart);
  if (rangeEnd) q = q.lt('scheduled_at', rangeEnd);
  const { data, error } = await q;
  if (error) {
    console.error('fetchSessions error:', error);
    return [];
  }
  return (data || []).map(sessionRowToObj);
};

export const createSession = async (session) => {
  const { data: user } = await supabase.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return null;
  const row = {
    id: session.id,
    user_id: userId,
    client_id: session.clientId,
    scheduled_at: session.scheduledAt,
    duration_minutes: session.durationMinutes ?? 60,
    status: session.status ?? 'upcoming',
    notes: session.notes ?? '',
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('sessions').insert(row);
  if (error) console.error('createSession error:', error);
  return session.id;
};

export const updateSessionRow = async (id, patch) => {
  const row = { updated_at: new Date().toISOString() };
  if (patch.clientId !== undefined) row.client_id = patch.clientId;
  if (patch.scheduledAt !== undefined) row.scheduled_at = patch.scheduledAt;
  if (patch.durationMinutes !== undefined)
    row.duration_minutes = patch.durationMinutes;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.notes !== undefined) row.notes = patch.notes;
  const { error } = await supabase.from('sessions').update(row).eq('id', id);
  if (error) console.error('updateSessionRow error:', error);
};

export const deleteSession = async (id) => {
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) console.error('deleteSession error:', error);
};

// ---------- Workout Presets ----------

const presetRowToObj = (row) => ({
  id: row.id,
  name: row.name || '',
  description: row.description || '',
  tags: row.tags || [],
  sections: row.data?.sections || { warmUp: [], resistance: [], coolDown: [] },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fetchPresets = async () => {
  const { data: user } = await supabase.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return [];
  const { data, error } = await supabase
    .from('workout_presets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('fetchPresets error:', error);
    return [];
  }
  return (data || []).map(presetRowToObj);
};

export const createPreset = async (preset) => {
  const { data: user } = await supabase.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return null;
  const row = {
    id: preset.id,
    user_id: userId,
    name: preset.name ?? '',
    description: preset.description ?? '',
    tags: preset.tags || [],
    data: { sections: preset.sections || { warmUp: [], resistance: [], coolDown: [] } },
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('workout_presets').insert(row);
  if (error) console.error('createPreset error:', error);
  return preset.id;
};

export const updatePresetRow = async (id, patch) => {
  const row = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.sections !== undefined) row.data = { sections: patch.sections };
  const { error } = await supabase
    .from('workout_presets')
    .update(row)
    .eq('id', id);
  if (error) console.error('updatePresetRow error:', error);
};

export const deletePreset = async (id) => {
  const { error } = await supabase.from('workout_presets').delete().eq('id', id);
  if (error) console.error('deletePreset error:', error);
};

export const subscribeToPresets = (userId, onChange) => {
  const channel = supabase
    .channel(`workout_presets:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workout_presets',
        filter: `user_id=eq.${userId}`,
      },
      onChange
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};

// Subscribe to remote changes on both tables for this user. Any event triggers
// a full refetch + onChange(nextState). Returns an unsubscribe fn.
export const subscribeToUserState = (userId, onChange) => {
  const handler = async () => {
    const next = await fetchState();
    onChange(next);
  };

  const channel = supabase
    .channel(`coach_workbook:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'clients',
        filter: `user_id=eq.${userId}`,
      },
      handler
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'library_exercises',
        filter: `user_id=eq.${userId}`,
      },
      handler
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToSessions = (userId, onChange) => {
  const channel = supabase
    .channel(`sessions:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `user_id=eq.${userId}`,
      },
      onChange
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};
