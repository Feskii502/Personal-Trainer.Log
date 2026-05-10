import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { cx } from '../lib/utils.js';

export default function AuthView() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setBusy(true);
    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) setError(err.message);
    } else {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setBusy(false);
        setError('Please enter your name.');
        return;
      }
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}${
              import.meta.env.BASE_URL || '/'
            }`.replace(/\/+$/, '/')
          : undefined;
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: trimmedName },
          emailRedirectTo: redirectTo,
        },
      });
      if (err) {
        setError(err.message);
      } else if (data?.session) {
        // Auto-confirmed — already signed in.
      } else {
        setInfo(
          'Check your email to confirm the account, then come back and sign in.'
        );
        setMode('signin');
      }
    }
    setBusy(false);
  };

  const isSignup = mode === 'signup';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="card p-6 sm:p-8 w-full max-w-[420px] flex flex-col gap-5"
      >
        <div>
          <div className="section-title mb-1">Fitats</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {isSignup ? 'Create your account' : 'Sign in'}
          </h1>
        </div>

        <div className="flex items-center bg-bg-elevated/60 border border-border rounded-btn p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError('');
              setInfo('');
            }}
            className={cx(
              'flex-1 h-10 rounded-btn text-xs font-semibold uppercase tracking-wider transition-colors',
              !isSignup ? 'bg-brand-lime text-black' : 'text-txt-secondary'
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
              setInfo('');
            }}
            className={cx(
              'flex-1 h-10 rounded-btn text-xs font-semibold uppercase tracking-wider transition-colors',
              isSignup ? 'bg-brand-lime text-black' : 'text-txt-secondary'
            )}
          >
            Sign up
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {isSignup && (
            <label className="flex flex-col gap-1.5">
              <span className="section-title">Your name</span>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Jane Doe"
                required
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="section-title">Email</span>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="section-title">Password</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              minLength={isSignup ? 8 : undefined}
              required
            />
          </label>
        </div>

        {error && (
          <div
            className="text-sm px-3 py-2 rounded-btn"
            style={{
              color: '#FF4D3A',
              background: '#FF4D3A14',
              border: '1px solid #FF4D3A33',
            }}
          >
            {error}
          </div>
        )}
        {info && (
          <div
            className="text-sm px-3 py-2 rounded-btn"
            style={{
              color: '#3ADBC7',
              background: '#3ADBC714',
              border: '1px solid #3ADBC733',
            }}
          >
            {info}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {isSignup ? <UserPlus size={18} /> : <LogIn size={18} />}
          {busy
            ? isSignup
              ? 'Creating account...'
              : 'Signing in...'
            : isSignup
            ? 'Create account'
            : 'Sign in'}
        </button>

        <div className="text-xs text-txt-secondary text-center">
          {isSignup
            ? 'By signing up you agree to keep your client data accurate.'
            : 'New here? Tap Sign up above.'}
        </div>
      </form>
    </div>
  );
}
