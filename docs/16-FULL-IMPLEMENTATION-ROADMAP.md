# AMARIVA — FULL IMPLEMENTATION ROADMAP

## Mission

Build AMARIVA as a real public product-led business engine, not a brochure website.

Canonical loop:

**Demand → Discovery → Free Value → Usage → Lead → Opportunity → Offer → Transaction → Delivery → Retention → Expansion → Learning → Next Action**

## Phase 0 — CONTROL & BASELINE

### Goal
Create one canonical implementation baseline.

### Deliver
- repository audit
- architecture decision record
- environment strategy
- domain strategy
- legal/policy checklist
- analytics naming convention
- content model
- product model
- event model
- deployment strategy
- definition of done

### Exit
The project can be implemented without architectural ambiguity.

---

## Phase 1 — BRAND & PUBLIC FOUNDATION

### Goal
Turn AMARIVA into a credible public property.

### Deliver
- visual identity system
- typography and spacing system
- responsive design system
- homepage
- about
- contact/support
- terms
- privacy
- navigation
- footer
- SEO metadata
- sitemap/robots
- favicon/social preview assets
- trust elements

### UX standard
Fast, calm, useful, premium through clarity rather than decoration.

### Exit
A stranger understands what AMARIVA is, who it is for, and where to start.

---

## Phase 2 — DISCOVERY & DEMAND INTELLIGENCE

### Goal
Create a repeatable system for finding high-intent problems.

### Deliver
- opportunity taxonomy
- demand-signal schema
- keyword/topic backlog
- problem scoring
- source classification
- opportunity status flow
- internal opportunity dashboard
- research notes structure

### Scoring
**Demand × Pain × Intent × Monetization × Distribution × Strategic Fit**

### Exit
At least one validated demand cluster is selected.

---

## Phase 3 — FREE TOOL ENGINE

### Goal
Launch AMARIVA's first real acquisition product.

### Deliver
- flagship free tool
- reusable tool framework
- form/input validation
- useful result state
- explanation layer
- related content CTA
- optional email/save flow
- shareable result where safe
- tool analytics
- abuse/rate protection where needed
- reusable components for future tools

### Tool quality gate
The tool must provide immediate standalone utility before asking for anything.

### Exit
A real user can discover the tool, use it, get a result, and understand the next step.

---

## Phase 4 — CONTENT & SEO ENGINE

### Goal
Turn one validated problem cluster into a traffic system.

### Deliver
- content templates
- topic cluster model
- article page
- comparison page
- FAQ page
- how-to page
- example page
- tool landing page
- internal linking system
- canonical metadata
- structured data where appropriate
- author/trust presentation
- content index/search

### Initial cluster
1 flagship tool
3–5 supporting high-intent pages
1 commercial page

### Exit
Search and content can continuously feed the free tool.

---

## Phase 5 — DISTRIBUTION & AUDIENCE CAPTURE

### Goal
Move attention from external channels into AMARIVA-owned assets.

### Deliver
- share/CTA patterns
- social preview metadata
- distribution content templates
- newsletter/email capture
- consent state
- lead source attribution
- campaign/source tracking
- reusable share snippets
- optional webhooks/integrations

### Channel rule
Search and useful tools are primary compounding acquisition. Social is distribution and demand discovery.

### Exit
External attention is measurable from source → visit → tool/content usage.

---

## Phase 6 — PRODUCT & COMMERCE

### Goal
Convert validated demand into revenue.

### Deliver
- product catalog
- offer pages
- pricing
- product detail pages
- checkout
- transaction state
- payment provider abstraction
- webhook handling
- idempotency
- order record
- fulfillment state
- customer receipt/status
- refund/support path

### Offer ladder
**Free → Entry Product → Core Product → Recurring Software → Higher-Value Solution**

### Exit
A real visitor can become a paying customer end-to-end.

---

## Phase 7 — CUSTOMER, ACCOUNT & RETENTION

### Goal
Make the first purchase the beginning of a relationship.

### Deliver
- customer profile
- access control
- purchased products
- onboarding
- first-value flow
- saved outputs where relevant
- customer history
- email/update preferences
- repeat-use tracking
- cross-sell logic
- referral mechanism
- support entry point

### Exit
A customer can buy, access value, succeed, return, and discover a logical next product.

---

## Phase 8 — ANALYTICS & INTERNAL CONTROL

### Goal
Make the system measurable enough to decide what to build next.

### Deliver
- event pipeline
- funnel metrics
- source attribution
- tool analytics
- conversion metrics
- transaction metrics
- retention metrics
- experiment log
- opportunity dashboard
- product dashboard
- next-action queue

### Canonical events
- page_view
- tool_start
- tool_complete
- result_view
- lead_created
- offer_view
- checkout_start
- purchase
- delivery_complete
- activation
- repeat_use
- repeat_purchase
- upgrade
- cancellation
- referral

### Exit
Every major stage of the business loop is observable.

---

## Phase 9 — GROWTH OPTIMIZATION

### Goal
Optimize the actual bottleneck instead of adding random features.

### Deliver
- funnel diagnosis
- experiment framework
- landing page experiments
- CTA experiments
- tool UX experiments
- offer/pricing experiments
- retention experiments
- performance optimization
- SEO improvement loop
- content refresh loop

### Decision logic

Traffic high + usage low:
**relevance/UX problem**

Usage high + lead low:
**next-step/trust problem**

Lead high + purchase low:
**offer/pricing/proof problem**

Purchase high + retention low:
**delivery/product problem**

### Exit
At least one acquisition-to-revenue path is measurably improving.

---

## Phase 10 — SCALE & PORTFOLIO

### Goal
Scale only what already works.

### Deliver
- additional tools by validated cluster
- additional products
- recurring software expansion
- vertical landing systems
- partner/distribution surfaces
- automation
- cost controls
- reliability improvements
- reusable component library
- reusable product framework

### Portfolio rule
Expand from validated demand clusters, not from speculative feature ideas.

### Exit
AMARIVA has a repeatable, measurable, economically sensible growth engine.

---

# GLOBAL DEFINITION OF DONE

AMARIVA is not “done” when the homepage looks polished.

The first real completion milestone is:

**A stranger discovers AMARIVA → lands on useful content/tool → uses it → receives value → sees a relevant paid offer → purchases → receives the promised value → returns or expands → data is captured → system produces a next action.**

That is the first complete business loop.

## Implementation checkpoint — 2026-10-07

The original roadmap above remains the strategic target. Current code ships a real SSR public foundation, ungated pricing/margin/BEP calculator, four supporting articles, one truthful paid-offer page, real private toolkit asset and checkout/identity/webhook/fulfillment boundaries. D1 event/capture/admin behavior is tested locally with 42 passing tests; responsive browser checks pass at 1440/390/320 pixels.

Production D1 is blocked by account database quota. Commerce/email are disabled pending storage, eligible provider credentials, verified sender and real operator legal/policy facts. No live purchase, revenue, retention uplift or scaled demand is asserted. Baseline experiment and next-action records are prepared; measurable optimization and scale have not started.

See [implementation architecture and phase gaps](18-IMPLEMENTATION-ARCHITECTURE.md), [activation/deployment](19-DEPLOYMENT-ENVIRONMENT.md), and [launch gates](20-TESTING-LAUNCH.md). Do not mark Phase 6 or the overall loop complete until an actual operator-approved production purchase and promised delivery are verified.
