import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  fetchSessions,
  createSession,
  updateSessionRow,
  deleteSession,
  subscribeToSessions,
} from '../lib/storage.js';
import { uid } from '../lib/utils.js';

// Sessions hook scoped to an arbitrary date range (rangeStart inclusive,
// rangeEnd exclusive — both ISO strings). Re-fetches on realtime events.
export function useSessions(rangeStart, rangeEnd) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const next = await fetchSessions(rangeStart, rangeEnd);
    setSessions(next);
    setLoading(false);
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId || cancelled) return;
      await refetch();
      unsubscribe = subscribeToSessions(userId, () => {
        refetch();
      });
    })();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [refetch]);

  const add = useCallback(async ({ clientId, scheduledAt, durationMinutes, notes }) => {
    const id = uid();
    await createSession({
      id,
      clientId,
      scheduledAt,
      durationMinutes: durationMinutes ?? 60,
      status: 'upcoming',
      notes: notes ?? '',
    });
    await refetch();
    return id;
  }, [refetch]);

  const patch = useCallback(async (id, p) => {
    await updateSessionRow(id, p);
    await refetch();
  }, [refetch]);

  const remove = useCallback(async (id) => {
    await deleteSession(id);
    await refetch();
  }, [refetch]);

  return { sessions, loading, add, patch, remove, refetch };
}
