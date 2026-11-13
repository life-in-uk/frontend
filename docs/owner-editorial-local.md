# Local owner editorial preview

The owner screen is at `/owner/editorial`. It uses a same-origin backend proxy and a server session; it does not store a password or API bearer token in browser storage. Choose the **Drafts and previews** role to inspect batches and handle manual translations, or **Approval and publication** for final owner actions. These roles have separate passwords. Review remains on the independent review API and cannot be performed from this screen.

## Local-only configuration

Set these variables in the backend process environment or a protected local environment file that is not committed:

```sh
EDITORIAL_OWNER_DRAFT_PASSWORD='<unique random value, at least 32 characters>'
EDITORIAL_OWNER_APPROVAL_PASSWORD='<different unique random value, at least 32 characters>'
EDITORIAL_SESSION_COOKIE_SECURE=false
EDITORIAL_OWNER_ORIGINS='http://127.0.0.1:5179,http://localhost:5179'
```

The owner passwords must differ from each other and from the machine API tokens. Do not put the backend machine tokens in frontend `.env` files or Vite `VITE_*` variables. The application does not print login bodies or passwords. Production must use HTTPS; Secure cookies default on and should remain enabled.

Run the frontend against an already running isolated local backend without restarting it:

```sh
cd ~/projects/life-in-uk-frontend
BANK_HOLIDAYS_API_TARGET=http://127.0.0.1:8082 npm run dev -- --host 127.0.0.1 --port 5179 --strictPort
```

The backend must be started separately with the owner session variables above. For local HTTP only, set `EDITORIAL_SESSION_COOKIE_SECURE=false`. Use the draft password to list and inspect batches. Select a batch and export its translation package; copy it to Claude manually, then paste Claude's complete `translation-package-v1` JSON response and choose **Validate and save locale drafts**. The backend prevalidates all four locales, checks the source revision/hash and evidence references, computes each locale content hash and persists the locales in one transaction. Imported content remains unreviewed. Use the approval password only after the batch has five valid, independently reviewed locale versions. The server still checks review hashes, expiry, prior publication state and the owner approval state before publishing.

## Translation response contract

The export contains the Chinese Guide, evidence/source provenance, batch/source IDs and hashes, instructions, and a complete `responseTemplate`. Claude should return only that template with translated `title`, `summary`, `content`, and `evidence[].statement` fields. Keep all source references, evidence keys, support source keys, locators, excerpts and notes unchanged. The import accepts exactly four locales: `zh-TW`, `en`, `ur` and `hi`.
