# AMARIVA — Implementation baseline

Updated: 2026-10-07. This records implementation decisions without replacing the original strategy documents.

## Phase 0 audit

Audited repository: Sparkmind-obp-off/Amariva, main at f90280d. The initial repository contained README and 18 strategy documents, no package, application, database migration, or deployment configuration. Working tree was clean; remote main matched local main. All existing strategy documents are preserved.

GitHub authentication succeeded for the selected repository. BYOK Cloudflare authentication succeeded for the user's account. Created Pages project `amariva`. Creating an isolated `amariva-production` D1 database failed because the account reached its database quota. No existing databases were deleted, reused, or altered. Public launch can proceed, but production data collection and commerce cannot be declared active.

## Architecture decision

Hono + TypeScript, semantic SSR HTML, self-hosted CSS/font, a small browser ES module, Vite single-entry edge build, Cloudflare Pages advanced-mode `_worker.js`, and D1 for persistent domain data. No Node filesystem APIs at runtime. No third-party frontend runtime or AI API is required.

The legacy Hono Pages plugin assumes a `notFoundHandler` API incompatible with the installed Hono version. An explicit Vite SSR entry eliminates this wrapper. `_routes.json` bypasses the worker for `/static/*` only. Static security headers are in `_headers`; dynamic security headers are applied server-side.

### Modules

- `src/index.ts`: public routes, SEO, policies, protected operator surface.
- `src/views.ts`: reusable page shell, cards, forms, results, offer CTA, pricing, legal and customer views.
- `src/content.ts`: typed content catalog, topic cluster, product, indexable paths, HTML escaping.
- `src/api.ts`: D1 APIs, authorization, durable rate limits, checkout state, webhooks, fulfillment, email identity, outbox.
- `src/providers.ts`: replaceable payment and email adapters; current boundaries support Stripe REST and Resend REST.
- `src/security.mjs`: webhook HMAC, hashes, timing-resistant secret comparison, dimension sanitation.
- `public/static/calculator.mjs`: pure calculation and payment amount-validation logic, shared by browser and tests/server.
- `src/private-kit.ts`: real paid ZIP embedded only in the worker. NOT a public static download.
- `scripts/build_kit.py`: build-time generation of workbook/checklist/guide; no Python runtime in production.
- `migrations/0001_engine.sql`: stable IDs, timestamps, status checks, indexes and clearly labelled baseline seed records.

## Brand and UX

Public: AMARIVA — Business Tools for Better Work. Indonesian customer-facing copy. Calm off-white, forest-green, sage surfaces, accessible focus states, responsive layout, clear free-tool CTA. Original HTML calculator preview is labelled an example. No fabricated proof, registrations, trademark symbols, customers, or earnings. ORDRIA is not exposed in public navigation or copy. Manrope is self-hosted under OFL; license is included. Social artwork is original typographic artwork, not stock imagery.

## Initial demand / product strategy

Cluster: price, contribution margin, operational break-even. Evidence: original blueprint explicitly identifies the pricing cluster, and the SBA publishes contribution/BEP formulas and a calculator: https://legacy.sba.gov/business-guide/plan-your-business/calculate-your-startup-costs/break-even-point . This is a qualitative problem signal, not measured Indonesian keyword volume, conversion evidence, or proven willingness to pay. Scores in the opportunity seed are working judgments, not market research findings.

Flagship: five-input calculator for variable unit cost, unit sale price, fee %, fixed costs, and units per matching period. Computes contribution, contribution margin, rounded-up BEP, operational profit estimate, and minimum break-even price at target units. Negative/zero contribution has no reachable BEP. Input values never leave the device. CSV export is local and ungated. No saved-server financial records in this launch.

Content: four useful original pages (how-to price, margin vs markup comparison, BEP guide, discount example), each with worked numbers, method limitations, related links, and calculator CTA. SSR, canonical/OG metadata, Article/Breadcrumb JSON-LD, sitemap and robots. No keyword-volume claims or mass-generated pages.

Entry offer: Pricing Decision Kit, planned Rp99,000 once. Real ZIP contains a three-scenario XLSX workbook with formulas/data validation, cost-audit worksheet, decision log, START-HERE guide, and cost checklist. Sale status is activation pending. No recurring product is launched. Deeper offers require usage and purchase evidence first.

## Domain and analytics

Tables cover topic, content asset, free tool, visitor/session, source, tool session, lead, opportunity, product, offer, customer, transaction, fulfillment, subscription, experiment, event, next action, support request, access token, webhook receipt, notification outbox, rate limit and maintenance.

