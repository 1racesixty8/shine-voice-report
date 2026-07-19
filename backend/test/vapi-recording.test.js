import assert from 'node:assert/strict';
import test from 'node:test';

import { app, buildEmailBody, downloadVapiResource, isWebhookAuthorized, sendIncidentEmail } from '../server.js';

test('downloads a Vapi recording with bearer authentication', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url: String(url), options };
    return new Response(Buffer.from('audio-data'), {
      status: 200,
      headers: {
        'content-type': 'audio/wav',
        'content-length': '10'
      }
    });
  };

  const result = await downloadVapiResource(
    {
      url: 'https://storage.vapi.ai/calls/call_123/recording.wav',
      filename: 'incident.wav',
      endpoint: 'stereo-recording'
    },
    { apiKey: 'test-private-key', callId: 'call_123', fetchImpl }
  );

  assert.equal(request.url, 'https://api.vapi.ai/call/call_123/stereo-recording');
  assert.equal(request.options.headers.Authorization, 'Bearer test-private-key');
  assert.equal(request.options.headers.Accept, 'audio/*, video/*, application/octet-stream');
  assert.equal(request.options.redirect, 'follow');
  assert.equal(result.filename, 'incident.wav');
  assert.equal(result.contentType, 'audio/wav');
  assert.equal(result.content.toString(), 'audio-data');
});

test('classifies Vapi authentication failures', async () => {
  await assert.rejects(
    downloadVapiResource(
      { url: 'https://storage.vapi.ai/calls/call_123/recording.wav' },
      {
        apiKey: 'expired-key',
        callId: 'call_123',
        fetchImpl: async () => new Response('', { status: 401 })
      }
    ),
    (error) => error.code === 'vapi_authentication_failed' && error.status === 401
  );
});

test('requires a call ID for protected recording downloads', async () => {
  await assert.rejects(
    downloadVapiResource(
      { url: 'https://example.com/recording.wav' },
      { apiKey: 'test-private-key', fetchImpl: async () => new Response('') }
    ),
    (error) => error.code === 'missing_vapi_call_id'
  );
});

test('email body does not expose the protected recording URL', () => {
  const report = {
    reportId: 'call_123',
    reportedAt: new Date('2026-07-14T12:00:00Z'),
    incidentType: 'General Incident',
    structuredData: {},
    recording: {
      url: 'https://storage.vapi.ai/calls/call_123/recording.wav',
      filename: 'recording.wav',
      contentType: 'audio/wav'
    },
    recordingDelivery: 'Attached securely using the Vapi API.'
  };

  const body = buildEmailBody(report);

  assert.match(body, /Attached securely using the Vapi API/);
  assert.doesNotMatch(body, /storage\.vapi\.ai/);
});

test('sends incident reports through the Resend API', async () => {
  const previousFrom = process.env.FROM_EMAIL;
  const previousRecipients = process.env.MANAGEMENT_EMAILS;
  process.env.FROM_EMAIL = 'SHINE Voice Report <reports@example.org>';
  process.env.MANAGEMENT_EMAILS = 'manager@example.org, backup@example.org';

  let request;
  const resendClient = {
    emails: {
      send: async (payload) => {
        request = payload;
        return { data: { id: 'resend-message-id' }, error: null };
      }
    }
  };

  try {
    const result = await sendIncidentEmail({
      reportId: 'call_456',
      reportedAt: new Date('2026-07-19T12:00:00Z'),
      incidentType: 'General Incident',
      structuredData: {}
    }, { resendClient });

    assert.equal(result.messageId, 'resend-message-id');
    assert.equal(request.from, process.env.FROM_EMAIL);
    assert.deepEqual(request.to, ['manager@example.org', 'backup@example.org']);
    assert.match(request.subject, /Incident Report/);
  } finally {
    if (previousFrom === undefined) delete process.env.FROM_EMAIL;
    else process.env.FROM_EMAIL = previousFrom;
    if (previousRecipients === undefined) delete process.env.MANAGEMENT_EMAILS;
    else process.env.MANAGEMENT_EMAILS = previousRecipients;
  }
});


function requestWithHeaders(headers = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value])
  );
  return {
    get(name) {
      return normalized[name.toLowerCase()];
    }
  };
}

test('rejects a webhook request with a missing secret', () => {
  assert.equal(isWebhookAuthorized(requestWithHeaders(), 'expected-secret'), false);
});

test('rejects a webhook request with an invalid secret', () => {
  const request = requestWithHeaders({ 'x-vapi-secret': 'wrong-secret' });
  assert.equal(isWebhookAuthorized(request, 'expected-secret'), false);
});

test('accepts a webhook request with the x-vapi-secret header', () => {
  const request = requestWithHeaders({ 'x-vapi-secret': 'expected-secret' });
  assert.equal(isWebhookAuthorized(request, 'expected-secret'), true);
});

test('accepts a webhook request with bearer authentication', () => {
  const request = requestWithHeaders({ authorization: 'Bearer expected-secret' });
  assert.equal(isWebhookAuthorized(request, 'expected-secret'), true);
});

test('webhook route enforces the configured shared secret', async (t) => {
  const previousSecret = process.env.VAPI_WEBHOOK_SECRET;
  process.env.VAPI_WEBHOOK_SECRET = 'expected-secret';

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => {
    server.close();
    if (previousSecret === undefined) delete process.env.VAPI_WEBHOOK_SECRET;
    else process.env.VAPI_WEBHOOK_SECRET = previousSecret;
  });

  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/vapi-webhook`;
  const payload = JSON.stringify({ message: { type: 'status-update' } });

  const unauthorized = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload
  });
  assert.equal(unauthorized.status, 401);

  const authorized = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-vapi-secret': 'expected-secret'
    },
    body: payload
  });
  assert.equal(authorized.status, 202);
});
