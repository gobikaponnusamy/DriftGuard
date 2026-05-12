import {
  Activity,
  BarChart3,
  Database,
  FileJson,
  Home,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, PropsWithChildren } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getTimeline, recordBaseline, registerService, triggerReplay } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import { getRuntimeSettings, setRuntimeSettings, syntheticStagingUrl } from '../config/runtimeSettings';
import { useServices } from '../hooks/useServices';
import type { ReplayAuthType } from '../types/api';
import { Button, Input, Select, Textarea } from './forms';
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
    <div className="h-screen overflow-hidden bg-transparent text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-10 flex w-72 flex-col overflow-hidden border-r border-white/10 bg-[#070814]/95 shadow-[20px_0_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <button onClick={() => navigate('/')} className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5 text-left transition hover:bg-white/[0.03]">
          <span className="animate-drift-pulse grid h-9 w-9 place-items-center rounded-xl border border-indigo-300/35 bg-indigo-400/15 shadow-[0_0_30px_rgba(129,140,248,0.20)]">
            <ShieldCheck className="h-5 w-5 text-indigo-100" />
          </span>
          <span>
            <span className="block text-base font-black tracking-tight">Drift<span className="text-fuchsia-300">Guard</span></span>
            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Release radar</span>
          </span>
        </button>
        <div
          title="Demo mode is using DriftGuard's bundled checkout API to simulate production capture and staging replay."
          className="glass-line mx-4 mt-3 shrink-0 rounded-xl border border-amber-300/25 bg-gradient-to-r from-amber-300/12 via-fuchsia-400/10 to-indigo-400/10 px-3 py-2"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-amber-100"><Zap className="h-4 w-4 text-amber-200" /> Demo gate active</div>
        </div>
        <nav className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-hidden px-4 py-3">
          {nav.map((group) => (
            <div key={group.section}>
              <div className="mb-1 px-1 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">{group.section}</div>
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
                        return `group relative flex h-8 items-center gap-3 overflow-hidden rounded-xl border px-4 text-sm font-bold transition duration-200 ${
                          active ? 'border-white/10 bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_28px_rgba(168,85,247,0.12)]' : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-100'
                        }`
                      }}
                    >
                      {({ isActive }) => {
                        const active = isActive && (item.label === 'Dashboard' || item.to !== '/');
                        return (
                          <>
                            {active && <span className="absolute inset-y-1 left-1 w-1 rounded-full bg-gradient-to-b from-amber-300 via-fuchsia-300 to-indigo-300" />}
                            {active && <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-400/14 via-indigo-400/10 to-transparent" />}
                            <Icon className={`relative h-3.5 w-3.5 ${active ? 'text-amber-100' : 'text-slate-500 group-hover:text-slate-200'}`} />
                            <span className="relative">{item.label}</span>
                          </>
                        );
                      }}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="shrink-0 space-y-2 border-t border-white/10 p-3">
          <button onClick={() => setAddOpen(true)} className="flex h-9 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-200 transition hover:border-fuchsia-300/60 hover:bg-fuchsia-300/10 hover:text-fuchsia-50">
            <Plus className="h-3.5 w-3.5" /> Add service
          </button>
          <button onClick={logout} className="flex h-9 w-full items-center gap-3 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06]">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
          <button onClick={() => setSettingsOpen(true)} className="flex h-9 w-full items-center gap-3 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06]">
            <Settings className="h-3.5 w-3.5" /> Settings
          </button>
        </div>
      </aside>
      <main className="no-scrollbar ml-72 h-screen overflow-y-auto overflow-x-hidden">{children}</main>
      {addOpen && (
        <LayoutAddServiceModal
          onClose={() => setAddOpen(false)}
          onCreated={async () => {
            await reload();
          }}
        />
      )}
      {settingsOpen && <SettingsModal services={services} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function LayoutAddServiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [sourceMode, setSourceMode] = useState<'manual' | 'openapi'>('manual');
  const [authMode, setAuthMode] = useState<ReplayAuthType>('NONE');
  const [authHeaderName, setAuthHeaderName] = useState('X-API-Key');
  const [authValue, setAuthValue] = useState('');
  const [showAuthValue, setShowAuthValue] = useState(false);
  const [openApiUrl, setOpenApiUrl] = useState('');
  const [openApiJson, setOpenApiJson] = useState('');
  const [endpointPreview, setEndpointPreview] = useState<{ method: string; path: string }[]>([]);
  const [baselineExamples, setBaselineExamples] = useState('');
  const [createdMessage, setCreatedMessage] = useState('');
  const [error, setError] = useState('');
  const [importNotice, setImportNotice] = useState('');
  const [isSaving, setSaving] = useState(false);

  async function importOpenApi(specOverride?: string) {
    setError('');
    setImportNotice('');
    try {
      let specSource = specOverride?.trim() || openApiJson.trim();
      if (!specOverride && openApiUrl.trim()) {
        const response = await fetch(openApiUrl.trim());
        if (!response.ok) {
          throw new Error(`Unable to fetch OpenAPI spec (${response.status})`);
        }
        specSource = await response.text();
        setOpenApiJson(specSource);
      }
      if (!specSource) {
        setError('Paste OpenAPI JSON or provide an OpenAPI URL.');
        return;
      }
      const parsed = parseOpenApiSpec(specSource);
      const importedName = parsed.info?.title?.trim();
      const importedUrl = parsed.servers?.find((server) => server.url)?.url;
      const importedEndpoints = Object.entries(parsed.paths ?? {})
        .flatMap(([path, methods]) => Object.keys(methods).map((method) => ({ method: method.toUpperCase(), path })))
        .slice(0, 20);
      if (!importedEndpoints.length) {
        throw new Error('This file is JSON, but it is not an OpenAPI spec with a paths section.');
      }
      if (importedName && !name.trim()) {
        setName(importedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
      }
      if (importedUrl) {
        setBaseUrl(importedUrl);
      }
      if (importedEndpoints.length) {
        setEndpointPreview(importedEndpoints);
        setBaselineExamples(JSON.stringify(importedEndpoints.map((endpoint, index) => (
          baselineExample(endpoint.method, endpoint.path, index)
        )), null, 2));
      }
      if (!importedUrl) {
        setImportNotice(`Imported ${importedEndpoints.length} endpoints. Add the Production base URL manually because the spec has no servers[0].url.`);
      } else {
        setImportNotice(`Imported ${importedEndpoints.length} endpoints from OpenAPI.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OpenAPI JSON is not valid.');
    }
  }

  function openSpecPicker() {
    fileInputRef.current?.click();
  }

  async function importOpenApiFile(file: File | undefined) {
    if (!file) {
      return;
    }
    const content = await file.text();
    setOpenApiJson(content);
    await importOpenApi(content);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Service name is required.');
      return;
    }
    if (!baseUrl.trim()) {
      setError('Production base URL is required.');
      return;
    }
    if (authMode !== 'NONE' && !authValue.trim()) {
      setError('Replay authentication credential is required for the selected auth type.');
      return;
    }
    if (needsAuthHeader(authMode) && !authHeaderName.trim()) {
      setError('Replay authentication header name is required.');
      return;
    }
    setSaving(true);
    try {
      const examples = parseBaselineExamples(baselineExamples);
      const created = await registerService({
        name,
        baseUrl,
        replayAuthType: authMode,
        replayAuthHeaderName: needsAuthHeader(authMode) ? authHeaderName : undefined,
        replayAuthValue: authMode === 'NONE' ? undefined : authValue,
      });
      await Promise.all(examples.map((endpoint) => recordBaseline(created.id, {
        method: endpoint.method,
        path: endpoint.path,
        requestHeaders: endpoint.requestHeaders ?? { 'content-type': 'application/json' },
        requestBody: endpoint.requestBody,
        responseStatus: endpoint.responseStatus,
        responseHeaders: endpoint.responseHeaders ?? { 'content-type': 'application/json' },
        responseBody: endpoint.responseBody,
        responseTimeMs: endpoint.responseTimeMs,
      })));
      const syntheticUrl = syntheticStagingUrl(created.id);
      const currentSettings = getRuntimeSettings();
      setRuntimeSettings({ ...currentSettings, defaultStagingUrl: syntheticUrl });
      setCreatedMessage(`Created ${created.name} with ${examples.length} baselines. Starting staging comparison...`);
      await onCreated();
      const session = await triggerReplay({ serviceId: created.id, stagingUrl: syntheticUrl });
      onClose();
      navigate(`/replay/${session.id}`);
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
    <Modal title="Add service" onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1">
          {([
            ['manual', 'Manual endpoints'],
            ['openapi', 'OpenAPI import'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSourceMode(value)}
              className={`h-9 rounded-lg text-xs font-bold transition ${sourceMode === value ? 'bg-gradient-to-r from-fuchsia-300 to-indigo-300 text-slate-950' : 'text-slate-300 hover:bg-white/[0.06]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-bold">
            Service name
            <Input className="mt-1 w-full" value={name} onChange={(event) => setName(event.target.value)} placeholder="inventory-api" />
          </label>
          <label className="block text-xs font-bold">
            Authentication used by service
            <Select
              className="mt-1 w-full"
              value={authMode}
              onChange={(event) => setAuthMode(event.target.value as ReplayAuthType)}
            >
              <option value="NONE">None</option>
              <option value="BEARER_TOKEN">Bearer token</option>
              <option value="API_KEY_HEADER">API key header</option>
              <option value="BASIC_AUTH">Basic auth</option>
              <option value="CUSTOM_HEADER">Custom header</option>
            </Select>
          </label>
        </div>
        <label className="block text-xs font-bold">
          Production base URL
          <Input className="mt-1 w-full" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.company.com" />
        </label>
        {authMode !== 'NONE' && (
          <section className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-2">
            {needsAuthHeader(authMode) && (
              <label className="block text-xs font-bold">
                Header name
                <Input
                  className="mt-1 w-full"
                  value={authHeaderName}
                  onChange={(event) => setAuthHeaderName(event.target.value)}
                  placeholder={authMode === 'API_KEY_HEADER' ? 'X-API-Key' : 'X-Staging-Token'}
                />
              </label>
            )}
            <label className="block text-xs font-bold">
              {authMode === 'BASIC_AUTH' ? 'Username:password' : authMode === 'BEARER_TOKEN' ? 'Bearer token' : 'Credential value'}
              <div className="relative mt-1">
                <Input
                  className="w-full pr-11"
                  type={showAuthValue ? 'text' : 'password'}
                  value={authValue}
                  onChange={(event) => setAuthValue(event.target.value)}
                  placeholder={authMode === 'BASIC_AUTH' ? 'staging-user:secret' : 'Stored for replay only'}
                />
                <button
                  type="button"
                  title={showAuthValue ? 'Hide credential' : 'Show credential'}
                  aria-label={showAuthValue ? 'Hide credential' : 'Show credential'}
                  onClick={() => setShowAuthValue((value) => !value)}
                  className="absolute inset-y-1 right-1 grid w-8 place-items-center rounded-md text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-100"
                >
                  {showAuthValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <p className="sm:col-span-2 text-[11px] leading-5 text-slate-400">
              Used only when DriftGuard replays baselines against staging. The value is stored server-side and never returned in API responses.
            </p>
          </section>
        )}
        {sourceMode === 'openapi' && (
          <section className="space-y-2 rounded-lg border border-[#465047] bg-[#151815] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold"><FileJson className="h-4 w-4 text-cyan-200" /> Import OpenAPI spec</div>
              <Button type="button" onClick={openSpecPicker}>Upload File</Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml,application/json,text/yaml,application/yaml"
              className="hidden"
              onChange={(event) => void importOpenApiFile(event.target.files?.[0])}
            />
            <label className="block text-xs font-bold">
              OpenAPI URL
              <Input
                className="mt-1 w-full"
                value={openApiUrl}
                onChange={(event) => {
                  setOpenApiUrl(event.target.value);
                  setError('');
                  setImportNotice('');
                }}
                onBlur={() => {
                  if (openApiUrl.trim()) {
                    void importOpenApi();
                  }
                }}
                placeholder="https://api.company.com/openapi.json"
              />
            </label>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Or paste JSON</div>
            <Textarea
              className="w-full"
              value={openApiJson}
              onChange={(event) => {
                setOpenApiJson(event.target.value);
                setError('');
                setImportNotice('');
              }}
              onBlur={() => {
                if (openApiJson.trim()) {
                  void importOpenApi();
                }
              }}
              placeholder='{"openapi":"3.0.0","info":{"title":"orders-api"},"servers":[{"url":"https://api.company.com"}],"paths":{"/orders":{"get":{},"post":{}}}}'
            />
            {importNotice && <p className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 p-3 text-xs text-cyan-100">{importNotice}</p>}
            {endpointPreview.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-bold">
                  <span>Endpoint preview</span>
                  <span className="text-slate-400">{endpointPreview.length} endpoints</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {endpointPreview.map((endpoint) => (
                    <div key={`${endpoint.method}-${endpoint.path}`} className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-white/10 bg-[#090a12] px-2 py-2 text-xs">
                      <span className="rounded-md bg-white/[0.07] px-2 py-1 text-center text-[10px] font-black text-cyan-100">{endpoint.method}</span>
                      <span className="truncate font-semibold text-slate-200">{endpoint.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
        {sourceMode === 'manual' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold sm:col-span-2">
              Baseline examples JSON
              <Textarea
                className="mt-1 min-h-72 w-full resize-none font-mono"
                value={baselineExamples}
                onChange={(event) => setBaselineExamples(event.target.value)}
                placeholder={baselineExamplesPlaceholder}
              />
              <span className="mt-1 block text-[11px] font-semibold leading-5 text-slate-400">
                Add one object per request. Each endpoint can have its own requestBody, responseStatus, responseBody, and responseTimeMs.
              </span>
            </label>
          </div>
        )}
        <div className="rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/10 p-3 text-xs text-fuchsia-50">
          DriftGuard will create each request/response pair as a separate baseline, generate a staging candidate from those baselines, and immediately compare staging behavior.
        </div>
        <Button type="submit" disabled={isSaving}>{isSaving ? 'Adding...' : 'Add service'}</Button>
        {createdMessage && <p className="rounded-xl border border-lime-400/30 bg-lime-400/10 p-3 text-xs text-lime-100">{createdMessage}</p>}
        {error && <p className="text-xs text-red-300">{error}</p>}
      </form>
    </Modal>
  );
}

function needsAuthHeader(authMode: ReplayAuthType) {
  return authMode === 'API_KEY_HEADER' || authMode === 'CUSTOM_HEADER';
}

type BaselineExample = {
  method: string;
  path: string;
  requestHeaders?: Record<string, unknown>;
  requestBody?: string;
  responseStatus: number;
  responseHeaders?: Record<string, unknown>;
  responseBody: string;
  responseTimeMs: number;
};

type OpenApiSpec = {
  info?: { title?: string };
  servers?: { url?: string }[];
  paths?: Record<string, Record<string, unknown>>;
};

function parseOpenApiSpec(value: string): OpenApiSpec {
  try {
    return JSON.parse(value) as OpenApiSpec;
  } catch {
    return parseBasicOpenApiYaml(value);
  }
}

function parseBasicOpenApiYaml(value: string): OpenApiSpec {
  const lines = value.split(/\r?\n/);
  const paths: Record<string, Record<string, unknown>> = {};
  let title: string | undefined;
  let serverUrl: string | undefined;
  let inServers = false;
  let inPaths = false;
  let currentPath = '';

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    if (trimmed.startsWith('title:')) {
      title = unquote(trimmed.slice('title:'.length).trim());
    }
    if (trimmed === 'servers:') {
      inServers = true;
      inPaths = false;
      continue;
    }
    if (trimmed === 'paths:') {
      inPaths = true;
      inServers = false;
      continue;
    }
    if (inServers && trimmed.startsWith('- url:')) {
      serverUrl = unquote(trimmed.slice('- url:'.length).trim());
    }
    if (inPaths && line.match(/^ {2}\/.+:/)) {
      currentPath = trimmed.slice(0, -1);
      paths[currentPath] = {};
      continue;
    }
    if (inPaths && currentPath && line.match(/^ {4}(get|post|put|patch|delete|head|options):/i)) {
      const method = trimmed.split(':')[0].toLowerCase();
      paths[currentPath][method] = {};
    }
  }

  if (!Object.keys(paths).length) {
    throw new Error('OpenAPI spec could not be parsed. Use JSON, or a standard YAML file with a paths section.');
  }

  return {
    info: title ? { title } : undefined,
    servers: serverUrl ? [{ url: serverUrl }] : undefined,
    paths,
  };
}

function unquote(value: string) {
  return value.replace(/^['"]|['"]$/g, '');
}

const baselineExamplesPlaceholder = JSON.stringify([
  baselineExample('GET', '/orders/ord_123', 0),
  baselineExample('POST', '/orders', 1),
  baselineExample('GET', '/orders/ord_123/status', 2),
], null, 2);

function baselineExample(method: string, path: string, index: number): BaselineExample {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const id = normalizedPath.split('/').filter(Boolean).at(-1) ?? `sample_${index + 1}`;
  return {
    method: normalizedMethod,
    path: normalizedPath,
    requestHeaders: { 'content-type': 'application/json' },
    requestBody: normalizedMethod === 'GET' ? undefined : JSON.stringify({ orderId: id, dryRun: true }),
    responseStatus: normalizedMethod === 'POST' ? 201 : 200,
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: JSON.stringify({
      id,
      path: normalizedPath,
      status: normalizedMethod === 'POST' ? 'created' : 'confirmed',
      total: `${99 + index}.0`,
      timestamp: '2026-05-12T10:00:00Z',
    }),
    responseTimeMs: 90 + index * 25,
  };
}

function parseBaselineExamples(value: string): BaselineExample[] {
  if (!value.trim()) {
    throw new Error('Add baseline examples JSON, upload an OpenAPI file, or import an OpenAPI URL before adding the service.');
  }
  const parsed = JSON.parse(value) as Partial<BaselineExample>[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Baseline examples must be a non-empty JSON array.');
  }
  return parsed.map((item, index) => {
    if (!item.method || !item.path || !item.responseBody) {
      throw new Error(`Baseline example ${index + 1} needs method, path, and responseBody.`);
    }
    return {
      method: item.method.toUpperCase(),
      path: item.path.startsWith('/') ? item.path : `/${item.path}`,
      requestHeaders: item.requestHeaders,
      requestBody: item.requestBody,
      responseStatus: item.responseStatus ?? (item.method.toUpperCase() === 'POST' ? 201 : 200),
      responseHeaders: item.responseHeaders,
      responseBody: normalizeBody(item.responseBody),
      responseTimeMs: item.responseTimeMs ?? 100,
    };
  });
}

function normalizeBody(value: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function SettingsModal({ services, onClose }: { services: { id: string; name: string }[]; onClose: () => void }) {
  const [settings, setSettings] = useState(getRuntimeSettings());
  const [saved, setSaved] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id ?? '');

  function save() {
    setRuntimeSettings(settings);
    setSaved(true);
  }

  return (
    <Modal title="Release settings" onClose={onClose} size="lg">
      <div className="space-y-4 text-xs">
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-400/10 to-fuchsia-400/10 p-4">
          <SectionTitle title="Replay target" />
          {services.length > 0 && (
            <label className="mt-3 block font-bold text-slate-200">
              Service
              <Select
                className="mt-1 w-full"
                value={selectedServiceId}
                onChange={(event) => {
                  const nextServiceId = event.target.value;
                  setSelectedServiceId(nextServiceId);
                  setSettings({ ...settings, defaultStagingUrl: syntheticStagingUrl(nextServiceId) });
                }}
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </Select>
            </label>
          )}
          <label className="mt-3 block font-bold text-slate-200">
            Default staging URL
            <Input
              className="mt-1 w-full"
              value={settings.defaultStagingUrl}
              onChange={(event) => setSettings({ ...settings, defaultStagingUrl: event.target.value })}
            />
          </label>
          <p className="mt-2 text-slate-400">
            Add Service can generate a synthetic staging URL automatically for manually entered baselines.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <SectionTitle title="Deploy gate policy" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ToggleCard
              checked={settings.failOnBreaking}
              label="Block breaking drift"
              onChange={(checked) => setSettings({ ...settings, failOnBreaking: checked })}
            />
            <ToggleCard
              checked={settings.failOnAnyDrift}
              label="Block any drift"
              onChange={(checked) => setSettings({ ...settings, failOnAnyDrift: checked })}
            />
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

        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          {saved ? <p className="text-xs font-bold text-lime-300">Settings saved.</p> : <span />}
          <Button onClick={save} className="min-w-32 border-fuchsia-300/50 bg-fuchsia-300/15">Save settings</Button>
        </div>
      </div>
    </Modal>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div className="text-[11px] font-bold uppercase tracking-wide text-fuchsia-200">{title}</div>;
}

function ToggleCard({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 bg-[#090a12] px-3 py-2 font-semibold text-slate-200">
      <input
        type="checkbox"
        className="h-4 w-4 accent-fuchsia-400"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
