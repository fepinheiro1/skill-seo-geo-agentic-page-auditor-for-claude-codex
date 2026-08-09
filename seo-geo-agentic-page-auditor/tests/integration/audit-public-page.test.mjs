import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const auditScript = path.join(skillRoot, 'scripts/audit-public-page.mjs');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X9W4WQAAAABJRU5ErkJggg==', 'base64');

test('a controlled bad page cannot receive PASS', { timeout: 60000 }, async () => {
  const repeatedCopy = Array.from({ length: 18 }, () => 'This visible product page contains useful account information and links for customers.').join(' ');
  const server = http.createServer((request, response) => {
    if (request.url === '/robots.txt') {
      response.writeHead(200, { 'content-type': 'text/plain' });
      return response.end('User-agent: *\nDisallow: /\nAllow: /page\n');
    }
    if (request.url === '/og.png') {
      response.writeHead(200, { 'content-type': 'image/png' });
      return response.end(png);
    }
    if (request.url === '/page') {
      const origin = `http://127.0.0.1:${server.address().port}`;
      const html = `<!doctype html><html lang="en"><head><title>Global Account</title><meta name="description" content="A clear account page."><meta name="robots" content="index,follow"><link rel="canonical" href="${origin}/wrong"><meta property="og:title" content="Global Account"><meta property="og:description" content="A clear account page."><meta property="og:url" content="${origin}/also-wrong"><meta property="og:image" content="${origin}/og.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Global Account"><meta name="twitter:description" content="A clear account page."><meta name="twitter:image" content="${origin}/og.png"><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: 'Global Account', url: `${origin}/another-page`, offers: { '@type': 'Offer', price: 'invalid', priceCurrency: 'US' } })}</script></head><body><main><h1>Global Account</h1><p>${repeatedCopy}</p><a href="/help">Help</a></main></body></html>`;
      response.writeHead(200, { 'content-type': 'text/html' });
      return response.end(html);
    }
    response.writeHead(404, { 'content-type': 'text/html' });
    return response.end('<h1>Not found</h1>');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'seo-audit-test-'));
  const reportPath = path.join(temporaryDirectory, 'report.json');
  const htmlPath = path.join(temporaryDirectory, 'report.html');
  const target = `http://127.0.0.1:${server.address().port}/page`;
  const child = spawn(process.execPath, [auditScript, '--url', target, '--allow-private-network', '--out', reportPath, '--html', htmlPath, '--lang', 'en'], { cwd: skillRoot });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const [exitCode] = await once(child, 'exit');
  server.close();

  assert.equal(exitCode, 1, stderr);
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  const codes = report.issues.map((issue) => issue.code);
  assert.notEqual(report.outcome, 'PASS');
  assert.ok(codes.includes('canonical-mismatch'));
  assert.ok(codes.includes('social-url-mismatch'));
  assert.ok(codes.includes('schema-page-url-mismatch'));
  assert.ok(codes.includes('schema-invalid-price'));
  assert.ok(codes.includes('schema-invalid-currency'));
  assert.ok(!codes.includes('robots-disallowed'));
  const html = await fs.readFile(htmlPath, 'utf8');
  assert.match(html, /Automated audit result/);
  assert.match(html, /PASS IN AUTOMATED SCOPE|FAILED AUTOMATED CHECKS|FIXES REQUIRED/);
  assert.match(html, /Methodology limits/);
  assert.match(html, /<details><summary>Technical details<\/summary>/);
});
