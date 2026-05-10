import {
  Activity,
  BarChart3,
  Database,
  Eye,
  EyeOff,
  Home,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, PropsWithChildren } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getTimeline, registerService } from '../api/endpoints';
import { getStoredApiKey, setStoredApiKey } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { getRuntimeSettings, setRuntimeSettings } from '../config/runtimeSettings';
import { useServices } from '../hooks/useServices';
import { Button, Input } from './forms';
import { Modal } from './Modal';

export function Layout({ children }: PropsWithChildren) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { data: services = [], reload } = useServices();
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const serviceId = services[0]?.id;
  const [latestReplay, setLatestReplay] = useState('/');

  useEffect(() => {
    if (!serviceId) {
      return;
    }
    let cancelled = false;
    async function loadLatestReplay() {
      try {
        const points = await getTimeline(serviceId);
        const latest = points.at(-1)?.sessionId;
        if (!latest || cancelled) {
          return;
        }
        setLatestReplay(`/replay/${latest}`);
      } catch {
        setLatestReplay('/');
      }
    }
    void loadLatestReplay();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  const nav = useMemo(() => [
    { section: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: Home, exact: true }] },
    { section: 'Capture', items: [{ to: serviceId ? `/services/${serviceId}/baselines` : '/', label: 'Baselines', icon: Database, exact: false }] },
    { section: 'Replay', items: [
      { to: latestReplay, label: 'Live replay', icon: Activity, exact: false },
    ] },
    { section: 'Reports', items: [{ to: serviceId ? `/services/${serviceId}/reports` : '/', label: 'Timeline', icon: BarChart3, exact: false }] },
    { section: 'Settings', items: [
      { to: serviceId ? `/services/${serviceId}/ignore-rules` : '/', label: 'Ignore rules', icon: SlidersHorizontal, exact: false },
      { to: serviceId ? `/services/${serviceId}/pii-vault` : '/', label: 'PII vault', icon: ShieldAlert, exact: false },
    ] },
  ], [latestReplay, serviceId]);

  return (
    <div className="min-h-screen bg-[#111410] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r border-[#3f473f] bg-[#232721] shadow-2xl">
        <button onClick={() => navigate('/')} className="flex h-14 items-center gap-2 border-b border-[#3f473f] px-4 text-left text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-cyan-300" />
          Drift<span className="text-indigo-400">Guard</span>
        </button>
        <nav className="flex-1 space-y-4 px-3 py-4">
          {nav.map((group) => (
            <div key={group.section}>
              <div className="mb-1 px-1 text-[10px] uppercase text-slate-400">{group.section}</div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.label}
                      to={item.to}
                      end={item.exact}
                      className={({ isActive }) => {
                        const active = isActive && (item.label === 'Dashboard' || item.to !== '/');
                        return `flex h-9 items-center gap-3 rounded-md border px-4 text-sm font-semibold transition ${
                          active ? 'border-cyan-300/70 bg-[#313831] text-white shadow-[inset_3px_0_0_rgba(103,232,249,0.8)]' : 'border-[#4f5a51] text-slate-300 hover:border-[#6b776d] hover:bg-[#2c322c]'
                        }`
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-[#3f473f] p-3">
          <button onClick={() => setAddOpen(true)} className="flex h-9 w-full items-center gap-3 rounded-md border border-[#4f5a51] px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/70 hover:bg-[#2c322c]">
            <Plus className="h-3.5 w-3.5" /> Add service
          </button>
          <button onClick={logout} className="flex h-9 w-full items-center gap-3 rounded-md border border-[#4f5a51] px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/70 hover:bg-[#2c322c]">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
          <button onClick={() => setSettingsOpen(true)} className="flex h-9 w-full items-center gap-3 rounded-md border border-[#4f5a51] px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/70 hover:bg-[#2c322c]">
            <Settings className="h-3.5 w-3.5" /> Settings
          </button>
        </div>
      </aside>
      <main className="ml-64 min-h-screen">{children}</main>
      {addOpen && (
        <LayoutAddServiceModal
          onClose={() => setAddOpen(false)}
          onCreated={async () => {
            await reload();
            navigate('/');
          }}
        />
      )}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function LayoutAddServiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://mock-checkout-prod:8081');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!name.trim() || !baseUrl.trim()) {
      setError('Service name and base URL are required.');
      return;
    }
    setSaving(true);
    try {
      const created = await registerService({ name, baseUrl });
      setStoredApiKey(created.apiKey);
      setApiKey(created.apiKey);
      await onCreated();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to add service';
      setError(message.includes('already exists')
        ? `${name.trim()} is already registered. Use a different service name.`
        : message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add service" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs font-bold">
          Service name
          <Input className="mt-1 w-full" value={name} onChange={(event) => setName(event.target.value)} placeholder="inventory-api" />
        </label>
        <label className="block text-xs font-bold">
          Base URL
          <Input className="mt-1 w-full" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://service.example.com" />
        </label>
        <Button type="submit" disabled={isSaving}>{isSaving ? 'Adding...' : 'Add service'}</Button>
        {apiKey && (
          <div className="rounded-md border border-lime-500/40 bg-lime-950/30 p-2 text-xs text-lime-100">
            <div className="font-bold">Generated API key</div>
            <code className="mt-1 block break-all">{apiKey}</code>
          </div>
        )}
        {error && <p className="text-xs text-red-300">{error}</p>}
      </form>
    </Modal>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [settings, setSettings] = useState(getRuntimeSettings());
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  function save() {
    setStoredApiKey(apiKey.trim());
    setRuntimeSettings(settings);
    setSaved(true);
  }

  return (
    <Modal title="Settings" onClose={onClose} size="xl">
      <div className="space-y-4 text-xs">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-lg border border-[#465047] bg-[#181c18] p-4">
            <SectionTitle title="Runtime endpoints" />
            <div className="grid gap-3 sm:grid-cols-2">
              <EndpointCard label="API URL" value={import.meta.env.VITE_API_URL ?? 'http://localhost:8080'} />
              <EndpointCard label="WebSocket URL" value={import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080'} />
            </div>
            <label className="block font-bold text-slate-200">
              X-API-Key
              <div className="mt-1 flex gap-2">
                <Input
                  className="w-full"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(event) => {
                    setSaved(false);
                    setApiKey(event.target.value);
                  }}
                  placeholder="Paste service API key"
                />
                <button
                  type="button"
                  title={showApiKey ? 'Hide API key' : 'Reveal API key'}
                  aria-label={showApiKey ? 'Hide API key' : 'Reveal API key'}
                  onClick={() => setShowApiKey((value) => !value)}
                  className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#59615b] bg-[#151815] text-slate-200 transition hover:border-cyan-300/70 hover:bg-[#252b25]"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <span className="mt-1 block text-[11px] font-semibold text-slate-400">
                Stored locally as {maskSecret(apiKey)}.
              </span>
            </label>
          </section>

          <section className="space-y-3 rounded-lg border border-[#465047] bg-[#181c18] p-4">
            <SectionTitle title="Replay defaults" />
            <label className="block font-bold text-slate-200">
              Default staging replay URL
              <Input
                className="mt-1 w-full"
                value={settings.defaultStagingUrl}
                onChange={(event) => setSettings({ ...settings, defaultStagingUrl: event.target.value })}
              />
            </label>
            <label className="block font-bold text-slate-200">
              Traffic shadow proxy URL
              <Input
                className="mt-1 w-full"
                value={settings.trafficProxyUrl}
                onChange={(event) => setSettings({ ...settings, trafficProxyUrl: event.target.value })}
              />
            </label>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-lg border border-[#465047] bg-[#181c18] p-4">
            <SectionTitle title="CI deploy gate policy" />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-12 items-center gap-3 rounded-md border border-[#3f473f] bg-[#111410] px-3 py-2 font-semibold text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-400"
                  checked={settings.failOnBreaking}
                  onChange={(event) => setSettings({ ...settings, failOnBreaking: event.target.checked })}
                />
                Block deploys when BREAKING drift is detected
              </label>
              <label className="flex min-h-12 items-center gap-3 rounded-md border border-[#3f473f] bg-[#111410] px-3 py-2 font-semibold text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-400"
                  checked={settings.failOnAnyDrift}
                  onChange={(event) => setSettings({ ...settings, failOnAnyDrift: event.target.checked })}
                />
                Block deploys on any drift type
              </label>
            </div>
            <label className="mt-3 block font-bold text-slate-200">
              Gate wait timeout, seconds
              <Input
                type="number"
                min={1}
                max={300}
                className="mt-1 w-full"
                value={settings.maxWaitSeconds}
                onChange={(event) => setSettings({ ...settings, maxWaitSeconds: Number(event.target.value) })}
              />
            </label>
          </section>

          <section className="rounded-lg border border-[#465047] bg-[#181c18] p-4">
            <SectionTitle title="Proxy smoke command" />
            <code className="mt-3 block rounded-md border border-[#3f473f] bg-[#111410] p-3 text-slate-300">curl.exe {settings.trafficProxyUrl}/checkout/cart</code>
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-[#3f473f] pt-4">
          {saved ? <p className="text-xs font-bold text-lime-300">Settings saved.</p> : <span />}
          <Button onClick={save} className="min-w-32 border-cyan-400/60 bg-cyan-950/40">Save settings</Button>
        </div>
      </div>
    </Modal>
  );
}

function EndpointCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#3f473f] bg-[#111410] p-3">
      <div className="font-bold text-slate-200">{label}</div>
      <code className="mt-1 block break-all text-slate-300">{value}</code>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div className="text-[11px] font-bold uppercase tracking-wide text-cyan-200">{title}</div>;
}

function maskSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'not set';
  }
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}****`;
  }
  return `${trimmed.slice(0, 6)}****${trimmed.slice(-4)}`;
}
