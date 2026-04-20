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
