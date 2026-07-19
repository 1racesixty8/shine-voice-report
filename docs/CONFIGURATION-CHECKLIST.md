# SHINE Configuration Checklist

## Accounts

- [ ] Vapi account created and owned by management.
- [ ] Phone number purchased or assigned in Vapi/Twilio.
- [ ] Agency-controlled production hosting account created.
- [ ] Resend account and verified sending domain configured.
- [ ] Resend API key created and stored only in the production host's encrypted environment settings.

## Vapi

- [ ] Import or recreate the assistant prompt from `vapi/vapi-assistant-config.example.json`.
- [ ] Connect the phone number to the assistant.
- [ ] Enable transcripts/end-of-call report artifacts.
- [ ] Set the Server URL to the deployed backend `/vapi-webhook` URL.
- [ ] Configure the webhook to send the production `VAPI_WEBHOOK_SECRET` in `x-vapi-secret` or a Bearer authorization header.
- [ ] Place a real test call and verify the assistant collects incident details.

## Backend

- [ ] Deploy `backend/` to the hosting platform.
- [ ] Set the production environment variables documented in the setup guide.
- [ ] Confirm `RESEND_API_KEY` and `FROM_EMAIL` use the approved Resend configuration.
- [ ] Confirm `VAPI_API_KEY` and `VAPI_WEBHOOK_SECRET` are stored only in encrypted production settings.
- [ ] Set `ATTACH_CALL_RECORDINGS=true` if approved recording attachments are required.
- [ ] Set `MANAGEMENT_EMAILS` to the management recipient address.
- [ ] Confirm `/health` returns OK.
- [ ] Send `test-payload.json` with the webhook secret to `/vapi-webhook` and verify the email arrives.

## Flyer

- [ ] Customize the flyer template for the agency property, phone number, and QR code.
- [ ] Confirm the printed phone number is correct.
- [ ] Confirm the QR code opens the phone dialer for the same number.
- [ ] Print and test with at least one iPhone and one Android phone.
- [ ] Confirm emergency disclaimer remains visible: call 911 first for immediate danger.
