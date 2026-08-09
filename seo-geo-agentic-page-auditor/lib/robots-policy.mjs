function normalizeAgent(value) {
  return String(value || '').trim().toLowerCase();
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
  const path = `${url.pathname}${url.search}`;
  const candidates = selected.flatMap((group) => group.rules)
    .filter((rule) => rule.pattern && compileRule(rule.pattern).test(path))
    .map((rule) => ({ ...rule, specificity: rule.pattern.replace(/[\*$]/g, '').length }));

  candidates.sort((left, right) => right.specificity - left.specificity || (left.directive === 'allow' ? -1 : 1));
  const matchedRule = candidates[0] || null;
  return {
    allowed: !matchedRule || matchedRule.directive === 'allow',
    matchedRule,
    matchedAgents: [...new Set(selected.flatMap((group) => group.agents))],
  };
}
