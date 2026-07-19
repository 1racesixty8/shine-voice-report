# Agency Adoption Guide

This guide explains how another supportive housing agency can adapt SHINE Voice Report for its own property or portfolio.

## 1. Decide ownership

Assign owners for:

- Vapi account
- Phone number
- Backend hosting
- Resend account and verified sending domain
- Report recipient inbox
- Flyer approval
- Privacy and records-retention policy

## 2. Create the voice agent

Use `vapi/vapi-assistant-config.example.json` as a starting point. Customize the prompt for your agency, property, language needs, and escalation policy.

## 3. Connect a phone number

Buy or assign a phone number in Vapi/Twilio and route it to the assistant.

If you use a flyer QR code, encode the phone number as a `tel:` link so scanning opens the phone dialer.

## 4. Deploy the backend

Deploy the `backend/` folder to an agency-approved Node-compatible host.

The important public route is:

```text
/vapi-webhook
```

## 5. Configure email delivery

Use an agency-owned Resend account and a verified sending domain. Use a shared mailbox or distribution list for report recipients instead of a personal inbox.

Set:

```text
RESEND_API_KEY=replace_with_resend_server_key
FROM_EMAIL="SHINE Voice Reports <reports@example.org>"
MANAGEMENT_EMAILS=manager@example.org
VAPI_API_KEY=replace_with_vapi_server_key
VAPI_WEBHOOK_SECRET=replace_with_a_random_shared_secret
ATTACH_CALL_RECORDINGS=true
```

## 6. Connect Vapi to the backend

Set the assistant or phone number Server URL to:

```text
https://your-backend-domain.example/vapi-webhook
```

Configure Vapi's webhook request to send the same secret in the `x-vapi-secret` header, or as a Bearer authorization value.

## 7. Test before launch

Test:

- Phone number reaches the assistant
- Assistant asks the right questions
- End-of-call webhook fires
- Email arrives
- Approved recording attachment arrives through authenticated Vapi access
- Transcript and summary are useful
- 911 disclaimer is clear

## 8. Launch carefully

Start with a small pilot. Review reports manually. Adjust prompt wording and distribution lists before expanding.
