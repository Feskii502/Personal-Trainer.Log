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
