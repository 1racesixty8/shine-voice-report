# SHINE Voice Report

SHINE Voice Report is an open-source voice-first incident reporting workflow for supportive housing communities.

Residents call a phone number or scan a flyer QR code, speak naturally to a Vapi voice assistant, and management receives a structured incident report by email after the call.

SHINE stands for **Supportive Housing Incident Navigation Engine**.

## Who this is for

This project is for supportive housing agencies, resident services teams, property managers, and community safety teams that want a lower-barrier way for residents to report concerns without filling out paper forms.

## How it works

1. A resident calls the published phone number or scans a QR code that opens the phone dialer.
2. Vapi answers the call with a voice assistant.
3. The assistant asks calm, structured questions about the incident.
4. When the call ends, Vapi sends an end-of-call webhook to the backend.
5. The backend extracts the summary, transcript, caller details, and structured fields.
6. The backend emails management a written incident report.

## What is included

```text
backend/       Node/Express webhook for Vapi end-of-call reports
vapi/          Example Vapi assistant prompt/configuration
flyer-assets/  Example flyer image template
docs/          Setup, operations, and adoption guides
```

## Requirements

- Vapi account
- Vapi/Twilio phone number connected to the assistant
- Hosting provider for the backend, such as Vercel, Render, or Railway
- Email sender account or SMTP provider
- Management recipient inbox or distribution list

## Quick start

1. Copy `backend/.env.example` to `.env` for local testing.
2. Fill in SMTP and report-recipient settings.
3. Deploy `backend/` to your hosting provider.
4. Set the deployed `/vapi-webhook` URL as the Vapi assistant or phone number Server URL.
5. Place a test call or post `backend/test-payload.json` to the webhook.
6. Confirm the report email arrives.

## Environment variables

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=reports@example.org
SMTP_PASS=REPLACE_WITH_APP_PASSWORD_OR_SMTP_SECRET
FROM_EMAIL="SHINE Voice Reports <reports@example.org>"
MANAGEMENT_EMAILS=manager@example.org
```

`MANAGEMENT_EMAILS` may contain one address or a comma-separated list.

## Safety and privacy

SHINE can process sensitive resident/community information. Agencies using it should:

- Use accounts owned by the agency, not a personal account.
- Never commit `.env` files or passwords.
- Avoid putting real transcripts or reports in public repositories.
- Confirm privacy, consent, retention, and incident-report policies with leadership.
- Keep the emergency disclaimer visible: if there is immediate danger, call 911 first.

## Customization

Each agency should customize:

- Property name
- Phone number
- Flyer design
- Vapi assistant prompt
- Report recipient inbox
- Emergency language
- Privacy/consent language
- Data retention workflow

## Documentation

- `docs/SETUP-GUIDE.md`
- `docs/BACKEND-OPERATION-WALKTHROUGH.md`
- `docs/CONFIGURATION-CHECKLIST.md`
- `docs/AGENCY-ADOPTION-GUIDE.md`

## License

MIT License. See `LICENSE`.
