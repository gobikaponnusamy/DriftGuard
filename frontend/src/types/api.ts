export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiError;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type DriftType = 'NONE' | 'BREAKING' | 'WARNING' | 'PERFORMANCE';
export type ReplayStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
export type IgnoreRuleType = 'IGNORE' | 'MASK';
export type RedactionRuleType = 'REDACT' | 'HASH' | 'DROP';
export type TriageStatus = 'OPEN' | 'ACCEPTED' | 'IGNORED' | 'FIXED' | 'BLOCKING';
export type ReadinessDecision = 'READY' | 'NEEDS_REVIEW' | 'BLOCKED' | 'PENDING';

export interface LoginResponse {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
}

export interface RegisteredService {
  id: string;
  name: string;
  baseUrl: string;
  createdAt: string;
}

export interface ServiceRegistration extends RegisteredService {
  apiKey: string;
}

export interface Baseline {
  id: string;
  serviceId: string;
  method: string;
  path: string;
  requestHeaders: Record<string, unknown>;
  requestBody?: string;
  responseStatus: number;
  responseHeaders: Record<string, unknown>;
  responseBody?: string;
  responseTimeMs: number;
  capturedAt: string;
}

export interface ReplaySession {
  id: string;
  serviceId: string;
  stagingUrl: string;
  status: ReplayStatus;
  triggeredAt: string;
  completedAt?: string;
  totalRequests: number;
  driftedCount: number;
}

export interface DiffChange {
  path: string;
  type: string;
  from?: unknown;
  to?: unknown;
}

export interface ReplayResult {
  id: string;
  sessionId: string;
  baselineId: string;
  method: string;
  path: string;
  baselineStatus: number;
  baselineResponseTimeMs: number;
  baselineResponseBody?: string;
  replayedStatus: number;
  replayedHeaders: Record<string, unknown>;
  replayedBody?: string;
  replayedResponseTimeMs: number;
  driftType: DriftType;
  driftSummary?: string;
  diffJson: { drifts?: DiffChange[] };
  triageStatus: TriageStatus;
  triageNote?: string;
  triagedAt?: string;
  replayedAt: string;
}

export interface IgnoreRule {
  id: string;
  serviceId: string;
  fieldPath: string;
  ruleType: IgnoreRuleType;
  createdAt: string;
}

export interface RedactionRule {
  id: string;
  serviceId: string;
  fieldPath: string;
  ruleType: RedactionRuleType;
  createdAt: string;
}

export interface ReplayProgressEvent {
  baselineId?: string;
  path?: string;
  driftType?: DriftType;
  status: 'done' | 'completed';
  progress: number;
  total: number;
  driftedCount?: number;
}

export interface TimelinePoint {
  sessionId: string;
  date: string;
  breaking: number;
  warning: number;
  performance: number;
}

export interface ReleaseReadiness {
  serviceId: string;
  sessionId: string;
  status: ReplayStatus;
  decision: ReadinessDecision;
  message: string;
  triggeredAt: string;
  totalRequests: number;
  driftedCount: number;
  breakingCount: number;
  warningCount: number;
  performanceCount: number;
  openCount: number;
  acceptedCount: number;
  ignoredCount: number;
  fixedCount: number;
  blockingCount: number;
}

export interface BaselinePromotion {
  id: string;
  sessionId: string;
  serviceId: string;
  promotedBy: string;
  note?: string;
  promotedCount: number;
  forced: boolean;
  promotedAt: string;
}
