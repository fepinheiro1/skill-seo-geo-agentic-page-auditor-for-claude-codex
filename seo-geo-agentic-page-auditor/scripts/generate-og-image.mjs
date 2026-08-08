#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const args = parseArgs(process.argv.slice(2));
if (!args.config || !args.output) {
  console.error('Usage: node generate-og-image.mjs --config config.json --output social-card.png');
  process.exit(2);
}

const configPath = path.resolve(args.config);
const configDir = path.dirname(configPath);
const outputPath = path.resolve(args.output);
const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
validateConfig(config);

const resolved = {
  ...config,
  logo: await resolveAsset(config.logo, configDir),
  visual: await resolveAsset(config.visual, configDir),
  fonts: {
    heading: await resolveAsset(config.fonts?.heading, configDir),
    body: await resolveAsset(config.fonts?.body, configDir),
  },
};

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(renderHtml(resolved), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);

  const checks = await page.evaluate(() => {
    const overflow = [...document.querySelectorAll('[data-overflow-check]')]
      .filter((element) => element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1)
      .map((element) => ({
        name: element.getAttribute('data-overflow-check'),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
    const failedImages = [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.alt || image.src);
    return { overflow, failedImages };
  });

  if (checks.overflow.length) throw new Error(`Text overflow: ${JSON.stringify(checks.overflow)}`);
  if (checks.failedImages.length) throw new Error(`Images failed to load: ${checks.failedImages.join(', ')}`);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const image = await page.screenshot({ type: 'png' });
  if (image.length < 20000) throw new Error(`Generated image is suspiciously small (${image.length} bytes).`);
  await fs.writeFile(outputPath, image);
  console.log(`Generated 1200x630 Open Graph image: ${outputPath} (${formatBytes(image.length)})`);
} finally {
  await browser.close();
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === '--config' || values[index] === '--output') {
      parsed[values[index].slice(2)] = values[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function validateConfig(config) {
  for (const field of ['brandName', 'headline']) {
    if (!config[field] || typeof config[field] !== 'string') throw new Error(`Config field "${field}" is required.`);
  }
  if (config.headline.length > 110) throw new Error('Headline exceeds 110 characters. Shorten it for small social previews.');
  if ((config.description || '').length > 180) throw new Error('Description exceeds 180 characters.');
  const hex = /^#[0-9a-f]{6}$/i;
  for (const [name, value] of Object.entries(config.colors || {})) {
    if (!hex.test(value)) throw new Error(`Color "${name}" must be a six-digit hex value.`);
  }
}

async function resolveAsset(value, baseDir) {
  if (!value) return '';
  if (/^(https?:|data:)/i.test(value)) return value;
  const absolutePath = path.resolve(baseDir, value);
  const data = await fs.readFile(absolutePath);
  return `data:${mimeTypeFor(absolutePath)};base64,${data.toString('base64')}`;
}

function mimeTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.otf': 'font/otf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };
  const mimeType = mimeTypes[extension];
  if (!mimeType) throw new Error(`Unsupported local asset type: ${extension || '(none)'}`);
  return mimeType;
}

function renderHtml(config) {
  const colors = {
    background: '#0d1024',
    surface: '#171b35',
    primary: '#6ee7f9',
    accent: '#a78bfa',
    text: '#ffffff',
    muted: '#c7cbe0',
    ...config.colors,
  };
  const headlineClass = config.headline.length > 72 ? 'headline headline-small' : config.headline.length > 42 ? 'headline headline-medium' : 'headline';
  const headingFont = config.fonts?.heading
    ? `@font-face { font-family: Heading; src: url('${escapeAttribute(config.fonts.heading)}'); font-display: block; }`
    : '';
  const bodyFont = config.fonts?.body
    ? `@font-face { font-family: Body; src: url('${escapeAttribute(config.fonts.body)}'); font-display: block; }`
    : '';
  const logo = config.logo
    ? `<img class="logo" src="${escapeAttribute(config.logo)}" alt="${escapeAttribute(config.brandName)} logo">`
    : `<div class="brand-mark" aria-hidden="true"></div>`;
  const visual = config.visual
    ? `<img class="visual-image" src="${escapeAttribute(config.visual)}" alt="Page visual">`
    : `<div class="generated-visual" aria-hidden="true"><span></span><span></span><span></span><span></span></div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    ${headingFont}
    ${bodyFont}
    * { box-sizing: border-box; }
    html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
    body {
      color: ${colors.text};
      background: ${colors.background};
      font-family: ${config.fonts?.body ? 'Body' : 'Arial, sans-serif'};
    }
    .card { position: relative; width: 1200px; height: 630px; padding: 58px 62px; display: grid; grid-template-columns: 1.06fr .94fr; gap: 54px; overflow: hidden; }
    .card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 78% 35%, ${hexToRgba(colors.accent, .26)}, transparent 34%), linear-gradient(135deg, ${hexToRgba(colors.primary, .08)}, transparent 44%); pointer-events: none; }
    .content, .visual { position: relative; z-index: 1; }
    .content { min-width: 0; display: flex; flex-direction: column; }
    .brand { height: 56px; display: flex; align-items: center; gap: 16px; font-weight: 700; font-size: 23px; }
    .logo { display: block; max-width: 190px; max-height: 48px; object-fit: contain; object-position: left center; }
    .brand-mark { width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, ${colors.primary}, ${colors.accent}); box-shadow: 0 10px 30px ${hexToRgba(colors.primary, .25)}; }
    .eyebrow { min-height: 25px; margin-top: 28px; color: ${colors.primary}; font-size: 17px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
    .headline { margin: 16px 0 0; max-height: 218px; overflow: hidden; font-family: ${config.fonts?.heading ? 'Heading' : 'Arial, sans-serif'}; font-size: 58px; line-height: 1.02; font-weight: 800; letter-spacing: 0; }
    .headline-medium { font-size: 40px; line-height: 1.04; }
    .headline-small { font-size: 34px; line-height: 1.06; }
    .description { margin: 24px 0 0; max-width: 560px; max-height: 72px; overflow: hidden; color: ${colors.muted}; font-size: 21px; line-height: 1.45; }
    .cta { margin-top: auto; align-self: flex-start; display: ${config.cta ? 'inline-flex' : 'none'}; align-items: center; min-height: 48px; padding: 0 21px; border: 1px solid ${hexToRgba(colors.primary, .55)}; border-radius: 9px; color: ${colors.text}; background: ${hexToRgba(colors.surface, .74)}; font-size: 18px; font-weight: 700; }
    .visual { align-self: center; width: 100%; height: 492px; padding: 16px; border: 1px solid ${hexToRgba(colors.primary, .25)}; border-radius: 30px; background: ${hexToRgba(colors.surface, .92)}; box-shadow: 0 30px 90px rgba(0, 0, 0, .28); overflow: hidden; }
    .visual-image { width: 100%; height: 100%; display: block; object-fit: cover; border-radius: 18px; }
    .generated-visual { position: relative; width: 100%; height: 100%; border-radius: 18px; overflow: hidden; background: linear-gradient(145deg, ${hexToRgba(colors.primary, .12)}, ${hexToRgba(colors.accent, .24)}), ${colors.background}; }
    .generated-visual::before { content: ''; position: absolute; left: 38px; right: 38px; bottom: 54px; height: 2px; background: ${hexToRgba(colors.muted, .22)}; }
    .generated-visual span { position: absolute; bottom: 56px; width: 62px; border-radius: 18px 18px 4px 4px; background: linear-gradient(180deg, ${colors.primary}, ${colors.accent}); box-shadow: 0 0 34px ${hexToRgba(colors.primary, .25)}; }
    .generated-visual span:nth-child(1) { left: 48px; height: 112px; opacity: .58; }
    .generated-visual span:nth-child(2) { left: 140px; height: 188px; opacity: .72; }
    .generated-visual span:nth-child(3) { left: 232px; height: 278px; opacity: .86; }
    .generated-visual span:nth-child(4) { left: 324px; height: 358px; }
  </style>
</head>
<body>
  <main class="card">
    <section class="content">
      <div class="brand">${logo}<span>${escapeHtml(config.brandName)}</span></div>
      <div class="eyebrow" data-overflow-check="eyebrow">${escapeHtml(config.eyebrow || '')}</div>
      <h1 class="${headlineClass}" data-overflow-check="headline">${escapeHtml(config.headline)}</h1>
      <p class="description" data-overflow-check="description">${escapeHtml(config.description || '')}</p>
      <div class="cta" data-overflow-check="cta">${escapeHtml(config.cta || '')}</div>
    </section>
    <section class="visual">${visual}</section>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(1)} KB`;
}
