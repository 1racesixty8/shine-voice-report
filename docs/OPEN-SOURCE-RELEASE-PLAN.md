# Open Source Release Plan for SHINE Voice Report

Yes — SHINE can be made open source and shared with other supportive housing agencies. I recommend releasing it as a public GitHub repository with a clear nonprofit-friendly license, a safe sample configuration, and zero live credentials.

## Recommended open-source model

Use a two-layer model:

1. **Open-source core**
   - Backend webhook code
   - Vapi assistant prompt/config template
   - Sample flyer template or example flyer
   - Setup docs
   - Test payloads
   - Deployment examples for Vercel/Render

2. **Agency-owned deployment**
   - Each agency uses its own Vapi account
   - Each agency uses its own phone number
   - Each agency uses its own email sender and recipient inbox
   - Each agency owns its hosting and environment variables

This lets you share the system widely without giving away your private Gmail, Vercel, Vapi, or phone-number credentials.

## Recommended license

I recommend **MIT License** if your goal is maximum adoption.

Why MIT:

- Easy for nonprofits and agencies to understand
- Allows reuse, modification, and deployment
- Low legal friction
- Common for small civic-tech/open-source tools

Alternative: **Apache 2.0** if you want a more formal license with explicit patent language.

For this project, MIT is probably best.

## What to publish

Publish these files/folders:

```text
README.md
LICENSE
.env.example
backend/
  server.js
  api/
  package.json
  package-lock.json
  vercel.json
  test-payload.json
vapi/
  vapi-assistant-config.example.json
docs/
  SETUP-GUIDE.md
  BACKEND-OPERATION-WALKTHROUGH.md
  CONFIGURATION-CHECKLIST.md
  AGENCY-ADOPTION-GUIDE.md
flyer-assets/
  SHINE-Voice-Report-Final-Flyer.png
```

## What not to publish

Do not publish:

- `.env`
- Gmail App Passwords
- Vercel tokens
- Vapi private API keys
- Twilio credentials
- Local `.vercel` folders
- `node_modules`
- Private notes
- Any resident reports, transcripts, recordings, or test data with real names

## Recommended repo name

Good names:

- `shine-voice-report`
- `shine-supportive-housing-reporting`
- `supportive-housing-voice-report`

Best choice:

```text
shine-voice-report
```

## Recommended public positioning

Suggested GitHub description:

> Voice-first incident reporting workflow for supportive housing communities. Residents call or scan a flyer QR code, speak naturally to a Vapi voice assistant, and management receives a structured incident report by email.

## README structure

Your public README should include:

1. What SHINE is
2. Who it is for
3. How the flow works
4. Requirements
5. Quick start
6. Vapi setup
7. Backend deployment
8. Email configuration
9. Privacy and safety notes
10. How agencies can customize it
11. License

## Agency customization model

Each agency should customize:

- Property name
- Flyer design
- Phone number
- Vapi assistant prompt
- Report recipient email
- Emergency disclaimer language
- Privacy/consent language
- Data retention policy

## Privacy and safety warning

Because SHINE handles incident reports, transcripts, and possibly caller phone numbers, the open-source README should clearly say:

- Do not commit real reports or transcripts.
- Do not publish credentials.
- Confirm privacy and records-retention rules with agency leadership.
- Tell callers to call 911 first for emergencies.
- Treat reports as sensitive resident/community information.

## Recommended path from current kit to public repo

1. Create a new clean folder named `shine-voice-report-open-source`.
2. Copy only safe template files into it.
3. Rename Example Supportive Housing Property-specific config to examples.
4. Replace personal email examples with placeholders.
5. Add MIT `LICENSE`.
6. Add `.gitignore` for secrets and build folders.
7. Add a strong README.
8. Initialize Git.
9. Push to GitHub.
10. Share the GitHub link with DISH and other agencies.

## Recommended tagline

> SHINE helps supportive housing residents report concerns by voice, without forms, while giving management structured, reviewable incident reports.
