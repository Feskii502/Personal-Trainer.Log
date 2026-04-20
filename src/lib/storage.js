import { supabase } from './supabase.js';
import { DEFAULT_LIBRARY } from './exerciseLibrary.js';

export const emptyState = () => ({
  clients: [],
  library: DEFAULT_LIBRARY,
});

const normalize = (data) => ({
  clients: data?.clients ?? [],
  library: data?.library?.length ? data.library : DEFAULT_LIBRARY,
});

export const fetchState = async () => {
  const { data: user } = await supabase.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return emptyState();

  const { data, error } = await supabase
    .from('user_state')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('fetchState error:', error);
    return emptyState();
  }

  if (!data) {
    const initial = emptyState();
    const { error: insertErr } = await supabase
      .from('user_state')
      .insert({ user_id: userId, data: initial });
    if (insertErr) console.error('seed insert error:', insertErr);
    return initial;
  }

  return normalize(data.data);
};

export const persistState = async (state) => {
  const { data: user } = await supabase.auth.getUser();
  const userId = user?.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('user_state')
    .upsert(
      { user_id: userId, data: state, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) console.error('persistState error:', error);
};

// Subscribe to remote changes for this user's row. Invokes onChange with the
// normalized state whenever another tab/device writes. Returns unsubscribe fn.
export const subscribeToUserState = (userId, onChange) => {
  const channel = supabase
    .channel(`user_state:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_state',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const incoming = payload.new?.data;
        if (incoming) onChange(normalize(incoming));
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
};
