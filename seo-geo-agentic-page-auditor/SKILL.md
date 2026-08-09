---
name: seo-geo-agentic-page-auditor
description: Audit, repair, and publish public web pages for technical SEO, JavaScript rendering, crawlability, indexing, GEO and AI citations, Open Graph and social previews, structured data, Core Web Vitals, accessibility-tree quality, and experimental agentic-web readiness. Use for React or other JavaScript sites, SEO regressions, pages missing from search, generic social cards, FAQ and schema work, crawler/HTML mismatches, sitemap or canonical problems, excessive image/video/script loading, and pre-publish quality gates.
---

# SEO GEO Agentic Page Auditor

Treat a public page as a multi-consumer artifact. Compare what a person, a no-JavaScript request using simulated crawler identities, a rendering browser, a social identity, and a browser agent receive. Do not describe simulated User-Agent requests as verified crawler traffic, and do not approve a page from source-code inspection alone.

## Operating principles

1. Preserve the existing product and marketing design unless the user authorizes visual or copy changes.
2. Prefer one semantic page for users and crawlers. Do not use user-agent cloaking or crawler-only copy.
3. Put critical metadata and topic-defining content in the initial HTML. Client-side metadata is a fallback, not the target.
4. Distinguish discovery, crawling, rendering, indexing, ranking, citation, and conversion. Passing one stage does not prove the next.
5. Treat fixed character counts and word counts as heuristics, not ranking laws. Judge clarity, intent coverage, evidence, and truncation risk.
6. Treat `llms.txt`, WebMCP, and Lighthouse Agentic Browsing as experimental enhancements. Never present them as ranking requirements.
7. Never promise indexing, rankings, rich results, AI citations, or social cache refreshes.

## Read the relevant references

- Read [react-rendering-and-indexing.md](references/react-rendering-and-indexing.md) for React, SPA, SSR, SSG, hydration, status, canonical, redirect, sitemap, or crawler problems.
- Read [geo-content-and-faq.md](references/geo-content-and-faq.md) for content architecture, FAQs, evidence, entities, citation-ready answers, and content clusters.
- Read [social-graph-and-images.md](references/social-graph-and-images.md) before creating or changing OG/Twitter images or image SEO.
- Read [performance-and-assets.md](references/performance-and-assets.md) for Core Web Vitals, scripts, fonts, images, video, hidden components, or loading behavior.
- Read [structured-data.md](references/structured-data.md) before adding or changing JSON-LD.
- Read [agentic-web.md](references/agentic-web.md) for AI crawlers, accessibility trees, `llms.txt`, WebMCP, forms, or browser agents.
- Read [ai-commerce-surfaces.md](references/ai-commerce-surfaces.md) for e-commerce pages that care about AI shopping visibility: crawled product schema, merchant product feeds, and agentic checkout.
- Read [verification-and-release-gates.md](references/verification-and-release-gates.md) before declaring a page ready.
- Read [technical-handoff.md](references/technical-handoff.md) when the user wants an implementation brief for a developer or another AI.
- Read [evidence-sources.md](references/evidence-sources.md) when current standards or claims must be verified online.

## Workflow

### 1. Discover the page contract

Inspect the repository before editing. Identify:

- framework and rendering mode;
- route source, route variants, dynamic parameters, and not-found behavior;
- metadata source of truth;
- sitemap and prerender/build registries;
- page class: indexable editorial, indexable marketing, transactional, private/app, preview/debug, redirect, or short link;
- expected canonical, robots policy, schema type, social image policy, and internal-link cluster;
- deployment, CDN, cache, and redirect layers that can change the production response.

Write concrete success criteria before implementation. For an indexable public page, require at minimum a final `200`, unique initial-HTML title and description, self-consistent canonical, one useful H1, indexable robots policy, crawlable body content, valid relevant JSON-LD, sitemap and static-render coverage when applicable, internal links, and page-specific social tags.

### 2. Observe the real response

The Node scripts require the `playwright` package. Run them from a directory whose `node_modules` already provides Playwright, or run `npm install` once inside the skill directory (a `package.json` is included) and `npx playwright install chromium` if no Chromium build is present.

Run the page auditor when Playwright is available. Public-network destinations are enforced by default. Use `--allow-private-network` only for a controlled localhost test and never for an untrusted URL or inside a sensitive network:

```bash
node scripts/audit-public-page.mjs \
  --url https://example.com/page \
  --out /tmp/page-audit.json \
  --html /tmp/page-audit.html \
  --lang pt-BR
```

When a canonical URL is intentionally different from the requested URL, pass the expected preferred URL explicitly with `--expected-canonical`. Otherwise the final URL after redirects is treated as the expected canonical.

The audit compares no-JavaScript and rendered output, uses simulated search, AI-search and social User-Agents, records redirects, checks canonical, social metadata, schema, hreflang and snippet controls, and evaluates robots.txt across AI training, AI-search and user-triggered crawler classes. It also probes llms.txt and soft-404 behavior, measures loaded resources at mobile and desktop viewports, detects meaningful content mounted only after scrolling, and flags response divergence. The JSON is the machine-readable evidence source; the self-contained HTML is the responsive, printable stakeholder report. Use production and local URLs when both matter.

