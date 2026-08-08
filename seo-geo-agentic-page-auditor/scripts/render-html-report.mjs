#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SEVERITY_ORDER = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW'];
const SEVERITY_LABEL = {
  BLOCKER: 'Blocker',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

const PORTUGUESE = {
  'SEO / GEO audit': 'Auditoria SEO / GEO',
  'Sitemap audit': 'Auditoria de sitemap',
  'SEO / GEO / AGENTIC AUDIT': 'AUDITORIA SEO / GEO / AGÊNTICA',
  'Skip to report': 'Ir para o relatório',
  'Public page readiness report': 'Relatório de prontidão da página pública',
  'Sitemap readiness report': 'Relatório de prontidão do sitemap',
  'A crawler-first view of discoverability, initial HTML, metadata, social previews, rendering, performance and agentic accessibility.': 'Uma visão orientada a crawlers sobre descoberta, HTML inicial, metadados, previews sociais, renderização, performance e acessibilidade agêntica.',
  'A site-wide view of indexability, canonical consistency, initial HTML, metadata, structured data and social readiness.': 'Uma visão geral de indexabilidade, consistência canônica, HTML inicial, metadados, dados estruturados e prontidão social.',
  'Release outcome': 'Resultado para publicação',
  'Coverage': 'Cobertura',
  'Report sections': 'Seções do relatório',
  'Overview': 'Visão geral',
  'Findings': 'Achados',
  'Crawlers': 'Crawlers',
  'Metadata': 'Metadados',
  'Performance': 'Performance',
  'Issue profile': 'Perfil de problemas',
  'URL inventory': 'Inventário de URLs',
  'Print / PDF': 'Imprimir / PDF',
  'EXECUTIVE OVERVIEW': 'VISÃO EXECUTIVA',
  'What needs attention first': 'O que precisa de atenção primeiro',
  'Indexable inventory at a glance': 'Inventário indexável em um relance',
  'No findings were recorded by the automated checks.': 'Nenhum achado foi registrado pelas verificações automatizadas.',
  'Blocker': 'Bloqueador',
  'High': 'Alta',
  'Medium': 'Média',
  'Low': 'Baixa',
  'Stops release': 'Impede a publicação',
  'Material risk': 'Risco relevante',
  'Optimization': 'Otimização',
  'Polish': 'Refinamento',
  'PRIORITY QUEUE': 'FILA DE PRIORIDADES',
  'Recommended next actions': 'Próximas ações recomendadas',
  'No automated action is required.': 'Nenhuma ação automatizada é necessária.',
  'DELIVERY SNAPSHOT': 'RESUMO DA ENTREGA',
  'Initial response': 'Resposta inicial',
  'HTTP status': 'Status HTTP',
  'Initial words': 'Palavras no HTML inicial',
  'Rendered words': 'Palavras renderizadas',
  'Internal links': 'Links internos',
  'JSON-LD blocks': 'Blocos JSON-LD',
  'H1 elements': 'Elementos H1',
  'EVIDENCE LED': 'ORIENTADO POR EVIDÊNCIAS',
  'Filter findings': 'Filtrar achados',
  'All': 'Todos',
  'View evidence': 'Ver evidências',
  'CONSUMER MATRIX': 'MATRIZ DE CONSUMIDORES',
  'What each crawler receives': 'O que cada crawler recebe',
  'JavaScript is disabled in this matrix so initial HTML and edge behavior remain visible.': 'O JavaScript é desativado nesta matriz para revelar o HTML inicial e o comportamento da camada de entrega.',
  'Consumer': 'Consumidor',
  'Status': 'Status',
  'Final URL': 'URL final',
  'Title': 'Título',
  'Canonical': 'Canônica',
  'Time': 'Tempo',
  'SEMANTIC SIGNALS': 'SINAIS SEMÂNTICOS',
  'Metadata and page meaning': 'Metadados e significado da página',
  'Values shown here come from the initial, no-JavaScript HTML.': 'Os valores apresentados vêm do HTML inicial, sem JavaScript.',
  'Meta description': 'Meta description',
  'Primary H1': 'H1 principal',
  'Language': 'Idioma',
  'Not declared': 'Não declarado',
  'characters': 'caracteres',
  'declared': 'declarada',
  'H1 elements': 'elementos H1',
  'SOCIAL PREVIEW': 'PREVIEW SOCIAL',
  'No Open Graph title': 'Sem título Open Graph',
  'No Open Graph description': 'Sem descrição Open Graph',
  'No Open Graph image': 'Sem imagem Open Graph',
  'Detected asset': 'Arquivo detectado',
  'Image loaded successfully': 'Imagem carregada com sucesso',
  'No verified image dimensions': 'Dimensões da imagem não verificadas',
  'DELIVERY COST': 'CUSTO DE ENTREGA',
  'Rendered-page performance': 'Performance da página renderizada',
  'Lab observations are directional and should be confirmed with production field data.': 'As observações de laboratório são direcionais e devem ser confirmadas com dados reais de produção.',
  'Lab LCP': 'LCP de laboratório',
  'Largest Contentful Paint': 'Largest Contentful Paint',
  'Lab CLS': 'CLS de laboratório',
  'Cumulative Layout Shift': 'Cumulative Layout Shift',
  'Scripts': 'Scripts',
  'Images': 'Imagens',
  'requests': 'requisições',
  'TRANSFER PROFILE': 'PERFIL DE TRANSFERÊNCIA',
  'Resource weight': 'Peso dos recursos',
  'ACCESSIBILITY TREE': 'ÁRVORE DE ACESSIBILIDADE',
  'Agent-visible controls': 'Controles visíveis para agentes',
  'Unnamed interactives': 'Interativos sem nome acessível',
  'Hidden loaded media': 'Mídias ocultas carregadas',
  'Page errors': 'Erros da página',
  'Console errors': 'Erros de console',
  'Rendered links': 'Links renderizados',
  'Rendered images': 'Imagens renderizadas',
  'Every URL was evaluated from its initial HTML response, before client-side rendering.': 'Cada URL foi avaliada a partir da resposta HTML inicial, antes da renderização no cliente.',
  'Audited URLs': 'URLs auditadas',
  'Sitemap inventory': 'Inventário do sitemap',
  'Healthy': 'Saudáveis',
  'No automated finding': 'Sem achados automatizados',
  'With findings': 'Com achados',
  'Needs review': 'Precisam de revisão',
  'Issue types': 'Tipos de problema',
  'Distinct patterns': 'Padrões distintos',
  'COVERAGE': 'COBERTURA',
  'Healthy versus affected': 'Saudáveis versus afetadas',
  'DUPLICATION': 'DUPLICAÇÃO',
  'Repeated metadata': 'Metadados repetidos',
  'Duplicate title groups': 'Grupos de títulos duplicados',
  'URLs in title groups': 'URLs em grupos de títulos',
  'Duplicate description groups': 'Grupos de descrições duplicadas',
  'URLs in description groups': 'URLs em grupos de descrições',
  'PATTERN DETECTION': 'DETECÇÃO DE PADRÕES',
  'Most frequent findings': 'Achados mais frequentes',
  'Prioritize systemic fixes that remove the same issue from many URLs at once.': 'Priorize correções sistêmicas que eliminem o mesmo problema de várias URLs de uma vez.',
  'No sitemap issues were recorded.': 'Nenhum problema de sitemap foi registrado.',
  'URL INVENTORY': 'INVENTÁRIO DE URLS',
  'Page-level evidence': 'Evidências por página',
  'Search URLs and findings': 'Buscar URLs e achados',
  'Search URL, title or issue': 'Buscar URL, título ou problema',
  'Filter URLs': 'Filtrar URLs',
  'Affected': 'Afetadas',
  'URL': 'URL',
  'H1': 'H1',
  'Clear': 'Sem problemas',
  'Nothing to show': 'Nada para exibir',
  'Methodology and report engine by Performa.AI': 'Metodologia e mecanismo de relatório por Performa.AI',
  'Generated locally. Audit data is not transmitted by this report file.': 'Gerado localmente. Os dados da auditoria não são transmitidos por este arquivo.',
  'Date unavailable': 'Data indisponível',
  'URLs shown': 'URLs exibidas',
  'URL shown': 'URL exibida',
};

let activeLanguage = 'pt-BR';

function normalizeLanguage(value) {
  return String(value || '').toLowerCase().startsWith('en') ? 'en' : 'pt-BR';
}

function ui(value) {
  return activeLanguage === 'pt-BR' ? PORTUGUESE[value] || value : value;
}

export function renderHtmlReport(report, options = {}) {
  activeLanguage = normalizeLanguage(options.lang);
  const kind = Array.isArray(report?.noJavaScript) ? 'page' : Array.isArray(report?.results) ? 'sitemap' : null;
  if (!kind) throw new Error('Unsupported report format. Expected a page or sitemap audit JSON file.');

  const body = kind === 'page' ? renderPageReport(report) : renderSitemapReport(report);
  const title = kind === 'page'
    ? `${ui('SEO / GEO audit')} - ${safeHost(report.targetUrl)}`
    : `${ui('Sitemap audit')} - ${safeHost(report.sitemap)}`;

  return `<!doctype html>
<html lang="${activeLanguage}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>${escapeHtml(title)}</title>
  <style>${styles()}</style>
</head>
<body>
  <a class="skip-link" href="#main">${ui('Skip to report')}</a>
  ${body}
  ${renderFooter()}
  <script>${clientScript()}</script>
</body>
</html>`;
}

function renderPageReport(report) {
  const issues = Array.isArray(report.issues) ? report.issues : [];
  const counts = Object.fromEntries(SEVERITY_ORDER.map((severity) => [severity, issues.filter((issue) => issue.severity === severity).length]));
  const baseline = report.noJavaScript?.find((entry) => entry.userAgent === 'browser-no-js') || report.noJavaScript?.[0] || {};
  const initial = baseline.document || {};
  const rendered = report.rendered || {};
  const renderedDocument = rendered.document || {};
  const meta = initial.meta || {};
  const performance = rendered.performance || {};
  const totals = performance.totals || {};
  const statusClass = outcomeClass(report.outcome);
  const nextActions = issues.slice().sort(compareSeverity).slice(0, 8);
  const consumerRows = (report.noJavaScript || []).map((entry) => {
    const crawlerState = entry.error || entry.status !== 200 ? 'fail' : 'pass';
    const doc = entry.document || {};
    return `<tr data-status="${crawlerState}">
      <td><strong>${escapeHtml(humanize(entry.userAgent))}</strong></td>
      <td>${statusPill(entry.status || 'Error', crawlerState)}</td>
      <td class="mono wrap">${escapeHtml(entry.finalUrl || '-')}</td>
      <td>${escapeHtml(truncate(doc.title || '-', 64))}</td>
      <td class="mono wrap">${escapeHtml(first(doc.canonical) || '-')}</td>
      <td>${formatNumber(entry.elapsedMs)} ms</td>
    </tr>`;
  }).join('');

  return `
  <header class="report-hero">
    <div class="hero-rule"></div>
    <div class="shell hero-inner">
      <div class="hero-copy">
        <p class="eyebrow">${ui('SEO / GEO / AGENTIC AUDIT')}</p>
        <h1>${ui('Public page readiness report')}</h1>
        <p class="target-url">${escapeHtml(report.targetUrl || '-')}</p>
        <p class="hero-summary">${ui('A crawler-first view of discoverability, initial HTML, metadata, social previews, rendering, performance and agentic accessibility.')}</p>
      </div>
      <div class="score-block ${statusClass}">
        <span class="score-label">${ui('Release outcome')}</span>
        <strong>${escapeHtml(localizedOutcome(report.outcome))}</strong>
        <span>${formatDate(report.generatedAt)}</span>
      </div>
    </div>
  </header>

  <nav class="report-nav" aria-label="${ui('Report sections')}">
    <div class="shell nav-inner">
      <a href="#overview">${ui('Overview')}</a>
      <a href="#findings">${ui('Findings')}</a>
      <a href="#crawlers">${ui('Crawlers')}</a>
      <a href="#metadata">${ui('Metadata')}</a>
      <a href="#performance">${ui('Performance')}</a>
      <button class="print-button" type="button" data-print>${ui('Print / PDF')}</button>
    </div>
  </nav>

  <main id="main">
    <section class="section" id="overview">
      <div class="shell">
        <div class="section-heading">
          <div><p class="eyebrow dark">${ui('EXECUTIVE OVERVIEW')}</p><h2>${ui('What needs attention first')}</h2></div>
          <p>${issues.length ? findingsSummary(issues.length) : ui('No findings were recorded by the automated checks.')}</p>
        </div>
        <div class="metric-grid severity-grid">
          ${SEVERITY_ORDER.map((severity) => metricCard(ui(SEVERITY_LABEL[severity]), counts[severity], severity.toLowerCase(), severity === 'BLOCKER' ? ui('Stops release') : severity === 'HIGH' ? ui('Material risk') : severity === 'MEDIUM' ? ui('Optimization') : ui('Polish'))).join('')}
        </div>
        <div class="overview-grid">
          <article class="surface action-surface">
            <div class="surface-heading"><div><p class="kicker">${ui('PRIORITY QUEUE')}</p><h3>${ui('Recommended next actions')}</h3></div><span class="count-badge">${nextActions.length}</span></div>
            ${nextActions.length ? `<ol class="action-list">${nextActions.map((issue) => `<li><span class="severity-dot ${escapeHtml(issue.severity.toLowerCase())}"></span><div><strong>${escapeHtml(localizedIssueMessage(issue))}</strong><span>${escapeHtml(issue.code)}</span></div></li>`).join('')}</ol>` : emptyState(ui('No automated action is required.'))}
          </article>
          <aside class="surface health-surface">
            <div class="surface-heading"><div><p class="kicker">${ui('DELIVERY SNAPSHOT')}</p><h3>${ui('Initial response')}</h3></div></div>
            <dl class="fact-list">
              ${fact(ui('HTTP status'), baseline.status || '-')}
              ${fact(ui('Initial words'), formatNumber(initial.wordCount || 0))}
              ${fact(ui('Rendered words'), formatNumber(renderedDocument.wordCount || 0))}
              ${fact(ui('Internal links'), formatNumber(initial.links?.internal || 0))}
              ${fact(ui('JSON-LD blocks'), formatNumber(initial.jsonLd?.length || 0))}
              ${fact(ui('H1 elements'), formatNumber(initial.h1?.length || 0))}
            </dl>
          </aside>
        </div>
      </div>
    </section>

    <section class="section section-tint" id="findings">
      <div class="shell">
        <div class="section-heading compact">
          <div><p class="eyebrow dark">${ui('EVIDENCE LED')}</p><h2>${ui('Findings')}</h2></div>
          <div class="filter-row" role="group" aria-label="${ui('Filter findings')}">
            <button type="button" class="filter-button active" data-finding-filter="all">${ui('All')} <span>${issues.length}</span></button>
            ${SEVERITY_ORDER.map((severity) => `<button type="button" class="filter-button" data-finding-filter="${severity}">${escapeHtml(ui(SEVERITY_LABEL[severity]))} <span>${counts[severity]}</span></button>`).join('')}
          </div>
        </div>
        <div class="finding-list" data-finding-list>
          ${issues.length ? issues.slice().sort(compareSeverity).map((issue, index) => renderFinding(issue, index + 1)).join('') : emptyState(ui('No findings were recorded by the automated checks.'))}
        </div>
      </div>
    </section>

    <section class="section" id="crawlers">
      <div class="shell">
        <div class="section-heading"><div><p class="eyebrow dark">${ui('CONSUMER MATRIX')}</p><h2>${ui('What each crawler receives')}</h2></div><p>${ui('JavaScript is disabled in this matrix so initial HTML and edge behavior remain visible.')}</p></div>
        <div class="table-wrap surface">
          <table>
            <thead><tr><th>${ui('Consumer')}</th><th>${ui('Status')}</th><th>${ui('Final URL')}</th><th>${ui('Title')}</th><th>${ui('Canonical')}</th><th>${ui('Time')}</th></tr></thead>
            <tbody>${consumerRows}</tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="section section-dark" id="metadata">
      <div class="shell">
        <div class="section-heading inverted"><div><p class="eyebrow">${ui('SEMANTIC SIGNALS')}</p><h2>${ui('Metadata and page meaning')}</h2></div><p>${ui('Values shown here come from the initial, no-JavaScript HTML.')}</p></div>
        <div class="metadata-grid">
          ${metadataItem(ui('Title'), initial.title, initial.title?.length, ui('characters'))}
          ${metadataItem(ui('Meta description'), first(meta.description), first(meta.description)?.length, ui('characters'))}
          ${metadataItem(ui('Canonical'), first(initial.canonical), initial.canonical?.length, ui('declared'))}
          ${metadataItem('Robots', first(meta.robots) || ui('Not declared'), null, null)}
          ${metadataItem(ui('Primary H1'), first(initial.h1), initial.h1?.length, ui('H1 elements'))}
          ${metadataItem(ui('Language'), initial.lang || ui('Not declared'), null, null)}
        </div>
        <div class="social-preview">
          <div class="social-copy">
            <p class="kicker cyan">${ui('SOCIAL PREVIEW')}</p>
            <h3>${escapeHtml(first(meta['og:title']) || initial.title || ui('No Open Graph title'))}</h3>
            <p>${escapeHtml(first(meta['og:description']) || first(meta.description) || ui('No Open Graph description'))}</p>
            <span class="mono">${escapeHtml(first(meta['og:image']) || ui('No Open Graph image'))}</span>
          </div>
          <div class="image-spec">
            <span>${ui('Detected asset')}</span>
            <strong>${renderedDocument.ogImage?.width || '-'} x ${renderedDocument.ogImage?.height || '-'}</strong>
            <small>${renderedDocument.ogImage?.loaded ? ui('Image loaded successfully') : ui('No verified image dimensions')}</small>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="performance">
      <div class="shell">
        <div class="section-heading"><div><p class="eyebrow dark">${ui('DELIVERY COST')}</p><h2>${ui('Rendered-page performance')}</h2></div><p>${ui('Lab observations are directional and should be confirmed with production field data.')}</p></div>
        <div class="metric-grid performance-grid">
          ${metricCard(ui('Lab LCP'), formatDuration(performance.vitals?.lcp), performance.vitals?.lcp > 2500 ? 'medium' : 'good', ui('Largest Contentful Paint'))}
          ${metricCard(ui('Lab CLS'), formatDecimal(performance.vitals?.cls), performance.vitals?.cls > 0.1 ? 'medium' : 'good', ui('Cumulative Layout Shift'))}
          ${metricCard(ui('Scripts'), formatBytes(totals.script?.transferSize || 0), (totals.script?.transferSize || 0) > 500000 ? 'medium' : 'good', `${totals.script?.requests || 0} ${ui('requests')}`)}
          ${metricCard(ui('Images'), formatBytes(totals.image?.transferSize || 0), (totals.image?.transferSize || 0) > 2000000 ? 'medium' : 'good', `${totals.image?.requests || 0} ${ui('requests')}`)}
        </div>
        <div class="overview-grid">
          <article class="surface resource-surface">
            <div class="surface-heading"><div><p class="kicker">${ui('TRANSFER PROFILE')}</p><h3>${ui('Resource weight')}</h3></div></div>
            ${renderResourceBars(totals)}
          </article>
          <aside class="surface health-surface">
            <div class="surface-heading"><div><p class="kicker">${ui('ACCESSIBILITY TREE')}</p><h3>${ui('Agent-visible controls')}</h3></div></div>
            <dl class="fact-list">
              ${fact(ui('Unnamed interactives'), formatNumber(rendered.unnamedInteractive?.length || 0))}
              ${fact(ui('Hidden loaded media'), formatNumber(rendered.hiddenLoadedMedia?.length || 0))}
              ${fact(ui('Page errors'), formatNumber(rendered.pageErrors?.length || 0))}
              ${fact(ui('Console errors'), formatNumber(rendered.consoleErrors?.length || 0))}
              ${fact(ui('Rendered links'), formatNumber(renderedDocument.links?.total || 0))}
              ${fact(ui('Rendered images'), formatNumber(renderedDocument.images?.length || 0))}
            </dl>
          </aside>
        </div>
      </div>
    </section>
  </main>`;
}

function renderSitemapReport(report) {
  const results = Array.isArray(report.results) ? report.results : [];
  const issueCounts = report.issueCounts || {};
  const healthyCount = Math.max(0, (report.urlCount || results.length) - (report.failingUrlCount || 0));
  const topIssues = Object.entries(issueCounts).slice(0, 12);
  const duplicateTitleUrls = Object.values(report.duplicateTitles || {}).flat().length;
  const duplicateDescriptionUrls = Object.values(report.duplicateDescriptions || {}).flat().length;

  return `
  <header class="report-hero">
    <div class="hero-rule"></div>
    <div class="shell hero-inner">
      <div class="hero-copy">
        <p class="eyebrow">${ui('SEO / GEO / AGENTIC AUDIT')}</p>
        <h1>${ui('Sitemap readiness report')}</h1>
        <p class="target-url">${escapeHtml(report.sitemap || '-')}</p>
        <p class="hero-summary">${ui('A site-wide view of indexability, canonical consistency, initial HTML, metadata, structured data and social readiness.')}</p>
      </div>
      <div class="score-block ${report.failingUrlCount ? 'conditional' : 'pass'}">
        <span class="score-label">${ui('Coverage')}</span>
        <strong>${formatNumber(report.urlCount || results.length)} URLs</strong>
        <span>${formatDate(report.generatedAt)}</span>
      </div>
    </div>
  </header>

  <nav class="report-nav" aria-label="${ui('Report sections')}">
    <div class="shell nav-inner">
      <a href="#overview">${ui('Overview')}</a>
      <a href="#issues">${ui('Issue profile')}</a>
      <a href="#inventory">${ui('URL inventory')}</a>
      <button class="print-button" type="button" data-print>${ui('Print / PDF')}</button>
    </div>
  </nav>

  <main id="main">
    <section class="section" id="overview">
      <div class="shell">
        <div class="section-heading"><div><p class="eyebrow dark">${ui('EXECUTIVE OVERVIEW')}</p><h2>${ui('Indexable inventory at a glance')}</h2></div><p>${ui('Every URL was evaluated from its initial HTML response, before client-side rendering.')}</p></div>
        <div class="metric-grid severity-grid">
          ${metricCard(ui('Audited URLs'), formatNumber(report.urlCount || results.length), 'neutral', ui('Sitemap inventory'))}
          ${metricCard(ui('Healthy'), formatNumber(healthyCount), 'good', ui('No automated finding'))}
          ${metricCard(ui('With findings'), formatNumber(report.failingUrlCount || 0), report.failingUrlCount ? 'medium' : 'good', ui('Needs review'))}
          ${metricCard(ui('Issue types'), formatNumber(Object.keys(issueCounts).length), Object.keys(issueCounts).length ? 'low' : 'good', ui('Distinct patterns'))}
        </div>
        <div class="overview-grid">
          <article class="surface resource-surface">
            <div class="surface-heading"><div><p class="kicker">${ui('COVERAGE')}</p><h3>${ui('Healthy versus affected')}</h3></div></div>
            ${coverageBar(healthyCount, report.failingUrlCount || 0)}
          </article>
          <aside class="surface health-surface">
            <div class="surface-heading"><div><p class="kicker">${ui('DUPLICATION')}</p><h3>${ui('Repeated metadata')}</h3></div></div>
            <dl class="fact-list">
              ${fact(ui('Duplicate title groups'), formatNumber(Object.keys(report.duplicateTitles || {}).length))}
              ${fact(ui('URLs in title groups'), formatNumber(duplicateTitleUrls))}
              ${fact(ui('Duplicate description groups'), formatNumber(Object.keys(report.duplicateDescriptions || {}).length))}
              ${fact(ui('URLs in description groups'), formatNumber(duplicateDescriptionUrls))}
            </dl>
          </aside>
        </div>
      </div>
    </section>

    <section class="section section-dark" id="issues">
      <div class="shell">
        <div class="section-heading inverted"><div><p class="eyebrow">${ui('PATTERN DETECTION')}</p><h2>${ui('Most frequent findings')}</h2></div><p>${ui('Prioritize systemic fixes that remove the same issue from many URLs at once.')}</p></div>
        <div class="issue-profile">
          ${topIssues.length ? topIssues.map(([issue, count], index) => `<div class="profile-row"><span class="rank">${String(index + 1).padStart(2, '0')}</span><div><strong>${escapeHtml(localizedSitemapIssue(issue))}</strong><small>${escapeHtml(issue)}</small></div><span class="profile-bar"><i style="width:${Math.max(4, Math.round((count / topIssues[0][1]) * 100))}%"></i></span><b>${formatNumber(count)}</b></div>`).join('') : emptyState(ui('No sitemap issues were recorded.'))}
        </div>
      </div>
    </section>

    <section class="section" id="inventory">
      <div class="shell wide-shell">
        <div class="section-heading compact">
          <div><p class="eyebrow dark">${ui('URL INVENTORY')}</p><h2>${ui('Page-level evidence')}</h2></div>
          <div class="inventory-tools">
            <label class="search-field"><span class="sr-only">${ui('Search URLs and findings')}</span><input type="search" placeholder="${ui('Search URL, title or issue')}" data-url-search></label>
            <div class="filter-row" role="group" aria-label="${ui('Filter URLs')}">
              <button type="button" class="filter-button active" data-url-filter="all">${ui('All')} <span>${results.length}</span></button>
              <button type="button" class="filter-button" data-url-filter="affected">${ui('Affected')} <span>${report.failingUrlCount || 0}</span></button>
              <button type="button" class="filter-button" data-url-filter="healthy">${ui('Healthy')} <span>${healthyCount}</span></button>
            </div>
          </div>
        </div>
        <p class="result-count" data-result-count>${results.length} ${ui('URLs shown')}</p>
        <div class="table-wrap surface inventory-table">
          <table>
            <thead><tr><th>${ui('URL')}</th><th>${ui('Status')}</th><th>${ui('Title')}</th><th>${ui('Canonical')}</th><th>${ui('H1')}</th><th>${ui('Findings')}</th></tr></thead>
            <tbody data-url-list>${results.map(renderSitemapRow).join('')}</tbody>
          </table>
        </div>
      </div>
    </section>
  </main>`;
}

function renderFinding(issue, index) {
  const evidence = issue.evidence == null ? '' : `<details><summary>${ui('View evidence')}</summary><pre>${escapeHtml(JSON.stringify(issue.evidence, null, 2))}</pre></details>`;
  return `<article class="finding ${escapeHtml(issue.severity.toLowerCase())}" data-finding-severity="${escapeHtml(issue.severity)}">
    <div class="finding-index">${String(index).padStart(2, '0')}</div>
    <div class="finding-body"><div class="finding-meta"><span class="severity-label">${escapeHtml(ui(SEVERITY_LABEL[issue.severity] || issue.severity))}</span><code>${escapeHtml(issue.code)}</code></div><h3>${escapeHtml(localizedIssueMessage(issue))}</h3>${evidence}</div>
  </article>`;
}

function renderSitemapRow(result) {
  const issues = Array.isArray(result.issues) ? result.issues : [];
  const state = issues.length ? 'affected' : 'healthy';
  const search = [result.url, result.title, result.description, ...issues].join(' ').toLowerCase();
  return `<tr data-url-state="${state}" data-url-search-value="${escapeHtml(search)}">
    <td class="mono wrap"><a href="${escapeHtml(safeHref(result.url))}" target="_blank" rel="noreferrer">${escapeHtml(result.url || '-')}</a></td>
    <td>${statusPill(result.status || 'Error', result.status === 200 ? 'pass' : 'fail')}</td>
    <td>${escapeHtml(truncate(result.title || '-', 74))}</td>
    <td class="mono wrap">${escapeHtml(first(result.canonical) || '-')}</td>
    <td>${escapeHtml(truncate(first(result.h1) || '-', 58))}</td>
    <td>${issues.length ? `<div class="issue-tags">${issues.map((issue) => `<span title="${escapeHtml(localizedSitemapIssue(issue))}">${escapeHtml(issue)}</span>`).join('')}</div>` : `<span class="healthy-label">${ui('Clear')}</span>`}</td>
  </tr>`;
}

function renderResourceBars(totals) {
  const rows = ['script', 'image', 'video', 'font', 'style', 'fetch'].map((type) => ({ type, ...(totals[type] || {}) }));
  const maximum = Math.max(1, ...rows.map((row) => row.transferSize || 0));
  return `<div class="resource-bars">${rows.map((row) => `<div class="resource-row"><div><strong>${escapeHtml(localizedResourceType(row.type))}</strong><span>${row.requests || 0} ${ui('requests')}</span></div><span class="bar"><i style="width:${Math.max(row.transferSize ? 3 : 0, Math.round(((row.transferSize || 0) / maximum) * 100))}%"></i></span><b>${formatBytes(row.transferSize || 0)}</b></div>`).join('')}</div>`;
}

function coverageBar(healthy, affected) {
  const total = Math.max(1, healthy + affected);
  const healthyPercent = Math.round((healthy / total) * 100);
  const affectedPercent = 100 - healthyPercent;
  return `<div class="coverage"><div class="coverage-bar" aria-label="${healthyPercent}% ${ui('Healthy')}, ${affectedPercent}% ${ui('Affected')}"><i style="width:${healthyPercent}%"></i><b style="width:${affectedPercent}%"></b></div><div class="coverage-legend"><span><i class="legend-dot good"></i>${ui('Healthy')} <strong>${healthyPercent}%</strong></span><span><i class="legend-dot medium"></i>${ui('Affected')} <strong>${affectedPercent}%</strong></span></div></div>`;
}

function metricCard(label, value, tone, note) {
  return `<article class="metric ${escapeHtml(tone)}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><small>${escapeHtml(note)}</small></article>`;
}

function metadataItem(label, value, count, unit) {
  return `<article class="metadata-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || 'Not declared')}</strong>${count != null ? `<small>${formatNumber(count)} ${escapeHtml(unit || '')}</small>` : ''}</article>`;
}

function fact(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(value))}</dd></div>`;
}

function statusPill(label, state) {
  return `<span class="status-pill ${escapeHtml(state)}"><i></i>${escapeHtml(String(label))}</span>`;
}

function emptyState(message) {
  return `<div class="empty-state"><strong>${ui('Nothing to show')}</strong><span>${escapeHtml(message)}</span></div>`;
}

function renderFooter() {
  return `<footer class="brand-footer">
    <div class="shell footer-inner">
      <div class="brand-lockup" aria-label="Performa.AI">
        <strong>Performa<span>.AI</span></strong>
      </div>
      <p>${ui('Methodology and report engine by Performa.AI')}</p>
      <p class="footer-note">${ui('Generated locally. Audit data is not transmitted by this report file.')}</p>
    </div>
  </footer>`;
}

function clientScript() {
  return `
  document.querySelector('[data-print]')?.addEventListener('click', () => window.print());

  const findingButtons = [...document.querySelectorAll('[data-finding-filter]')];
  findingButtons.forEach((button) => button.addEventListener('click', () => {
    findingButtons.forEach((item) => item.classList.toggle('active', item === button));
    const filter = button.dataset.findingFilter;
    document.querySelectorAll('[data-finding-severity]').forEach((item) => {
      item.hidden = filter !== 'all' && item.dataset.findingSeverity !== filter;
    });
  }));

  const urlButtons = [...document.querySelectorAll('[data-url-filter]')];
  const search = document.querySelector('[data-url-search]');
  const urlRows = [...document.querySelectorAll('[data-url-state]')];
  function filterUrls() {
    const active = document.querySelector('[data-url-filter].active')?.dataset.urlFilter || 'all';
    const query = (search?.value || '').trim().toLowerCase();
    let visible = 0;
    urlRows.forEach((row) => {
      const stateMatch = active === 'all' || row.dataset.urlState === active;
      const queryMatch = !query || row.dataset.urlSearchValue.includes(query);
      row.hidden = !(stateMatch && queryMatch);
      if (!row.hidden) visible += 1;
    });
    const count = document.querySelector('[data-result-count]');
    if (count) count.textContent = visible + (visible === 1 ? ' ${ui('URL shown')}' : ' ${ui('URLs shown')}');
  }
  urlButtons.forEach((button) => button.addEventListener('click', () => {
    urlButtons.forEach((item) => item.classList.toggle('active', item === button));
    filterUrls();
  }));
  search?.addEventListener('input', filterUrls);
  `;
}

function styles() {
  return `
  :root {
    color-scheme: light;
    --ink: #101425;
    --muted: #667085;
    --line: #e4e7ec;
    --paper: #ffffff;
    --canvas: #f6f7fb;
    --navy: #09051a;
    --navy-2: #14082f;
    --purple: #7128e8;
    --purple-2: #8b5cf6;
    --cyan: #08e5ee;
    --green: #079455;
    --amber: #dc6803;
    --red: #d92d20;
    --radius: 8px;
    --shadow: 0 12px 36px rgba(16, 24, 40, .07);
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; scroll-padding-top: 72px; }
  body { margin: 0; background: var(--canvas); color: var(--ink); font-family: Manrope, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 15px; line-height: 1.55; letter-spacing: 0; }
  a { color: inherit; }
  button, input { font: inherit; letter-spacing: 0; }
  button { cursor: pointer; }
  [hidden] { display: none !important; }
  .shell { width: min(1180px, calc(100% - 48px)); margin-inline: auto; }
  .wide-shell { width: min(1420px, calc(100% - 48px)); }
  .skip-link { position: fixed; z-index: 100; top: 8px; left: 8px; transform: translateY(-150%); background: white; color: var(--ink); padding: 10px 14px; border-radius: 4px; }
  .skip-link:focus { transform: none; }
  .report-hero { position: relative; overflow: hidden; background: var(--navy); color: white; }
  .report-hero::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(105deg, transparent 44%, rgba(113,40,232,.2) 72%, rgba(8,229,238,.06)); }
  .hero-rule { height: 5px; background: linear-gradient(90deg, var(--purple), var(--cyan)); }
  .hero-inner { min-height: 390px; display: grid; grid-template-columns: minmax(0, 1fr) 280px; align-items: end; gap: 72px; padding-block: 80px 68px; position: relative; z-index: 1; }
  .hero-copy { max-width: 810px; }
  .eyebrow, .kicker { margin: 0 0 12px; color: var(--cyan); font-size: 11px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
  .eyebrow.dark, .kicker { color: var(--purple); }
  .kicker.cyan { color: var(--cyan); }
  h1, h2, h3, p { overflow-wrap: anywhere; }
  h1 { max-width: 850px; margin: 0; font-size: clamp(42px, 6vw, 76px); line-height: .98; font-weight: 800; letter-spacing: 0; }
  .target-url { margin: 26px 0 0; color: white; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 15px; }
  .hero-summary { max-width: 720px; margin: 14px 0 0; color: #b9b4c8; font-size: 17px; }
  .score-block { align-self: end; min-height: 172px; padding: 24px; border: 1px solid rgba(255,255,255,.18); border-radius: var(--radius); background: rgba(255,255,255,.06); display: flex; flex-direction: column; justify-content: flex-end; }
  .score-block::before { content: ""; width: 42px; height: 4px; margin-bottom: 28px; background: var(--cyan); }
  .score-block.fail::before { background: #ff6b6b; }
  .score-block.conditional::before { background: #fdb022; }
  .score-block.pass::before { background: #12b76a; }
  .score-block strong { font-size: 24px; line-height: 1.1; }
  .score-block span { margin-top: 6px; color: #b9b4c8; font-size: 12px; }
  .score-block .score-label { margin: 0 0 8px; color: white; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
  .report-nav { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,.96); border-bottom: 1px solid var(--line); backdrop-filter: blur(12px); }
  .nav-inner { min-height: 62px; display: flex; align-items: center; gap: 28px; }
  .nav-inner a { color: #475467; font-size: 13px; font-weight: 700; text-decoration: none; }
  .nav-inner a:hover { color: var(--purple); }
  .print-button { margin-left: auto; border: 1px solid #d0d5dd; border-radius: 6px; background: white; color: var(--ink); padding: 9px 13px; font-size: 12px; font-weight: 800; }
  .section { padding: 84px 0; }
  .section-tint { background: #eef0f7; }
  .section-dark { background: var(--navy); color: white; }
  .section-heading { display: flex; align-items: end; justify-content: space-between; gap: 48px; margin-bottom: 34px; }
  .section-heading.compact { align-items: center; }
  .section-heading h2 { margin: 0; max-width: 720px; font-size: clamp(30px, 4vw, 46px); line-height: 1.05; letter-spacing: 0; }
  .section-heading > p { max-width: 490px; margin: 0; color: var(--muted); }
  .section-heading.inverted > p { color: #aaa4ba; }
  .metric-grid { display: grid; gap: 14px; }
  .severity-grid, .performance-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .metric { position: relative; min-height: 158px; padding: 22px; overflow: hidden; border: 1px solid var(--line); border-radius: var(--radius); background: var(--paper); box-shadow: var(--shadow); }
  .metric::after { content: ""; position: absolute; left: 0; bottom: 0; width: 100%; height: 4px; background: #98a2b3; }
  .metric.blocker::after { background: var(--red); }
  .metric.high::after { background: #f04438; }
  .metric.medium::after { background: #f79009; }
  .metric.low::after { background: var(--purple-2); }
  .metric.good::after { background: var(--green); }
  .metric span, .metric small { display: block; color: var(--muted); }
  .metric span { font-size: 12px; font-weight: 800; text-transform: uppercase; }
  .metric strong { display: block; margin: 18px 0 5px; font-size: 34px; line-height: 1; }
  .metric small { font-size: 12px; }
  .overview-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(300px, .75fr); gap: 18px; margin-top: 18px; }
  .surface { border: 1px solid var(--line); border-radius: var(--radius); background: var(--paper); box-shadow: var(--shadow); }
  .action-surface, .health-surface, .resource-surface { padding: 28px; }
  .surface-heading { display: flex; align-items: start; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
  .surface-heading h3 { margin: 0; font-size: 22px; line-height: 1.2; }
  .count-badge { min-width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: #f1eafe; color: var(--purple); font-weight: 800; }
  .action-list { margin: 0; padding: 0; list-style: none; }
  .action-list li { display: grid; grid-template-columns: 10px 1fr; gap: 13px; padding: 15px 0; border-top: 1px solid var(--line); }
  .action-list strong, .action-list span { display: block; }
  .action-list strong { font-size: 14px; }
  .action-list span { margin-top: 3px; color: var(--muted); font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .severity-dot { width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: #98a2b3; }
  .severity-dot.blocker { background: var(--red); }
  .severity-dot.high { background: #f04438; }
  .severity-dot.medium { background: #f79009; }
  .severity-dot.low { background: var(--purple-2); }
  .fact-list { margin: 0; }
  .fact-list > div { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; padding: 13px 0; border-top: 1px solid var(--line); }
  .fact-list dt { color: var(--muted); }
  .fact-list dd { margin: 0; font-weight: 800; text-align: right; }
  .filter-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .filter-button { border: 1px solid #d0d5dd; border-radius: 6px; background: white; color: #475467; padding: 9px 12px; font-size: 12px; font-weight: 800; }
  .filter-button span { color: #98a2b3; margin-left: 4px; }
  .filter-button.active { border-color: var(--purple); background: var(--purple); color: white; }
  .filter-button.active span { color: #ddd0ff; }
  .finding-list { display: grid; gap: 10px; }
  .finding { display: grid; grid-template-columns: 66px minmax(0, 1fr); border: 1px solid var(--line); border-left: 4px solid #98a2b3; border-radius: var(--radius); background: white; }
  .finding.blocker { border-left-color: var(--red); }
  .finding.high { border-left-color: #f04438; }
  .finding.medium { border-left-color: #f79009; }
  .finding.low { border-left-color: var(--purple-2); }
  .finding-index { padding: 23px 18px; color: #98a2b3; font: 800 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .finding-body { padding: 21px 24px 22px 0; }
  .finding-meta { display: flex; align-items: center; gap: 12px; }
  .severity-label { font-size: 10px; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }
  .finding code { color: var(--muted); font-size: 11px; }
  .finding h3 { margin: 8px 0 0; font-size: 16px; line-height: 1.45; }
  details { margin-top: 14px; }
  summary { color: var(--purple); font-size: 12px; font-weight: 800; cursor: pointer; }
  pre { max-height: 340px; overflow: auto; padding: 16px; border-radius: 6px; background: #101425; color: #d0d5dd; font: 11px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
  .table-wrap { overflow: auto; }
  table { width: 100%; border-collapse: collapse; min-width: 980px; }
  th, td { padding: 15px 17px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
  th { position: sticky; top: 0; z-index: 1; background: #f9fafb; color: #667085; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }
  td { color: #475467; font-size: 12px; }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr:hover td { background: #fcfcfd; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; }
  .wrap { max-width: 300px; overflow-wrap: anywhere; }
  .status-pill { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; font-size: 11px; font-weight: 800; }
  .status-pill i { width: 7px; height: 7px; border-radius: 50%; background: #98a2b3; }
  .status-pill.pass i { background: var(--green); }
  .status-pill.fail i { background: var(--red); }
  .metadata-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid rgba(255,255,255,.14); border-radius: var(--radius); overflow: hidden; }
  .metadata-item { min-height: 160px; padding: 24px; border-right: 1px solid rgba(255,255,255,.12); border-bottom: 1px solid rgba(255,255,255,.12); }
  .metadata-item:nth-child(3n) { border-right: 0; }
  .metadata-item:nth-last-child(-n+3) { border-bottom: 0; }
  .metadata-item span, .metadata-item small { display: block; color: #aaa4ba; }
  .metadata-item span { font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
  .metadata-item strong { display: block; margin: 20px 0 8px; color: white; font-size: 15px; line-height: 1.55; overflow-wrap: anywhere; }
  .metadata-item small { font-size: 11px; }
  .social-preview { display: grid; grid-template-columns: minmax(0, 1fr) 250px; gap: 34px; margin-top: 20px; padding: 34px; border-radius: var(--radius); background: var(--navy-2); border: 1px solid rgba(139,92,246,.35); }
  .social-copy h3 { margin: 0; color: white; font-size: 25px; }
  .social-copy p { margin: 10px 0 22px; color: #b9b4c8; }
  .social-copy span { color: var(--cyan); overflow-wrap: anywhere; }
  .image-spec { padding-left: 26px; border-left: 1px solid rgba(255,255,255,.12); display: flex; flex-direction: column; justify-content: center; }
  .image-spec span, .image-spec small { color: #aaa4ba; }
  .image-spec strong { margin: 6px 0; color: white; font-size: 28px; }
  .resource-bars, .issue-profile { display: grid; gap: 16px; }
  .resource-row { display: grid; grid-template-columns: 120px minmax(80px, 1fr) 76px; align-items: center; gap: 16px; }
  .resource-row strong, .resource-row span { display: block; }
  .resource-row span { color: var(--muted); font-size: 11px; }
  .bar, .profile-bar { height: 8px; overflow: hidden; border-radius: 4px; background: #eaecf0; }
  .bar i, .profile-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--purple), var(--cyan)); }
  .resource-row b { font-size: 12px; text-align: right; }
  .coverage { padding-top: 12px; }
  .coverage-bar { display: flex; height: 26px; overflow: hidden; border-radius: 5px; background: #eaecf0; }
  .coverage-bar i { background: var(--green); }
  .coverage-bar b { background: #f79009; }
  .coverage-legend { display: flex; justify-content: space-between; gap: 20px; margin-top: 18px; color: var(--muted); }
  .coverage-legend span { display: flex; align-items: center; gap: 8px; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; background: #98a2b3; }
  .legend-dot.good { background: var(--green); }
  .legend-dot.medium { background: #f79009; }
  .profile-row { display: grid; grid-template-columns: 38px minmax(210px, .75fr) minmax(120px, 1fr) 50px; align-items: center; gap: 18px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,.1); }
  .rank { color: var(--cyan); font: 800 11px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .profile-row strong, .profile-row small { display: block; }
  .profile-row small { margin-top: 2px; color: #8d879d; font: 10px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .profile-row b { color: white; text-align: right; }
  .profile-bar { background: rgba(255,255,255,.12); }
  .inventory-tools { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
  .search-field input { width: min(410px, 70vw); border: 1px solid #d0d5dd; border-radius: 6px; background: white; padding: 10px 13px; outline: none; }
  .search-field input:focus { border-color: var(--purple); box-shadow: 0 0 0 3px rgba(113,40,232,.12); }
  .result-count { margin: -20px 0 14px; color: var(--muted); font-size: 12px; }
  .inventory-table { max-height: 760px; }
  .inventory-table th { top: 0; }
  .inventory-table a { color: var(--purple); text-decoration: none; }
  .issue-tags { display: flex; flex-wrap: wrap; gap: 5px; max-width: 360px; }
  .issue-tags span { padding: 4px 6px; border-radius: 4px; background: #fff3e8; color: #b54708; font: 9px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .healthy-label { color: var(--green); font-weight: 800; }
  .empty-state { min-height: 130px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; color: var(--muted); text-align: center; }
  .empty-state strong { color: var(--ink); }
  .brand-footer { padding: 46px 0; background: #05030d; color: white; }
  .footer-inner { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px 40px; }
  .brand-lockup { display: flex; align-items: center; }
  .brand-lockup > strong { font-size: 20px; }
  .brand-lockup > strong span { color: var(--cyan); }
  .brand-footer p { margin: 0; color: #b9b4c8; font-size: 12px; text-align: right; }
  .brand-footer .footer-note { grid-column: 2; color: #777184; font-size: 10px; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

  @media (max-width: 900px) {
    .hero-inner { min-height: auto; grid-template-columns: 1fr; gap: 34px; padding-block: 64px 52px; }
    .score-block { min-height: 140px; }
    .severity-grid, .performance-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .overview-grid { grid-template-columns: 1fr; }
    .section-heading { align-items: start; flex-direction: column; gap: 18px; }
    .section-heading.compact { align-items: stretch; }
    .metadata-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .metadata-item:nth-child(3n) { border-right: 1px solid rgba(255,255,255,.12); }
    .metadata-item:nth-child(2n) { border-right: 0; }
    .metadata-item:nth-last-child(-n+3) { border-bottom: 1px solid rgba(255,255,255,.12); }
    .metadata-item:nth-last-child(-n+2) { border-bottom: 0; }
    .inventory-tools { align-items: stretch; width: 100%; }
    .search-field input { width: 100%; }
  }
  @media (max-width: 640px) {
    .shell, .wide-shell { width: min(100% - 28px, 1180px); }
    h1 { font-size: 42px; }
    .hero-inner { padding-block: 50px 42px; }
    .target-url { font-size: 12px; }
    .hero-summary { font-size: 15px; }
    .nav-inner { gap: 18px; overflow-x: auto; }
    .nav-inner a { white-space: nowrap; }
    .print-button { display: none; }
    .section { padding: 62px 0; }
    .section-heading h2 { font-size: 32px; }
    .severity-grid, .performance-grid { grid-template-columns: 1fr 1fr; }
    .metric { min-height: 138px; padding: 18px; }
    .metric strong { font-size: 28px; }
    .action-surface, .health-surface, .resource-surface { padding: 20px; }
    .finding { grid-template-columns: 44px minmax(0, 1fr); }
    .finding-index { padding: 20px 11px; }
    .finding-body { padding: 18px 16px 20px 0; }
    .metadata-grid { grid-template-columns: 1fr; }
    .metadata-item, .metadata-item:nth-child(n) { min-height: 132px; border-right: 0; border-bottom: 1px solid rgba(255,255,255,.12); }
    .metadata-item:last-child { border-bottom: 0; }
    .social-preview { grid-template-columns: 1fr; padding: 24px; }
    .image-spec { padding: 22px 0 0; border-left: 0; border-top: 1px solid rgba(255,255,255,.12); }
    .resource-row { grid-template-columns: 88px minmax(70px, 1fr) 66px; gap: 10px; }
    .profile-row { grid-template-columns: 28px minmax(0, 1fr) 40px; gap: 10px; }
    .profile-bar { grid-column: 2 / 4; }
    .footer-inner { grid-template-columns: 1fr; }
    .brand-footer p, .brand-footer .footer-note { grid-column: 1; text-align: left; }
  }
  @media print {
    :root { --canvas: #fff; }
    .report-nav, .filter-row, .inventory-tools { display: none !important; }
    .report-hero, .section-dark, .brand-footer { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .section { padding: 38px 0; break-inside: avoid; }
    .surface, .metric { box-shadow: none; }
    .inventory-table { max-height: none; }
    details:not([open]) > *:not(summary) { display: block; }
  }
  `;
}

function compareSeverity(left, right) {
  return SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity);
}

function findingsSummary(count) {
  if (activeLanguage === 'en') return `${count} findings across crawlability, meaning, presentation and delivery.`;
  return `${count} ${count === 1 ? 'achado' : 'achados'} entre rastreabilidade, significado, apresentação e entrega.`;
}

function localizedOutcome(outcome) {
  if (activeLanguage === 'en') return outcome || 'UNKNOWN';
  return {
    PASS: 'APROVADO',
    'CONDITIONAL PASS': 'APROVADO COM RESSALVAS',
    FAIL: 'REPROVADO',
  }[outcome] || 'DESCONHECIDO';
}

function localizedIssueMessage(issue) {
  const message = String(issue?.message || '');
  if (activeLanguage === 'en') return message;
  const fixed = {
    noindex: 'A resposta inicial bloqueia a indexação.',
    'missing-title': 'O HTML inicial não possui título.',
    'missing-description': 'O HTML inicial não possui meta description.',
    'missing-h1': 'O HTML inicial não possui H1.',
    'no-internal-links': 'O HTML inicial não possui links internos rastreáveis.',
    'invalid-json-ld': 'Pelo menos um bloco JSON-LD inicial é inválido.',
    'missing-lang': 'O HTML inicial não declara o idioma do documento (html[lang]).',
    'missing-json-ld': 'O HTML inicial não contém dados estruturados JSON-LD.',
    'soft-404': 'Uma URL propositalmente inexistente retornou HTTP 200. Rotas ausentes provavelmente geram soft 404 e poluem o índice.',
    'robots-disallow-all': 'O robots.txt bloqueia o site inteiro para todos os crawlers.',
    'sitemap-not-in-robots': 'O robots.txt não declara uma linha Sitemap:.',
    'snippet-restricted': 'Controles de snippet (nosnippet ou max-snippet:0) removem esta página das prévias de busca e das respostas de IA do Google.',
    'hreflang-missing-self': 'O conjunto hreflang não referencia a própria página; a autorreferência é obrigatória para um cluster recíproco válido.',
    'article-missing-dates': 'Os dados estruturados de artigo não trazem datePublished/dateModified nem metas article:; os sinais de frescor estão ausentes.',
    'og-image-unreachable': 'A imagem Open Graph não foi carregada.',
    'canonical-hydration-mismatch': 'A canônica muda depois da renderização JavaScript.',
    'title-hydration-mismatch': 'O título muda depois da renderização JavaScript.',
    'main-content-js-dependent': 'A maior parte do conteúdo principal aparece somente depois da renderização JavaScript.',
    'scroll-dependent-content': 'Conteúdo relevante da página só é inserido no DOM depois que o usuário rola a tela.',
    'page-errors': 'A página renderizada produziu erros JavaScript.',
  };
  if (fixed[issue.code]) return fixed[issue.code];
  if (issue.code === 'crawler-fetch-failed') return message.replace(' could not fetch the page.', ' não conseguiu acessar a página.');
  if (issue.code === 'crawler-non-200') return message.replace(' received HTTP ', ' recebeu HTTP ');
  if (issue.code === 'canonical-count') return message.replace('Expected one canonical, found ', 'Era esperada uma canônica, mas foram encontradas ').replace('.', '.');
  if (issue.code === 'multiple-h1') return message.replace('The initial HTML has ', 'O HTML inicial possui ').replace(' H1 elements.', ' elementos H1.');
  if (issue.code === 'thin-initial-html') return message.replace('The no-JavaScript main content contains only ', 'O conteúdo principal sem JavaScript possui apenas ').replace(' words. This is a diagnostic heuristic, not a ranking threshold.', ' palavras. Esta é uma heurística de diagnóstico, não um limite de ranqueamento.');
  if (issue.code === 'missing-social-tag') return message.replace('The initial HTML is missing ', 'O HTML inicial não possui ');
  if (issue.code === 'og-image-dimensions') return message.replace('The Open Graph image is ', 'A imagem Open Graph possui ').replace('most platforms expect roughly 1.91:1 at 1200x630 or larger, so review cropping in previews.', 'a maioria das plataformas espera cerca de 1.91:1 em 1200x630 ou maior; revise o corte nas prévias.');
  if (issue.code === 'robots-txt-unavailable') return message.replace('robots.txt did not return 200 (got ', 'O robots.txt não retornou 200 (obteve ').replace('). Crawlers assume allow-all, but sitemap discovery through robots.txt is unavailable.', '). Crawlers assumem permissão total, mas a descoberta de sitemap via robots.txt fica indisponível.');
  if (issue.code === 'search-crawler-blocked-robots') return message.replace('robots.txt blocks ', 'O robots.txt bloqueia ').replace(' from crawling this page.', ' de rastrear esta página.');
  if (issue.code === 'ai-search-crawler-blocked') return message.replace('robots.txt blocks AI search crawlers (', 'O robots.txt bloqueia crawlers de busca de IA (').replace('); the page cannot be cited by those AI answer engines.', '); a página não pode ser citada por esses mecanismos de resposta de IA.');
  if (issue.code === 'user-fetcher-blocked') return message.replace('robots.txt blocks user-triggered AI fetchers (', 'O robots.txt bloqueia fetchers de IA acionados por usuários (').replace('); live page opens from AI assistants may fail, and these fetchers may not honor robots.txt.', '); aberturas da página ao vivo por assistentes de IA podem falhar, e esses fetchers podem não respeitar o robots.txt.');
  if (issue.code === 'snippet-limited') return message.replace('max-snippet limits previews to ', 'O max-snippet limita as prévias a ').replace(' characters; confirm this restriction is intentional, because it also constrains AI answers.', ' caracteres; confirme se a restrição é intencional, pois ela também limita as respostas de IA.');
  if (issue.code === 'data-nosnippet-present') return message.replace(' elements use data-nosnippet; their text is excluded from previews and AI answers. Confirm the exclusion is intentional.', ' elementos usam data-nosnippet; o texto deles fica fora das prévias e das respostas de IA. Confirme se a exclusão é intencional.');
  if (issue.code === 'hreflang-invalid') return message.replace(' hreflang alternates have invalid language codes or non-absolute URLs.', ' alternates hreflang têm códigos de idioma inválidos ou URLs não absolutas.');
  if (issue.code === 'main-thread-blocking') return message.replace('Long tasks blocked the main thread for about ', 'Tarefas longas bloquearam a thread principal por cerca de ').replace(' ms in total (lab TBT proxy; good is under roughly 200 ms).', ' ms no total (proxy de TBT em laboratório; bom é abaixo de aproximadamente 200 ms).');
  if (issue.code === 'hidden-loaded-media-desktop') return message.replace(' additional hidden media elements loaded resources at the desktop viewport (1366x900).', ' elementos de mídia ocultos adicionais carregaram recursos no viewport desktop (1366x900).');
  if (issue.code === 'crawler-divergence') return message.replace(' receives different title or canonical metadata.', ' recebe título ou canônica diferentes.');
  if (issue.code === 'large-script-transfer') return message.replace('Rendered page transferred ', 'A página renderizada transferiu ').replace(' of script resources.', ' em recursos de script.');
  if (issue.code === 'large-image-transfer') return message.replace('Rendered page transferred ', 'A página renderizada transferiu ').replace(' of image resources.', ' em recursos de imagem.');
  if (issue.code === 'large-video-transfer') return message.replace('Rendered page transferred ', 'A página renderizada transferiu ').replace(' of video resources.', ' em recursos de vídeo.');
  if (issue.code === 'hidden-loaded-media') return message.replace(' hidden media elements loaded resources.', ' elementos de mídia ocultos carregaram recursos.');
  if (issue.code === 'unnamed-interactive') return message.replace(' interactive elements appear to lack accessible names.', ' elementos interativos parecem não possuir nomes acessíveis.');
  if (issue.code === 'cls') return message.replace('Observed lab CLS was ', 'O CLS observado em laboratório foi ');
  if (issue.code === 'lcp') return message.replace('Observed lab LCP was ', 'O LCP observado em laboratório foi ');
  if (issue.code === 'title-length') return message.replace('Title has ', 'O título possui ').replace(' characters; inspect truncation and meaning rather than applying a hard limit.', ' caracteres; avalie truncamento e significado em vez de aplicar um limite rígido.');
  if (issue.code === 'description-length') return message.replace('Description has ', 'A descrição possui ').replace(' characters; inspect likely truncation.', ' caracteres; avalie o possível truncamento.');
  return message;
}

function localizedSitemapIssue(issue) {
  if (activeLanguage === 'en') return humanize(issue);
  const labels = {
    'html-over-5mb': 'HTML acima de 5 MB',
    'redirected-sitemap-url': 'URL do sitemap redirecionada',
    'noindex-in-sitemap': 'Noindex presente no sitemap',
    'missing-title': 'Título ausente',
    'missing-description': 'Meta description ausente',
    'canonical-mismatch': 'Canônica divergente',
    'missing-h1': 'H1 ausente',
    'multiple-h1': 'Multiplos H1',
    'missing-og-image': 'Imagem Open Graph ausente',
    'missing-twitter-image': 'Imagem do X ausente',
    'invalid-json-ld': 'JSON-LD inválido',
    'thin-initial-html-heuristic': 'HTML inicial com pouco conteúdo',
  };
  if (labels[issue]) return labels[issue];
  if (issue.startsWith('http-')) return `Resposta HTTP ${issue.slice(5)}`;
  if (issue.startsWith('canonical-count-')) return `${issue.slice(16)} canônicas encontradas`;
  if (issue.startsWith('fetch-error')) return 'Erro ao acessar a URL';
  return humanize(issue);
}

function localizedResourceType(type) {
  if (activeLanguage === 'en') return humanize(type);
  return {
    script: 'Scripts',
    image: 'Imagens',
    video: 'Vídeos',
    font: 'Fontes',
    style: 'Estilos',
    fetch: 'Requisições de dados',
  }[type] || humanize(type);
}

function outcomeClass(outcome) {
  if (outcome === 'PASS') return 'pass';
  if (outcome === 'FAIL') return 'fail';
  return 'conditional';
}

function first(value) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function humanize(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function truncate(value, maximum) {
  const text = String(value || '');
  return text.length > maximum ? `${text.slice(0, maximum - 1)}...` : text;
}

function safeHost(value) {
  try { return new URL(value).host; } catch { return 'report'; }
}

function safeHref(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '#';
  } catch { return '#'; }
}

function formatDate(value) {
  if (!value) return ui('Date unavailable');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(activeLanguage, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date) + ' UTC';
}

function formatNumber(value) {
  return new Intl.NumberFormat('en').format(Number(value) || 0);
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDuration(value) {
  const duration = Number(value) || 0;
  return duration ? `${Math.round(duration)} ms` : '-';
}

function formatDecimal(value) {
  const number = Number(value) || 0;
  return number.toFixed(3);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === '--report' || values[index] === '--output' || values[index] === '--lang') {
      parsed[values[index].slice(2)] = values[index + 1];
      index += 1;
    }
  }
  return parsed;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.report || !args.output) {
    console.error('Usage: node render-html-report.mjs --report report.json --output report.html [--lang pt-BR|en]');
    process.exitCode = 2;
    return;
  }
  const reportPath = path.resolve(args.report);
  const outputPath = path.resolve(args.output);
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, renderHtmlReport(report, { lang: args.lang }), 'utf8');
  console.log(`HTML report: ${outputPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runCli();
}
