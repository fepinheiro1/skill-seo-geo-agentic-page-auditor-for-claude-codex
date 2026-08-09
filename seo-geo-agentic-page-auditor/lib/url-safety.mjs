import dns from 'node:dns/promises';
import net from 'node:net';
import ipaddr from 'ipaddr.js';

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);
const NON_CANONICAL_QUERY_KEYS = new Set(['gclid', 'fbclid', 'msclkid', 'ttclid', 'ts', 'nocache', '_', 'cachebust', 'cache_bust']);

export function isPublicIp(value) {
  try {
    const address = ipaddr.parse(value);
    return address.range() === 'unicast';
  } catch {
    return false;
  }
}

export async function assertSafePublicUrl(value, options = {}) {
  const url = value instanceof URL ? new URL(value) : new URL(value);
  if (!SAFE_PROTOCOLS.has(url.protocol)) throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  if (url.username || url.password) throw new Error('URLs containing credentials are not allowed.');

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!hostname) throw new Error('URL hostname is required.');
  if (options.allowPrivateNetwork) return url;
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error(`Private or local hostname is blocked: ${hostname}`);
  }

  const addresses = net.isIP(hostname)
    ? [{ address: hostname }]
    : await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error(`Private, reserved or unresolved destination is blocked: ${hostname}`);
  }
  return url;
}

export function createUrlGuard(options = {}) {
  const cache = new Map();
  return async (value) => {
    const url = value instanceof URL ? value : new URL(value);
    const key = `${url.protocol}//${url.host}`;
    if (!cache.has(key)) cache.set(key, assertSafePublicUrl(url, options));
    await cache.get(key);
    return url;
  };
}

export async function safeFetch(value, options = {}) {
  const guard = options.guard || createUrlGuard({ allowPrivateNetwork: options.allowPrivateNetwork });
  const maximumRedirects = options.maximumRedirects ?? 5;
  let current = await guard(value);

  for (let redirectCount = 0; redirectCount <= maximumRedirects; redirectCount += 1) {
    const response = await fetch(current, {
      ...options.fetchOptions,
      redirect: 'manual',
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;

    const location = response.headers.get('location');
    if (!location) return response;
    if (redirectCount === maximumRedirects) throw new Error(`Redirect limit exceeded for ${value}`);
    current = await guard(new URL(location, current));
  }

  throw new Error(`Unable to fetch ${value}`);
}

export function normalizedUrl(value, base) {
  const url = new URL(value, base);
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
  const entries = [...url.searchParams.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    return leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue);
  });
  url.search = '';
  for (const [key, entryValue] of entries) url.searchParams.append(key, entryValue);
  return url.toString();
}

export function sameUrl(left, right, base) {
  try {
    return normalizedUrl(left, base) === normalizedUrl(right, base);
  } catch {
    return false;
  }
}

export function defaultCanonicalFor(value) {
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_') || NON_CANONICAL_QUERY_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  return url.toString();
}
