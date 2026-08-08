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
    name: 'facebook',
    value: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  },
  { name: 'x-twitter', value: 'Twitterbot/1.0' },
  { name: 'linkedin', value: 'LinkedInBot/1.0' },
];

const args = parseArgs(process.argv.slice(2));
if (!args.url) {
  console.error('Usage: node audit-public-page.mjs --url https://example.com/page [--out report.json] [--html report.html] [--handoff handoff.md] [--lang pt-BR|en] [--screenshot page.png]');
  process.exit(2);
}

const targetUrl = new URL(args.url).toString();
const browser = await chromium.launch({ headless: true });

try {
  const noJs = [];
  for (const userAgent of USER_AGENTS) {
    noJs.push(await inspectNoJavaScript(browser, targetUrl, userAgent));
  }

  const rendered = await inspectRendered(browser, targetUrl, args.screenshot);
  const issues = analyze({ targetUrl, noJs, rendered });
  const report = {
    generatedAt: new Date().toISOString(),
    targetUrl,
    outcome: outcomeFor(issues),
    issues,
    noJavaScript: noJs,
    rendered,
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

  const scrollDiscovery = await inspectScrollDependentContent(page, document);

  const hiddenLoadedMedia = await page.evaluate(() => {
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
  }).catch(() => []);

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

async function inspectScrollDependentContent(page, initialDocument) {
  const before = {
    wordCount: initialDocument?.wordCount || 0,
    sections: await page.locator('section').count(),
    height: await page.evaluate(() => document.body.scrollHeight),
  };
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
    previous = current;
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
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].map((element, index) => {
      try {
        const parsed = JSON.parse(element.textContent || '');
        const values = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed];
        return {
          index,
          valid: true,
          types: values.flatMap((value) => value?.['@type'] || []).filter(Boolean),
        };
      } catch (error) {
        return { index, valid: false, error: error.message, types: [] };
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

  if (!baseline?.document) return dedupeIssues(issues);
  const initial = baseline.document;
  const robots = `${first(initial.meta.robots)} ${baseline.responseHeaders['x-robots-tag'] || ''}`.toLowerCase();
  if (robots.includes('noindex')) add('BLOCKER', 'noindex', 'The initial response blocks indexing.', robots.trim());
  if (!initial.title) add('BLOCKER', 'missing-title', 'The initial HTML has no title.');
  if (!first(initial.meta.description)) add('HIGH', 'missing-description', 'The initial HTML has no meta description.');
  if (initial.canonical.length !== 1) add('BLOCKER', 'canonical-count', `Expected one canonical, found ${initial.canonical.length}.`, initial.canonical);
  if (initial.h1.length === 0) add('HIGH', 'missing-h1', 'The initial HTML has no H1.');
  if (initial.h1.length > 1) add('MEDIUM', 'multiple-h1', `The initial HTML has ${initial.h1.length} H1 elements.`, initial.h1);
  if (initial.wordCount < 80) add('MEDIUM', 'thin-initial-html', `The no-JavaScript main content contains only ${initial.wordCount} words. This is a diagnostic heuristic, not a ranking threshold.`);
  if (initial.links.internal === 0) add('HIGH', 'no-internal-links', 'The initial HTML has no crawlable internal links.');
  if (initial.jsonLd.some((block) => !block.valid)) add('HIGH', 'invalid-json-ld', 'At least one initial JSON-LD block is invalid.', initial.jsonLd.filter((block) => !block.valid));

  for (const tag of ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    if (!first(initial.meta[tag])) add('HIGH', 'missing-social-tag', `The initial HTML is missing ${tag}.`);
  }
  const socialImage = report.rendered?.document?.ogImage || initial.ogImage;
  if (socialImage && !socialImage.loaded) add('HIGH', 'og-image-unreachable', 'The Open Graph image did not load.', socialImage);
  if (socialImage?.loaded && (socialImage.width !== 1200 || socialImage.height !== 630)) {
    add('MEDIUM', 'og-image-dimensions', `The Open Graph image is ${socialImage.width}x${socialImage.height}; review against the 1200x630 social-card target.`, socialImage.url);
  }

  if (report.rendered?.document) {
    const rendered = report.rendered.document;
    if (initial.canonical[0] && rendered.canonical[0] && initial.canonical[0] !== rendered.canonical[0]) {
      add('BLOCKER', 'canonical-hydration-mismatch', 'Canonical changes after JavaScript rendering.', { initial: initial.canonical, rendered: rendered.canonical });
    }
    if (initial.title && rendered.title && initial.title !== rendered.title) {
      add('HIGH', 'title-hydration-mismatch', 'Title changes after JavaScript rendering.', { initial: initial.title, rendered: rendered.title });
    }
    if (rendered.wordCount > Math.max(120, initial.wordCount * 1.8)) {
      add('HIGH', 'main-content-js-dependent', 'Most main content appears only after JavaScript rendering.', { initialWords: initial.wordCount, renderedWords: rendered.wordCount });
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
  if (report.rendered?.unnamedInteractive?.length) add('MEDIUM', 'unnamed-interactive', `${report.rendered.unnamedInteractive.length} interactive elements appear to lack accessible names.`, report.rendered.unnamedInteractive.slice(0, 20));
  if (report.rendered?.pageErrors?.length) add('HIGH', 'page-errors', 'The rendered page produced JavaScript errors.', report.rendered.pageErrors);
  if ((report.rendered?.performance?.vitals?.cls || 0) > 0.1) add('MEDIUM', 'cls', `Observed lab CLS was ${report.rendered.performance.vitals.cls.toFixed(3)}.`);
  if ((report.rendered?.performance?.vitals?.lcp || 0) > 2500) add('MEDIUM', 'lcp', `Observed lab LCP was ${Math.round(report.rendered.performance.vitals.lcp)} ms.`);

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

function formatBytes(value) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}
