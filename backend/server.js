import 'dotenv/config';
import express from 'express';
import { Resend } from 'resend';
import fs from 'node:fs/promises';
import process from 'node:process';
import { timingSafeEqual } from 'node:crypto';

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_MAX_RECORDING_BYTES = 20 * 1024 * 1024;
const VAPI_RECORDING_ENDPOINTS = new Set([
  'mono-recording',
  'stereo-recording',
  'customer-recording',
  'assistant-recording',
  'video-recording'
]);

app.use(express.json({ limit: '2mb' }));
app.use(express.static(process.cwd()));

function firstPresent(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') || '';
}

function asText(value) {
  if (value === undefined || value === null || value === '') return 'Not provided';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not provided';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function filenameFromUrl(value) {
  if (!value) return '';

  try {
    const url = new URL(value);
    const filename = url.pathname.split('/').filter(Boolean).pop();
    return filename ? decodeURIComponent(filename) : '';
  } catch {
    return String(value).split(/[\\/]/).filter(Boolean).pop() || '';
  }
}

function normalizeRecordingSource(source) {
  if (!source) return null;

  if (typeof source === 'string') {
    return {
      url: source,
      filename: filenameFromUrl(source)
    };
  }

  if (typeof source !== 'object' || Array.isArray(source)) return null;

  const url = firstPresent(
    source.url,
    source.recordingUrl,
    source.stereoRecordingUrl,
    source.monoRecordingUrl,
    source.href,
    source.path
  );

  if (!url) return null;

  return {
    url,
    filename: firstPresent(source.filename, source.fileName, source.name, filenameFromUrl(url)),
    contentType: firstPresent(source.contentType, source.mimeType, source.type),
    durationSeconds: firstPresent(source.durationSeconds, source.duration, source.lengthSeconds)
  };
}

function extractRecording(payload) {
  const message = payload.message || {};
  const call = message.call || payload.call || {};
  const artifact = message.artifact || payload.artifact || call.artifact || {};
  const candidates = [
    [artifact.recording, 'mono-recording'],
    [artifact.recordingUrl, 'mono-recording'],
    [artifact.stereoRecordingUrl, 'stereo-recording'],
    [artifact.monoRecordingUrl, 'mono-recording'],
    [artifact.audioUrl, 'mono-recording'],
    [artifact.audio, 'mono-recording'],
    [artifact.streamRecordingUrl, 'mono-recording'],
    [artifact.videoRecordingUrl, 'video-recording'],
    [call.recordingUrl, 'mono-recording'],
    [call.stereoRecordingUrl, 'stereo-recording'],
    [call.monoRecordingUrl, 'mono-recording'],
    [call.streamRecordingUrl, 'mono-recording'],
    [call.videoRecordingUrl, 'video-recording'],
    [message.recordingUrl, 'mono-recording'],
    [message.stereoRecordingUrl, 'stereo-recording'],
    [message.monoRecordingUrl, 'mono-recording'],
    [message.streamRecordingUrl, 'mono-recording'],
    [message.videoRecordingUrl, 'video-recording'],
    [payload.recordingUrl, 'mono-recording']
  ];

  for (const [candidate, endpoint] of candidates) {
    const recording = normalizeRecordingSource(candidate);
    if (recording) return { ...recording, endpoint };
  }

  return null;
}

class VapiResourceError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'VapiResourceError';
    this.code = code;
    this.status = status;
  }
}

async function downloadVapiResource(resource, options = {}) {
  const apiKey = options.apiKey || process.env.VAPI_API_KEY;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const maxBytes = options.maxBytes || Number(process.env.VAPI_MAX_RECORDING_BYTES) || DEFAULT_MAX_RECORDING_BYTES;
  const callId = firstPresent(options.callId, resource.callId);
  const endpoint = firstPresent(resource.endpoint, 'mono-recording');

  if (!apiKey) {
    throw new VapiResourceError('missing_vapi_api_key', 'VAPI_API_KEY is required to download protected Vapi recordings.');
  }
  if (!callId) {
    throw new VapiResourceError('missing_vapi_call_id', 'A Vapi call ID is required to download a protected recording.');
  }
  if (!VAPI_RECORDING_ENDPOINTS.has(endpoint)) {
    throw new VapiResourceError('invalid_vapi_recording_endpoint', 'The requested Vapi recording type is not supported.');
  }

  const url = new URL(`/call/${encodeURIComponent(callId)}/${endpoint}`, 'https://api.vapi.ai');

  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'audio/*, video/*, application/octet-stream'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const code = response.status === 401 || response.status === 403
      ? 'vapi_authentication_failed'
      : response.status === 404 || response.status === 410
        ? 'vapi_resource_unavailable'
        : 'vapi_download_failed';
    throw new VapiResourceError(code, `Vapi recording download failed with HTTP ${response.status}.`, response.status);
  }

  const contentLength = Number(response.headers.get('content-length'));
  if (contentLength && contentLength > maxBytes) {
    throw new VapiResourceError('vapi_recording_too_large', `Vapi recording exceeds the ${maxBytes}-byte attachment limit.`);
  }

  const content = Buffer.from(await response.arrayBuffer());
  if (content.byteLength > maxBytes) {
    throw new VapiResourceError('vapi_recording_too_large', `Vapi recording exceeds the ${maxBytes}-byte attachment limit.`);
  }

  return {
    content,
    filename: resource.filename || `${callId}-${endpoint}.wav`,
    contentType: resource.contentType || response.headers.get('content-type') || 'application/octet-stream'
  };
}

