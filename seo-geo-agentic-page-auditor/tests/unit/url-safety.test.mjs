import assert from 'node:assert/strict';
import test from 'node:test';
import { assertSafePublicUrl, defaultCanonicalFor, isPublicIp, normalizedUrl, sameUrl } from '../../lib/url-safety.mjs';

test('classifies public and non-public addresses', () => {
  assert.equal(isPublicIp('8.8.8.8'), true);
  assert.equal(isPublicIp('127.0.0.1'), false);
  assert.equal(isPublicIp('10.0.0.1'), false);
  assert.equal(isPublicIp('169.254.169.254'), false);
  assert.equal(isPublicIp('::1'), false);
});

test('removes common tracking and cache parameters from the default canonical expectation', () => {
  assert.equal(defaultCanonicalFor('https://example.com/page?utm_source=test&ts=123'), 'https://example.com/page');
  assert.equal(defaultCanonicalFor('https://example.com/search?q=boots'), 'https://example.com/search?q=boots');
});

test('blocks localhost by default and permits explicit local testing', async () => {
  await assert.rejects(() => assertSafePublicUrl('http://localhost:3000/page'), /blocked/);
  assert.equal((await assertSafePublicUrl('http://localhost:3000/page', { allowPrivateNetwork: true })).hostname, 'localhost');
});

test('normalizes fragments, default ports and query ordering without hiding path differences', () => {
  assert.equal(normalizedUrl('https://EXAMPLE.com:443/page?b=2&a=1#part'), 'https://example.com/page?a=1&b=2');
  assert.equal(sameUrl('https://example.com/page', 'https://example.com/page'), true);
  assert.equal(sameUrl('https://example.com/page', 'https://example.com/page/'), false);
});
