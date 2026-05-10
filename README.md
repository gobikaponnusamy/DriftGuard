# DriftGuard

DriftGuard is a full-stack production behavior diff tool. It saves safe, sampled examples of how an API behaves today, replays the same requests against staging, and shows exactly what changed before the new version reaches customers.

The platform includes traffic capture, replay orchestration, JSON diffing, WebSocket progress, release readiness, deploy-gate simulation, endpoint risk scoring, PII redaction, and a Monaco side-by-side diff viewer.

## Problem

A team ships a small refactor. Tests pass. No errors appear. But the checkout API quietly changes:

- `price.amount` changes from number to string
- `order_id` becomes `orderId`
- `POST /checkout/order` returns `200` instead of `201`
- one endpoint becomes 4x slower

DriftGuard catches that in staging by comparing:

```text
Current production behavior
        vs
New staging behavior
```

## Architecture

```text
                          +----------------------+
                          |      React UI        |
                          |  DriftGuard Console  |
                          +----------+-----------+
                                     |
                              REST + WebSocket
                                     |
                                     v
+------------------+       +----------------------+       +------------------+
| Traffic Proxy    | ----> | Spring Boot Backend  | ----> | PostgreSQL       |
| shadow capture   |       | DriftGuard API       |       | baselines/results|
+--------+---------+       +----------+-----------+       +------------------+
         |                            |
         | forwards request           | live replay state
         v                            v
+------------------+          +------------------+
| Mock Production  |          | Redis            |
| or real service  |          | replay progress  |
+------------------+          +------------------+

Replay phase:

+----------------------+       +------------------+
| Spring Boot Backend  | ----> | Mock Staging     |
| replays saved calls  |       | or staging env   |
+----------------------+       +------------------+
          |
          v
 Compare saved production response vs staging response
```

## Simple Data Flow

```text
1. Capture
   request -> production API -> production response
   DriftGuard stores this as a production snapshot

2. Test staging
   DriftGuard sends the same saved request to staging
   DriftGuard stores the staging response

3. Diff
   production snapshot response vs staging response

4. Decide
   allow deploy, needs review, or block deploy
```

For local demonstration, production and staging are simulated by `infra/mock-checkout/server.js`.

## Tech Stack

| Area | Technology |
| --- | --- |
| Backend | Java 21, Spring Boot 3, Spring WebSocket, Spring Scheduler, Spring Data JPA |
| Diffing | Jackson `JsonNode` deep comparison |
| Persistence | PostgreSQL, Flyway |
| Live state | Redis |
| HTTP replay | Spring WebClient |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI | Monaco Diff Editor, Recharts, native WebSocket |
| Infra | Docker Compose, nginx, mock production/staging APIs, traffic proxy |

## Repository Layout

```text
backend/                 Spring Boot backend
  src/main/java/com/driftguard/
    auth/                JWT login and service API key auth
    service/             registered services
    recorder/            production snapshot capture
    replay/              replay sessions, results, triage, promotion
    diff/                Jackson JSON diff engine
    ignore/              ignore/mask rules
    redaction/           PII redaction vault
    report/              timeline, readiness, reporting
    webhook/             CI/CD deploy webhooks and gate
    websocket/           live replay event streaming
    common/              ApiResponse and exception handling
  src/main/resources/db/migration/

frontend/                React console
  src/pages/             dashboard, snapshots, live test, diff, reports, rules
  src/components/        shared UI
  src/hooks/             data-fetching hooks
  src/api/               axios client and endpoint functions
  src/types/             TypeScript API contracts

infra/
  mock-checkout/         fake production and staging checkout API
  traffic-proxy/         sidecar-style capture proxy

docker-compose.yml       full local stack
```

## Features

### Production Snapshot Capture

DriftGuard records request/response pairs from production-like traffic.

Stored data includes:

- method
- path
- request headers/body
- response status
- response headers/body
- response time

In the local demo environment, snapshots come from:

- seeded data in `DemoDataSeeder.java`
- the mock production service
- the traffic proxy service

### Staging Replay

DriftGuard replays saved production requests against a staging URL.

Each replay creates:

- one replay session
- one replay result per production snapshot
- structured diff JSON
- drift severity

### Deep JSON Diff Engine

The diff engine detects:

- field added
- field removed
- type changed
- value changed
- status changed
- latency regression

Severity:

| Drift Type | Meaning |
| --- | --- |
| `NONE` | No meaningful change |
| `WARNING` | Value changed |
| `BREAKING` | status changed, field removed, or type changed |
| `PERFORMANCE` | response time changed significantly |

### Live Staging Test

Replay progress streams over WebSocket:

```text
/ws/replay/{sessionId}
```

The UI shows:

- progress bar
- live completed request rows
- drift badges
- sortable/searchable results table
- release readiness
- endpoint risk score
- contract change summary

### Monaco Diff Viewer

The diff page compares:

```text
Left:  saved production response
Right: replayed staging response
```

It also shows smart drift explanations, for example:

```text
$.order_id was removed in staging. This can break clients that still read that field.
```

### CI/CD Deploy Gate

DriftGuard can be called from a pipeline before production deployment.

It returns:

- `ALLOW`
- `PENDING`
- `BLOCK`

Blocking gate endpoint:

```text
POST /api/webhooks/deploy/gate
```

### PII Redaction Vault

Sensitive values are transformed before storage.

Supported rules:

| Rule | Behavior |
| --- | --- |
| `REDACT` | replace with `[REDACTED]` |
| `HASH` | deterministic hash for stable comparison |
| `DROP` | remove the field |

