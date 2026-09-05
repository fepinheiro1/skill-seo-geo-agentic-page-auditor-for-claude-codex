import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../scripts/audit-public-page.mjs', import.meta.url));

async function auditFixture(t, options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'seo-policy-'));
  const server = http.createServer((request, response) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (request.url === '/robots.txt') {
      response.writeHead(options.robotsStatus || 200, { 'content-type': 'text/plain' });
      return response.end(options.robots || `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml`);
    }
    if (request.url === '/start') {
      response.writeHead(301, { location: `${origin}/page` });
      return response.end();
    }
    if (request.url === '/og.svg') {
      response.writeHead(200, { 'content-type': 'image/svg+xml' });
      return response.end('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="blue"/></svg>');
    }
    if (request.url !== '/page') {
      response.writeHead(404);
      return response.end('Not found');
    }
    const headers = { 'content-type': 'text/html', ...options.headers };
    if (options.googlebotHeader && /Googlebot/i.test(request.headers['user-agent'] || '')) headers['x-robots-tag'] = 'noindex';
    response.writeHead(200, headers);
    const graph = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebPage', url: `${origin}/page` }] };
    response.end(`<!doctype html><html lang="en"><head><title>Policy fixture</title><meta name="description" content="Controlled page for indexing tests."><meta name="robots" content="index,follow">${options.meta || ''}<link rel="canonical" href="${origin}/page"><meta property="og:title" content="Policy fixture"><meta property="og:description" content="Indexing tests"><meta property="og:url" content="${origin}/page"><meta property="og:image" content="${origin}/og.svg"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Policy fixture"><meta name="twitter:description" content="Indexing tests"><meta name="twitter:image" content="${origin}/og.svg"><script type="application/ld+json">${JSON.stringify(graph)}</script></head><body><main><h1>Policy fixture</h1><p>${'This fixture includes useful visible content and a clear internal link. '.repeat(20)}</p><a href="/help">Help</a></main></body></html>`);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const reportPath = path.join(directory, 'report.json');
  const htmlPath = path.join(directory, 'report.html');
  const handoffPath = path.join(directory, 'handoff.md');
  const child = spawn(process.execPath, [script, '--url', `http://127.0.0.1:${server.address().port}/${options.redirect ? 'start' : 'page'}`, '--allow-private-network', '--out', reportPath, '--html', htmlPath, '--handoff', handoffPath, '--lang', 'en']);
  t.after(() => { if (child.exitCode === null) child.kill(); });
  let stderr = '';
  child.stdout.resume();
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const [exitCode] = await once(child, 'exit');
  assert.ok(await fs.stat(reportPath).catch(() => null), `Audit failed before reporting: ${stderr}`);
  return {
    exitCode,
    report: JSON.parse(await fs.readFile(reportPath, 'utf8')),
    html: await fs.readFile(htmlPath, 'utf8'),
    handoff: await fs.readFile(handoffPath, 'utf8'),
  };
}

test('indexing policy regressions', { timeout: 180000 }, async (t) => {
  await t.test('a valid graph and unrelated crawler restriction remain eligible', async (t) => {
    const { report, exitCode } = await auditFixture(t, { headers: { 'x-robots-tag': 'otherbot: noindex' } });
    assert.equal(exitCode, 0);
    assert.equal(report.outcome, 'PASS');
    assert.ok(!report.issues.some((issue) => issue.code === 'schema-missing-type'));
  });
  for (const [name, options] of [
    ['second meta robots', { meta: '<meta name="robots" content="noindex">' }],
    ['Googlebot-specific meta', { meta: '<meta name="googlebot" content="noindex">' }],
    ['Googlebot-specific HTTP response', { googlebotHeader: true }],
    ['repeated HTTP headers', { headers: { 'x-robots-tag': ['googlebot: noindex', 'follow'] } }],
  ]) {
    await t.test(`blocks publication for ${name}`, async (t) => {
      const { report, exitCode, html, handoff } = await auditFixture(t, options);
      assert.equal(exitCode, 1);
      assert.equal(report.outcome, 'FAIL');
      assert.ok(report.issues.some((issue) => issue.code === 'noindex' && issue.evidence.userAgent === 'googlebot-smartphone'));
      assert.ok(html.includes('noindex'));
      assert.ok(handoff.includes('noindex'));
    });
  }
  for (const robotsStatus of [404, 429, 503]) {
    await t.test(`distinguishes robots HTTP ${robotsStatus}`, async (t) => {
      const { report, exitCode } = await auditFixture(t, { robotsStatus });
      assert.equal(exitCode, robotsStatus === 404 ? 0 : 1);
      assert.equal(report.confidence.level, robotsStatus === 404 ? 'HIGH' : 'MEDIUM');
      assert.equal(report.checks.find((check) => check.id === 'robots-policy').status, robotsStatus === 404 ? 'verified' : 'not-verified');
    });
  }
  await t.test('wildcard block preserves the explicit Googlebot exception', async (t) => {
    const { report } = await auditFixture(t, { robots: 'User-agent: *\nDisallow: /\nUser-agent: Googlebot\nAllow: /' });
    assert.ok(!report.issues.some((issue) => issue.code === 'robots-disallow-all'));
    const blocked = report.issues.find((issue) => issue.code === 'search-crawler-blocked-robots');
    assert.deepEqual(blocked.evidence.map((item) => item.crawler), ['Bingbot']);
  });
  await t.test('uses the destination path when evaluating robots after a redirect', async (t) => {
    const { report } = await auditFixture(t, { redirect: true, robots: 'User-agent: *\nDisallow: /page' });
    assert.ok(report.issues.some((issue) => issue.code === 'search-crawler-blocked-robots'));
    assert.ok(report.origin.aiCrawlerPolicy.find((entry) => entry.crawler === 'Googlebot').allowed === false);
  });
});
