# Verification and Release Gates

## Contents

- Required environments
- Blocker gates
- Search and social gates
- Content and GEO gates
- Performance and accessibility gates
- Post-deploy verification
- Report template

## Required environments

Test the built artifact, not only a development server. For important routes, test:

- local production build or preview;
- deployed production URL;
- mobile and desktop viewport;
- JavaScript disabled and enabled;
- search crawler and social crawler user agents;
- cold navigation and repeat navigation.

## Blocker gates

Fail release for an indexable public page when any applies:

- final response is not `200`;
- WAF/CDN challenge or crawler-specific `403`/`429` occurs;
- redirect loop or unstable URL mutation occurs;
- initial HTML has `noindex` or conflicting robots directives;
- canonical is missing, conflicting, malformed, or points to the wrong page;
- initial HTML is only a generic app shell;
- title, H1, or main content describes another route;
- a missing resource produces a soft 404 with `200`;
- sitemap URL lacks a deployable HTML route;
- crawler responses materially diverge from the user page.

## Search and social gates

Require:

- unique title and useful description in initial HTML;
- one clear H1 and logical headings;
- crawlable internal links to and from the page;
- valid JSON-LD that matches visible content;
- sitemap, canonical, internal links, OG URL, and schema URL use the same preferred variant;
- page-specific OG/Twitter metadata in initial HTML;
- social image is public, correct MIME, 1200x630, nonblank, and legible as a thumbnail;
- robots.txt and infrastructure allow intended search/AI/social crawlers.

Length ranges are warnings, not blockers, unless copy is visibly truncated or loses meaning.

## Content and GEO gates

Require:

- a distinct primary intent;
- direct answers to key questions;
- claims supported by evidence or clearly labeled as inference;
- dates/version context for time-sensitive facts;
- named entities used consistently;
- useful limitations and next steps;
- real contextual internal links;
- no fabricated evidence, authorship, ratings, customers, or statistics;
- FAQ questions and answers visible and page-specific when used.

## Performance and accessibility gates

Require:

- no important layout overlap at target viewports;
- explicit media dimensions or stable aspect ratios;
- no desktop-only heavy media downloaded on mobile when absent;
- LCP asset prioritized intentionally;
- no unexpected autoplay media or large hidden resources;
- all interactive elements have accessible names;
- form controls have labels and errors are programmatically associated;
- keyboard completion of the primary action;
- no severe console or hydration errors.

Use field Core Web Vitals for outcome and lab tests for diagnosis.

## Post-deploy verification

After release:

1. fetch production with no-JS simulated search and social User-Agents, labeling the evidence accurately;
2. confirm status, redirect chain, final URL, and initial HTML;
3. verify canonical, robots, OG, schema, H1, and body text;
4. open the OG image directly and in a social debugger;
5. test URL inspection/live rendering where available;
6. submit or refresh sitemap and use IndexNow where appropriate;
7. request recrawl selectively for strategic Google URLs when useful;
8. monitor indexing, impressions, citations, referrals, and conversion separately.

Do not mark a production task complete before the deployed response is checked. Code readiness and production correctness are different states.

## Report template

```text
Automated outcome: PASS | CONDITIONAL PASS | NEEDS FIXES | FAIL

Blockers:
- ...

Verified:
- environment, URL, timestamp, user agent, status
- initial HTML
- rendered DOM
- sitemap/canonical/robots
- OG image
- schema
- mobile performance/accessibility

Changed:
- ...

External actions:
- deploy, CDN purge/config, Search Console, Bing Webmaster, social re-scrape

Experimental:
- llms.txt, WebMCP, agentic audit observations

Not guaranteed:
- indexing, ranking, rich results, AI citation, cache refresh timing

Methodology limits:
- simulated User-Agent responses are not verified crawler-origin traffic
- lab performance is not field data
- automated schema checks do not replace official validators or human review
```