Seeded demo rules:

```text
$.customer.email       HASH
$.payment.cardNumber  REDACT
$.authorization       REDACT
```

### Ignore Rules

Ignore noisy fields during diffing:

```text
$.timestamp
$.request_id
$.items[*].updatedAt
```

## Running The System

Prerequisites:

- Docker Desktop
- Java 21 if running backend locally
- Node.js 18+ if running frontend locally

Start the full stack:

```powershell
docker compose up --build
```

Open the frontend URL exposed by Docker Compose. The default port mappings are defined in `docker-compose.yml`.

Demo login:

```text
Email:    demo@driftguard.local
Password: driftguard
API key:  dg_demo_checkout_api_key
```

Reset demo data:

```powershell
docker compose down -v
docker compose up --build
```

## Demo Walkthrough

1. Open the frontend application.
2. Log in with the demo credentials.
3. On Dashboard, select `checkout-api`.
4. Click `Run demo`.
5. DriftGuard captures mock production responses and tests mock staging.
6. Open Live Replay.
7. Review:
   - deploy gate simulator
   - endpoint risk score
   - contract change summary
   - searchable replay results
8. Click any replay result to open the Monaco Diff Viewer.
9. Show smart drift explanations and triage controls.
10. Open Reports to show drift trend over time.
11. Open PII Vault to show safe production capture controls.

## Example Production And Staging APIs

The mock API is included to demonstrate the capture and replay workflow without requiring an external service:

```text
infra/mock-checkout/server.js
```

Docker runs it twice:

```text
mock-checkout-prod      MOCK_MODE=prod
mock-checkout-staging   MOCK_MODE=staging
```

Example behavior:

```text
Production: price.amount = 49.0
Staging:    price.amount = "49.0"
```

That intentional difference creates drift during the local example flow.

## Traffic Proxy

The proxy forwards requests to the configured production service and records the response into DriftGuard. It is configured through environment variables for the target URL, DriftGuard backend URL, service name, API key, sampling rate, and maximum body size.

## API Endpoints

All `/api/**` endpoints require either:

```text
Authorization: Bearer <jwt>
```

or:

```text
X-API-Key: <service-api-key>
```

Public auth endpoints are excluded.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login and return JWT |
| `POST` | `/api/auth/register` | Public service registration alias |
| `POST` | `/api/services` | Register service and return generated API key |
| `GET` | `/api/services` | List services |
| `POST` | `/api/record/{serviceId}` | Record production snapshot |
| `GET` | `/api/baselines/{serviceId}` | List production snapshots |
| `GET` | `/api/baselines/{serviceId}/{id}` | Get snapshot detail |
| `DELETE` | `/api/baselines/{serviceId}/{id}` | Delete snapshot |
| `POST` | `/api/replay` | Start staging replay |
| `GET` | `/api/replay/{sessionId}` | Replay session status |
| `GET` | `/api/replay/{sessionId}/results` | Replay results |
| `GET` | `/api/replay/{sessionId}/results/{id}` | Single result with full diff |
| `PATCH` | `/api/replay/{sessionId}/results/{id}/triage` | Update drift triage |
| `POST` | `/api/replay/{sessionId}/promote` | Promote approved staging behavior |
| `GET` | `/api/replay/{sessionId}/promotions` | Promotion audit record |
| `POST` | `/api/ignore-rules/{serviceId}` | Add ignore rule |
| `GET` | `/api/ignore-rules/{serviceId}` | List ignore rules |
| `DELETE` | `/api/ignore-rules/{serviceId}/{id}` | Delete ignore rule |
| `POST` | `/api/redaction-rules/{serviceId}` | Add redaction rule |
| `GET` | `/api/redaction-rules/{serviceId}` | List redaction rules |
| `DELETE` | `/api/redaction-rules/{serviceId}/{id}` | Delete redaction rule |
| `GET` | `/api/reports/{serviceId}/timeline` | Drift timeline |
| `GET` | `/api/reports/{serviceId}/readiness` | Release readiness |
| `POST` | `/api/webhooks/deploy` | CI webhook trigger |
| `POST` | `/api/webhooks/deploy/gate` | Blocking deploy gate |
| `GET` | `/api/webhooks/deploy/{sessionId}/gate` | Poll gate status |
| `POST` | `/api/demo/capture/{serviceId}` | Capture mock production |
| `POST` | `/api/demo/replay/{serviceId}` | Replay against mock staging |
| `POST` | `/api/demo/run/{serviceId}` | Capture + replay demo flow |

WebSocket:

| Path | Purpose |
| --- | --- |
| `/ws/replay/{sessionId}` | Live replay progress events |

## Build Verification

Backend tests:

```powershell
cd backend
.\gradlew.bat test
```

Frontend typecheck and production build:

```powershell
cd frontend
npm install
npm run typecheck
npm run build
```

Validate Compose:

```powershell
docker compose config --quiet
```

## Database

Flyway migrations create:

- `services`
- `baselines`
- `replay_sessions`
- `replay_results`
- `ignore_rules`
- `redaction_rules`
- `baseline_promotions`
- `app_users`

The most important tables are:

```text
baselines       saved production responses
replay_results  staging responses plus diff output
```

## Security And Privacy Design

For real production use, DriftGuard should be deployed with:

- endpoint allowlist/blocklist
- traffic sampling
- PII redaction before storage
- sensitive header denylist
- payload size limits
- short retention policies
- role-based access control
- audit logging

The included implementation provides the key primitives: API keys, JWT login, sampling settings in the traffic proxy, and redaction rules.
