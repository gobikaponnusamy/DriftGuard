import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button, Input } from '../components/forms';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('demo@driftguard.local');
  const [password, setPassword] = useState('driftguard');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    try {
      await login(email, password, apiKey);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#101111] px-4 text-slate-100">
      <form onSubmit={submit} className="w-full max-w-sm rounded-md border border-[#555] bg-[#2a2c29] p-6">
        <h1 className="text-lg font-bold">Drift<span className="text-indigo-400">Guard</span></h1>
        <p className="mt-1 text-xs text-slate-400">Production behavior diffing before release</p>
        <div className="mt-5 space-y-3">
          <label className="block text-xs font-bold">Email<Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full" /></label>
          <label className="block text-xs font-bold">Password<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full" /></label>
          <label className="block text-xs font-bold">API key<Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Optional X-API-Key" className="mt-1 w-full" /></label>
        </div>
        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
        <Button className="mt-5 w-full bg-[#373a36]" type="submit">Sign in</Button>
        <p className="mt-3 text-[11px] text-slate-400">Demo: demo@driftguard.local / driftguard. Paste a registered service API key to call protected APIs.</p>
      </form>
    </main>
  );
}
