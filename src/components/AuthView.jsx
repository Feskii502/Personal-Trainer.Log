import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase.js';

export default function AuthView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (err) setError(err.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="card p-6 sm:p-8 w-full max-w-[420px] flex flex-col gap-5"
      >
        <div>
          <div className="section-title mb-1">Coach Workbook</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Sign in
          </h1>
        </div>

        <div className="flex flex-col gap-3">
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
              autoComplete="current-password"
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

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          <LogIn size={18} />
          {busy ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="text-xs text-txt-secondary text-center">
          Accounts are created in the Supabase dashboard.
        </div>
      </form>
    </div>
  );
}
