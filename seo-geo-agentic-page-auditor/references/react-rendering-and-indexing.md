# React Rendering and Indexing

## Contents

- Rendering target
- Initial HTML contract
- Status and redirect behavior
- Canonical and URL variants
- Robots, sitemap, and discovery
- React failure patterns
- Framework selection

## Rendering target

Prefer SSR, SSG, or prerendered HTML for indexable public pages. Hydrate for interaction after meaningful HTML arrives. Client-side rendering can be indexed by rendering-capable crawlers, but introduces a second queue and excludes social bots and other no-JavaScript consumers.

Do not use dynamic rendering or user-agent-specific HTML as the normal architecture. If a temporary bot-rendering workaround exists, keep user and crawler semantics equivalent and plan its removal.

## Initial HTML contract

An indexable response should contain before JavaScript:

- useful `<title>` and meta description;
- canonical and robots directives;
- Open Graph and Twitter tags;
- one topic-defining H1;
- meaningful main text, not only an empty root node;
- crawlable `<a href>` links;
- relevant JSON-LD;
- image `src`, dimensions, and alt text for meaningful images.

Compare raw/no-JS HTML with the hydrated DOM. Fail when hydration removes or contradicts canonical, robots, H1, main content, links, or schema.

## Status and redirect behavior

- Return `200` only for a real page.
- Return `404` or `410` for missing content; avoid SPA soft 404s.
- Use `301` or `308` for permanent URL consolidation.
- Use `302` or `307` only for genuinely temporary moves.
- Keep redirect chains to one hop where possible.
- Ensure the destination canonical matches the final preferred URL.
- Do not append volatile cache-busting query parameters to canonical navigation URLs.

## Canonical and URL variants

Choose one policy for trailing slash, scheme, host, case, and tracking parameters. Enforce it across:

- internal links;
- redirects;
- canonical;
- sitemap `<loc>`;
- hreflang;
- OG URL;
- structured-data URL and IDs.

A canonical is a consolidation hint, not a substitute for redirects and clean internal links. Never emit multiple or conflicting canonicals.

## Robots, sitemap, and discovery

- Keep private, preview, debug, search-result, and low-value parameter pages out of the sitemap.
- Include only canonical, indexable, successful URLs.
- Use real content modification dates for `lastmod`; do not stamp every URL on every build.
- Reference sitemap locations in `robots.txt`.
- Use `noindex` in HTML or `X-Robots-Tag`; blocking a URL in robots.txt can prevent crawlers from seeing its `noindex`.
- Use IndexNow as a freshness notification for participating engines, not as an indexing guarantee.
- Maintain crawlable internal links; sitemap inclusion alone does not establish page importance.

## React failure patterns

- A global `index.html` ships generic title, description, and social tags for every route.
- Route metadata runs only in `useEffect`, after social bots have left.
- The initial shell contains `noindex`, expecting React to remove it later.
- The server rewrites every unknown URL to `200` app HTML.
- Metadata registries, sitemap registries, route tables, and prerender lists drift apart.
- A lazy section requires scroll or click before main content or links exist.
- CSS hides desktop media on mobile but React still mounts and downloads it.
- Cached HTML references old metadata while hashed JavaScript contains new values.
- Canonical omits or adds a slash differently from redirects and sitemap.

## Framework selection

Fit the existing system before proposing migration. Prefer the smallest architecture change that can guarantee initial HTML:

- add build-time prerender for stable editorial and marketing routes;
- add route-level SSR for dynamic public data;
- use framework-native metadata and status APIs;
- preserve client-only rendering for authenticated application surfaces.

Do not migrate a marketing site solely to gain metadata APIs when a reliable prerender/build pipeline solves the contract.
