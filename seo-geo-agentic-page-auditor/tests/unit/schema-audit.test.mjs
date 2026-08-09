import assert from 'node:assert/strict';
import test from 'node:test';
import { auditStructuredData } from '../../lib/schema-audit.mjs';

test('rejects Product data with another page URL, invalid price and invalid currency', () => {
  const findings = auditStructuredData([{
    index: 0,
    valid: true,
    value: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Global Account',
      url: 'https://example.com/other',
      offers: { '@type': 'Offer', price: 'not-a-number', priceCurrency: 'US' },
    },
  }], {
    canonical: 'https://example.com/page',
    finalUrl: 'https://example.com/page',
    visibleText: 'Global Account',
  });
  const codes = findings.map((finding) => finding.code);
  assert.ok(codes.includes('schema-page-url-mismatch'));
  assert.ok(codes.includes('schema-invalid-price'));
  assert.ok(codes.includes('schema-invalid-currency'));
});

test('accepts a consistent visible Product node', () => {
  const findings = auditStructuredData([{
    index: 0,
    valid: true,
    value: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Global Account',
      url: 'https://example.com/page',
      offers: { '@type': 'Offer', price: '19.90', priceCurrency: 'USD' },
    },
  }], {
    canonical: 'https://example.com/page',
    finalUrl: 'https://example.com/page',
    visibleText: 'Open your Global Account today.',
  });
  assert.deepEqual(findings, []);
});
