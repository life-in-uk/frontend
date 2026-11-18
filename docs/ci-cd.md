# CI/CD (frontend)

Two workflows, both built on the existing release tooling (`build:release`,
`deploy:site`, `verify:site`; see `docs/deploy-cloudfront.md`). The backend has
its own pipeline (backend repository, `docs/ci-cd.md`).

| Workflow | When | AWS access |
|---|---|---|
| `.github/workflows/ci.yml` | every pull request and push to `main` | none |
| `.github/workflows/deploy-production.yml` | manual, then owner approval | OIDC role, deploy job only |

## CI

Lint, unit tests, `build:release` against the **public production Guide API**
(read-only; page counts come from the published inventory, never hardcoded),
`scripts/ci/check-release-output.mjs` (no local/private URLs in any uploaded
file, no `noindex` except `404.html`, the build used the production origin and
API, robots.txt allows crawling and names the sitemap), the generated
CloudFront function, and `verify:site` against the local edge emulator
(canonicals, hreflang pages, redirects with query strings, real 404s, owner
paths blocked, caching headers, sitemap, robots). `actionlint` checks the
workflow files. The release build is uploaded as an artifact for 14 days.

A pull request that needs backend changes not yet in production fails the
release build until the backend is deployed: deploy the backend first.
The build retries HTTP 429 (production nginx allows 10 API requests/s per IP).

## Release

1. Merge to `main` with CI green.
2. Actions → **Deploy production** → Run workflow (branch `main`); `ref` blank
   for current `main`, or a full commit SHA on `main`.
3. The build job repeats lint/tests, builds from `https://lifeinuk.info/api`
   and keeps the release as artifact `production-site` (90 days).
4. Approve the **production** environment when asked. The deploy job re-checks
   the release, assumes the deploy role, runs `deploy:site --execute`
   (assets → files → HTML, CloudFront `test-function` gate, publish, delete
   objects not in the release, invalidate `/*`) and then
   `verify:site --base https://lifeinuk.info --production` (retried for up to
   3 minutes while the edge updates).
5. The run summary shows the commit and the run ID to use for a rollback.

**After a content release** (backend `deploy/PUBLISHING.md`), run the same
workflow on the current `main`: the build picks up the new Guides from
production. Withdrawn pages disappear because the deploy removes objects
that are not in the release.

## Rollback

Actions → **Deploy production** → `rollback_run_id` = the run ID of the last
good deploy (from its summary, or
`gh run list --workflow deploy-production.yml --status success`). The exact
artifact of that run is redeployed and verified; nothing is rebuilt. The run
must be a successful **Deploy production** run on `main` of this repository;
any other run ID (CI, pull requests, other branches) is refused, because those
could carry an artifact of the same name built from unreviewed code.

A rollback restores the pages of that moment: Guides published later are
missing until the next normal release. Artifacts are kept 90 days; for an
older commit run a normal release with `ref` = that commit (rebuilt from
current content).

## One-time setup (owner approval required; nothing here has been applied)

**Order matters.** Configure the GitHub `production` environment (below)
*before* creating the IAM role. A job that names an environment makes GitHub
create it automatically **without protection rules**, and the role's trust
policy only checks the environment name, so the reviewer rule and the
`main`-only branch rule are what make approval mandatory. In the environment,
also untick "Allow administrators to bypass configured protection rules".

**AWS** (account 919693204623; the GitHub OIDC provider already exists):

```bash
aws iam create-role --role-name LifeInUK-GitHub-FrontendDeploy --max-session-duration 3600 \
  --description "GitHub Actions: life-in-uk/frontend production deploys" \
  --assume-role-policy-document file://infra/aws/frontend-deploy-trust.json
aws iam put-role-policy --role-name LifeInUK-GitHub-FrontendDeploy --policy-name deploy-site \
  --policy-document file://infra/aws/frontend-deploy-policy.json
```

The trust policy accepts only jobs of this repository that run in the
`production` environment (immutable OIDC subject with the repository ID). The
permissions are limited to: list/put/delete objects in the site bucket,
describe/update/test/publish the `lifeinuk-viewer-request` function, and
create/get invalidations of distribution `E2VQEY0DI83CFH`. It cannot change
the distribution, DNS, certificates, other buckets or other projects.

**GitHub** (repository settings):

- Environment `production`: required reviewer = owner; administrators may not bypass; deployment branches =
  `main` only; prevent self-review off (single owner).
- Variables (repository or environment): `AWS_FRONTEND_DEPLOY_ROLE_ARN`
  = `arn:aws:iam::919693204623:role/LifeInUK-GitHub-FrontendDeploy`,
  `SITE_BUCKET` = `lifeinuk-site-919693204623-eu-west-2`,
  `CLOUDFRONT_DISTRIBUTION_ID` = `E2VQEY0DI83CFH`,
  `CLOUDFRONT_FUNCTION_NAME` = `lifeinuk-viewer-request`. None of these are secrets.
- Branch protection on `main`: require the `CI` check.
- No AWS keys or other secrets are stored in GitHub.
