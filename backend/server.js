import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import fs from 'node:fs/promises';
import process from 'node:process';

const app = express();
const PORT = process.env.PORT || 3000;

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

function createTransporter() {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL', 'MANAGEMENT_EMAILS'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing email environment variables: ${missing.join(', ')}`);
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendIncidentEmail(report) {
  const transporter = createTransporter();
  const subject = buildSubject(report);
  const text = buildEmailBody(report);

  const recipients = process.env.MANAGEMENT_EMAILS.split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (!recipients.length) throw new Error('MANAGEMENT_EMAILS must include at least one recipient.');

  console.log(`Sending incident report ${report.reportId} to ${recipients.join(', ')}`);

  return transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: recipients,
    subject,
    text
  });
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'shine-voice-report-webhook', timestamp: new Date().toISOString() });
});

app.post('/vapi-webhook', async (req, res) => {
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

export { app, extractReport, buildSubject, buildEmailBody };
