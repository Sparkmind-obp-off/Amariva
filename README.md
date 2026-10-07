# AMARIVA

**AMARIVA — Business Tools for Better Work**

Public master brand, practical tools, products and software. The separate internal operating/control brand ORDRIA is not part of the public customer-facing experience.

## Current implementation — 2026-10-07

Hono + TypeScript + Cloudflare Pages BYOK. Existing strategic documents and repository history are preserved. This is a functional public foundation and locally tested business-engine implementation, **not a completed live commerce loop**.

### Completed and tested

- Responsive SSR homepage, tool catalog, about, support, terms and privacy.
- Flagship free pricing/margin/BEP calculator with input validation, meaningful interpretation, negative-contribution handling, next steps and local CSV export. No account or payment required; calculator inputs never leave the device.
- Four original useful supporting guides and one product page for Pricing Decision Kit.
- Canonical/OG/Twitter metadata, structured data, sitemap, robots, favicon, original social asset and self-hosted licensed typography.
- D1 migration/domain entities, source attribution, consent-aware analytics, leads/support requests and durable rate limits; verified in local/isolated D1.
- Replaceable Stripe/Resend integration boundaries, signed webhook validation, idempotent state, partial/full refund handling, actual private workbook/checklist/guide ZIP fulfillment.
- Order-scoped customer authorization, single-use email-login boundary, purchase history/download checks and receipt outbox.
- Server-protected operator surface with funnel counts, sources, verified revenue, opportunities, experiments, next actions, support requests and notification status.
- 42 passing business/security/D1/API tests, 45 passing browser route/viewport checks, TypeScript/build passing, zero current npm audit advisories.

### Production status / blockers

- Public target: **https://amariva.pages.dev** — deployment verification recorded in delivery.
- GitHub: **https://github.com/Sparkmind-obp-off/Amariva**, branch `main`.
- Production D1 is **unconfigured**: Cloudflare account reached its database quota. No other project's database was altered or deleted. Storage APIs return truthful 503 errors rather than storing in memory or fabricating success.
- Commerce and email are **disabled**. Payment/email credentials, provider eligibility, operator legal identity/contact/jurisdiction, license/refund/tax policy and live purchase/delivery acceptance are outstanding.
- Rp99,000 is a proposed toolkit price until activation. No fake payment success, testimonials, revenue, customer counts or legal registrations.

## Entry URIs

| Path | Purpose |
|---|---|
| `/` | Homepage |
| `/tools` | Free tool catalog |
| `/tools/kalkulator-harga-jual` | Pricing, contribution margin, BEP and profit calculator |
| `/resources` | Content cluster index |
| `/resources/cara-menentukan-harga-jual` | Pricing how-to |
| `/resources/margin-vs-markup` | Margin/markup comparison |
| `/resources/cara-menghitung-bep` | BEP method and worked example |
| `/resources/simulasi-diskon` | Discount contribution example |
| `/products`, `/products/pricing-kit` | Product catalog / truthful offer status |
| `/checkout`, `/checkout/success`, `/checkout/cancel` | Checkout/status boundaries, no redirect-based success |
| `/account`, `/auth/verify?token=…` | Protected purchases / confirmed single-use email login |
| `/about`, `/contact`, `/privacy`, `/terms` | Trust and policies |
| `/sitemap.xml`, `/robots.txt` | Search discovery |
| `/api/health` | Public readiness and activation status |
| `POST /api/events` | Consented allowlisted observational events |
| `POST /api/leads`, `POST /api/contact` | Validated lead/support persistence |
| `POST /api/checkout` | Server-owned price, provider checkout and idempotency |
| `POST /api/webhooks/stripe` | Signed payment/refund transitions |
| `/api/orders`, `/api/download/:id` | Cookie-authorized history / paid private delivery |
| `POST /api/auth/request`, `/api/auth/verify`, `/api/auth/logout` | Email-login and session boundaries |
| `/internal/control` | Private operator dashboard; never linked in public navigation |

Share acquisition URLs with short codes, e.g. `/tools/kalkulator-harga-jual?utm_source=newsletter&utm_campaign=pricing_launch`. Do not put personal data in campaign parameters.

## Quick user guide

Open the free calculator, enter per-unit variable cost, sale price, percentage fee, period fixed costs and target units for the same period. Submit to see contribution/BEP/profit, compare alternate inputs and download CSV. Read the linked guides to understand assumptions. Toolkit purchase is not available until the explicit activation gates pass. Form success is shown only if the corresponding data is actually persisted.

