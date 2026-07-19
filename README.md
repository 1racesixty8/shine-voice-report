# SHINE Voice Report

SHINE Voice Report is a voice-first incident reporting system for supportive housing communities. It gives residents a lower-barrier way to report a concern by phone instead of requiring them to complete a paper or online form.

A resident calls the published phone number, or scans a QR code that opens the phone dialer. A Vapi voice assistant asks calm, structured questions and captures the information needed for an incident report. After the call, the production backend prepares a written report and emails it to the approved management recipients through Resend.

SHINE stands for **Supportive Housing Incident Navigation Engine**.

## Who this is for

This project is intended for supportive housing agencies, resident services teams, property managers, and community safety teams that need an accessible way for residents to report non-emergency concerns.

SHINE is not an emergency service. If anyone is in immediate danger, call 911 or the appropriate local emergency number first.

## Architecture summary

The production workflow has four main parts:

1. **Vapi voice agent** — Answers the resident's call, follows the approved SHINE conversation, and produces a transcript, summary, structured incident fields, and call metadata.
2. **Webhook backend** — Vapi sends an end-of-call webhook to the production deployment. The backend confirms that the event is relevant, extracts the report fields, and uses Vapi's authenticated API when it needs protected call artifacts such as the recording.
3. **Email delivery through Resend** — The backend formats a readable incident report and sends it from the approved SHINE sender domain to the configured management inboxes.
4. **Production hosting** — An agency-controlled Node-compatible host runs the webhook and health endpoints and stores the server-side environment variables.

```text
Resident phone call or QR code
        |
        v
Vapi voice assistant
        |
        | end-of-call webhook
        v
Production webhook backend
        |
        | authenticated Vapi API request when protected artifacts are needed
        v
Structured incident report + recording access
        |
        | Resend API
        v
Approved management email recipients
```

### Webhook flow

1. A resident calls the Vapi-connected phone number.
2. The Vapi assistant collects the incident details and ends the call.
3. Vapi sends an `end-of-call-report` event to the deployed webhook URL.
4. The backend extracts the summary, transcript, caller details, timestamps, and structured report fields.
5. When the recording or another protected call artifact is needed, the backend requests it from Vapi using server-side authentication. Public recording URLs must not be treated as permanent storage.
6. The backend creates the incident-report email and sends it through Resend.
7. The production host returns a success or failure response to Vapi and records operational logs without intentionally exposing secrets.

## Repository structure

```text
backend/               Node/Express webhook and deployment configuration
backend/api/           Legacy serverless entry points retained for compatibility
vapi/                  Example Vapi assistant configuration
flyer-assets/          Example resident-facing flyer asset
docs/                  Setup, operations, and agency adoption guides
```

Important entry points:

- `backend/server.js` contains the webhook processing and report formatting logic.
- `backend/api/vapi-webhook.js` is a legacy serverless adapter for the webhook.
- `backend/api/health.js` exposes the health check.
- `backend/render.yaml` is an example host configuration; adapt deployment settings to the approved production provider.
- `vapi/vapi-assistant-config.example.json` is a redacted example, not a production export.

## Implementation status

The `main` branch contains an older public reference backend. The current SHINE production standard uses Resend for email delivery and Vapi's authenticated API for protected recording access.

This README documents the current production handoff architecture. Before deploying this repository as the operating instance, confirm that the Resend and authenticated Vapi changes are present in the deployment branch. Do not deploy the older email path as the production configuration.

## Environment variables and API keys

Store all secrets in the production host's encrypted environment settings or a local untracked `.env` file. Never commit real values, copy them into documentation, or expose them in browser-side code.

### Production handoff variables

| Variable | Purpose | Secret? |
| --- | --- | --- |
| `VAPI_API_KEY` | Server-side credential for retrieving protected Vapi call data and recording artifacts | Yes |
| `RESEND_API_KEY` | Server-side credential used to send incident-report emails through Resend | Yes |
| `FROM_EMAIL` | Verified SHINE sender name and email address | No, but configure privately |
| `MANAGEMENT_EMAILS` | One approved recipient or a comma-separated list of management recipients | No, but contains operational contact data |
| `VAPI_WEBHOOK_SECRET` | Optional shared secret used to validate incoming Vapi webhook requests when webhook authentication is enabled | Yes |
| `PORT` | Local development port; the production host may supply its own runtime port | No |
| `NODE_ENV` | Runtime mode such as `production` | No |

Example names only:

```dotenv
VAPI_API_KEY=replace_with_vapi_server_key
RESEND_API_KEY=replace_with_resend_server_key
FROM_EMAIL="SHINE Voice Report <reports@example.org>"
MANAGEMENT_EMAILS=manager@example.org
VAPI_WEBHOOK_SECRET=replace_if_webhook_authentication_is_enabled
PORT=3000
NODE_ENV=production
```

## Production deployment notes

1. Deploy the `backend/` application to the agency-approved Node-compatible production host.
2. Add the required environment variables in the host's encrypted settings for each environment where they are appropriate.
3. Confirm that the deployment exposes:
   - `GET /health`
   - `POST /vapi-webhook`
4. Set the Vapi assistant or phone number server URL to the production webhook address.
5. Keep host-level access controls from blocking Vapi's webhook, or configure a supported authenticated path.
6. Place a controlled test call and confirm the webhook succeeds, the report email is delivered through Resend, and protected recording access works through the authenticated Vapi API.
7. Review production logs for failures, but do not log API keys, complete resident reports, or recording URLs unnecessarily.
8. Treat Preview deployments as test systems and do not connect them to the live resident phone number unless explicitly intended.

## Safety, privacy, and operations

SHINE may process sensitive resident and community information. Any agency operating an instance should:

- Use agency-controlled Vapi, production hosting, Resend, domain, and phone accounts.
- Limit report recipients to approved staff.
- Keep transcripts, recordings, API keys, and resident reports out of the repository.
- Define privacy, consent, retention, deletion, escalation, and emergency procedures before launch.
- Use authenticated Vapi API requests for protected artifacts instead of relying on old public recording links.
- Test changes with fictional data before using them with residents.
- Keep the emergency disclaimer clear: SHINE does not replace 911 or emergency services.

## Ownership and intellectual property

Race Anderson retains all SHINE Voice Report intellectual property; DISH holds a non-exclusive license to operate this instance per the SHINE Voice Report - DISH Agreement.

The repository's published license applies to the code released here. The SHINE name, operating materials, private configurations, agency data, production credentials, and agreement-specific rights must be handled according to their applicable ownership and contract terms.

## Additional documentation

- `docs/SETUP-GUIDE.md`
- `docs/BACKEND-OPERATION-WALKTHROUGH.md`
- `docs/CONFIGURATION-CHECKLIST.md`
- `docs/AGENCY-ADOPTION-GUIDE.md`
- `SECURITY.md`
- `CONTRIBUTING.md`

## License

See `LICENSE` for the license covering the code published in this repository.
