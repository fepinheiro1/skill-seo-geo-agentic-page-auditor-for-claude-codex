function normalizeAgent(value) {
  return String(value || '').trim().toLowerCase();
}

// REP compares encoded octets. Decode only unreserved escapes: %2F must
// remain distinct from a path separator, while %70 and p are equivalent.
function normalizeRobotsPath(value) {
  return value.replace(/[^\x00-\x7F]/gu, (character) => encodeURIComponent(character))
    .replace(/%[0-9a-f]{2}/gi, (escape) => {
      const character = String.fromCharCode(parseInt(escape.slice(1), 16));
      return /^[a-z0-9._~-]$/i.test(character) ? character : escape.toUpperCase();
    });
}

export function evaluatePageRobots(meta, header, userAgent = '') {
  const agent = normalizeAgent(userAgent);
  const values = Object.entries(meta || {})
    .filter(([key]) => key.toLowerCase() === 'robots' || (agent && key.toLowerCase() === agent))
    .flatMap(([, value]) => Array.isArray(value) ? value : [value]);

  // Repeated HTTP headers are newline-separated by Playwright. Agent scope
  // persists within a field, but does not leak into the next header field.
  for (const line of String(header || '').split('\n')) {
    let scope = '';
    for (const part of line.split(',')) {
      let directive = part.trim().toLowerCase();
      const prefix = directive.match(/^([a-z][a-z0-9_-]*|\*):\s*(.*)$/);
      if (prefix && !['max-snippet', 'max-image-preview', 'max-video-preview', 'unavailable_after'].includes(prefix[1])) {
        scope = prefix[1];
        directive = prefix[2];
      }
      if (!scope || scope === '*' || scope === agent) values.push(directive);
    }
  }
  const directives = values.flatMap((value) => String(value).toLowerCase().split(/[,\n]/)).map((value) => value.trim()).filter(Boolean);
  const tokens = directives.flatMap((value) => value.split(/\s+/));
  const snippetLimits = directives.flatMap((value) => [...value.matchAll(/\bmax-snippet\s*:\s*(-?\d+)/g)].map((match) => Number(match[1]))).filter((value) => value >= 0);
  const maxSnippet = snippetLimits.length ? Math.min(...snippetLimits) : null;
  return {
    directives,
    noindex: tokens.includes('noindex') || tokens.includes('none'),
    nosnippet: tokens.includes('nosnippet') || maxSnippet === 0,
    maxSnippet,
  };
}

export function robotsAvailability(status) {
  if (status >= 200 && status < 300) return 'available';
  // Google treats ordinary 4xx responses as absent rules, but 429, server
  // errors and transport failures can suspend crawling or reuse cached rules.
  if (status >= 400 && status < 500 && status !== 429) return 'absent';
  return 'unavailable';
}

function compileRule(pattern) {
  const anchored = pattern.endsWith('$');
  const source = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = source.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${escaped}${anchored ? '$' : ''}`);
}

export function parseRobots(text) {
  const groups = [];
  let current = null;
  let rulesStarted = false;

  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === 'user-agent') {
      if (!current || rulesStarted) {
        current = { agents: [], rules: [] };
        groups.push(current);
        rulesStarted = false;
      }
      current.agents.push(normalizeAgent(value));
      continue;
    }

    if ((key === 'allow' || key === 'disallow') && current) {
      rulesStarted = true;
      if (value || key === 'allow') current.rules.push({ directive: key, pattern: value });
    }
  }

  return groups;
}

export function evaluateRobots(groups, userAgent, targetUrl) {
  const agent = normalizeAgent(userAgent);
  const matching = groups
    .map((group) => ({
      group,
      specificity: Math.max(0, ...group.agents.map((token) => token === '*' ? 0 : agent.includes(token) ? token.length : -1)),
    }))
    .filter(({ specificity, group }) => specificity >= 0 && group.agents.some((token) => token === '*' || agent.includes(token)));
  if (!matching.length) return { allowed: true, matchedRule: null, matchedAgents: [] };

  const bestSpecificity = Math.max(...matching.map(({ specificity }) => specificity));
  const selected = matching.filter(({ specificity }) => specificity === bestSpecificity).map(({ group }) => group);
  const url = new URL(targetUrl);
  const path = normalizeRobotsPath(`${url.pathname}${url.search}`);
  const candidates = selected.flatMap((group) => group.rules)
    .filter((rule) => rule.pattern && compileRule(normalizeRobotsPath(rule.pattern)).test(path))
    .map((rule) => ({ ...rule, specificity: normalizeRobotsPath(rule.pattern).replace(/[\*$]/g, '').length }));

  candidates.sort((left, right) => right.specificity - left.specificity || (left.directive === 'allow' ? -1 : 1));
  const matchedRule = candidates[0] || null;
  return {
    allowed: !matchedRule || matchedRule.directive === 'allow',
    matchedRule,
    matchedAgents: [...new Set(selected.flatMap((group) => group.agents))],
  };
}