For a site-wide initial-HTML pass:

```bash
python3 scripts/audit-sitemap.py \
  --sitemap https://example.com/sitemap.xml \
  --out /tmp/sitemap-audit.json \
  --html /tmp/sitemap-audit.html \
  --lang pt-BR
```

Do not infer production behavior from a local React route. Confirm the deployed response after release.

### 3. Fix the earliest broken stage

Work in this order:

1. reachability, WAF/CDN blocks, status, redirect loop, and final URL;
2. robots and indexability;
3. canonical and duplicate URL variants;
4. initial HTML and rendering;
5. title, description, H1, visible content, and internal links;
6. structured data and image discoverability;
7. social preview;
8. performance and agentic enhancements.

Do not spend time polishing schema or OG while crawlers receive `403`, a SPA shell, `noindex`, or the wrong canonical.

### 4. Build citation-ready content

Create one clear intent per canonical URL. Lead important sections with a direct answer, then support it with explanation, evidence, examples, limitations, dates, and source provenance. Use descriptive headings, comparison tables where useful, and entities named consistently across text, metadata, images, and schema.

FAQs must answer real follow-up questions. Keep answers visible in HTML and useful without relying on FAQ rich results. Add FAQPage schema only when it truthfully represents visible page content and is appropriate for the publisher.

### 5. Generate the social image

Use the deterministic generator for page-specific 1200x630 cards:

```bash
node scripts/generate-og-image.mjs \
  --config assets/og-config.example.json \
  --output /tmp/social-card.png
```

Adapt the config to the site's real brand assets. Inspect the PNG at full size and as a small preview. Keep the social card separate from the page's primary content image when text-heavy social artwork would be poor image-search material.

### 6. Apply performance budgets

Measure before and after. Pay special attention to resources mounted inside CSS-hidden components: hidden images and autoplay video can still download. Gate large media by viewport when it is absent from the mobile experience. Preserve motion with short, muted preview encodes when motion is essential; do not replace meaningful media with a static poster without approval.

### 7. Evaluate agentic readiness

First make semantic HTML, links, buttons, labels, forms, landmarks, focus behavior, and the accessibility tree reliable. Then consider a curated `llms.txt`. Evaluate WebMCP only for real user-facing actions and label it experimental. Require authorization, confirmation, validation, idempotency, least privilege, and safe outputs for consequential tools.

### 8. Verify and report

Run the release gates in [verification-and-release-gates.md](references/verification-and-release-gates.md). Report separately:

- verified facts;
- implemented changes;
- tests performed and their environment;
- production or third-party actions still required;
- experimental recommendations;
- residual risks and what cannot be guaranteed.

Do not declare success because the visual browser looks correct. A page passes the automated scope only when its initial HTML, rendered DOM, simulated crawler responses, social image, and build/deploy artifacts agree. Verified crawler access, field performance, indexing, rankings, rich-result eligibility and AI citations require external evidence.

After presenting the diagnosis, ask whether the user wants a complete technical Markdown handoff for the developer or AI responsible for the site. Do not generate it automatically unless the user requested it or passed `--handoff`. Generate it from the same JSON evidence source:

```bash
node scripts/generate-technical-handoff.mjs \
  --report /tmp/page-audit.json \
  --output /tmp/page-handoff.md \
  --lang pt-BR
```

Both audit commands also accept `--handoff /tmp/handoff.md` when the user requests the HTML, JSON, and technical handoff together.

## Output format

For audits, preserve the JSON report as the evidence source and generate the self-contained HTML report for review. The HTML must remain neutral throughout the report body, place methodology branding only in the footer, escape all audited values, work without external assets, support mobile and print layouts, and retain expandable technical evidence. Use the Markdown handoff as the execution document after user confirmation. It may be regenerated from an existing JSON report:

```bash
node scripts/render-html-report.mjs \
  --report /tmp/page-audit.json \
  --output /tmp/page-audit.html \
  --lang pt-BR
```

The HTML report supports `pt-BR` and `en`; `pt-BR` is the default. Keep its executive section plain-language and concise. Put machine-readable codes and raw evidence inside collapsed technical details, and reserve the Markdown handoff for full implementation instructions. Keep issue codes stable in English so reports remain comparable across languages.

Lead findings with severity and evidence. For implementation, summarize changed behavior and verification. Use these severity levels:

- `BLOCKER`: prevents crawling, correct indexing, or safe operation.
- `HIGH`: creates wrong canonical/indexing/social output or hides main content from non-JS consumers.
- `MEDIUM`: weakens understanding, citation readiness, accessibility, or performance materially.
- `LOW`: polish, heuristic, or experimental opportunity.

Methodology maintained by Performa.AI.
