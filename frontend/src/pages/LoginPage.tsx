import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Server, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Button, Input } from '../components/forms';

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('demo@driftguard.local');
  const [password, setPassword] = useState('driftguard');
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
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    }
  }

  return (
    <main className="min-h-screen bg-[#05060b] text-slate-100">
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#070814]/90 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="animate-drift-pulse grid h-8 w-8 place-items-center rounded-lg border border-indigo-300/35 bg-indigo-400/15 shadow-[0_0_24px_rgba(129,140,248,0.18)]">
            <ShieldCheck className="h-4 w-4 text-indigo-100" />
          </span>
          <div className="text-sm font-black">Drift<span className="text-fuchsia-300">Guard</span></div>
        </div>
        <div className="text-xs font-semibold text-slate-500">Production Behavior Diff Console</div>
      </header>

      <section className="grid min-h-[calc(100vh-3.5rem)] place-items-center px-4">
        <div className="glass-line w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d1020]/92 shadow-[0_30px_90px_rgba(0,0,0,0.46)] backdrop-blur-xl">
          <div className="border-b border-white/10 bg-white/[0.03] px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-indigo-300/25 bg-indigo-300/10 shadow-[0_0_24px_rgba(129,140,248,0.14)]">
                <LockKeyhole className="h-5 w-5 text-indigo-100" />
              </span>
              <div>
                <h1 className="text-base font-black text-slate-100">Sign in to console</h1>
                <p className="mt-1 text-xs text-slate-500">Access replay sessions, baselines, and release gates.</p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="px-6 py-5">
            <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-200">
              Email
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full" />
            </label>
            <label className="block text-xs font-bold text-slate-200">
              Password
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full" />
            </label>
            </div>
            {error && <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-100">{error}</p>}
            <Button className="mt-6 w-full border-fuchsia-300/50 bg-fuchsia-300/15 text-fuchsia-50 hover:bg-fuchsia-300/20" type="submit">
              Sign in
            </Button>
          </form>

          <div className="grid grid-cols-3 rounded-b-2xl border-t border-white/10 bg-[#070814]/70 text-center">
            <ConsoleStat icon={Server} label="Services" value="watch" />
            <ConsoleStat icon={ShieldCheck} label="Gates" value="review" />
            <ConsoleStat icon={LockKeyhole} label="Access" value="secure" />
          </div>
        </div>
      </section>
    </main>
  );
}

function ConsoleStat({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="border-r border-white/10 px-3 py-3 last:border-r-0">
      <Icon className="mx-auto h-4 w-4 text-indigo-200" />
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-slate-300">{value}</div>
    </div>
  );
}
