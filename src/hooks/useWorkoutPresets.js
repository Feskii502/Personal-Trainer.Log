import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  fetchPresets,
  createPreset,
  updatePresetRow,
  deletePreset,
  subscribeToPresets,
} from '../lib/storage.js';
import { uid } from '../lib/utils.js';

export function useWorkoutPresets() {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const next = await fetchPresets();
    setPresets(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id;
      if (!userId || cancelled) return;
      await refetch();
      unsubscribe = subscribeToPresets(userId, () => refetch());
    })();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [refetch]);

  const add = useCallback(
    async (preset) => {
      const id = preset.id || uid();
      await createPreset({ ...preset, id });
      await refetch();
      return id;
    },
    [refetch]
  );

  const patch = useCallback(
    async (id, p) => {
      await updatePresetRow(id, p);
      await refetch();
    },
    [refetch]
  );

  const remove = useCallback(
    async (id) => {
      await deletePreset(id);
      await refetch();
    },
    [refetch]
  );

  return { presets, loading, add, patch, remove, refetch };
}
