# SHINE Configuration Checklist

## Accounts

- [ ] Vapi account created and owned by management.
- [ ] Phone number purchased or assigned in Vapi/Twilio.
- [ ] Backend hosting account created, such as Vercel, Render, or Railway.
- [ ] Email sender account created, preferably a management-owned mailbox.
- [ ] Gmail App Password or SMTP/API credential created for the sender account.

## Vapi

- [ ] Import or recreate the assistant prompt from `vapi/vapi-assistant-config.example.json`.
- [ ] Connect the phone number to the assistant.
- [ ] Enable transcripts/end-of-call report artifacts.
- [ ] Set the Server URL to the deployed backend `/vapi-webhook` URL.
- [ ] Place a real test call and verify the assistant collects incident details.

## Backend

- [ ] Deploy `backend/` to the hosting platform.
- [ ] Set all environment variables from `backend/.env.example`.
- [ ] Set `MANAGEMENT_EMAILS` to the management recipient address.
- [ ] Confirm `/health` returns OK.
- [ ] Send `test-payload.json` to `/vapi-webhook` and verify the email arrives.

## Flyer

- [ ] Customize the flyer template for the agency property, phone number, and QR code.
- [ ] Confirm the printed phone number is correct.
- [ ] Confirm the QR code opens the phone dialer for the same number.
- [ ] Print and test with at least one iPhone and one Android phone.
- [ ] Confirm emergency disclaimer remains visible: call 911 first for immediate danger.
