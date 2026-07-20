# SHINE hosting status

**Checked and secured on July 20, 2026**

## The short answer

**Decision: SHINE will keep using Vercel for hosting.** Vercel runs the live web address that receives completed call reports from Vapi. Resend handles the separate job of sending those reports by email.

Think of it this way: **Vercel receives and prepares the report; Resend delivers the email.** Resend does not replace the server that receives the call information.

The live webhook security update is now complete. Vapi sends a private credential with its report, and Vercel rejects requests that do not have the matching secret.

## What is on Vercel right now

The live Vercel address is:

`https://vapi-ai-incident-reporter-pacific-b.vercel.app`

It currently provides:

- `/vapi-webhook` — receives completed-call information from Vapi, turns it into a written incident report, and starts email delivery.
- `/health` — confirms that the backend is online.
- `/` — serves the older SHINE web page included with that Vercel project.

The live site responded successfully during this review, and its response headers identify Vercel as the host. The repository also contains `backend/vercel.json`, which routes those public addresses to the backend code.

The public documentation site is separate. GitHub Pages serves the repository's `docs` folder. GitHub Pages does **not** run the private webhook or send report emails.

## What uses Resend

The backend sends incident-report emails through the Resend API. It uses private settings for:

- the Resend API key;
- the approved SHINE sender address; and
- the management email recipient list.

Those settings must stay on the server and must never be placed in the public GitHub repository. Resend is the email delivery company only. It does not receive Vapi calls, run `/vapi-webhook`, or replace Vercel hosting.

## Is the current setup stable and secure?

**Yes. The current Vercel-to-Resend setup is online and now has the security lock from the latest GitHub code.**

The live health check passed. The production source uses Resend directly, and earlier end-to-end testing recorded a successful Resend delivery. On July 20, 2026, a new Vapi private server key and a separate webhook credential were created for production. The secured backend was then deployed to Vercel, and the public SHINE address was moved to that deployment.

The live checks now show the correct behavior:

- the health address returns `200`, meaning the service is online;
- a request with no secret returns `401 Unauthorized`;
- a request with the wrong secret returns `401 Unauthorized`; and
- a request with the correct Vapi credential is accepted.

This closes the known gap that could have allowed someone who discovered the webhook address to submit a fake report. The system is now in a reasonable state for the DISH handoff. The private keys must remain in Vapi and Vercel and must never be copied into public documents or GitHub files.

## Hosting decision

Vercel is approved as SHINE's current production host. The safe setup is active: Vercel stores the private webhook secret, Vapi sends the matching credential, and Resend delivers the report emails. No hosting move is needed for the DISH handoff.

## Future option only: leaving Vercel

There is no current plan to leave Vercel. If SHINE changes hosts in the future, the move would require these steps:

1. Choose another service that can run a Node web server. The repository includes `backend/render.yaml` as a starting example for Render, but there is no live Render service now.
2. Deploy the latest `main` branch from the `backend` folder, not the older local Vercel project.
3. Add the private server settings on the new host: `RESEND_API_KEY`, `FROM_EMAIL`, `MANAGEMENT_EMAILS`, `VAPI_API_KEY`, `VAPI_WEBHOOK_SECRET`, and the recording settings.
4. Test the new `/health` address. Confirm that a request without the webhook secret is rejected, then run one approved test call and confirm the report email and recording arrive correctly.
5. Change the Vapi assistant or phone-number Server URL to the new host's `/vapi-webhook` address, and configure Vapi to send the matching secret.
6. Monitor at least one real call. After the new host is proven, remove SHINE's private settings from Vercel and disable or delete the old Vercel project.
7. Check any QR codes or documents that use the old Vercel address. The phone-number QR code may not need a change, but any link that opens the old Vercel web page will.

## Recommended wording for the DISH handoff

Use this wording:

> SHINE uses Vercel to securely host the call-report webhook and Resend to send incident-report emails. The production webhook requires a private Vapi credential, and unsigned requests are rejected.

The current setup is working and secured. Vercel is the approved host for the current DISH handoff.
