# SHINE Backend Operation Walkthrough

This explains what happens behind the scenes after a resident calls the SHINE Voice Report phone number or scans the QR code on the flyer.

## 1. Resident starts the report

The resident either:

- Calls `(555) 010-1234`, or
- Scans the QR code, which opens the phone dialer for that same number.

The QR code does not open a website. It starts a phone call.

## 2. Vapi answers the phone call

The phone number is connected to the Vapi voice agent currently configured for the Example Supportive Housing Property SHINE pilot.

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

This URL is hosted on Vercel.

## 5. Vercel receives the webhook

Vercel runs the backend code in `server.js` through the serverless API route in:

```text
api/vapi-webhook.js
```

Vercel receives the POST request from Vapi at:

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

## 10. Backend sends the email through Gmail SMTP

The backend uses Nodemailer and Gmail SMTP.

The key function is:

```text
sendIncidentEmail(report)
```

It reads these environment variables from Vercel:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=reports@example.org
SMTP_PASS=Gmail App Password
FROM_EMAIL=Example Supportive Housing Property Reports <reports@example.org>
MANAGEMENT_EMAILS=reports@example.org
```

The email currently goes to:

```text
reports@example.org
```

## 11. Gmail accepts and delivers the message

If the Gmail App Password is valid, Gmail accepts the email and returns a message ID.

A successful webhook response looks like:

```json
{
  "ok": true,
  "reportId": "call_test_12345",
  "messageId": "<...@gmail.com>"
}
```

## 12. Vapi receives success from the backend

The backend returns HTTP `200` to Vapi.

That means:

- Vapi reached the backend
- The backend parsed the report
- Gmail accepted the outgoing email

## 13. Management receives the report

The recipient inbox receives a plain-text incident report email.

For the current pilot, that inbox is:

```text
reports@example.org
```

For DISH management later, they can change the email destination by updating this Vercel environment variable:

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
{"ok":true,"service":"pacific-bay-inn-vapi-webhook"}
```

Send a test report:

```bash
curl -X POST https://your-backend-domain.example/vapi-webhook \
  -H "Content-Type: application/json" \
  --data-binary @test-payload.json
```

Expected result:

```json
{"ok":true,"reportId":"call_test_12345","messageId":"<...@gmail.com>"}
```

## 15. What can break

The main failure points are:

- Vapi phone number is not connected to the assistant.
- Vapi Server URL is missing or wrong.
- Vercel deployment protection is accidentally turned on.
- Gmail App Password is revoked or changed.
- `MANAGEMENT_EMAILS` is wrong.
- Vercel environment variables are missing.

## 16. Current verified status

As of the most recent check, the Vercel backend still works:

- `/health` returned HTTP `200`
- `/vapi-webhook` accepted test payloads
- A test email was successfully sent through Gmail SMTP
