// Both report formats consume site-wide findings, including older reports
// whose lastmod evidence used `detail` instead of `message`.
export function sitemapLevelFindings(report) {
  return [
    ...(report.sitemapIssues || []).map((issue) => ({ severity: 'BLOCKER', ...issue })),
    ...(report.siteIssues || []).map((issue) => ({ severity: 'MEDIUM', ...issue })),
  ].map((issue) => ({
    ...issue,
    message: issue.message || issue.detail || issue.code,
    evidence: issue.evidence ?? { message: issue.message || issue.detail || issue.code },
    urls: [report.sitemap || '-'],
  }));
}
