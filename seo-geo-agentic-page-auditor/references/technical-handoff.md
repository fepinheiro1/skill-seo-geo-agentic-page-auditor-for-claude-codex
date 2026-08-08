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
