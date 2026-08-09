# SEO GEO Agentic Page Auditor

An agent-ready skill for auditing public web pages across technical SEO, GEO, JavaScript rendering, social previews, Core Web Vitals, structured data, and agentic-web readiness.

The goal is simple: treat a page as a multi-consumer artifact. A browser user, search crawlers, social crawlers, AI crawlers, and browser agents may receive different evidence. This skill compares responses to simulated crawler identities and rendered browser behavior before recommending or applying fixes. It does not impersonate or verify requests from official crawler infrastructure.

Methodology maintained by Performa.AI.

## What It Checks

- Initial HTML versus rendered DOM, especially for React and SPA pages, including content mounted only after scrolling.
- Responses to simulated browser, Googlebot Smartphone, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot, Facebook, X, and LinkedIn User-Agents.
- AI crawler policy: an allow/block matrix over robots.txt for three crawler classes — AI training (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, Meta-ExternalAgent, CCBot, Amazonbot), AI search (OAI-SearchBot, Claude-SearchBot, PerplexityBot), and user-triggered fetchers (ChatGPT-User, Claude-User, Perplexity-User) — flagging the classic mistake of blocking citation-critical crawlers while intending to block only training.
- Indexing fundamentals: status codes, redirects, canonical, robots, title, description, H1, document language, crawlable body content, sitemap posture, soft-404 behavior, and noindex risk.
- Snippet controls: `nosnippet`, `max-snippet`, and `data-nosnippet`, which govern both classic previews and Google AI answers.
- Internationalization: hreflang code validity, absolute URLs, and self-reference.
- GEO readiness: citation-ready answers, entity clarity, topical clusters, FAQs, visible evidence, freshness signals, and AI-readable page structure.
- Social previews: Open Graph, Twitter/X cards, image dimensions and aspect ratio, card text, deterministic 1200x630 social image generation, and social crawler behavior.
- Structured data: JSON-LD presence, validity, relevance, visibility match, article dates, and common schema traps.
- Performance: resource weight, hidden media downloads at mobile and desktop viewports, JavaScript cost, main-thread blocking (lab TBT proxy), image/video strategy, Core Web Vitals clues, and mobile risk.
- Agentic readiness: accessibility tree, labels, forms, buttons, links, `llms.txt` (with an evidence-based posture), WebMCP posture, and safe action design.
- AI commerce surfaces: crawled product schema versus declared merchant feeds versus agentic checkout, each labeled with its maturity.
- Sitemap health: per-URL initial HTML, duplicate titles and descriptions, and `lastmod` build-stamping detection.

## Repository Layout

```text
seo-geo-agentic-page-auditor/
  SKILL.md
  agents/
  assets/
  references/
  scripts/
```

Install or copy the `seo-geo-agentic-page-auditor/` folder into the skills directory used by your AI coding environment.

## Requirements

- Node.js 20 or newer.
- Python 3.10 or newer.
- Playwright Chromium for the full page and Open Graph image checks.

Install dependencies from this repository root:

```bash
npm install
npx playwright install chromium
```

Public-network destinations are enforced by default. For a controlled localhost audit, opt in explicitly with `--allow-private-network`. Do not enable that flag for untrusted URLs or inside a sensitive network.

## Quick Start

Audit one public page and generate JSON, HTML, and a developer handoff:

```bash
node seo-geo-agentic-page-auditor/scripts/audit-public-page.mjs \
  --url https://example.com/page \
  --out /tmp/page-audit.json \
  --html /tmp/page-audit.html \
  --handoff /tmp/page-handoff.md \
  --lang pt-BR
```

Audit a sitemap from initial HTML:

```bash
python3 seo-geo-agentic-page-auditor/scripts/audit-sitemap.py \
  --sitemap https://example.com/sitemap.xml \
  --out /tmp/sitemap-audit.json \
  --html /tmp/sitemap-audit.html \
  --handoff /tmp/sitemap-handoff.md \
  --lang en
```

Generate a deterministic 1200x630 social card:

```bash
node seo-geo-agentic-page-auditor/scripts/generate-og-image.mjs \
  --config seo-geo-agentic-page-auditor/assets/og-config.example.json \
  --output /tmp/social-card.png
```

## Reports

The skill can produce three outputs:

- JSON evidence, designed to be the stable source of truth.
- A self-contained HTML report, suitable for stakeholders and print/PDF.
- A technical Markdown handoff, suitable for a developer or another AI agent.

Handoffs redact absolute local paths, distinguish no-JavaScript, hydrated, and post-scroll snapshots, and provide issue-specific recommendations with acceptance criteria and verification steps. Release outcomes use `NEEDS FIXES` whenever a high-priority finding remains.

Reports support `pt-BR` and `en`. Machine-readable issue codes stay in English so results remain comparable across languages.

The HTML report keeps the executive summary concise. Methodology limits and raw evidence remain collapsed under technical details, while the Markdown handoff carries the complete implementation guidance.

## Privacy And Limits

The scripts run locally and do not include telemetry. Auditing a public URL naturally sends HTTP requests to that site and may appear in its server logs.

This skill cannot guarantee indexing, ranking, rich results, AI citations, verified crawler access, or social cache refreshes. Its crawler matrix uses simulated User-Agent headers from the audit machine. Laboratory performance does not replace CrUX, RUM or INP field data. Structured-data automation covers syntax and common semantic consistency; official validators and human review remain required.

Use the auditor as one evidence layer, not as a global SEO strategy or a standalone publication authority. Sensitive environments should still run it in an isolated container with outbound network controls.

## License

MIT
