# Changelog

All notable changes to this project are documented here.

## Unreleased

- Combine duplicate and crawler-specific indexing directives, including scoped HTTP headers.
- Distinguish unavailable robots policies from absent rules, preserve crawler exceptions, and normalize UTF-8 paths.
- Check robots policy at the final URL after redirects and label Google-Extended as training and grounding.
- Accept JSON-LD graph envelopes without requiring a type on the container.
- Preserve site-level sitemap findings in HTML and Markdown, including legacy lastmod evidence.
- Record verification coverage and reduce confidence when automated observations are incomplete.
- Separate audit, repair and authorized publication modes; remove unsupported llms.txt statistics.
- Add regression tests for indexing, robots, valid graphs and report consistency.

## 2.0.0 - 2026-08-08

- Prevent false passes when canonical URLs disagree with the expected final URL.
- Evaluate robots rules with longest-match and Allow-tie behavior.
- Add common semantic checks for Product, Article, FAQ, Breadcrumb, Organization and page URL structured data.
- Support gzip sitemaps, the 50 MB uncompressed limit, 50,000 URLs, retries and non-space-delimited languages.
- Block private, loopback, reserved and metadata-network destinations by default, including redirect revalidation.
- Label crawler checks accurately as simulated User-Agent requests.
- Keep executive HTML reports concise while preserving expandable technical evidence and Markdown handoffs.
- Add deterministic unit and integration tests, pinned dependencies, GitHub Actions and security guidance.

## 1.0.0 - 2026-08-07

- Initial public release.
