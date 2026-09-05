import assert from 'node:assert/strict';
import test from 'node:test';
import { renderHtmlReport } from '../../scripts/render-html-report.mjs';
import { renderTechnicalHandoff } from '../../scripts/generate-technical-handoff.mjs';

test('site-level sitemap findings survive HTML and Markdown rendering in both languages', () => {
  const report = {
    reportVersion: 2,
    generatedAt: '2026-09-05T00:00:00Z',
    sitemap: 'https://example.com/sitemap.xml',
    urlCount: 20,
    failingUrlCount: 0,
    issueCounts: {},
    siteIssues: [{ code: 'lastmod-uniform', severity: 'MEDIUM', detail: '20 of 20 dates match <script>alert(1)</script>.' }],
    results: [],
  };
  for (const lang of ['en', 'pt-BR']) {
    const html = renderHtmlReport(report, { lang });
    const markdown = renderTechnicalHandoff(report, { lang });
    assert.ok(html.includes('lastmod-uniform'));
    assert.ok(markdown.includes('lastmod-uniform'));
    assert.ok(markdown.includes('`CONDITIONAL PASS`'));
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  }
});
