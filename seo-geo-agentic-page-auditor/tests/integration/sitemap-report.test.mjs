import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../scripts/audit-sitemap.py', import.meta.url));

test('sitemap CLI preserves repeated indexing headers and site-level findings in all outputs', { timeout: 30000 }, async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'seo-sitemap-report-'));
  const server = http.createServer((request, response) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    if (request.url === '/sitemap.xml') {
      response.writeHead(200, { 'content-type': 'application/xml' });
      return response.end(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Array.from({ length: 20 }, (_, index) => `<url><loc>${origin}/page-${index}</loc><lastmod>2026-09-01</lastmod></url>`).join('')}</urlset>`);
    }
    response.writeHead(200, { 'content-type': 'text/html', 'x-robots-tag': ['googlebot: noindex', 'follow'] });
    response.end(`<html lang="en"><head><title>${request.url}</title><meta name="description" content="Description for ${request.url}"><link rel="canonical" href="${origin}${request.url}"><meta property="og:image" content="${origin}/og.png"><meta name="twitter:image" content="${origin}/og.png"></head><body><h1>Fixture</h1>${'Useful content. '.repeat(90)}</body></html>`);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const json = path.join(directory, 'audit.json');
  const html = path.join(directory, 'audit.html');
  const markdown = path.join(directory, 'audit.md');
  const child = spawn('python3', [script, '--sitemap', `http://127.0.0.1:${server.address().port}/sitemap.xml`, '--allow-private-network', '--out', json, '--html', html, '--handoff', markdown]);
  t.after(() => { if (child.exitCode === null) child.kill(); });
  let stderr = '';
  child.stdout.resume();
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const [exitCode] = await once(child, 'exit');
  assert.ok(await fs.stat(json).catch(() => null), stderr);
  assert.equal(exitCode, 1, stderr);
  const report = JSON.parse(await fs.readFile(json, 'utf8'));
  assert.equal(report.urlCount, 20);
  assert.equal(report.issueCounts['noindex-in-sitemap'], 20);
  assert.equal(report.siteIssues[0].code, 'lastmod-uniform');
  assert.equal(report.siteIssues[0].severity, 'MEDIUM');
  for (const output of [html, markdown]) {
    const content = await fs.readFile(output, 'utf8');
    assert.ok(content.includes('lastmod-uniform'));
    assert.ok(content.includes('noindex-in-sitemap'));
  }
});
