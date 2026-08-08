#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { renderTechnicalHandoff } from './generate-technical-handoff.mjs';
import { renderHtmlReport } from './render-html-report.mjs';

const USER_AGENTS = [
  {
    name: 'browser-no-js',
    value: 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile Safari/537.36',
  },
  {
    name: 'googlebot-smartphone',
    value: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  },
  {
    name: 'bingbot',
    value: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/150.0.0.0 Safari/537.36',
  },
  {
    name: 'oai-searchbot',
    value: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
  },
  {
    name: 'claude-searchbot',
    value: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://www.anthropic.com)',
  },
  {
    name: 'perplexitybot',
    value: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
  },
  {
    name: 'facebook',
    value: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  },
  { name: 'x-twitter', value: 'Twitterbot/1.0' },
  { name: 'linkedin', value: 'LinkedInBot/1.0' },
];

// Crawler classes matter because blocking them has opposite consequences:
// blocking training crawlers is a legitimate content policy; blocking AI-search
// crawlers removes the site from AI answers; blocking user-triggered fetchers
// breaks live page opens from assistants (and they may not honor robots.txt).
const AI_CRAWLER_ROSTER = [
  { token: 'Googlebot', class: 'search' },
  { token: 'Bingbot', class: 'search' },
  { token: 'OAI-SearchBot', class: 'ai-search' },
  { token: 'Claude-SearchBot', class: 'ai-search' },
  { token: 'PerplexityBot', class: 'ai-search' },
  { token: 'GPTBot', class: 'ai-training' },
  { token: 'ClaudeBot', class: 'ai-training' },
  { token: 'Google-Extended', class: 'ai-training' },
  { token: 'Applebot-Extended', class: 'ai-training' },
  { token: 'Meta-ExternalAgent', class: 'ai-training' },
  { token: 'CCBot', class: 'ai-training' },
  { token: 'Amazonbot', class: 'ai-training' },
  { token: 'ChatGPT-User', class: 'user-fetch' },
  { token: 'Claude-User', class: 'user-fetch' },
  { token: 'Perplexity-User', class: 'user-fetch' },
];

const HIDDEN_MEDIA_EVAL = () => {
  return [...document.querySelectorAll('img, video, iframe')]
    .map((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      const source = element.currentSrc || element.src || '';
      const hidden = style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0;
      const loaded = element.tagName === 'IMG'
        ? element.complete && element.naturalWidth > 0
        : element.tagName === 'VIDEO'
          ? element.readyState > 0
          : Boolean(source);
      return { tag: element.tagName.toLowerCase(), source, hidden, loaded };
    })
    .filter((item) => item.hidden && item.loaded && item.source);
};

const args = parseArgs(process.argv.slice(2));
if (!args.url) {
  console.error('Usage: node audit-public-page.mjs --url https://example.com/page [--out report.json] [--html report.html] [--handoff handoff.md] [--lang pt-BR|en] [--screenshot page.png]');
  process.exit(2);
}

const targetUrl = new URL(args.url).toString();
const browser = await chromium.launch({ headless: true });

try {
  const [noJs, origin] = await Promise.all([
    Promise.all(USER_AGENTS.map((userAgent) => inspectNoJavaScript(browser, targetUrl, userAgent))),
    inspectOrigin(targetUrl),
  ]);

  const rendered = await inspectRendered(browser, targetUrl, args.screenshot);
  const renderedDesktop = await inspectDesktopResources(browser, targetUrl);
  const issues = analyze({ targetUrl, noJs, rendered, renderedDesktop, origin });
  const report = {
    generatedAt: new Date().toISOString(),
    targetUrl,
    outcome: outcomeFor(issues),
    issues,
    origin,
    noJavaScript: noJs,
    rendered,
    renderedDesktop,
  };

  if (args.out) {
    await fs.mkdir(path.dirname(path.resolve(args.out)), { recursive: true });
    await fs.writeFile(path.resolve(args.out), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (args.html) {
    await fs.mkdir(path.dirname(path.resolve(args.html)), { recursive: true });
    await fs.writeFile(path.resolve(args.html), renderHtmlReport(report, { lang: args.lang }), 'utf8');
  }

  if (args.handoff) {
    await fs.mkdir(path.dirname(path.resolve(args.handoff)), { recursive: true });
    await fs.writeFile(path.resolve(args.handoff), renderTechnicalHandoff(report, { lang: args.lang, source: args.out ? path.resolve(args.out) : 'in-memory audit report' }), 'utf8');
  }

  printSummary(report, args.out, args.html, args.handoff);
  process.exitCode = report.outcome === 'FAIL' ? 1 : 0;
} finally {
  await browser.close();
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--url' || value === '--out' || value === '--html' || value === '--handoff' || value === '--lang' || value === '--screenshot') {
      parsed[value.slice(2)] = values[index + 1];
      index += 1;
    }
  }
  return parsed;
}