function extractWebhookSecret(req) {
  const directSecret = req.get('x-vapi-secret');
  if (directSecret) return directSecret.trim();

  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function isWebhookAuthorized(req, expectedSecret = process.env.VAPI_WEBHOOK_SECRET) {
  if (!expectedSecret) return true;

  const receivedSecret = extractWebhookSecret(req);
  if (!receivedSecret) return false;

  const expected = Buffer.from(expectedSecret);
  const received = Buffer.from(receivedSecret);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function formatDate(value) {
  if (!value) return 'Not provided';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Los_Angeles'
  }).format(date);
}

function normalizeStructuredData(payload) {
  const message = payload.message || {};
  const call = message.call || payload.call || {};
  const artifact = message.artifact || payload.artifact || call.artifact || {};
  const candidates = [
    message.analysis?.structuredData,
    call.analysis?.structuredData,
    artifact.structuredOutputs,
    artifact.structuredOutput,
    message.structuredData,
    call.structuredData
  ];

  return candidates.reduce((merged, item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return { ...merged, ...item };
    }
    return merged;
  }, {});
}

function extractReport(payload) {
  const message = payload.message || {};
  const call = message.call || payload.call || {};
  const customer = call.customer || message.customer || payload.customer || {};
  const artifact = message.artifact || payload.artifact || call.artifact || {};
  const structuredData = normalizeStructuredData(payload);

  const summary = firstPresent(
    message.summary,
    message.analysis?.summary,
    call.analysis?.summary,
    structuredData.summary,
    structuredData.description,
    structuredData.incidentDescription
  );

  const transcript = firstPresent(
    message.transcript,
    artifact.transcript,
    call.artifact?.transcript,
    payload.transcript
  );

  const recording = extractRecording(payload);

  const incidentType = firstPresent(
    structuredData.incidentType,
    structuredData.typeOfIncident,
    structuredData.type,
    structuredData.category,
    'General Incident'
  );

  const reportedAt = new Date();
  const startedAt = firstPresent(call.startedAt, message.startedAt, payload.startedAt);
  const endedAt = firstPresent(call.endedAt, message.endedAt, payload.endedAt);

  return {
    reportId: firstPresent(call.id, message.callId, payload.callId, `manual-${reportedAt.getTime()}`),
    reportedAt,
    startedAt,
    endedAt,
    callerPhone: firstPresent(customer.number, customer.phoneNumber, message.customer?.number),
    reporterName: firstPresent(structuredData.tenantName, structuredData.reporterName, structuredData.name),
    reporterRole: firstPresent(structuredData.role, structuredData.reporterRole, structuredData.personType),
    unit: firstPresent(structuredData.unit, structuredData.unitNumber, structuredData.room, structuredData.callbackInfo),
    confidentialRequested: firstPresent(structuredData.confidentialRequested, structuredData.confidential, structuredData.anonymous),
    incidentDateTime: firstPresent(structuredData.incidentDateTime, structuredData.when, structuredData.timeOfIncident, structuredData.dateTime),
    location: firstPresent(structuredData.location, structuredData.locationInBuilding, structuredData.buildingLocation),
    incidentType,
    peopleInvolved: firstPresent(structuredData.peopleInvolved, structuredData.involvedParties, structuredData.whoWasInvolved),
    outsideAgencies: firstPresent(structuredData.outsideAgenciesContacted, structuredData.outsideAgency, structuredData.agenciesContacted),
    staffNotified: firstPresent(structuredData.staffNotified, structuredData.staffMembersContacted, structuredData.staffContacted),
    urgency: firstPresent(structuredData.urgency, structuredData.priority, structuredData.urgencyLevel),
    summary,
    transcript,
    recording,
    structuredData
  };
}

function buildSubject(report) {
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'America/Los_Angeles'
  }).format(report.reportedAt);
  return `Example Supportive Housing Property Incident Report - ${date} - ${report.incidentType || 'General Incident'}`;
}

