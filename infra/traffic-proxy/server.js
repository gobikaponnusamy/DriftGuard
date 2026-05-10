import http from 'node:http';
import { URL } from 'node:url';

const port = Number(process.env.PORT ?? 8083);
const targetUrl = required('TARGET_URL');
const driftguardUrl = required('DRIFTGUARD_URL').replace(/\/$/, '');
const apiKey = required('DRIFTGUARD_API_KEY');
const serviceName = process.env.DRIFTGUARD_SERVICE_NAME ?? 'checkout-api';
const sampleRate = clamp(Number(process.env.TRAFFIC_PROXY_SAMPLE_RATE ?? '1'), 0, 1);
const maxBodyBytes = Math.max(0, Number(process.env.TRAFFIC_PROXY_MAX_BODY_BYTES ?? '262144'));
let serviceId = process.env.DRIFTGUARD_SERVICE_ID ?? '';

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const requestBody = await readBody(req);
  const incomingUrl = new URL(req.url ?? '/', targetUrl);
  const requestHeaders = sanitizeHeaders(req.headers);

  try {
    const upstream = await fetch(incomingUrl, {
      method: req.method,
      headers: requestHeaders,
      body: requestBody.length > 0 && req.method !== 'GET' && req.method !== 'HEAD' ? requestBody : undefined,
      redirect: 'manual',
    });
    const responseBytes = Buffer.from(await upstream.arrayBuffer());
    const responseHeaders = Object.fromEntries(upstream.headers.entries());

    res.writeHead(upstream.status, responseHeaders);
    res.end(responseBytes);

    if (shouldRecord()) {
      void recordBaseline({
        method: req.method ?? 'GET',
        path: incomingUrl.pathname + incomingUrl.search,
        requestHeaders,
        requestBody: bodyForStorage(requestBody),
        responseStatus: upstream.status,
        responseHeaders,
        responseBody: bodyForStorage(responseBytes),
        responseTimeMs: Date.now() - started,
      });
    }
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'UPSTREAM_UNAVAILABLE', message: String(error.message ?? error) }));
  }
});

server.listen(port, () => {
  console.log(`DriftGuard traffic proxy listening on ${port}, forwarding to ${targetUrl}`);
});

async function recordBaseline(payload) {
  try {
    const id = await resolveServiceId();
    const response = await fetch(`${driftguardUrl}/api/record/${id}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.error(`DriftGuard record failed: ${response.status} ${await response.text()}`);
    }
  } catch (error) {
    console.error(`DriftGuard record failed: ${error.message ?? error}`);
  }
}

async function resolveServiceId() {
  if (serviceId) {
    return serviceId;
  }
  const response = await fetch(`${driftguardUrl}/api/services`, {
    headers: { 'x-api-key': apiKey },
  });
  if (!response.ok) {
    throw new Error(`Unable to resolve service id: ${response.status}`);
  }
  const body = await response.json();
  const service = body.data?.find((entry) => entry.name === serviceName) ?? body.data?.[0];
  if (!service?.id) {
    throw new Error(`Service not found: ${serviceName}`);
  }
  serviceId = service.id;
  return serviceId;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sanitizeHeaders(headers) {
  const clean = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (['host', 'connection', 'content-length'].includes(lower)) {
      continue;
    }
    clean[lower] = Array.isArray(value) ? value.join(',') : String(value ?? '');
  }
  return clean;
}

function shouldRecord() {
  return sampleRate >= 1 || Math.random() < sampleRate;
}

function bodyForStorage(bytes) {
  if (!bytes.length) {
    return null;
  }
  if (maxBodyBytes === 0) {
    return '[body omitted by proxy limit]';
  }
  if (bytes.length > maxBodyBytes) {
    return bytes.subarray(0, maxBodyBytes).toString('utf8') + '\n[truncated by proxy]';
  }
  return bytes.toString('utf8');
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) {
    return max;
  }
  return Math.min(max, Math.max(min, value));
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}
