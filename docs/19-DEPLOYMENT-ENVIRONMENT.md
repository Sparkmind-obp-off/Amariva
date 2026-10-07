# AMARIVA — BYOK deployment and environment

## Deployment path

User explicitly selected their own Cloudflare account (BYOK), not Genspark Hosted. Project `amariva`, production branch `main`, primary origin https://amariva.pages.dev . Repository https://github.com/Sparkmind-obp-off/Amariva . API tokens and secrets are never committed.

Public deployment has NO production DB binding because the account's D1 quota is full. This is deliberate fail-closed configuration, not a simulated database. Do not deploy `wrangler.local.jsonc`: its all-zero local-only ID is not a real production database.

## Local development

Node 22+ recommended. `npm ci`, then `npm run db:migrate:local`, `npm run build`, and `pm2 start ecosystem.config.cjs`. Pages dev does not support custom `--config` paths; the PM2/dev script supplies a local D1 binding on the CLI with the same ID used by migration commands. It listens on port 3000. Check `curl http://localhost:3000/api/health`. Stop port/service before restart. Use `pm2 logs --nostream`.

Local secrets: `.dev.vars` (ignored). An operator secret is generated privately; do not paste it into frontend code, README, tickets or commit history. Database data lives only in Wrangler's local D1 emulator during development. Tests use a separate ephemeral Miniflare D1 instance and do not seed production revenue.

## Activate isolated production storage

1. Operator upgrades Cloudflare plan or explicitly identifies a database safe to remove. Never delete another project automatically; API list table counts alone are not proof that a database is empty.
2. `npx wrangler d1 create amariva-production` after quota is resolved.
3. Add this top-level configuration using the REAL returned ID:

```json
"d1_databases": [{"binding":"DB","database_name":"amariva-production","database_id":"REAL_RETURNED_ID","migrations_dir":"migrations"}]
```

4. Apply `npx wrangler d1 migrations apply amariva-production --remote`.
5. `npm run typecheck && npm test && npm run deploy`.
6. Verify `/api/health`, consented events, lead/support persistence and operator dashboard from the production origin. Keep commerce disabled until every other gate is satisfied.

## Variables and secrets

| Name | Type | Default / purpose |
|---|---|---|
| DB | D1 binding | Absent production; required for all persistent APIs |
| PUBLIC_ORIGIN | Public config | https://amariva.pages.dev; update canonical URLs and email/checkout URLs after a verified domain change |
| PAYMENT_PROVIDER | Config | disabled; current adapter supports stripe |
| COMMERCE_ENABLED | Config | false; final enable switch, never bypass other gates |
| LEGAL_READY | Config | false; operator-confirmed facts, not an invented legal approval |
| LEGAL_OPERATOR | Config | Real operator legal identity |
| LEGAL_JURISDICTION | Config | Operator-confirmed jurisdiction |
| REFUND_POLICY | Config | Actual policy wording confirmed by operator |
| SUPPORT_EMAIL | Config | Verified operational contact; not guessed from account identity |
| ADMIN_TOKEN | Secret | Minimum 24 characters, generated strong operator password |
| STRIPE_SECRET_KEY | Secret | Server-only live key; live purchase gate requires sk_live prefix |
| STRIPE_WEBHOOK_SECRET | Secret | Provider-issued signing secret for this endpoint |
| RESEND_API_KEY | Secret | Server-only email API credential |
| EMAIL_FROM | Config | Verified sender domain/address, never fabricate |

Use `npx wrangler pages secret put NAME --project-name amariva` with secure stdin for secrets. Nonsecret config lives in `wrangler.jsonc` vars. `npx wrangler pages secret list --project-name amariva` lists names without exposing values. Tokens from the Genspark Deploy panel are loaded by `setup_cloudflare_api_key`; do not run OAuth/wrangler login in this sandbox.

The `.env.example` reference contains empty placeholders only. Do not commit `.env`, `.env.*`, `.dev.vars`, local data, screenshots, or operator access files.

## Payment activation acceptance

Confirm provider eligibility for operator country and IDR first. If Stripe is unsuitable, implement another PaymentAdapter and its verification boundary; do not merely rename the provider setting. The current public switch accepts live Stripe credentials only. Unit/integration tests use signed fixtures, not live credentials. A future provider sandbox integration should run in a separate staging environment rather than enabling test payments on the public site.

Register `https://amariva.pages.dev/api/webhooks/stripe` for checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired and charge.refunded. Set signing secret on Pages. Test amount/currency mismatch, unpaid and expired states, replay, provider timeouts, refund and access revocation.

Verify verified-sender email delivery, magic-link single-use/expiry, support operation, price/tax policy, license/refund wording and workbook compatibility. Only then set legal/operator fields, provider secrets and final activation flags. Readiness config is not proof of a successful real payment. Operator-approved small live purchase, actual download, receipt and refund acceptance are still required.

## Deployment / domain / rollback

`npm run deploy` builds and runs direct `wrangler pages deploy dist --project-name amariva --branch main`. Read/write project metadata `cloudflare_project_name=amariva` for future agent redeploys. Build output contains `_worker.js`, `_routes.json`, `_headers`, and public/static assets. The paid ZIP is in the worker only.

No custom domain is guessed from the 20 zones available in the account. Add a confirmed domain in Cloudflare Pages, wait for active HTTPS, update PUBLIC_ORIGIN, redirect/canonical strategy, payment return URLs and email links, and redeploy.

Rollback: preserve previous deployment IDs in Cloudflare Pages; use the dashboard's rollback to the previous successful production deployment, or deploy a reviewed previous git commit. D1 changes are not automatically rolled back with code. Export D1 before schema changes, prefer additive forward migrations, and never run destructive migrations without explicit operator approval. Public prelaunch deployment is safe with commerce disabled and DB absent.

Operator route: `/internal/control` prompts Basic auth, username `operator`, password from private delivery. Without DB it reports the activation blocker, not fake metrics. `/internal/notifications/retry` requires operator auth and same-origin POST. Roles and record authorization remain in the app; BYOK route admission/WAF may be hardened with Cloudflare Access later.
