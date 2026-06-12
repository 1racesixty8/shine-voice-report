# SHINE Voice Report Setup Guide

## 1. Deploy the backend

The backend is a small Node/Express webhook. It receives Vapi end-of-call reports at `/vapi-webhook` and emails management.

### Vercel quick setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Deploy the `backend/` folder to Vercel.

3. Add these environment variables in the hosting dashboard:

   ```text
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=management-sender@example.com
   SMTP_PASS=GMAIL_APP_PASSWORD_OR_SMTP_PASSWORD
   FROM_EMAIL="SHINE Voice Reports <management-sender@example.com>"
   MANAGEMENT_EMAILS=reports@example.com
   ```

4. Redeploy after adding environment variables.

5. Verify:

   ```bash
   curl https://YOUR-BACKEND-DOMAIN/health
   curl -X POST https://YOUR-BACKEND-DOMAIN/vapi-webhook \
     -H "Content-Type: application/json" \
     --data-binary @test-payload.json
   ```

## 2. Configure Vapi

1. Create or open the SHINE assistant in Vapi.
2. Use `vapi/vapi-assistant-config.json` as the prompt/configuration reference.
3. Assign the phone number to the assistant.
4. In the assistant or phone number settings, set the Server URL to:

   ```text
   https://YOUR-BACKEND-DOMAIN/vapi-webhook
   ```

5. Make a test call and verify the report email arrives.

## 3. Update email recipients

The adopting agency does not need to edit code. They only update environment variables in the backend hosting dashboard.

Change the destination address:

```text
MANAGEMENT_EMAILS=reports@example.org
```

If management wants the email to come from their own domain or Gmail account, also update:

```text
SMTP_USER=reports@example.org
SMTP_PASS=NEW_APP_PASSWORD_OR_SMTP_SECRET
FROM_EMAIL="SHINE Voice Reports <reports@example.org>"
```

Then redeploy/restart the backend.

## 4. Security notes

- Never include `.env`, Gmail app passwords, Vercel tokens, Twilio tokens, or Vapi private keys in a handoff ZIP.
- Store secrets only in the hosting provider's environment variable settings.
- Use a group mailbox or distribution list for production reporting.
- Treat transcripts as sensitive resident information.
