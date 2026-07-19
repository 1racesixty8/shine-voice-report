# SHINE Backend Operation Walkthrough

This explains what happens behind the scenes after a resident calls the SHINE Voice Report phone number or scans the QR code on the flyer.

## 1. Resident starts the report

The resident either:

- Calls `(555) 010-1234`, or
- Scans the QR code, which opens the phone dialer for that same number.

The QR code does not open a website. It starts a phone call.

## 2. Vapi answers the phone call

The phone number is connected to the agency's Vapi voice agent for the SHINE workflow.

Vapi handles:

- Answering the call
- Speaking the first message
- Asking one question at a time
- Recording/transcribing the conversation
- Producing an end-of-call report when the call ends

## 3. Vapi collects incident details

During the call, the assistant tries to collect:

- Caller name, if they are comfortable sharing it
- Resident/staff/visitor role
- Unit or callback information
- Exact property location
- What happened
- When it happened
- Whether anyone is injured or in immediate danger
- Urgency level
- People involved
- Staff or outside agencies already contacted
- Any extra details useful to management

If the caller describes immediate danger, the assistant should tell them to call 911 first.

## 4. Call ends and Vapi creates a webhook event

When the call ends, Vapi sends an `end-of-call-report` event to the backend webhook URL.

Current webhook URL:

```text
https://your-backend-domain.example/vapi-webhook
```

This URL is hosted on the agency-approved production platform.

## 5. The production host receives the webhook

The production host runs the backend code in `server.js` and exposes the webhook route:

```text
POST /vapi-webhook
```

The host receives the POST request from Vapi at:

```text
POST /vapi-webhook
```

The route is publicly reachable so Vapi can call it.

## 6. Backend ignores non-final events

The backend checks the incoming event type.

If the event is not:

```text
end-of-call-report
```

Then the backend returns HTTP `202` and ignores it.

This prevents emails from being sent for partial status updates or in-progress call events.

## 7. Backend extracts the incident report

For a real end-of-call report, the backend extracts details from the Vapi payload.

The key function is:

```text
extractReport(payload)
```

It looks for useful fields in several possible Vapi payload locations, including:

- `message.call`
- `message.artifact`
- `message.analysis.structuredData`
- `call.analysis.structuredData`
- `artifact.transcript`

This makes the backend more tolerant if Vapi changes where it places transcript or structured data.

## 8. Backend formats the email subject

The backend builds a subject like:

```text
Example Supportive Housing Property Incident Report - Jun 10, 2026 - General Incident
```

The key function is:

```text
buildSubject(report)
```

## 9. Backend formats the email body

The backend creates a plain-text incident report with sections for:

- Report ID
- Date reported
- Call start/end time
- Caller phone number
- Reporter information
- Incident details
- Incident description
- Full transcript
- Follow-up priority
- Raw structured data

The key function is:

```text
buildEmailBody(report)
```

## 10. Backend sends the email through Resend

The production backend uses the Resend API and the approved SHINE sending domain.

The key function is:

```text
sendIncidentEmail(report)
```

It reads these environment variables from the production host's encrypted settings:

```text
RESEND_API_KEY=replace_with_resend_server_key
FROM_EMAIL=Example Supportive Housing Property Reports <reports@example.org>
MANAGEMENT_EMAILS=reports@example.org
VAPI_API_KEY=replace_with_vapi_server_key
VAPI_WEBHOOK_SECRET=replace_with_a_random_shared_secret
ATTACH_CALL_RECORDINGS=true
VAPI_MAX_RECORDING_BYTES=20971520
```

The email currently goes to:

```text
reports@example.org
```

## 11. Resend accepts and delivers the message

If the Resend API key and verified sender are valid, Resend accepts the email and returns a message ID.

A successful webhook response looks like:

```json
{
  "ok": true,
  "reportId": "call_test_12345",
  "messageId": "resend-message-id"
}
```

## 12. Vapi receives success from the backend

The backend returns HTTP `200` to Vapi.

That means:

- Vapi reached the backend
- The backend parsed the report
- Resend accepted the outgoing email

## 13. Management receives the report

The recipient inbox receives a plain-text incident report email.

For local examples, that inbox is:

```text
reports@example.org
```

Each agency can change the email destination by updating this hosting environment variable:

```text
MANAGEMENT_EMAILS=their-management-email@example.com
```

No code change is required.

## 14. How to test the backend

Health check:

```bash
curl https://your-backend-domain.example/health
```

Expected result:

```json
{"ok":true,"service":"shine-voice-report-webhook"}
```

Send a test report:

```bash
curl -X POST https://your-backend-domain.example/vapi-webhook \
  -H "Content-Type: application/json" \
  -H "x-vapi-secret: YOUR_WEBHOOK_SECRET" \
  --data-binary @test-payload.json
```

Expected result:

```json
{"ok":true,"reportId":"call_test_12345","messageId":"resend-message-id"}
```

## 15. What can break

The main failure points are:

- Vapi phone number is not connected to the assistant.
- Vapi Server URL is missing or wrong.
- Host-level access controls block Vapi from reaching the webhook.
- The Resend API key is missing, revoked, or invalid.
- The `FROM_EMAIL` sender has not been verified in Resend.
- `MANAGEMENT_EMAILS` is wrong.
- Production environment variables are missing.

## 16. Local validation status

Before publishing this template, these local checks were completed:

- `/health` returned HTTP `200`
- `/vapi-webhook` accepted test payloads
- Sample report formatting was verified
