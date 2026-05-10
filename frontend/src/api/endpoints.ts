import { apiClient, unwrap } from './client';
import type {
  Baseline,
  BaselinePromotion,
  IgnoreRule,
  IgnoreRuleType,
  PageResponse,
  RedactionRule,
  RedactionRuleType,
  RegisteredService,
  ReplayResult,
  ReplaySession,
  ServiceRegistration,
  TimelinePoint,
  LoginResponse,
  ReleaseReadiness,
  TriageStatus,
} from '../types/api';

export function login(payload: { email: string; password: string }) {
  return unwrap<LoginResponse>(apiClient.post('/api/auth/login', payload));
}

export function listServices() {
  return unwrap<RegisteredService[]>(apiClient.get('/api/services'));
}

export function registerService(payload: { name: string; baseUrl: string }) {
  return unwrap<ServiceRegistration>(apiClient.post('/api/services', payload));
}

export function listBaselines(serviceId: string, page = 0, size = 20) {
  return unwrap<PageResponse<Baseline>>(
    apiClient.get(`/api/baselines/${serviceId}`, { params: { page, size } }),
  );
}

export function deleteBaseline(serviceId: string, baselineId: string) {
  return unwrap<void>(apiClient.delete(`/api/baselines/${serviceId}/${baselineId}`));
}

export function triggerReplay(payload: { serviceId: string; stagingUrl: string }) {
  return unwrap<ReplaySession>(apiClient.post('/api/replay', payload));
}

export function getReplaySession(sessionId: string) {
  return unwrap<ReplaySession>(apiClient.get(`/api/replay/${sessionId}`));
}

export function listReplayResults(sessionId: string) {
  return unwrap<ReplayResult[]>(apiClient.get(`/api/replay/${sessionId}/results`));
}

export function getReplayResult(sessionId: string, resultId: string) {
  return unwrap<ReplayResult>(apiClient.get(`/api/replay/${sessionId}/results/${resultId}`));
}

export function updateReplayResultTriage(
  sessionId: string,
  resultId: string,
  payload: { status: TriageStatus; note?: string },
) {
  return unwrap<ReplayResult>(apiClient.patch(`/api/replay/${sessionId}/results/${resultId}/triage`, payload));
}

export function promoteReplaySession(
  sessionId: string,
  payload: { force: boolean; promotedBy?: string; note?: string },
) {
  return unwrap<BaselinePromotion>(apiClient.post(`/api/replay/${sessionId}/promote`, payload));
}

export function listReplayPromotions(sessionId: string) {
  return unwrap<BaselinePromotion[]>(apiClient.get(`/api/replay/${sessionId}/promotions`));
}

export function listIgnoreRules(serviceId: string) {
  return unwrap<IgnoreRule[]>(apiClient.get(`/api/ignore-rules/${serviceId}`));
}

export function addIgnoreRule(serviceId: string, payload: { fieldPath: string; ruleType: IgnoreRuleType }) {
  return unwrap<IgnoreRule>(apiClient.post(`/api/ignore-rules/${serviceId}`, payload));
}

export function deleteIgnoreRule(serviceId: string, ruleId: string) {
  return unwrap<void>(apiClient.delete(`/api/ignore-rules/${serviceId}/${ruleId}`));
}

export function listRedactionRules(serviceId: string) {
  return unwrap<RedactionRule[]>(apiClient.get(`/api/redaction-rules/${serviceId}`));
}

export function addRedactionRule(serviceId: string, payload: { fieldPath: string; ruleType: RedactionRuleType }) {
  return unwrap<RedactionRule>(apiClient.post(`/api/redaction-rules/${serviceId}`, payload));
}

export function deleteRedactionRule(serviceId: string, ruleId: string) {
  return unwrap<void>(apiClient.delete(`/api/redaction-rules/${serviceId}/${ruleId}`));
}

export function getTimeline(serviceId: string) {
  return unwrap<TimelinePoint[]>(apiClient.get(`/api/reports/${serviceId}/timeline`));
}

export function getReadiness(serviceId: string) {
  return unwrap<ReleaseReadiness>(apiClient.get(`/api/reports/${serviceId}/readiness`));
}

export function runDemoCapture(serviceId: string) {
  return unwrap<{ serviceId: string; capturedCount: number; productionBaseUrl: string }>(
    apiClient.post(`/api/demo/capture/${serviceId}`),
  );
}

export function runDemoReplay(serviceId: string) {
  return unwrap<ReplaySession>(apiClient.post(`/api/demo/replay/${serviceId}`));
}

export function runDemoScenario(serviceId: string) {
  return unwrap<{ serviceId: string; capturedCount: number; sessionId: string; stagingUrl: string }>(
    apiClient.post(`/api/demo/run/${serviceId}`),
  );
}