## Development / tests / deploy

```bash
npm ci
npm run db:migrate:local
npm run typecheck
npm test
npm run build
pm2 start ecosystem.config.cjs
curl http://localhost:3000/api/health
npx playwright install --with-deps chromium
npm run test:browser
# BYOK token must be configured first; production D1 is optional only during public prelaunch:
npm run deploy
```

All commands run from the repository root, `/home/user/webapp` in the sandbox. Local Pages uses CLI D1 binding; `wrangler.local.jsonc` is for local migration only, never production. Secrets belong in ignored `.dev.vars` or Cloudflare Pages secrets. Operator credentials are delivered privately, not stored in Git. See deployment notes before turning commerce on.

## Data architecture

Persistent engine data uses D1, with stable text IDs, UTC timestamps, explicit statuses, indexes and parameterized SQL. Tables cover visitor/source/content/topic/tool/tool_session/lead/opportunity/product/offer/customer/transaction/fulfillment/subscription/experiment/event/next_action and security/support/outbox entities. Calculator financial inputs remain client-only. Paid artifact is embedded in the server bundle, not under public/static. Neither in-memory nor runtime filesystem persistence is used.

## Next steps, in order

1. Resolve the Cloudflare D1 quota; create an isolated AMARIVA DB, bind, migrate and redeploy.
2. Verify real production analytics, lead/support persistence and consent behavior.
3. Confirm operator legal facts, payment provider eligibility and email sender; supply secure credentials.
4. Complete actual provider acceptance and operator-approved live purchase/refund, fulfillment/account/email/support checks.
5. Observe a real baseline, fix the largest measured bottleneck, then consider additional offers/software.

Not implemented/validated yet: live sales, production retention results, recurring billing, customer preferences editor, autonomous experiment rollout, automated privacy request fulfillment, cross-device people-level attribution, custom domain and scaled catalog. Do not claim the revenue/retention success condition before these activation checks pass.

## Implementation documentation

- [Architecture, audit, brand/tool/product/content strategy, event model and risks](docs/18-IMPLEMENTATION-ARCHITECTURE.md)
- [BYOK deployment, environment reference, storage activation and rollback](docs/19-DEPLOYMENT-ENVIRONMENT.md)
- [Testing notes, launch checklist and actual phase gaps](docs/20-TESTING-LAUNCH.md)

## Canonical strategic blueprint (preserved)

**Status:** Strategic Brand Lock. Formal legal/trademark clearance is separate and not asserted.

**Demand → Free Value → Traffic → Usage → Lead → Opportunity → Offer → Sale → Delivery → Retention → Expansion → Learning**

AMARIVA is designed to house free tools, content, paid products, software, standardized business solutions and recurring products where proven demand supports them.

### Documentation map

1. [Master Vision](docs/00-MASTER-VISION.md)
2. [Brand Strategy](docs/01-BRAND-STRATEGY.md)
3. [Audience & ICP](docs/02-AUDIENCE-ICP.md)
4. [Offer Architecture](docs/03-OFFER-ARCHITECTURE.md)
5. [Free Tool Engine](docs/04-FREE-TOOL-ENGINE.md)
6. [Content & SEO Engine](docs/05-CONTENT-SEO-ENGINE.md)
7. [Distribution Engine](docs/06-DISTRIBUTION-ENGINE.md)
8. [Growth Funnel](docs/07-GROWTH-FUNNEL.md)
9. [Product & Monetization](docs/08-PRODUCT-MONETIZATION.md)
10. [Sales & Conversion](docs/09-SALES-CONVERSION.md)
11. [Retention & Expansion](docs/10-RETENTION-EXPANSION.md)
12. [Analytics & Intelligence](docs/11-ANALYTICS-INTELLIGENCE.md)
13. [Operating Model](docs/12-OPERATING-MODEL.md)
14. [90-Day Launch Roadmap](docs/13-90-DAY-ROADMAP.md)
15. [Technical Direction](docs/14-TECHNICAL-DIRECTION.md)
16. [Brand Launch Checklist](docs/15-BRAND-LAUNCH-CHECKLIST.md)
17. [Full Implementation Roadmap](docs/16-FULL-IMPLEMENTATION-ROADMAP.md)
18. [Implementation Master Prompt](docs/17-GENSPARK-IMPLEMENTATION-MASTER-PROMPT.md)

AMARIVA is not built merely to look like a brand. It is built to create measurable demand, convert intent into revenue, retain customers and compound learning. Build useful things, earn trust, capture demand, and keep improving the machine.
