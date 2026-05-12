const DEFAULT_STAGING_URL = 'http://mock-checkout-staging:8081';
const DEFAULT_PROXY_URL = 'http://localhost:8083';

const DEFAULT_STAGING_KEY = 'driftguard_default_staging_url';
const TRAFFIC_PROXY_KEY = 'driftguard_traffic_proxy_url';
const FAIL_ON_BREAKING_KEY = 'driftguard_gate_fail_on_breaking';
const FAIL_ON_ANY_DRIFT_KEY = 'driftguard_gate_fail_on_any_drift';
const MAX_WAIT_SECONDS_KEY = 'driftguard_gate_max_wait_seconds';

export interface RuntimeSettings {
  defaultStagingUrl: string;
  trafficProxyUrl: string;
  failOnBreaking: boolean;
  failOnAnyDrift: boolean;
  maxWaitSeconds: number;
}

export function getRuntimeSettings(): RuntimeSettings {
  return {
    defaultStagingUrl: localStorage.getItem(DEFAULT_STAGING_KEY) ?? DEFAULT_STAGING_URL,
    trafficProxyUrl: localStorage.getItem(TRAFFIC_PROXY_KEY) ?? DEFAULT_PROXY_URL,
    failOnBreaking: localStorage.getItem(FAIL_ON_BREAKING_KEY) !== 'false',
    failOnAnyDrift: localStorage.getItem(FAIL_ON_ANY_DRIFT_KEY) === 'true',
    maxWaitSeconds: Number(localStorage.getItem(MAX_WAIT_SECONDS_KEY) ?? '90'),
  };
}

export function setRuntimeSettings(settings: RuntimeSettings) {
  localStorage.setItem(DEFAULT_STAGING_KEY, settings.defaultStagingUrl.trim());
  localStorage.setItem(TRAFFIC_PROXY_KEY, settings.trafficProxyUrl.trim());
  localStorage.setItem(FAIL_ON_BREAKING_KEY, String(settings.failOnBreaking));
  localStorage.setItem(FAIL_ON_ANY_DRIFT_KEY, String(settings.failOnAnyDrift));
  localStorage.setItem(MAX_WAIT_SECONDS_KEY, String(settings.maxWaitSeconds));
}

export function syntheticStagingUrl(serviceId: string) {
  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
  return `${apiBase}/synthetic-staging/${serviceId}`;
}
