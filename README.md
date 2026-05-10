# DriftGuard

DriftGuard is a full-stack production behavior diff tool. It saves safe, sampled examples of how an API behaves today, replays the same requests against staging, and shows exactly what changed before the new version reaches customers.

The project is built as an interview-ready production-safety platform, not just a CRUD dashboard. It includes traffic capture, replay, JSON diffing, WebSocket progress, release readiness, deploy-gate simulation, endpoint risk scoring, PII redaction, and a Monaco side-by-side diff viewer.

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
                          |   localhost:3000     |
                          +----------+-----------+
                                     |
                              REST + WebSocket
                                     |
                                     v
+------------------+       +----------------------+       +------------------+
| Traffic Proxy    | ----> | Spring Boot Backend  | ----> | PostgreSQL       |
| localhost:8083   |       | localhost:8080       |       | baselines/results|
+--------+---------+       +----------+-----------+       +------------------+
         |                            |
         | forwards request           | live replay state
         v                            v
+------------------+          +------------------+
| Mock Production  |          | Redis            |
| localhost:8081   |          | replay progress  |
+------------------+          +------------------+

Replay phase:

+----------------------+       +------------------+
| Spring Boot Backend  | ----> | Mock Staging     |
| replays saved calls  |       | localhost:8082   |
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

In the demo, production and staging are simulated by `infra/mock-checkout/server.js`.

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

In the demo, snapshots come from:

- seeded data in `DemoDataSeeder.java`
- mock production API at `localhost:8081`
- traffic proxy at `localhost:8083`

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

## Running Locally

Prerequisites:

- Docker Desktop
- Java 21 if running backend locally
- Node.js 18+ if running frontend locally

Start the full stack:

```powershell
docker compose up --build
```

Open:

```text
http://localhost:3000
```

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

## Local URLs

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8080 |
| Mock production API | http://localhost:8081 |
| Mock staging API | http://localhost:8082 |
| Traffic proxy | http://localhost:8083 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Demo Walkthrough

1. Open `http://localhost:3000`.
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

## Demo Production And Staging APIs

The mock API is manually written for the interview demo:

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

That intentional difference creates drift for the demo.

## Traffic Proxy Demo

Send requests through the proxy:

```powershell
curl.exe http://localhost:8083/checkout/cart
curl.exe http://localhost:8083/checkout/price/101
curl.exe -X POST http://localhost:8083/checkout/order `
  -H "Content-Type: application/json" `
  -d "{\"cartId\":\"cart_123\"}"
```

The proxy forwards to mock production and records the response into DriftGuard.

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

## Useful Curl Commands

List services:

```powershell
curl.exe -H "X-API-Key: dg_demo_checkout_api_key" http://localhost:8080/api/services
```

Start replay:

```powershell
curl.exe -X POST http://localhost:8080/api/replay `
  -H "Content-Type: application/json" `
  -H "X-API-Key: dg_demo_checkout_api_key" `
  -d "{\"serviceId\":\"SERVICE_ID\",\"stagingUrl\":\"http://mock-checkout-staging:8081\"}"
```

Run deploy gate:

```powershell
curl.exe -X POST http://localhost:8080/api/webhooks/deploy/gate `
  -H "Content-Type: application/json" `
  -H "X-API-Key: dg_demo_checkout_api_key" `
  -d "{\"serviceId\":\"SERVICE_ID\",\"stagingUrl\":\"http://mock-checkout-staging:8081\",\"failOnBreaking\":true,\"maxWaitSeconds\":90}"
```

## Local Development

Backend:

```powershell
cd backend
.\gradlew.bat test
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Production frontend build:

```powershell
cd frontend
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

The demo includes the key primitives: API keys, JWT login, sampling settings in the traffic proxy, and redaction rules.

## Interview Talking Points

- DriftGuard uses real production behavior as test cases, not only manually written tests.
- It tests staging before release by replaying saved production requests.
- It catches behavioral drift, not just schema drift.
- It classifies breaking, warning, and performance changes.
- It explains risky changes in human-readable language.
- It has CI/CD deploy gate behavior that can block unsafe releases.
- It handles noisy fields with ignore rules.
- It handles sensitive fields with redaction/hash/drop rules.
- PostgreSQL stores durable snapshots and results; Redis tracks live replay state.
- WebSockets make replay progress visible in real time.
- Endpoint risk score helps teams fix the highest-impact drift first.

## Current Demo Credentials

```text
Email:    demo@driftguard.local
Password: driftguard
API key:  dg_demo_checkout_api_key
```
