# AMARIVA — Tests and launch gates

## Verified on 2026-10-07

- TypeScript: `npm run typecheck` passes.
- Production SSR build: approximately 105 KB uncompressed worker, including the private 8 KB paid ZIP; no Node runtime imports.
- `npm test`: 42 tests pass, zero failed/skipped. Includes real ephemeral D1 persistence, seeded domain model, public SSR routes, metadata/404, origin checks, malformed input, consent, deduplicated leads/events, rate limiting, disabled checkout, webhook HMAC/mismatch/mode, atomic payment/fulfillment replay safety, order-level authorization, real protected ZIP response, partial/full refund and single-use email authentication/session logout.
- `npm run test:browser`: 45 route/viewport checks at 1440px, 390px and 320px pass. Covers one H1, no horizontal overflow, calculator expected values, negative contribution, loss scenario, CSV download, mobile navigation, browser console and analytics consent. Desktop/mobile screenshots are local ignored test artifacts.
- `npm audit`: zero known advisories after compatible sharp/undici build-tool overrides. Recheck at every dependency change.
- Local Pages + D1 `/api/health`: public ready, storage configured, commerce disabled, email disabled.

Fixtures are synthetic, isolated, and clearly test-only. No real provider purchase or production revenue was used or fabricated. The XLSX formula file is structurally generated; acceptance in real spreadsheet software remains an operator launch gate. Browser smoke is automated, not a substitute for assistive-technology or legal review.

## Reproduce

Node 22+: `npm ci`, `npm run typecheck`, `npm test`. Tests rebuild the worker via pretest; Miniflare 4 is pinned as a stable test API separately from Wrangler's current runtime. Test compatibility date is supported by that stable runtime; production uses the configured Pages date.

For browser QA, `npx playwright install --with-deps chromium`; apply local migration and start the configured PM2 service, then `npm run test:browser`. Optional `TEST_BASE_URL` selects a deployed origin. Production no-DB smoke should reject analytics rather than pretending persistence is active; do not seed production with paid test fixtures.

## Manual checklist

- [x] Clear free-tool primary CTA, truthful examples, no invented testimonials.
- [x] Labelled inputs, native validation, explicit negative result interpretation.
- [x] Keyboard focus styling, skip link, expandable mobile menu, readable narrow layout.
- [x] Public route rendering, four useful supporting articles, canonical/OG, sitemap and robots.
- [x] Optional analytics rejection does not break calculation/export.
- [x] Account/download permissions verified against other orders, including same email.
- [x] Webhook replay, state, IDR minor units, refunds and signature freshness tested in D1 fixtures.
- [ ] Screen-reader review with NVDA/VoiceOver and comprehensive automated accessibility audit.
- [ ] Spreadsheet open/recalculate/import acceptance across supported office clients.
- [ ] Validate demand using genuine queries/support signals and actual usage.

## Production launch gates

- [x] GitHub-selected repository retained, main branch, clean secret exclusions.
- [x] BYOK Pages project created, strong operator secret set, commerce disabled by default.
- [ ] Production isolated D1 created/bound/migrated — BLOCKED by account database quota.
- [ ] Production consented events, source attribution, lead/support persistence verified.
- [ ] Operator legal identity/jurisdiction/contact/license/refund/tax facts confirmed.
- [ ] Provider account eligibility, real payment credentials and verified email sender supplied.
- [ ] Separate provider sandbox acceptance completed; small operator-approved live transaction and refund tested.
- [ ] Actual receipt, customer login, private delivery and support response verified in production.
- [ ] Baseline funnel observation and one evidence-driven experiment completed.
- [ ] Catalog expansion / recurring software — deliberately deferred.

Public foundation launch is not a completed demand-to-retention business loop. Until the unchecked commerce gates are fulfilled, payment UI explicitly says sales are not open and server refuses checkout. Production storage absence gives clear 503 failures; the local tool remains fully useful.

## Next action order

1. Resolve D1 quota without touching other apps without permission.
2. Bind and validate production storage/analytics/capture.
3. Supply operator facts, eligible payment provider and email configuration.
4. Verify real fulfillment and retention entry point.
5. Observe the actual bottleneck before A/B experiments or additional products.
