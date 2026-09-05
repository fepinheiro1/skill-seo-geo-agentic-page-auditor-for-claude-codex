import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluatePageRobots, evaluateRobots, parseRobots, robotsAvailability } from '../../lib/robots-policy.mjs';

test('uses the longest matching rule and respects Allow exceptions', () => {
  const groups = parseRobots('User-agent: *\nDisallow: /\nAllow: /public/\n');
  const result = evaluateRobots(groups, 'Googlebot/2.1', 'https://example.com/public/page');
  assert.equal(result.allowed, true);
  assert.equal(result.matchedRule.pattern, '/public/');
});

test('Allow wins when matching rules have equal specificity', () => {
  const groups = parseRobots('User-agent: *\nDisallow: /same\nAllow: /same\n');
  assert.equal(evaluateRobots(groups, 'bingbot', 'https://example.com/same').allowed, true);
});

test('a specific user-agent group takes precedence over wildcard groups', () => {
  const groups = parseRobots('User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nDisallow: /private\n');
  assert.equal(evaluateRobots(groups, 'Mozilla compatible Googlebot/2.1', 'https://example.com/private').allowed, false);
  assert.equal(evaluateRobots(groups, 'bingbot', 'https://example.com/private').allowed, true);
});

test('supports wildcard and end-anchor matching', () => {
  const groups = parseRobots('User-agent: *\nDisallow: /*.pdf$\n');
  assert.equal(evaluateRobots(groups, 'Googlebot', 'https://example.com/file.pdf').allowed, false);
  assert.equal(evaluateRobots(groups, 'Googlebot', 'https://example.com/file.pdf?download=1').allowed, true);
});

test('matches equivalent UTF-8 and percent-encoded rule paths', () => {
  for (const pattern of ['/café', '/caf%C3%A9', '/caf%c3%a9']) {
    const groups = parseRobots(`User-agent: *\nDisallow: ${pattern}\n`);
    assert.equal(evaluateRobots(groups, 'Googlebot', 'https://example.com/caf%C3%A9').allowed, false);
  }
});

test('normalizes unreserved escapes without decoding reserved separators', () => {
  const groups = parseRobots('User-agent: *\nDisallow: /%70rivate\nDisallow: /a%2Fb\n');
  assert.equal(evaluateRobots(groups, 'Googlebot', 'https://example.com/private').allowed, false);
  assert.equal(evaluateRobots(groups, 'Googlebot', 'https://example.com/a/b').allowed, true);
  assert.equal(evaluateRobots(groups, 'Googlebot', 'https://example.com/a%2fb').allowed, false);
});

test('combines all applicable meta directives using the most restrictive rule', () => {
  const meta = { robots: ['index,follow', 'max-snippet:100', 'max-snippet:20'], googlebot: ['noindex'] };
  assert.equal(evaluatePageRobots(meta, '', 'googlebot').noindex, true);
  assert.equal(evaluatePageRobots(meta, '', 'bingbot').noindex, false);
  assert.equal(evaluatePageRobots(meta, '', 'googlebot').maxSnippet, 20);
  assert.equal(evaluatePageRobots({ ROBOTS: ['index', 'noindex'] }).noindex, true);
  assert.equal(evaluatePageRobots({ robots: ['indexifembedded'] }).noindex, false);
});

test('scoped header directives do not leak to unrelated crawlers or header fields', () => {
  const header = 'googlebot: noindex, nofollow\nmax-snippet: 0';
  assert.equal(evaluatePageRobots({}, header, 'googlebot').noindex, true);
  assert.equal(evaluatePageRobots({}, header, 'bingbot').noindex, false);
  assert.equal(evaluatePageRobots({}, header, 'bingbot').nosnippet, true);
  assert.equal(evaluatePageRobots({}, 'otherbot: none', 'googlebot').noindex, false);
  assert.equal(evaluatePageRobots({}, 'bingbot: index, googlebot: none', 'googlebot').noindex, true);
});

test('robots status handling distinguishes absence from unavailable policy', () => {
  for (const status of [200, 204]) assert.equal(robotsAvailability(status), 'available');
  for (const status of [401, 403, 404, 410]) assert.equal(robotsAvailability(status), 'absent');
  for (const status of [null, 301, 429, 500, 503]) assert.equal(robotsAvailability(status), 'unavailable');
});
