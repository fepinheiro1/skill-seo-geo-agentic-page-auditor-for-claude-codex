import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRobots, parseRobots } from '../../lib/robots-policy.mjs';

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
