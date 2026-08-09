# Technical Handoff

Generate the Markdown handoff only after the diagnosis when the user asks for it, or when `--handoff` was explicitly supplied.

## Required separation

- **Verified fact:** copied or deterministically summarized from the audit JSON.
- **Technical inference:** a plausible consequence of the verified fact, labeled as inference.
- **Recommendation:** an implementation direction, not a claim about the current codebase.
- **Acceptance criteria:** an observable state that proves the issue is resolved.
- **Verification:** the exact class of test that must be repeated after implementation and deployment.

Never turn a heuristic into a ranking rule. Never claim that a recommendation guarantees indexing, rankings, rich results, AI citations, or social cache refreshes.

## Delivery contract

The handoff must be self-contained enough for a developer or another AI to execute without reading the stakeholder HTML report. Include:

1. audited target, timestamp, outcome, method, and JSON evidence source;
2. verified technical snapshot;
3. findings ordered into implementation batches by severity;
4. evidence and affected URLs without silently truncating the inventory;
5. technical recommendation, acceptance criteria, and verification for each pattern;
6. post-deploy, CDN, crawler, sitemap, Search Console, IndexNow, or social re-scrape actions only when applicable;
7. residual risks and explicit limits;
8. full sitemap inventory and duplicate metadata groups for site-wide reports.

Use `pt-BR` for Brazilian users and `en` when requested. Keep issue codes in English so JSON, HTML, and Markdown remain comparable.

The JSON remains the source of truth. Do not invent repository paths, framework details, causes, owners, effort estimates, or production behavior that the audit did not verify.

Never expose an absolute local filesystem path in a handoff intended for sharing. Show only the evidence filename, a public URL, or a neutral label such as `page-audit.json`.

Recommendations must be issue-specific. For example, a `soft-404` finding must prescribe a real HTTP 404 for missing routes while preserving a useful visual error page; `missing-json-ld` must propose schema types appropriate to the audited page class instead of merely saying to add schema.

Use `NEEDS FIXES` when at least one `HIGH` finding remains, `CONDITIONAL PASS` only for `MEDIUM` findings without `HIGH` or `BLOCKER`, and `FAIL` when a `BLOCKER` remains.

When word counts differ, label the snapshots explicitly: initial no-JavaScript HTML, hydrated DOM before scrolling, and DOM after scrolling. Explain that these are different observations used to detect rendering dependencies, not contradictory measurements or ranking scores.