async function inspectNoJavaScript(browserInstance, url, userAgent) {
  const context = await browserInstance.newContext({
    javaScriptEnabled: false,
    userAgent: userAgent.value,
    viewport: { width: 390, height: 844 },
    locale: 'en-US',
  });
  const page = await context.newPage();
  const startedAt = Date.now();

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    return {
      userAgent: userAgent.name,
      status: response?.status() ?? null,
      finalUrl: page.url(),
      elapsedMs: Date.now() - startedAt,
      responseHeaders: pickHeaders(response?.headers() || {}),
      document: await collectDocument(page, false),
      error: null,
    };
  } catch (error) {
    return {
      userAgent: userAgent.name,
      status: null,
      finalUrl: page.url(),
      elapsedMs: Date.now() - startedAt,
      responseHeaders: {},
      document: null,
      error: `${error.name}: ${error.message}`,
    };
  } finally {
    await context.close();
  }
}

async function inspectOrigin(url) {
  const base = new URL(url);
  const fetchInfo = async (target, bodyLimit = 4000) => {
    try {
      const response = await fetch(target, {
        redirect: 'follow',
        headers: { 'user-agent': USER_AGENTS[0].value },
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.text();
      return { url: target, status: response.status, finalUrl: response.url, bodySample: body.slice(0, bodyLimit), error: null };
    } catch (error) {
      return { url: target, status: null, finalUrl: null, bodySample: '', error: `${error.name}: ${error.message}` };
    }
  };

  const [robotsTxt, notFoundProbe, llmsTxt] = await Promise.all([
    fetchInfo(new URL('/robots.txt', base.origin).toString(), 200000),
    fetchInfo(new URL('/seo-audit-missing-page-probe-3f9a1c', base.origin).toString()),
    fetchInfo(new URL('/llms.txt', base.origin).toString(), 2000),
  ]);

  // A SPA fallback serves HTML with 200 for any path; a 200 on /llms.txt only
  // counts when the body is actually Markdown-like, not the app shell.
  if (llmsTxt.status === 200 && /^\s*</.test(llmsTxt.bodySample)) {
    llmsTxt.note = 'Returned HTML, not Markdown; likely the SPA fallback rather than a real llms.txt.';
  }

  const aiCrawlerPolicy = robotsTxt.status === 200
    ? buildAiCrawlerPolicy(robotsTxt.bodySample, base.pathname || '/')
    : null;
  return { robotsTxt, notFoundProbe, llmsTxt, aiCrawlerPolicy };
}

function parseRobotsGroups(body) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (current && (field === 'allow' || field === 'disallow')) {
        current.rules.push({ type: field, path: value });
      }
    }
  }
  return groups;
}

function robotsRuleMatches(rulePath, targetPath) {
  if (!rulePath) return false;
  const pattern = rulePath
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  const anchored = pattern.endsWith('\\$') ? `^${pattern.slice(0, -2)}$` : `^${pattern}`;
  try {
    return new RegExp(anchored).test(targetPath);
  } catch {
    return false;
  }
}

function robotsAllows(groups, agentToken, targetPath) {
  const token = agentToken.toLowerCase();
  // Group selection: most specific matching user-agent line wins; '*' is the fallback.
  let selected = null;
  let selectedSpecificity = -1;
  for (const group of groups) {
    for (const agent of group.agents) {
      if (agent === '*') {
        if (selectedSpecificity < 0) { selected = group; selectedSpecificity = 0; }
      } else if (token === agent || token.startsWith(agent)) {
        // A group applies when its name is a prefix of the crawler token
        // ('perplexity' covers PerplexityBot); a longer group name such as
        // 'googlebot-image' must NOT capture the generic Googlebot.
        if (agent.length > selectedSpecificity) { selected = group; selectedSpecificity = agent.length; }
      }
    }
  }
  if (!selected) return { allowed: true, matchedBy: null };
  // Rule selection: longest matching path wins; on a tie, allow wins.
  let best = null;
  for (const rule of selected.rules) {
    if (!robotsRuleMatches(rule.path, targetPath)) continue;
    if (!best
      || rule.path.length > best.path.length
      || (rule.path.length === best.path.length && rule.type === 'allow' && best.type === 'disallow')) {
      best = rule;
    }
  }
  if (!best) return { allowed: true, matchedBy: selected.agents.join(',') };
  return { allowed: best.type === 'allow', matchedBy: selected.agents.join(','), rule: `${best.type}: ${best.path}` };
}