function buildEmailBody(report) {
  const description = firstPresent(report.summary, report.structuredData.description, report.structuredData.incidentDescription);

  return `SHINE VOICE REPORT
123 Example Street
Example City, ST 00000

Report ID: ${asText(report.reportId)}
Date Reported: ${formatDate(report.reportedAt)}
Call Started: ${formatDate(report.startedAt)}
Call Ended: ${formatDate(report.endedAt)}
Caller Phone: ${asText(report.callerPhone)}

CALL AUDIO
Delivery: ${asText(report.recordingDelivery)}
Recording File: ${asText(report.recording?.filename)}
Recording Type: ${asText(report.recording?.contentType)}

YOUR VOICE MATTERS
This report was collected through the SHINE Voice Report incident reporting flow.

REPORTER INFORMATION
Name: ${asText(report.reporterName)}
Role: ${asText(report.reporterRole)}
Unit: ${asText(report.unit)}
Confidential Requested: ${asText(report.confidentialRequested)}

INCIDENT DETAILS
Incident Date/Time: ${asText(report.incidentDateTime)}
Location in Building: ${asText(report.location)}
Incident Type: ${asText(report.incidentType)}
People Involved: ${asText(report.peopleInvolved)}
Outside Agencies Contacted: ${asText(report.outsideAgencies)}
Staff Notified: ${asText(report.staffNotified)}

INCIDENT DESCRIPTION
${asText(description)}

FULL TRANSCRIPT
${asText(report.transcript)}

FOLLOW-UP
Status: Needs Review
Priority: ${asText(report.urgency || 'Standard')}

STRUCTURED DATA
${asText(report.structuredData)}
`;
}

function createResendClient() {
  const required = ['RESEND_API_KEY', 'FROM_EMAIL', 'MANAGEMENT_EMAILS'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing email environment variables: ${missing.join(', ')}`);
  }

  return new Resend(process.env.RESEND_API_KEY);
}

async function sendIncidentEmail(report, options = {}) {
  const resend = options.resendClient || createResendClient();
  const subject = buildSubject(report);

  const recipients = process.env.MANAGEMENT_EMAILS.split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (!recipients.length) throw new Error('MANAGEMENT_EMAILS must include at least one recipient.');

  console.log(`Sending incident report ${report.reportId} to ${recipients.join(', ')}`);

  const attachments = [];
  if (!report.recording?.url) {
    report.recordingDelivery = 'No recording was provided by Vapi.';
  } else if (process.env.ATTACH_CALL_RECORDINGS !== 'true') {
    report.recordingDelivery = 'Recording attachment is disabled.';
  } else if (/^https:\/\//i.test(report.recording.url)) {
    try {
      attachments.push(await downloadVapiResource(report.recording, { callId: report.reportId }));
      report.recordingDelivery = 'Attached securely using the Vapi API.';
    } catch (error) {
      report.recordingDelivery = 'Recording could not be attached; the written report is still complete.';
      console.error(`Vapi recording unavailable for report ${report.reportId}:`, {
        code: error.code || error.name,
        status: error.status,
        message: error.message
      });
    }
  } else {
    report.recordingDelivery = 'Recording path was not an authenticated Vapi HTTPS resource.';
  }

  const text = buildEmailBody(report);

  const { data, error } = await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: recipients,
    subject,
    text,
    attachments
  });

  if (error) {
    const resendError = new Error(error.message || 'Resend failed to send the incident report email.');
    resendError.name = 'ResendError';
    resendError.code = error.name || 'resend_error';
    resendError.response = JSON.stringify(error);
    throw resendError;
  }

  return { messageId: data?.id };
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'shine-voice-report-webhook', timestamp: new Date().toISOString() });
});

app.post('/vapi-webhook', async (req, res) => {
  if (!isWebhookAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized webhook request.' });
  }

  const type = req.body?.message?.type || req.body?.type;

  if (type !== 'end-of-call-report') {
    return res.status(202).json({ ok: true, ignored: true, type: type || 'unknown' });
  }

  try {
    const report = extractReport(req.body);
    const email = await sendIncidentEmail(report);
    res.json({ ok: true, reportId: report.reportId, messageId: email.messageId });
  } catch (error) {
    console.error('Failed to process Vapi webhook:', error);
    const detail = process.env.NODE_ENV === 'production'
      ? `${error.code || error.command || error.name || 'email_error'}: ${error.response || error.message || 'Unknown email failure'}`
      : (error.stack || error.message);
    res.status(500).json({ ok: false, error: 'Failed to send incident report email.', detail });
  }
});

async function runTestPayload() {
  const raw = await fs.readFile(new URL('./test-payload.json', import.meta.url), 'utf8');
  const payload = JSON.parse(raw);
  const report = extractReport(payload);
  console.log('Subject:\n' + buildSubject(report));
  console.log('\nRecording:\n' + JSON.stringify(report.recording, null, 2));
  console.log('\nEmail body:\n' + buildEmailBody(report));
}

const isVercel = Boolean(process.env.VERCEL);

if (process.argv.includes('--test-payload')) {
  runTestPayload().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`Example Supportive Housing Property Vapi webhook listening on port ${PORT}`);
  });
}

export {
  app,
  extractReport,
  buildSubject,
  buildEmailBody,
  sendIncidentEmail,
  downloadVapiResource,
  VapiResourceError,
  isWebhookAuthorized
};
