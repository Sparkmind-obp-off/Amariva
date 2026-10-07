# AMARIVA — TECHNICAL DIRECTION

## Technical Philosophy

The technology should support product-led growth without becoming the business itself.

## Preferred Principles

- fast public pages,
- server-side secrets,
- provider-independent integrations,
- small composable services,
- measurable events,
- simple content publishing,
- low fixed infrastructure cost early,
- clear separation between public UI and internal control systems.

## Public Layer

Potential components:

- marketing site,
- tool pages,
- content pages,
- product pages,
- checkout,
- customer access,
- lightweight account system where required.

## Data

Minimum useful objects:

- visitor/session,
- content asset,
- free tool,
- tool session,
- lead,
- opportunity,
- offer,
- product,
- transaction,
- customer,
- subscription,
- experiment,
- event,
- next action.

## Integration Philosophy

Payments, email, analytics, AI/model providers, search services, and other infrastructure should be replaceable behind adapters where practical.

Avoid coupling the core business logic to one vendor.

## Security

Required baseline:

- server-side secret handling,
- least-privilege access,
- input validation,
- rate limiting where needed,
- audit-friendly events,
- privacy-aware analytics,
- secure payment redirects/webhooks,
- idempotent transaction handling.

## Performance

Prioritize:

- low client JavaScript,
- optimized assets,
- cacheable public content,
- accessible UI,
- efficient tool execution.

## SEO-Friendly Architecture

Tools and content should have stable, crawlable URLs.

Where a free tool produces a useful result, the result should be understandable and shareable without exposing sensitive customer data.

## Measurement

Every commercially relevant page should connect to:

- source,
- content/tool,
- CTA,
- offer,
- transaction.

Without this, optimization becomes guesswork.

## Build Sequence

**public foundation → free tool → analytics → content cluster → payment → customer access → retention → deeper automation**

Do not build full internal operations before the public demand loop proves what matters.
