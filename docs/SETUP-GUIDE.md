# SHINE Voice Report Setup Guide

## 1. Deploy the backend

The backend is a small Node/Express webhook. It receives Vapi end-of-call reports at `/vapi-webhook` and emails management.

### Production host setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Deploy the `backend/` folder to the approved Node-compatible production host.

3. Add these environment variables in the hosting dashboard:

   ```text
   RESEND_API_KEY=replace_with_resend_server_key
   FROM_EMAIL="SHINE Voice Reports <management-sender@example.com>"
   MANAGEMENT_EMAILS=reports@example.com
   VAPI_API_KEY=replace_with_vapi_server_key
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

If management wants the email to come from its own verified sending domain, also update:

```text
FROM_EMAIL="SHINE Voice Reports <reports@example.org>"
```

Then redeploy/restart the backend.

## 4. Security notes

- Never include `.env`, Resend API keys, hosting access tokens, Twilio tokens, or Vapi private keys in a handoff ZIP.
- Store secrets only in the hosting provider's environment variable settings.
- Use a group mailbox or distribution list for production reporting.
- Treat transcripts as sensitive resident information.