function buildAiCrawlerPolicy(robotsBody, targetPath) {
  const groups = parseRobotsGroups(robotsBody);
  return AI_CRAWLER_ROSTER.map((crawler) => {
    const verdict = robotsAllows(groups, crawler.token, targetPath);
    return { crawler: crawler.token, class: crawler.class, allowed: verdict.allowed, rule: verdict.rule || null, matchedGroup: verdict.matchedBy };
  });
}

function robotsDisallowsAll(body) {
  let appliesToAll = false;
  let inAgentGroup = false;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === 'user-agent') {
      if (!inAgentGroup) appliesToAll = false;
      inAgentGroup = true;
      if (value === '*') appliesToAll = true;
    } else {
      inAgentGroup = false;
      if (field === 'disallow' && appliesToAll && value === '/') return true;
    }
  }
  return false;
}

async function inspectRendered(browserInstance, url, screenshotPath) {
  const context = await browserInstance.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    locale: 'en-US',
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.addInitScript(() => {
    window.__agenticSeoVitals = { cls: 0, lcp: null, longTasks: [] };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__agenticSeoVitals.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__agenticSeoVitals.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        window.__agenticSeoVitals.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
      }
    }).observe({ type: 'longtask', buffered: true });
  });

  const startedAt = Date.now();
  let response;
  let navigationError = null;
  try {
    response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(750);
  } catch (error) {
    navigationError = `${error.name}: ${error.message}`;
  }

  const preScroll = await page.evaluate(() => {
    const text = (document.querySelector('main')?.innerText || document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    return {
      wordCount: text ? text.split(/\s+/).length : 0,
      sections: document.querySelectorAll('section').length,
      height: document.body.scrollHeight,
      vitalsAtLoad: window.__agenticSeoVitals
        ? { cls: window.__agenticSeoVitals.cls, lcp: window.__agenticSeoVitals.lcp }
        : null,
    };
  }).catch(() => null);
  const scrollDiscovery = preScroll ? await inspectScrollDependentContent(page, preScroll) : null;
  const document = await collectDocument(page, true).catch(() => null);
  const performance = await page.evaluate(() => {
    const resources = performance.getEntriesByType('resource').map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      transferSize: entry.transferSize || 0,
      encodedBodySize: entry.encodedBodySize || 0,
      decodedBodySize: entry.decodedBodySize || 0,
      duration: Math.round(entry.duration),
    }));
    const navigation = performance.getEntriesByType('navigation')[0];
    const totals = resources.reduce((accumulator, entry) => {
      const type = normalizeResourceType(entry.initiatorType, entry.name);
      accumulator[type] ||= { requests: 0, transferSize: 0, encodedBodySize: 0 };
      accumulator[type].requests += 1;
      accumulator[type].transferSize += entry.transferSize;
      accumulator[type].encodedBodySize += entry.encodedBodySize;
      return accumulator;
    }, {});

    function normalizeResourceType(initiatorType, name) {
      if (/\.(mp4|webm|mov)(\?|$)/i.test(name)) return 'video';
      if (/\.(woff2?|ttf|otf)(\?|$)/i.test(name)) return 'font';
      if (initiatorType === 'img' || /\.(png|jpe?g|webp|avif|gif|svg)(\?|$)/i.test(name)) return 'image';
      if (initiatorType === 'script') return 'script';
      if (initiatorType === 'css' || initiatorType === 'link') return 'style';
      if (initiatorType === 'fetch' || initiatorType === 'xmlhttprequest') return 'fetch';
      return initiatorType || 'other';
    }

    return {
      navigation: navigation
        ? {
            domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
            load: Math.round(navigation.loadEventEnd),
            responseStart: Math.round(navigation.responseStart),
            transferSize: navigation.transferSize,
            encodedBodySize: navigation.encodedBodySize,
          }
        : null,
      totals,
      resources: resources.sort((a, b) => b.transferSize - a.transferSize).slice(0, 40),
      vitals: window.__agenticSeoVitals,
    };
  }).catch(() => null);

  // Programmatic scrolling mounts lazy sections whose layout shifts are not
  // load-time CLS; report the pre-scroll snapshot as the lab vitals.
  if (performance?.vitals && preScroll?.vitalsAtLoad) {
    performance.vitals = {
      ...performance.vitals,
      clsIncludingScroll: performance.vitals.cls,
      cls: preScroll.vitalsAtLoad.cls,
      lcp: preScroll.vitalsAtLoad.lcp ?? performance.vitals.lcp,
    };
  }

  const hiddenLoadedMedia = await page.evaluate(HIDDEN_MEDIA_EVAL).catch(() => []);

  const unnamedInteractive = await page.evaluate(() => {
    return [...document.querySelectorAll('a[href], button, input, textarea, select, [role="button"], [role="link"]')]
      .map((element) => {
        const labels = 'labels' in element && element.labels ? [...element.labels].map((label) => label.innerText).join(' ') : '';
        const name = element.getAttribute('aria-label')
          || element.getAttribute('aria-labelledby')?.split(/\s+/).map((id) => document.getElementById(id)?.innerText || '').join(' ')
          || labels
          || element.innerText
          || element.getAttribute('alt')
          || element.getAttribute('title')
          || '';
        return {
          tag: element.tagName.toLowerCase(),
          type: element.getAttribute('type') || '',
          name: name.trim(),
          outerHtml: element.outerHTML.slice(0, 240),
        };
      })
      .filter((item) => !item.name && item.type !== 'hidden');
  }).catch(() => []);

  if (screenshotPath) {
    const absoluteScreenshotPath = path.resolve(screenshotPath);
    await fs.mkdir(path.dirname(absoluteScreenshotPath), { recursive: true });
    await page.screenshot({ path: absoluteScreenshotPath, fullPage: true });
  }

  const result = {
    status: response?.status() ?? null,
    finalUrl: page.url(),
    elapsedMs: Date.now() - startedAt,
    responseHeaders: pickHeaders(response?.headers() || {}),
    document,
    performance,
    scrollDiscovery,
    hiddenLoadedMedia,
    unnamedInteractive,
    pageErrors: pageErrors.slice(0, 20),
    consoleErrors: consoleErrors.slice(0, 20),
    error: navigationError,
  };
  await context.close();
  return result;
}

