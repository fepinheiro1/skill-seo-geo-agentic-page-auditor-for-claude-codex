# AI Commerce Surfaces

How product information reaches AI shopping experiences. Three distinct surfaces exist, with different maturity levels. Do not conflate them, and do not promise placement in any of them.

## Contents

- Surface taxonomy
- Crawled product schema
- Declared merchant feeds
- Agentic checkout
- Audit posture

## Surface taxonomy

| Surface | Mechanism | Maturity (2026-08) |
|---|---|---|
| Crawled product schema | AI crawlers read page HTML and `Product` JSON-LD | Established; same rules as structured-data.md |
| Declared merchant feed | Merchant submits a product feed directly to the AI platform | Operational (ChatGPT Shopping; comparable merchant programs at other providers) |
| Agentic checkout | The assistant completes the purchase inside the conversation | Emerging; real but provider-specific |

## Crawled product schema

The baseline. Accurate `Product` JSON-LD with real offers, price, currency, availability, and identifiers on a crawlable page is what every AI surface can consume without any enrollment. All rules in [structured-data.md](structured-data.md) apply; price and availability in schema must match the visible page.

## Declared merchant feeds

ChatGPT Shopping indexes a feed provided directly by the merchant (CSV, TSV, XML, or JSON; refresh accepted as often as every 15 minutes), which controls pricing and availability accuracy independently of crawling. Discovery via the feed is free for merchants. When auditing an e-commerce site that cares about AI shopping visibility:

- report whether product pages are crawlable and carry valid `Product` schema (this audit can verify it);
- note that feed enrollment is a platform-side merchant action this audit cannot verify, and list it under third-party actions;
- never claim the feed guarantees inclusion, ranking, or recommendation.

## Agentic checkout

The Agentic Commerce Protocol (ACP, co-developed by OpenAI and Stripe, Apache 2.0) powers in-conversation purchases such as ChatGPT Instant Checkout. Treat it like any consequential agent action from [agentic-web.md](agentic-web.md): server-side authorization, validation, idempotency, and clear confirmation states. It is an integration project with the merchant's commerce stack and payment provider, not a page-level fix — scope it separately from the page audit.

## Audit posture

- The page audit verifies the crawled surface only. Feed enrollment and checkout protocols are external actions; report them as such.
- Blocking AI-search crawlers (see the crawler classes in [agentic-web.md](agentic-web.md)) also removes product pages from AI shopping answers that rely on crawling.
- Keep one source of truth: schema, feed, and visible page must not disagree on price or availability. Disagreement is a defect even when each channel works in isolation.
- Label every provider-specific program with its current maturity and verify current provider documentation before recommending enrollment.
