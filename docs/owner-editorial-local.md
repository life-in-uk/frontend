# Local owner editorial preview

The owner screen is at `/owner/editorial`. It uses a same-origin backend proxy and a server session; it does not store a password or API bearer token in browser storage. Choose the **Drafts and previews** role to inspect batches, or **Approval and publication** for final owner actions. These roles have separate passwords. Review remains on the independent review API and cannot be performed from this screen.

## Local-only configuration

Set these variables in the backend process environment or a protected local environment file that is not committed:

```sh
EDITORIAL_OWNER_DRAFT_PASSWORD='<unique random value, at least 32 characters>'
EDITORIAL_OWNER_APPROVAL_PASSWORD='<different unique random value, at least 32 characters>'
EDITORIAL_SESSION_COOKIE_SECURE=false
EDITORIAL_OWNER_ORIGINS='http://127.0.0.1:5179,http://localhost:5179'
```

The owner passwords must differ from each other and from the machine API tokens. Do not put the backend machine tokens in frontend `.env` files or Vite `VITE_*` variables. The application does not print login bodies or passwords. Production must use HTTPS and set `EDITORIAL_SESSION_COOKIE_SECURE=true`.

Run the frontend against an already running isolated local backend without restarting it:

```sh
cd ~/projects/life-in-uk-frontend
BANK_HOLIDAYS_API_TARGET=http://127.0.0.1:8082 npm run dev -- --host 127.0.0.1 --port 5179 --strictPort
```

The backend must be started separately with the owner session variables above. Use the draft password to list and inspect batches. Use the approval password only after the batch has five valid, independently reviewed locale versions. The server still checks review hashes, expiry, prior publication state and the owner approval state before publishing.

## Current limitation

Manual Claude export/import is not part of this first owner-session slice. The batch screen can preview the stored locale canonical JSON, source revision, hashes, statuses and review results. Translation-package export, evidence-invariant preflight, and atomic prevalidation of a four-locale import remain to be implemented before using this as the manual translation workflow.