// Light desktop pass: the mobile audit cannot see desktop-only hidden media,
// and the doctrine requires checking hidden resources at both viewports.
async function inspectDesktopResources(browserInstance, url) {
  const context = await browserInstance.newContext({
    viewport: { width: 1366, height: 900 },
    locale: 'en-US',
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
    const hiddenLoadedMedia = await page.evaluate(HIDDEN_MEDIA_EVAL).catch(() => []);
    const totals = await page.evaluate(() => {
      return performance.getEntriesByType('resource').reduce((accumulator, entry) => {
        accumulator.requests += 1;
        accumulator.transferSize += entry.transferSize || 0;
        return accumulator;
      }, { requests: 0, transferSize: 0 });
    }).catch(() => null);
    return { viewport: '1366x900', hiddenLoadedMedia, totals, error: null };
  } catch (error) {
    return { viewport: '1366x900', hiddenLoadedMedia: [], totals: null, error: `${error.name}: ${error.message}` };
  } finally {
    await context.close();
  }
}

async function inspectScrollDependentContent(page, before) {
  let previous = before;
  let passes = 0;

  for (let pass = 1; pass <= 6; pass += 1) {
    passes = pass;
    const dimensions = await page.evaluate(() => ({ height: document.body.scrollHeight, viewport: window.innerHeight }));
    const step = Math.max(500, Math.round(dimensions.viewport * 0.8));
    for (let position = 0; position <= dimensions.height; position += step) {
      await page.evaluate((nextPosition) => window.scrollTo(0, nextPosition), position);
      await page.waitForTimeout(50);
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(180);
    const current = await page.evaluate(() => {
      const text = (document.querySelector('main')?.innerText || document.body?.innerText || '').replace(/\s+/g, ' ').trim();
      return {
        wordCount: text ? text.split(/\s+/).length : 0,
        sections: document.querySelectorAll('section').length,
        height: document.body.scrollHeight,
      };
    });
    const stable = current.wordCount === previous.wordCount
      && current.sections === previous.sections
      && current.height === previous.height;
    previous = current;
    if (stable) break;
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
  return { before, after: previous, passes };
}

async function collectDocument(page, inspectSocialImage) {
  const documentData = await page.evaluate(() => {
    const meta = {};
    for (const element of document.querySelectorAll('meta[name], meta[property]')) {
      const key = element.getAttribute('name') || element.getAttribute('property');
      meta[key] ||= [];
      meta[key].push(element.getAttribute('content') || '');
    }

    const canonical = [...document.querySelectorAll('link[rel~="canonical"]')].map((element) => element.href);
    const hreflang = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map((element) => ({
      hreflang: element.getAttribute('hreflang') || '',
      href: element.getAttribute('href') || '',
    }));
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((element, index) => {
      try {
        const parsed = JSON.parse(element.textContent || '');
        const values = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];
        return {
          index,
          valid: true,
          types: values.flatMap((value) => value?.['@type'] || []).filter(Boolean),
          hasDates: values.some((value) => Boolean(value?.datePublished || value?.dateModified)),
        };
      } catch (error) {
        return { index, valid: false, error: error.message, types: [], hasDates: false };
      }
    });
    const bodyText = (document.querySelector('main')?.innerText || document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const links = [...document.querySelectorAll('a[href]')].map((element) => ({
      href: element.href,
      text: (element.innerText || element.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(),
    }));
    const images = [...document.images].map((image) => ({
      src: image.currentSrc || image.src,
      alt: image.alt,
      width: image.naturalWidth || image.width || null,
      height: image.naturalHeight || image.height || null,
    }));
    return {
      lang: document.documentElement.lang || '',
      title: document.title,
      meta,
      canonical,
      hreflang,
      dataNosnippetCount: document.querySelectorAll('[data-nosnippet]').length,
      h1: [...document.querySelectorAll('h1')].map((element) => element.innerText.replace(/\s+/g, ' ').trim()),
      headings: [...document.querySelectorAll('h1, h2, h3')].map((element) => ({
        level: element.tagName.toLowerCase(),
        text: element.innerText.replace(/\s+/g, ' ').trim(),
      })).slice(0, 100),
      bodyTextSample: bodyText.slice(0, 1200),
      wordCount: bodyText ? bodyText.split(/\s+/).length : 0,
      links: {
        total: links.length,
        internal: links.filter((link) => {
          try { return new URL(link.href).origin === location.origin; } catch { return false; }
        }).length,
        emptyText: links.filter((link) => !link.text).length,
      },
      images: images.slice(0, 100),
      scripts: [...document.scripts].filter((script) => script.src).map((script) => script.src),
      jsonLd,
    };
  });

  const ogImage = first(documentData.meta['og:image']);
  documentData.ogImage = inspectSocialImage && ogImage ? await inspectImage(page, ogImage) : null;
  return documentData;
}

async function inspectImage(page, url) {
  return page.evaluate(async (imageUrl) => {
    return new Promise((resolve) => {
      const image = new Image();
      const timer = setTimeout(() => resolve({ url: imageUrl, loaded: false, width: null, height: null, error: 'timeout' }), 10000);
      image.onload = () => {
        clearTimeout(timer);
        resolve({ url: imageUrl, loaded: true, width: image.naturalWidth, height: image.naturalHeight, error: null });
      };
      image.onerror = () => {
        clearTimeout(timer);
        resolve({ url: imageUrl, loaded: false, width: null, height: null, error: 'load-error' });
      };
      image.src = imageUrl;
    });
  }, url);
}

function pickHeaders(headers) {
  const picked = {};
  for (const name of ['content-type', 'cache-control', 'location', 'x-robots-tag', 'content-language', 'server']) {
    if (headers[name]) picked[name] = headers[name];
  }
  return picked;
}

function analyze(report) {
  const issues = [];
  const add = (severity, code, message, evidence = null) => issues.push({ severity, code, message, evidence });
  const baseline = report.noJs.find((entry) => entry.userAgent === 'browser-no-js');

  for (const entry of report.noJs) {
    if (entry.error) add('BLOCKER', 'crawler-fetch-failed', `${entry.userAgent} could not fetch the page.`, entry.error);
    else if (entry.status !== 200) add('BLOCKER', 'crawler-non-200', `${entry.userAgent} received HTTP ${entry.status}.`, entry.finalUrl);
  }

  const robotsTxt = report.origin?.robotsTxt;
  if (robotsTxt) {
    if (robotsTxt.status === 200 && robotsDisallowsAll(robotsTxt.bodySample)) {
      add('BLOCKER', 'robots-disallow-all', 'robots.txt disallows the entire site for all crawlers.', robotsTxt.url);
    } else if (robotsTxt.status !== 200) {
      add('LOW', 'robots-txt-unavailable', `robots.txt did not return 200 (got ${robotsTxt.status ?? robotsTxt.error}). Crawlers assume allow-all, but sitemap discovery through robots.txt is unavailable.`, robotsTxt.url);
    }
    if (robotsTxt.status === 200 && !/^\s*sitemap\s*:/im.test(robotsTxt.bodySample)) {
      add('LOW', 'sitemap-not-in-robots', 'robots.txt does not declare a Sitemap: line.', robotsTxt.url);
    }
  }

  // When robots.txt disallows the whole site, the disallow-all BLOCKER already
  // covers every crawler class; per-class issues would only add noise.
  const disallowAll = robotsTxt?.status === 200 && robotsDisallowsAll(robotsTxt.bodySample);
  const policy = disallowAll ? null : report.origin?.aiCrawlerPolicy;
  if (policy) {
    const blockedBy = (klass) => policy.filter((entry) => entry.class === klass && !entry.allowed);
    const searchBlocked = blockedBy('search');
    if (searchBlocked.length) {
      add('BLOCKER', 'search-crawler-blocked-robots', `robots.txt blocks ${searchBlocked.map((entry) => entry.crawler).join(', ')} from crawling this page.`, searchBlocked);
    }
    const aiSearchBlocked = blockedBy('ai-search');
    if (aiSearchBlocked.length) {
      add('HIGH', 'ai-search-crawler-blocked', `robots.txt blocks AI search crawlers (${aiSearchBlocked.map((entry) => entry.crawler).join(', ')}); the page cannot be cited by those AI answer engines.`, aiSearchBlocked);
    }
    const fetcherBlocked = blockedBy('user-fetch');
    if (fetcherBlocked.length) {
      add('LOW', 'user-fetcher-blocked', `robots.txt blocks user-triggered AI fetchers (${fetcherBlocked.map((entry) => entry.crawler).join(', ')}); live page opens from AI assistants may fail, and these fetchers may not honor robots.txt.`, fetcherBlocked);
    }
    // Blocking ai-training crawlers is a legitimate policy choice: the matrix is
    // recorded in the report evidence, but no issue is raised for it.
  }
  const notFoundProbe = report.origin?.notFoundProbe;
  if (notFoundProbe?.status === 200) {
    add('HIGH', 'soft-404', 'A deliberately nonexistent URL returned HTTP 200. Missing routes likely produce soft 404s that pollute the index.', notFoundProbe.url);
  }

  if (!baseline?.document) return dedupeIssues(issues);
  const initial = baseline.document;
  const robots = `${first(initial.meta.robots)} ${baseline.responseHeaders['x-robots-tag'] || ''}`.toLowerCase();
  if (robots.includes('noindex')) add('BLOCKER', 'noindex', 'The initial response blocks indexing.', robots.trim());

  // Snippet controls govern both classic previews and Google AI features
  // (AI Overviews / AI Mode): restricting them silently removes the page from
  // AI answers as well.
  const maxSnippetMatch = robots.match(/max-snippet\s*:\s*(-?\d+)/);
  const maxSnippet = maxSnippetMatch ? Number(maxSnippetMatch[1]) : null;
  if (/(^|[\s,])nosnippet\b/.test(robots) || maxSnippet === 0) {
    add('HIGH', 'snippet-restricted', 'Snippet controls (nosnippet or max-snippet:0) remove this page from search previews and Google AI answers.', robots.trim());
  } else if (maxSnippet !== null && maxSnippet > 0 && maxSnippet < 50) {
    add('LOW', 'snippet-limited', `max-snippet limits previews to ${maxSnippet} characters; confirm this restriction is intentional, because it also constrains AI answers.`, robots.trim());
  }
  if (initial.dataNosnippetCount > 0) {
    add('LOW', 'data-nosnippet-present', `${initial.dataNosnippetCount} elements use data-nosnippet; their text is excluded from previews and AI answers. Confirm the exclusion is intentional.`);
  }

  const hreflang = initial.hreflang || [];
  if (hreflang.length) {
    const invalid = hreflang.filter((entry) => !/^(x-default|[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*)$/.test(entry.hreflang) || !/^https?:\/\//.test(entry.href));
    if (invalid.length) {
      add('MEDIUM', 'hreflang-invalid', `${invalid.length} hreflang alternates have invalid language codes or non-absolute URLs.`, invalid.slice(0, 10));
    }
    const selfTargets = [initial.canonical[0], baseline.finalUrl, report.targetUrl].filter(Boolean).map(normalizeUrlLoose);
    const hasSelf = hreflang.some((entry) => selfTargets.includes(normalizeUrlLoose(entry.href)));
    if (!hasSelf) {
      add('MEDIUM', 'hreflang-missing-self', 'The hreflang set does not reference this page itself; self-reference is required for a valid reciprocal cluster.', hreflang.slice(0, 10));
    }
  }

  const articleTypes = ['Article', 'BlogPosting', 'NewsArticle', 'TechArticle'];
  const articleBlocks = initial.jsonLd.filter((block) => block.valid && (block.types || []).some((type) => articleTypes.includes(type)));
  if (articleBlocks.length
    && !articleBlocks.some((block) => block.hasDates)
    && !first(initial.meta['article:published_time'])
    && !first(initial.meta['article:modified_time'])) {
    add('LOW', 'article-missing-dates', 'Article structured data carries no datePublished/dateModified and no article: meta dates; freshness signals are absent.');
  }
  if (!initial.title) add('BLOCKER', 'missing-title', 'The initial HTML has no title.');
  if (!first(initial.meta.description)) add('HIGH', 'missing-description', 'The initial HTML has no meta description.');
  if (initial.canonical.length !== 1) add('BLOCKER', 'canonical-count', `Expected one canonical, found ${initial.canonical.length}.`, initial.canonical);
  if (initial.h1.length === 0) add('HIGH', 'missing-h1', 'The initial HTML has no H1.');
  if (initial.h1.length > 1) add('MEDIUM', 'multiple-h1', `The initial HTML has ${initial.h1.length} H1 elements.`, initial.h1);
  if (initial.wordCount < 80) add('MEDIUM', 'thin-initial-html', `The no-JavaScript main content contains only ${initial.wordCount} words. This is a diagnostic heuristic, not a ranking threshold.`);
  if (initial.links.internal === 0) add('HIGH', 'no-internal-links', 'The initial HTML has no crawlable internal links.');
  if (!initial.lang) add('MEDIUM', 'missing-lang', 'The initial HTML does not declare a document language (html[lang]).');
  if (initial.jsonLd.length === 0) add('MEDIUM', 'missing-json-ld', 'The initial HTML contains no JSON-LD structured data.');
  if (initial.jsonLd.some((block) => !block.valid)) add('HIGH', 'invalid-json-ld', 'At least one initial JSON-LD block is invalid.', initial.jsonLd.filter((block) => !block.valid));

  for (const tag of ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    if (!first(initial.meta[tag])) add('HIGH', 'missing-social-tag', `The initial HTML is missing ${tag}.`);
  }
  const socialImage = report.rendered?.document?.ogImage || initial.ogImage;
  if (socialImage && !socialImage.loaded) add('HIGH', 'og-image-unreachable', 'The Open Graph image did not load.', socialImage);
  if (socialImage?.loaded && socialImage.width && socialImage.height) {
    const ratio = socialImage.width / socialImage.height;
    if (socialImage.width < 600 || ratio < 1.7 || ratio > 2.1) {
      add('MEDIUM', 'og-image-dimensions', `The Open Graph image is ${socialImage.width}x${socialImage.height} (ratio ${ratio.toFixed(2)}:1); most platforms expect roughly 1.91:1 at 1200x630 or larger, so review cropping in previews.`, socialImage.url);
    }
  }

  if (report.rendered?.document) {
    const rendered = report.rendered.document;
    if (initial.canonical[0] && rendered.canonical[0] && initial.canonical[0] !== rendered.canonical[0]) {
      add('BLOCKER', 'canonical-hydration-mismatch', 'Canonical changes after JavaScript rendering.', { initial: initial.canonical, rendered: rendered.canonical });
    }
    if (initial.title && rendered.title && initial.title !== rendered.title) {
      add('HIGH', 'title-hydration-mismatch', 'Title changes after JavaScript rendering.', { initial: initial.title, rendered: rendered.title });
    }
    const renderedNoScrollWords = report.rendered.scrollDiscovery?.before?.wordCount ?? rendered.wordCount;
    if (renderedNoScrollWords > Math.max(120, initial.wordCount * 1.8)) {
      add('HIGH', 'main-content-js-dependent', 'Most main content appears only after JavaScript rendering.', { initialWords: initial.wordCount, renderedWordsBeforeScroll: renderedNoScrollWords });
    }
  }

  const scrollDiscovery = report.rendered?.scrollDiscovery;
  if (scrollDiscovery) {
    const addedWords = scrollDiscovery.after.wordCount - scrollDiscovery.before.wordCount;
    if (addedWords >= 200 && scrollDiscovery.after.wordCount > Math.max(300, scrollDiscovery.before.wordCount * 2)) {
      add('HIGH', 'scroll-dependent-content', 'Meaningful page content is mounted in the DOM only after scrolling.', scrollDiscovery);
    }
  }

  const comparable = report.noJs.filter((entry) => entry.document && entry.status === 200);
  for (const entry of comparable) {
    if (entry.document.title !== initial.title || entry.document.canonical[0] !== initial.canonical[0]) {
      add('BLOCKER', 'crawler-divergence', `${entry.userAgent} receives different title or canonical metadata.`, {
        title: entry.document.title,
        canonical: entry.document.canonical,
      });
    }
  }

  const totals = report.rendered?.performance?.totals || {};
  if ((totals.script?.transferSize || 0) > 500000) add('MEDIUM', 'large-script-transfer', `Rendered page transferred ${formatBytes(totals.script.transferSize)} of script resources.`);
  if ((totals.image?.transferSize || 0) > 2000000) add('MEDIUM', 'large-image-transfer', `Rendered page transferred ${formatBytes(totals.image.transferSize)} of image resources.`);
  if ((totals.video?.transferSize || 0) > 1000000) add('MEDIUM', 'large-video-transfer', `Rendered page transferred ${formatBytes(totals.video.transferSize)} of video resources.`);
  if (report.rendered?.hiddenLoadedMedia?.length) add('MEDIUM', 'hidden-loaded-media', `${report.rendered.hiddenLoadedMedia.length} hidden media elements loaded resources.`, report.rendered.hiddenLoadedMedia.slice(0, 20));
  const mobileHiddenSources = new Set((report.rendered?.hiddenLoadedMedia || []).map((item) => item.source));
  const desktopOnlyHidden = (report.renderedDesktop?.hiddenLoadedMedia || []).filter((item) => !mobileHiddenSources.has(item.source));
  if (desktopOnlyHidden.length) add('MEDIUM', 'hidden-loaded-media-desktop', `${desktopOnlyHidden.length} additional hidden media elements loaded resources at the desktop viewport (1366x900).`, desktopOnlyHidden.slice(0, 20));
  if (report.rendered?.unnamedInteractive?.length) add('MEDIUM', 'unnamed-interactive', `${report.rendered.unnamedInteractive.length} interactive elements appear to lack accessible names.`, report.rendered.unnamedInteractive.slice(0, 20));
  if (report.rendered?.pageErrors?.length) add('HIGH', 'page-errors', 'The rendered page produced JavaScript errors.', report.rendered.pageErrors);
  if ((report.rendered?.performance?.vitals?.cls || 0) > 0.1) add('MEDIUM', 'cls', `Observed lab CLS was ${report.rendered.performance.vitals.cls.toFixed(3)}.`);
  if ((report.rendered?.performance?.vitals?.lcp || 0) > 2500) add('MEDIUM', 'lcp', `Observed lab LCP was ${Math.round(report.rendered.performance.vitals.lcp)} ms.`);
  const longTasks = report.rendered?.performance?.vitals?.longTasks || [];
  const blockingMs = Math.round(longTasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0));
  if (blockingMs > 600) add('MEDIUM', 'main-thread-blocking', `Long tasks blocked the main thread for about ${blockingMs} ms in total (lab TBT proxy; good is under roughly 200 ms).`, longTasks.slice(0, 10));

  if (initial.title.length > 65) add('LOW', 'title-length', `Title has ${initial.title.length} characters; inspect truncation and meaning rather than applying a hard limit.`);
  const description = first(initial.meta.description);
  if (description && description.length > 170) add('LOW', 'description-length', `Description has ${description.length} characters; inspect likely truncation.`);
  return dedupeIssues(issues);
}

function dedupeIssues(issues) {
  const seen = new Set();
  return issues.filter((issue) => {
    const key = `${issue.severity}:${issue.code}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function outcomeFor(issues) {
  if (issues.some((issue) => issue.severity === 'BLOCKER')) return 'FAIL';
  if (issues.some((issue) => issue.severity === 'HIGH' || issue.severity === 'MEDIUM')) return 'CONDITIONAL PASS';
  return 'PASS';
}

function printSummary(report, outputPath, htmlPath, handoffPath) {
  console.log(`${report.outcome}: ${report.targetUrl}`);
  const counts = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => {
    return `${severity}=${report.issues.filter((issue) => issue.severity === severity).length}`;
  });
  console.log(counts.join(' '));
  for (const issue of report.issues) console.log(`[${issue.severity}] ${issue.code}: ${issue.message}`);
  if (outputPath) console.log(`Report: ${path.resolve(outputPath)}`);
  if (htmlPath) console.log(`HTML report: ${path.resolve(htmlPath)}`);
  if (handoffPath) console.log(`Technical handoff: ${path.resolve(handoffPath)}`);
}

function first(values) {
  return Array.isArray(values) ? values[0] || '' : values || '';
}

function normalizeUrlLoose(value) {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname.replace(/\/$/, '') || '/';
    return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return String(value || '');
  }
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}
