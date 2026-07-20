# SHINE Voice Report: current DISH handoff status

**Updated July 20, 2026**

## Current decision

SHINE will keep using Vercel for production hosting. There is no current plan to move the webhook to Render or another provider.

## What runs where

- **Vapi** answers the call, guides the resident through the report, and sends the completed call information to SHINE.
- **Vercel** securely receives the completed-call webhook, prepares the written incident report, and starts email delivery.
- **Resend** sends the incident-report email to the approved management recipient list.
- **GitHub Pages** hosts the public project documentation only. It does not receive calls or send reports.

## Security status

The production webhook security update was completed on July 20, 2026.

- Vapi has a valid private server key for protected call and recording access.
- Vapi sends a dedicated private credential with webhook requests.
- Vercel stores the matching webhook secret in its encrypted production settings.
- Requests with no secret or the wrong secret receive `401 Unauthorized`.
- The health endpoint is online and returns `200`.

Private keys and secrets are not included in this repository or in the DISH handoff documents.

## Email status

Production email uses the Resend API. It does not use Gmail SMTP, a Gmail app password, or the old `SMTP_*` settings.

The server-side email settings are:

- `RESEND_API_KEY`
- `FROM_EMAIL`
- `MANAGEMENT_EMAILS`

Changing the report recipients only requires updating `MANAGEMENT_EMAILS` in Vercel. It does not require a code change.

## Approved handoff wording

> SHINE uses Vercel to securely host the call-report webhook and Resend to send incident-report emails. Vapi sends a private credential with each completed-call report, and unsigned requests are rejected.

## Source of truth

Use the current `main` branch of the `shine-voice-report` GitHub repository and `SHINE_HOSTING_STATUS.md`. Older local handoff folders or ZIP files that mention Gmail SMTP, Gmail app passwords, or donating SHINE are outdated and should not be sent to DISH.