Events use snake_case and generated stable IDs, UTC epoch seconds, optional source/page/tool/product/offer/campaign/device/session/transaction dimensions. Browser allowed: page_view, tool_start, tool_complete, result_view, product_view, offer_view, repeat_use, referral. Server owns lead_created, checkout_start, purchase, delivery_complete, activation, cancellation. repeat_purchase/upgrade/subscription-related events are reserved for future flows, not automatically claimed active.

Browser tracking only starts after explicit optional analytics consent. Rejecting tracking does not restrict the tool. No input values or email in browser events. Private account/auth/internal pages are excluded. UTM dimensions are restricted short codes, not full URLs. Lead attribution is submitted under the lead form's explicit consent. Browser counts are observational and potentially spoofable; they must never be treated as audited sales.

Operator dashboard shows real aggregate counts, distinct anonymous sessions where applicable, sources, verified lifetime net revenue/refunds, opportunity queue, experiment log, next-action queue, support/privacy requests and notification outbox. Event funnel is explicitly labelled counts rather than a deduplicated people funnel. Acquisition attribution is source-level; full cross-device person-level attribution is not implemented.

## Commerce / identity / fulfillment

Checkout is disabled by default and must pass storage, real operator policy, live provider and email gates. Price is server-owned. IDR is converted to Stripe's two-decimal minor units: displayed 99,000 rupiah -> Stripe 9,900,000 minor units. Client price fields are not accepted.

Transactions: pending -> checkout -> paid; failed/expired branches; refunded revokes access. Only signed, fresh Stripe webhook events with matching order ID, provider session, amount, currency and live/test mode can settle. Redirects never mark an order paid. D1 atomic batches and deterministic side-effect IDs ensure replay safety. Partial refunds are recorded in rupiah; full refunds revoke fulfillment. An out-of-order refund with unknown payment is rejected for retry rather than silently dropped.

Initial checkout cookie is a hashed, random order-only capability. Entering someone's email never grants access to their other orders. Email magic links are hashed in D1, expire in 15 minutes, are single use, and are consumed only after user confirmation POST. Verified links create a 7-day HttpOnly, Secure-in-HTTPS, SameSite=Lax account session. Every download checks ownership, paid state and nonrevoked fulfillment. Download marks delivery/activation once. Receipt notification has a durable outbox and protected retry endpoint; email is not assumed sent until the provider succeeds.

## Security / operations

64 KB request limits, JSON validation, exact same-origin POST checks, D1-backed IP-hash rate limits, prepared SQL, escaping and textContent, HMAC webhook verification, hashed tokens, private/no-store API responses, CSP, no frames, no referrers, HTTPS HSTS. Operator application-role access uses strong Basic authentication over HTTPS with a Cloudflare secret; username `operator`. This is BYOK application authentication, not Genspark Hosted admission. A public token never acts as customer authorization. Consider Cloudflare Access/WAF hardening before production data activation.

Lazy hourly housekeeping removes expired tokens/rate-limit records, 90-day event/tool/anonymous data, and eligible 180-day leads/support records. No cron or long-running jobs are required. Purchase/financial record retention requires operator legal review. Operator handles privacy requests and data deletion through authenticated D1 operations; no unsafe public deletion endpoint.

## Risks and current blockers

1. Production D1 quota reached: storage APIs explicitly return 503, do not fall back to memory or other apps' databases.
2. Payment and email credentials not supplied; real transactions/delivery emails are NOT verified live.
3. Legal operator identity, jurisdiction, refund/license/tax handling and verified support contact require real source facts before commerce.
4. Stripe account/currency/country eligibility must be checked by operator; an Indonesian operator may need a different local provider adapter.
5. Workbook formulas verified structurally; recalculation and import compatibility still require acceptance in the operator's supported Excel/LibreOffice/Google Sheets versions.
6. No production demand/conversion baseline: no claim of validated monetization, uplift or retention.
7. No autonomous A/B test rollout, recurring billing, multi-product catalog, account preference editor, or automated privacy deletion.
8. No custom domain selected; `amariva.pages.dev` is the initial HTTPS origin. No domain or trademark clearance implied.

## Roadmap status and definition of done

Phases 0–4: foundation/tool/content code implemented and tested; evidence is qualitative, not commercial validation. Phase 5 capture/event persistence works locally but production awaits D1. Phases 6–8 boundaries/customer/admin code and isolated D1 fixture tests exist; live commerce and production analytics are BLOCKED. Phase 9 has baseline experiment/next-action records only; no measurable optimization claim. Phase 10 deliberately not started.

A complete business loop is NOT yet achieved. Next sequence: unblock isolated D1 -> bind/apply migrations -> verify production consent events and leads -> supply legal facts and provider credentials -> real provider sandbox acceptance -> operator-approved small live purchase and refund -> verify delivery/email/account -> measure baseline -> fix the largest demonstrated bottleneck. Do not expand the catalog before this works.
