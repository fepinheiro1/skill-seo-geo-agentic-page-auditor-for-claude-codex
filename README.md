# SEO GEO Agentic Page Auditor

An agent-ready skill for auditing public web pages across technical SEO, GEO, JavaScript rendering, social previews, Core Web Vitals, structured data, and agentic-web readiness.

The goal is simple: treat a page as a multi-consumer artifact. A browser user, Googlebot, Bingbot, social crawlers, AI crawlers, and browser agents often receive different evidence. This skill helps an AI agent prove what each consumer receives before recommending or applying fixes.

Methodology maintained by Performa.AI.

## What It Checks

- Initial HTML versus rendered DOM, especially for React and SPA pages.
- Crawler responses for browser, Googlebot Smartphone, Bingbot, OAI-SearchBot, Facebook, X, and LinkedIn identities.
- Indexing fundamentals: status codes, redirects, canonical, robots, title, description, H1, crawlable body content, sitemap posture, and noindex risk.
- GEO readiness: citation-ready answers, entity clarity, topical clusters, FAQs, visible evidence, and AI-readable page structure.
- Social previews: Open Graph, Twitter/X cards, image dimensions, card text, deterministic 1200x630 social image generation, and social crawler behavior.
- Structured data: JSON-LD presence, relevance, visibility match, and common schema traps.
- Performance: resource weight, hidden media downloads, JavaScript cost, image/video strategy, Core Web Vitals clues, and mobile risk.
- Agentic readiness: accessibility tree, labels, forms, buttons, links, `llms.txt`, WebMCP posture, and safe action design.

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

Reports support `pt-BR` and `en`. Machine-readable issue codes stay in English so results remain comparable across languages.

## Privacy And Limits

The scripts run locally and do not include telemetry. Auditing a public URL naturally sends HTTP requests to that site and may appear in its server logs.

This skill cannot guarantee indexing, ranking, rich results, AI citations, or social cache refreshes. It provides evidence, prioritization, and implementation guidance.

## License

MIT
