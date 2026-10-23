# Read-only report routing check

Once this code is deployed to the production webhook, GET `/health` returns
`reportRouting` alongside the existing health fields:

```json
{"managementEmailsSet":true,"includesReportsInbox":true}
```

The first boolean means the comma-separated `MANAGEMENT_EMAILS` setting has at
least one nonempty entry. The second means that list includes the expected SHINE
reports inbox (an exact, case-insensitive match). The check uses the same parser
as email sending and never returns recipient addresses or credentials. Responses
are marked `Cache-Control: no-store`. A missing or empty list also emits a
value-free startup warning, including on serverless cold starts.

Both booleans must be true to confirm configured recipient inclusion. This does
not validate address syntax, exclude additional recipients, verify the sender or
API key, send email, or prove inbox delivery. Existing `ok` still means the
backend is online, not that mail is ready. Missing `reportRouting` means this
version is not deployed at the checked address; do not treat it as a pass.

Deployment requires approval. This repository alone does not establish whether
merging automatically deploys to Vercel. Confirm the production deployment source
before relying on the new fields. No environment or DNS changes are required by
this PR, and it does not change the configured recipient list.
