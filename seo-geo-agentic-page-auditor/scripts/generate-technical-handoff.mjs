#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SEVERITY_ORDER = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW'];

const COPY = {
  'pt-BR': {
    title: 'Handoff técnico de SEO, GEO e prontidão agêntica',
    purpose: 'Documento de implementação para a equipe de desenvolvimento ou IA responsável pelo site.',
    generated: 'Gerado em',
    source: 'Fonte de evidências',
    target: 'Alvo auditado',
    method: 'Método',
    methodPage: 'Comparação automatizada do HTML inicial sem JavaScript entre navegadores, mecanismos de busca e crawlers sociais, seguida de inspeção renderizada com navegador real.',
    methodSitemap: 'Leitura automatizada do HTML inicial de cada URL declarada no sitemap.',
    evidenceRule: 'Regra de evidência',
    evidenceRuleText: 'Fatos abaixo vêm do relatório JSON. Inferências e recomendações são identificadas separadamente e não devem ser tratadas como observações diretas.',
    outcome: 'Resultado',
    scope: 'Escopo',
    urlsAudited: 'URLs auditadas',
    urlsAffected: 'URLs com achados',
    findings: 'Achados',
    executive: 'Resumo executivo',
    facts: 'Fatos verificados',
    implementation: 'Plano de implementação',
    finding: 'Achado',
    fact: 'Fato verificado',
    inference: 'Inferência técnica',
    recommendation: 'Recomendação',
    acceptance: 'Critérios de aceite',
    verification: 'Verificação',
    evidence: 'Evidência',
    affectedUrls: 'URLs afetadas',
    consumerMatrix: 'Matriz de consumidores',
    consumer: 'Consumidor',
    status: 'Status',
    finalUrl: 'URL final',
    titleLabel: 'Título',
    canonical: 'Canônica',
    initialSnapshot: 'Snapshot técnico da página',
    initialHtml: 'HTML inicial',
    renderedBeforeScroll: 'DOM renderizado antes da rolagem',
    renderedAfterScroll: 'DOM renderizado após a rolagem',
    wordCountContext: 'As contagens representam snapshots diferentes: HTML sem JavaScript, DOM hidratado antes da rolagem e DOM após a rolagem. Diferenças entre elas ajudam a localizar dependência de JavaScript ou interação; não são uma pontuação de qualidade.',
    words: 'palavras',
    h1: 'H1',
    internalLinks: 'links internos',
    jsonLd: 'blocos JSON-LD',
    resourceBudget: 'Recursos transferidos no teste renderizado',
    duplicateMetadata: 'Metadados duplicados',
    duplicateTitles: 'Grupos de títulos duplicados',
    duplicateDescriptions: 'Grupos de descrições duplicadas',
    external: 'Ações externas após o deploy',
    caveats: 'Ressalvas e limites',
    appendix: 'Apêndice técnico',
    noFindings: 'Nenhum achado automatizado foi registrado.',
    noAffectedUrls: 'Nenhuma URL afetada foi registrada para este código.',
    batch1: 'Lote 1: bloqueadores de publicação',
    batch2: 'Lote 2: achados de alta prioridade',
    batch3: 'Lote 3: otimizações de prioridade média',
    batch4: 'Lote 4: refinamentos de baixa prioridade',
    caveatItems: [
      'Este documento não garante indexação, posição, rich result, citação por IA ou atualização imediata de cache social.',
      'Contagens de palavras e limites de caracteres são heurísticas de diagnóstico, não regras de ranqueamento.',
      'Métricas de laboratório devem ser confirmadas com dados de campo antes de decisões de performance de alto impacto.',
      'O JSON original permanece a fonte completa e auditável; este Markdown organiza as evidências para execução.',
      'Revise o documento antes de compartilhá-lo para confirmar que o alvo auditado não contém dados sensíveis.',
    ],
  },
  en: {
    title: 'Technical SEO, GEO and agentic-readiness handoff',
    purpose: 'Implementation document for the development team or AI responsible for the website.',
    generated: 'Generated at',
    source: 'Evidence source',
    target: 'Audited target',
    method: 'Method',
    methodPage: 'Automated comparison of initial no-JavaScript HTML across simulated browser, search-engine and social-crawler User-Agents, followed by a rendered inspection in a real browser.',
    methodSitemap: 'Automated inspection of the initial HTML returned by every URL declared in the sitemap.',
    evidenceRule: 'Evidence rule',
    evidenceRuleText: 'Facts below come from the JSON report. Inferences and recommendations are labeled separately and must not be treated as direct observations.',
    outcome: 'Outcome',
    scope: 'Scope',
    urlsAudited: 'Audited URLs',
    urlsAffected: 'URLs with findings',
    findings: 'Findings',
    executive: 'Executive summary',
    facts: 'Verified facts',
    implementation: 'Implementation plan',
    finding: 'Finding',
    fact: 'Verified fact',
    inference: 'Technical inference',
    recommendation: 'Recommendation',
    acceptance: 'Acceptance criteria',
    verification: 'Verification',
    evidence: 'Evidence',
    affectedUrls: 'Affected URLs',
    consumerMatrix: 'Consumer matrix',
    consumer: 'Consumer',
    status: 'Status',
    finalUrl: 'Final URL',
    titleLabel: 'Title',
    canonical: 'Canonical',
    initialSnapshot: 'Technical page snapshot',
    initialHtml: 'Initial HTML',
    renderedBeforeScroll: 'Rendered DOM before scrolling',
    renderedAfterScroll: 'Rendered DOM after scrolling',
    wordCountContext: 'Counts represent different snapshots: no-JavaScript HTML, hydrated DOM before scrolling and DOM after scrolling. Differences help locate JavaScript or interaction dependencies; they are not a quality score.',
    words: 'words',
    h1: 'H1',
    internalLinks: 'internal links',
    jsonLd: 'JSON-LD blocks',
    resourceBudget: 'Resources transferred in the rendered test',
    duplicateMetadata: 'Duplicate metadata',
    duplicateTitles: 'Duplicate title groups',
    duplicateDescriptions: 'Duplicate description groups',
    external: 'External actions after deployment',
    caveats: 'Caveats and limits',
    appendix: 'Technical appendix',
    noFindings: 'No automated findings were recorded.',
    noAffectedUrls: 'No affected URL was recorded for this code.',
    batch1: 'Batch 1: release blockers',
    batch2: 'Batch 2: high-priority findings',
    batch3: 'Batch 3: medium-priority optimizations',
    batch4: 'Batch 4: low-priority refinements',
    caveatItems: [
      'This document does not guarantee indexing, ranking, rich results, AI citations or immediate social-cache refreshes.',
      'Word counts and character limits are diagnostic heuristics, not ranking rules.',
      'Lab metrics should be confirmed with field data before high-impact performance decisions.',
      'The original JSON remains the complete auditable source; this Markdown organizes its evidence for implementation.',
      'Review the document before sharing it to confirm the audited target contains no sensitive data.',
    ],
  },
};

const GUIDANCE = {
  'crawler-fetch-failed': {
    inference: ['A camada de entrega impede que ao menos um crawler acesse a página.', 'The delivery layer prevents at least one crawler from accessing the page.'],
    recommendation: ['Corrigir DNS, origem, WAF, CDN ou timeout para que todos os consumidores pretendidos recebam a mesma página pública.', 'Fix DNS, origin, WAF, CDN or timeout behavior so every intended consumer receives the same public page.'],
    acceptance: ['Todos os crawlers testados recebem HTTP 200 e o mesmo conteúdo público essencial.', 'Every tested crawler receives HTTP 200 and the same essential public content.'],
    verification: ['Reexecutar o auditor e confirmar ausência de erros de fetch na matriz de consumidores.', 'Rerun the auditor and confirm there are no fetch errors in the consumer matrix.'],
  },
  'crawler-non-200': {
    inference: ['A resposta HTTP atual interrompe ou enfraquece a cadeia de descoberta e indexação.', 'The current HTTP response interrupts or weakens the discovery and indexing chain.'],
    recommendation: ['Corrigir a rota, redirecionamento ou camada de entrega para retornar o status intencional; páginas indexáveis devem terminar em 200.', 'Fix the route, redirect or delivery layer to return the intended status; indexable pages must end in 200.'],
    acceptance: ['A URL preferida termina em HTTP 200 sem loop, desafio ou mutação inesperada.', 'The preferred URL ends in HTTP 200 without a loop, challenge or unexpected mutation.'],
    verification: ['Testar a cadeia com curl e com os User-Agents simulados pelo auditor.', 'Test the chain with curl and the User-Agents simulated by the auditor.'],
  },
  'soft-404': {
    inference: ['Rotas ausentes parecem compartilhar a resposta HTTP 200 da aplicação, o que dificulta distinguir páginas reais de URLs inexistentes.', 'Missing routes appear to share the application HTTP 200 response, making real pages difficult to distinguish from nonexistent URLs.'],
    recommendation: ['Configurar a camada responsável pelas rotas ausentes para devolver HTTP 404 real, preservando uma página visual de erro útil. Não redirecionar toda URL desconhecida para a home.', 'Configure the layer responsible for missing routes to return a real HTTP 404 while preserving a useful visual error page. Do not redirect every unknown URL to the home page.'],
    acceptance: ['Uma URL inexistente retorna HTTP 404; URLs públicas válidas continuam retornando seus status e conteúdos corretos.', 'A nonexistent URL returns HTTP 404; valid public URLs continue returning their correct status and content.'],
    verification: ['Testar uma rota aleatória inexistente e uma amostra de rotas válidas com navegador, `curl` e crawler sem JavaScript.', 'Test a random nonexistent route and a sample of valid routes with a browser, `curl` and a no-JavaScript crawler.'],
  },
  noindex: {
    inference: ['A própria resposta instrui mecanismos de busca a não indexar a página.', 'The response itself instructs search engines not to index the page.'],
    recommendation: ['Remover `noindex` do HTML inicial e de `X-Robots-Tag` somente se a página for pública e destinada à busca.', 'Remove `noindex` from initial HTML and `X-Robots-Tag` only when the page is public and intended for search.'],
    acceptance: ['HTML e cabeçalhos não contêm diretivas conflitantes e a política final permite indexação.', 'HTML and headers contain no conflicting directives and the final policy allows indexing.'],
    verification: ['Inspecionar HTML inicial e cabeçalhos com JavaScript desativado.', 'Inspect initial HTML and headers with JavaScript disabled.'],
  },
  'missing-title': metadataGuidance('title'),
  'missing-description': metadataGuidance('description'),
  'missing-h1': metadataGuidance('h1'),
  'multiple-h1': metadataGuidance('h1-count'),
  'canonical-count': canonicalGuidance(),
  'canonical-mismatch': canonicalGuidance(),
  'canonical-hydration-mismatch': canonicalGuidance(),
  'redirected-sitemap-url': canonicalGuidance(),
  'social-url-mismatch': canonicalGuidance(),
  'robots-disallowed': {
    inference: ['O robots.txt impede o crawler indicado de acessar a URL, interrompendo a etapa de rastreamento.', 'robots.txt prevents the named crawler from accessing the URL, interrupting the crawling stage.'],
    recommendation: ['Revisar o grupo e a regra vencedora no robots.txt segundo a correspondência mais específica do RFC 9309.', 'Review the winning robots.txt group and rule using RFC 9309 longest-match behavior.'],
    acceptance: ['A URL estratégica é permitida para os mecanismos de busca pretendidos e a regra vencedora fica registrada na auditoria.', 'The strategic URL is allowed for intended search engines and the winning rule is recorded in the audit.'],
    verification: ['Reexecutar a auditoria e confirmar a política no Search Console ou ferramenta oficial equivalente.', 'Rerun the audit and confirm the policy in Search Console or an equivalent official tool.'],
  },
  'robots-unavailable': {
    inference: ['A política de rastreamento não pôde ser confirmada com confiança nesta execução.', 'The crawl policy could not be confirmed reliably in this run.'],
    recommendation: ['Corrigir a disponibilidade e o status de `/robots.txt` e repetir a auditoria antes de concluir sobre rastreamento.', 'Fix `/robots.txt` availability and status, then rerun the audit before drawing crawlability conclusions.'],
    acceptance: ['O robots.txt retorna uma resposta estável e a regra aplicável à URL pode ser determinada.', 'robots.txt returns a stable response and the rule applicable to the URL can be determined.'],
    verification: ['Buscar `/robots.txt` diretamente e repetir a avaliação com os consumidores pretendidos.', 'Fetch `/robots.txt` directly and repeat evaluation for intended consumers.'],
  },
  'ai-crawler-disallowed': {
    inference: ['O crawler de busca por IA indicado não pode rastrear a URL segundo o robots.txt atual.', 'The named AI search crawler cannot crawl the URL under the current robots.txt policy.'],
    recommendation: ['Confirmar se o bloqueio é uma decisão de governança; alterá-lo somente quando a descoberta por esse consumidor for desejada.', 'Confirm whether the block is a governance decision; change it only when discovery by that consumer is intended.'],
    acceptance: ['A política para crawlers de IA é deliberada, documentada e coerente com os objetivos do site.', 'The AI crawler policy is deliberate, documented and aligned with site goals.'],
    verification: ['Comparar a regra específica, o resultado automatizado e a política aprovada pela organização.', 'Compare the specific rule, automated result and organization-approved policy.'],
  },
  'no-internal-links': {
    inference: ['A página depende de descoberta externa ou JavaScript para distribuir e receber contexto interno.', 'The page depends on external discovery or JavaScript to receive and distribute internal context.'],
    recommendation: ['Adicionar links HTML contextuais e rastreáveis para páginas relacionadas e garantir ao menos um caminho interno até esta URL.', 'Add contextual crawlable HTML links to related pages and ensure at least one internal path reaches this URL.'],
    acceptance: ['Links relevantes existem no HTML inicial e a página não está órfã.', 'Relevant links exist in initial HTML and the page is not orphaned.'],
    verification: ['Reauditar a página e executar uma análise de links internos do sitemap.', 'Reaudit the page and run an internal-link analysis across the sitemap.'],
  },
  'thin-initial-html': renderingGuidance(),
  'thin-initial-html-heuristic': renderingGuidance(),
  'main-content-js-dependent': renderingGuidance(),
  'scroll-dependent-content': renderingGuidance(),
  'title-hydration-mismatch': {
    inference: ['O título não possui uma única fonte de verdade entre servidor e cliente.', 'The title has no single source of truth across server and client.'],
    recommendation: ['Gerar o título correto no HTML inicial e impedir que a hidratação o substitua por outro valor.', 'Generate the correct title in initial HTML and prevent hydration from replacing it with another value.'],
    acceptance: ['Título inicial e renderizado são idênticos e específicos para a rota.', 'Initial and rendered titles are identical and route-specific.'],
    verification: ['Comparar `view-source` com o DOM após hidratação e repetir com os User-Agents simulados.', 'Compare view-source with the hydrated DOM and repeat with the simulated User-Agents.'],
  },
  'crawler-divergence': {
    inference: ['Consumidores diferentes recebem sinais essenciais divergentes.', 'Different consumers receive divergent essential signals.'],
    recommendation: ['Remover regras por user agent e alinhar título, canônica e conteúdo essencial na mesma resposta pública.', 'Remove user-agent-specific rules and align title, canonical and essential content in the same public response.'],
    acceptance: ['Browser e requisições com User-Agents simulados de busca e redes sociais recebem sinais equivalentes.', 'Browser and requests using simulated search and social User-Agents receive equivalent signals.'],
    verification: ['Reexecutar a matriz completa de consumidores.', 'Rerun the full consumer matrix.'],
  },
  'missing-social-tag': socialGuidance(),
  'missing-og-image': socialGuidance(),
  'missing-twitter-image': socialGuidance(),
  'og-image-unreachable': socialGuidance(),
  'og-image-dimensions': socialGuidance(),
  'invalid-json-ld': {
    inference: ['O dado estruturado não pode ser interpretado com confiança.', 'The structured data cannot be interpreted reliably.'],
    recommendation: ['Corrigir a sintaxe JSON-LD e garantir que tipo, propriedades e URLs correspondam ao conteúdo visível.', 'Fix JSON-LD syntax and ensure type, properties and URLs match visible content.'],
    acceptance: ['Todos os blocos JSON-LD são válidos e representam fielmente a página.', 'Every JSON-LD block is valid and truthfully represents the page.'],
    verification: ['Validar o HTML publicado no Rich Results Test ou Schema Markup Validator e no auditor.', 'Validate published HTML in Rich Results Test or Schema Markup Validator and in the auditor.'],
  },
  'large-script-transfer': performanceGuidance('scripts'),
  'large-image-transfer': performanceGuidance('images'),
  'large-video-transfer': performanceGuidance('video'),
  'hidden-loaded-media': performanceGuidance('hidden-media'),
  lcp: performanceGuidance('lcp'),
  cls: performanceGuidance('cls'),
  'unnamed-interactive': {
    inference: ['Controles sem nome acessível prejudicam leitores de tela e agentes de navegador.', 'Unnamed controls weaken screen-reader and browser-agent operation.'],
    recommendation: ['Adicionar nome acessível por texto, `aria-label` apropriado ou associação semântica, preservando o comportamento visual.', 'Add an accessible name through text, an appropriate `aria-label` or semantic association while preserving visual behavior.'],
    acceptance: ['Todo controle interativo possui nome acessível único e útil.', 'Every interactive control has a unique useful accessible name.'],
    verification: ['Inspecionar a árvore de acessibilidade e navegar por teclado.', 'Inspect the accessibility tree and navigate by keyboard.'],
  },
  'page-errors': {
    inference: ['Erros de execução podem interromper hidratação, conteúdo ou ações importantes.', 'Runtime errors can interrupt hydration, content or important actions.'],
    recommendation: ['Corrigir os erros registrados e tratar falhas de integrações sem impedir a renderização principal.', 'Fix recorded errors and contain integration failures without blocking primary rendering.'],
    acceptance: ['A navegação principal não produz erros de página e o conteúdo essencial permanece funcional.', 'Primary navigation produces no page errors and essential content remains functional.'],
    verification: ['Repetir o teste em navegação fria e quente, mobile e desktop.', 'Repeat cold and warm navigation tests on mobile and desktop.'],
  },
  'title-length': polishGuidance('title'),
  'description-length': polishGuidance('description'),
  'html-over-10mb': performanceGuidance('html'),
  'non-html-sitemap-url': {
    inference: ['A URL não entrega HTML e, portanto, regras de título, H1, canônica HTML e Open Graph não se aplicam diretamente.', 'The URL does not return HTML, so HTML title, H1, canonical and Open Graph rules do not directly apply.'],
    recommendation: ['Confirmar se o recurso não HTML deve ser descoberto por busca. Mantê-lo no sitemap apenas quando essa descoberta for intencional.', 'Confirm whether the non-HTML resource should be discoverable in search. Keep it in the sitemap only when that discovery is intentional.'],
    acceptance: ['A presença no sitemap é deliberada e o recurso retorna status, MIME e política de indexação coerentes com sua finalidade.', 'Sitemap presence is deliberate and the resource returns status, MIME and indexability policy consistent with its purpose.'],
    verification: ['Inspecionar status, `Content-Type`, `X-Robots-Tag` e comportamento da URL em produção.', 'Inspect status, `Content-Type`, `X-Robots-Tag` and production URL behavior.'],
  },
};

let language = 'pt-BR';

function metadataGuidance(kind) {
  const values = {
    title: [
      ['O HTML inicial não identifica a página com um título útil.', 'The initial HTML does not identify the page with a useful title.'],
      ['Definir um `<title>` único, descritivo e alinhado à intenção principal da rota.', 'Define a unique descriptive `<title>` aligned with the route primary intent.'],
      ['O HTML inicial contém exatamente um título específico e estável.', 'Initial HTML contains exactly one route-specific stable title.'],
    ],
    description: [
      ['O HTML inicial não fornece um resumo editorial para busca e compartilhamento.', 'Initial HTML provides no editorial summary for search and sharing.'],
      ['Adicionar uma meta description única que explique claramente a utilidade da página.', 'Add a unique meta description that clearly explains the page value.'],
      ['A descrição existe no HTML inicial, é específica e não contradiz o conteúdo.', 'The description exists in initial HTML, is specific and does not contradict content.'],
    ],
    h1: [
      ['O assunto principal não está identificado por um H1 no HTML inicial.', 'The primary topic is not identified by an H1 in initial HTML.'],
      ['Adicionar um H1 visível, único e coerente com título, conteúdo e intenção.', 'Add a visible unique H1 consistent with title, content and intent.'],
      ['Existe um H1 útil no HTML inicial e ele corresponde à página.', 'A useful H1 exists in initial HTML and matches the page.'],
    ],
    'h1-count': [
      ['A hierarquia principal possui mais de um H1 e requer revisão semântica.', 'The primary hierarchy has more than one H1 and needs semantic review.'],
      ['Consolidar a identificação principal em um H1 e rebaixar subtítulos conforme a hierarquia real.', 'Consolidate the primary identification into one H1 and demote subheadings according to the real hierarchy.'],
      ['A página possui um H1 principal e uma hierarquia lógica de H2/H3.', 'The page has one primary H1 and a logical H2/H3 hierarchy.'],
    ],
  }[kind];
  return { inference: values[0], recommendation: values[1], acceptance: values[2], verification: ['Inspecionar o HTML inicial e o DOM renderizado.', 'Inspect initial HTML and the rendered DOM.'] };
}

function canonicalGuidance() {
  return {
    inference: ['A URL preferida não está declarada de forma única e consistente em toda a cadeia.', 'The preferred URL is not declared uniquely and consistently across the delivery chain.'],
    recommendation: ['Escolher uma variante canônica e alinhar redirecionamentos, sitemap, links internos, `<link rel="canonical">`, `og:url` e schema.', 'Choose one canonical variant and align redirects, sitemap, internal links, `<link rel="canonical">`, `og:url` and schema.'],
    acceptance: ['Cada URL indexável retorna uma canônica absoluta, autorreferente e idêntica antes e depois da hidratação.', 'Every indexable URL returns one absolute self-referencing canonical that remains identical after hydration.'],
    verification: ['Testar variantes com e sem barra, query string e protocolo; confirmar uma única URL final.', 'Test slash, query-string and protocol variants; confirm one final URL.'],
  };
}

function renderingGuidance() {
  return {
    inference: ['Parte relevante do significado da página pode não estar disponível no HTML inicial ou depende de interação para existir no DOM.', 'A meaningful part of the page may be absent from initial HTML or depend on interaction before it exists in the DOM.'],
    recommendation: ['Renderizar no servidor ou prerenderizar título, H1, resposta principal, seções essenciais e links; usar JavaScript para aprimorar, não para criar o conteúdo crítico.', 'Server-render or prerender title, H1, primary answer, essential sections and links; use JavaScript to enhance rather than create critical content.'],
    acceptance: ['O HTML inicial contém o conteúdo essencial e o DOM não ganha blocos semânticos importantes apenas após rolagem.', 'Initial HTML contains essential content and the DOM does not gain important semantic sections only after scrolling.'],
    verification: ['Comparar `view-source`, JavaScript desativado, DOM hidratado e DOM após rolagem completa.', 'Compare view-source, JavaScript disabled, hydrated DOM and DOM after full scrolling.'],
  };
}

function socialGuidance() {
  return {
    inference: ['O preview social pode ficar genérico, incompleto, cortado ou indisponível.', 'The social preview may be generic, incomplete, cropped or unavailable.'],
    recommendation: ['Entregar no HTML inicial tags Open Graph e Twitter completas, com URL absoluta e imagem pública 1200x630 específica para a página.', 'Deliver complete Open Graph and Twitter tags in initial HTML with an absolute URL and a public page-specific 1200x630 image.'],
    acceptance: ['Crawlers sociais recebem título, descrição, URL e imagem válidos; a imagem abre com MIME correto e mede 1200x630.', 'Social crawlers receive valid title, description, URL and image; the image opens with the correct MIME and measures 1200x630.'],
    verification: ['Reauditar com Facebook, X e LinkedIn e depois solicitar nova leitura nos depuradores oficiais.', 'Reaudit with Facebook, X and LinkedIn, then request a fresh scrape in official debuggers.'],
  };
}

function performanceGuidance(kind) {
  const recommendation = {
    scripts: ['Reduzir JavaScript não utilizado, dividir bundles e adiar integrações não críticas.', 'Reduce unused JavaScript, split bundles and defer non-critical integrations.'],
    images: ['Dimensionar, comprimir e carregar imagens conforme viewport e prioridade visual.', 'Size, compress and load images according to viewport and visual priority.'],
    video: ['Usar encodes curtos e eficientes, poster apropriado e carregamento condicionado à viewport.', 'Use short efficient encodes, an appropriate poster and viewport-gated loading.'],
    'hidden-media': ['Evitar montar ou baixar mídia oculta; condicionar a criação do recurso à viewport ou interação real.', 'Avoid mounting or downloading hidden media; gate resource creation by viewport or real interaction.'],
    lcp: ['Identificar o elemento LCP, priorizar seu recurso e remover bloqueios do caminho crítico.', 'Identify the LCP element, prioritize its resource and remove critical-path blockers.'],
    cls: ['Reservar dimensões estáveis para mídia e conteúdo dinâmico e evitar inserções acima do conteúdo visível.', 'Reserve stable dimensions for media and dynamic content and avoid insertions above visible content.'],
    html: ['Reduzir o HTML inicial sem remover conteúdo semântico essencial; eliminar payloads e duplicações desnecessárias.', 'Reduce initial HTML without removing essential semantic content; eliminate unnecessary payloads and duplication.'],
  }[kind];
  return {
    inference: ['O custo de entrega ou instabilidade observada pode prejudicar experiência, Core Web Vitals e operação por agentes.', 'Observed delivery cost or instability may weaken user experience, Core Web Vitals and agent operation.'],
    recommendation,
    acceptance: ['O recurso deixa de exceder o orçamento apontado e a experiência permanece visual e funcionalmente correta.', 'The resource no longer exceeds the flagged budget and the experience remains visually and functionally correct.'],
    verification: ['Medir novamente em mobile e desktop, com cache frio, e confirmar com dados de campo quando disponíveis.', 'Measure again on mobile and desktop with a cold cache and confirm with field data when available.'],
  };
}

function polishGuidance(kind) {
  return {
    inference: [`O ${kind === 'title' ? 'título' : 'resumo'} pode truncar em algumas superfícies.`, `The ${kind} may truncate on some surfaces.`],
    recommendation: ['Reescrever apenas se a versão truncada perder clareza ou intenção; não aplicar limite rígido automaticamente.', 'Rewrite only when truncation loses clarity or intent; do not apply a hard limit automatically.'],
    acceptance: ['A mensagem principal permanece clara nos principais previews e resultados.', 'The primary message remains clear in key previews and results.'],
    verification: ['Inspecionar previews reais em desktop e mobile.', 'Inspect real previews on desktop and mobile.'],
  };
}

export function renderTechnicalHandoff(report, options = {}) {
  language = normalizeLanguage(options.lang);
  const kind = Array.isArray(report?.noJavaScript) ? 'page' : Array.isArray(report?.results) ? 'sitemap' : null;
  if (!kind) throw new Error('Unsupported report format. Expected a page or sitemap audit JSON file.');
  return kind === 'page' ? renderPageHandoff(report, options) : renderSitemapHandoff(report, options);
}

function renderPageHandoff(report, options) {
  const t = COPY[language];
  const issues = [...(report.issues || [])].sort(compareSeverity);
  const baseline = report.noJavaScript?.find((entry) => entry.userAgent === 'browser-no-js') || report.noJavaScript?.[0] || {};
  const initial = baseline.document || {};
  const rendered = report.rendered || {};
  const renderedDocument = rendered.document || {};
  const counts = countBySeverity(issues);
  const outcome = pageOutcome(issues);
  const sections = [
    header(report.targetUrl, report.generatedAt, outcome, options.source, t.methodPage),
    `## ${t.executive}\n\n${summaryLine(issues.length, counts)}\n`,
    `## ${t.facts}\n\n${pageFacts(report, baseline, initial, rendered, renderedDocument)}\n`,
  ];

  if (issues.length) {
    sections.push(`## ${t.implementation}\n\n${renderBatches(issues, (issue) => renderPageIssue(issue, report))}`);
  } else {
    sections.push(`## ${t.implementation}\n\n${t.noFindings}\n`);
  }

  sections.push(`## ${t.consumerMatrix}\n\n${consumerTable(report.noJavaScript || [])}\n`);
  sections.push(`## ${t.external}\n\n${bulletList(externalActions(issues))}\n`);
  sections.push(`## ${t.caveats}\n\n${bulletList(t.caveatItems)}\n`);
  return `${sections.join('\n')}\n`;
}

function renderSitemapHandoff(report, options) {
  const t = COPY[language];
  const grouped = groupSitemapIssues(report.results || []);
  const pageFindings = [...grouped.entries()].map(([code, urls]) => ({
    code,
    urls,
    severity: sitemapSeverity(code),
    message: sitemapFact(code, urls.length),
  }));
  const sitemapFindings = (report.sitemapIssues || []).map((issue) => ({
    code: issue.code || 'sitemap-unavailable',
    urls: [report.sitemap || '-'],
    severity: 'BLOCKER',
    message: issue.message || sitemapFact(issue.code || 'sitemap-unavailable', 1),
  }));
  const findings = [...sitemapFindings, ...pageFindings].sort(compareSeverity);
  const counts = countBySeverity(findings);
  const outcome = sitemapOutcome(findings);
  const target = report.sitemap || '-';
  const sections = [
    header(target, report.generatedAt, outcome, options.source, t.methodSitemap),
    `## ${t.executive}\n\n- **${t.urlsAudited}:** ${number(report.urlCount ?? report.results?.length)}\n- **${t.urlsAffected}:** ${number(report.failingUrlCount ?? (report.results || []).filter((result) => result.issues?.length).length)}\n- **${t.findings}:** ${sitemapFindingSummary(findings)}\n- ${summaryLine(findings.length, counts)}\n`,
    `## ${t.facts}\n\n${sitemapFacts(report)}\n`,
  ];

  if (findings.length) {
    sections.push(`## ${t.implementation}\n\n${renderBatches(findings, (finding) => renderSitemapIssue(finding))}`);
  } else {
    sections.push(`## ${t.implementation}\n\n${t.noFindings}\n`);
  }

  sections.push(`## ${t.duplicateMetadata}\n\n${duplicateGroups(t.duplicateTitles, report.duplicateTitles)}\n\n${duplicateGroups(t.duplicateDescriptions, report.duplicateDescriptions)}\n`);
  sections.push(`## ${t.external}\n\n${bulletList(externalActions(findings))}\n`);
  sections.push(`## ${t.caveats}\n\n${bulletList(t.caveatItems)}\n`);
  sections.push(`## ${t.appendix}\n\n${sitemapInventory(report.results || [])}\n`);
  return `${sections.join('\n')}\n`;
}

function header(target, generatedAt, outcome, source, method) {
  const t = COPY[language];
  return `# ${t.title}\n\n${t.purpose}\n\n- **${t.target}:** ${mdCode(target)}\n- **${t.generated}:** ${formatDate(generatedAt)}\n- **${t.outcome}:** ${mdCode(outcome || '-')}\n- **${t.source}:** ${mdCode(displayEvidenceSource(source))}\n- **${t.method}:** ${method}\n- **${t.evidenceRule}:** ${t.evidenceRuleText}\n`;
}

function pageFacts(report, baseline, initial, rendered, renderedDocument) {
  const t = COPY[language];
  const meta = initial.meta || {};
  const performance = rendered.performance || {};
  const totals = performance.totals || {};
  const jsonLdCount = (initial.jsonLd || []).length;
  const beforeScroll = rendered.scrollDiscovery?.before;
  const afterScroll = rendered.scrollDiscovery?.after;
  const beforeScrollWords = beforeScroll?.wordCount ?? renderedDocument.wordCount;
  const afterScrollWords = afterScroll?.wordCount ?? renderedDocument.wordCount;
  return [
    `- **${t.status}:** ${baseline.status ?? '-'}; **${t.finalUrl}:** ${mdCode(baseline.finalUrl || '-')}`,
    `- **${t.titleLabel}:** ${mdCode(initial.title || '-')}`,
    `- **${t.canonical}:** ${mdCode(first(initial.canonical) || '-')}`,
    `- **Meta description:** ${mdCode(first(meta.description) || '-')}`,
    `- **${t.initialHtml}:** ${formatCount(initial.wordCount, language === 'pt-BR' ? 'palavra' : 'word', language === 'pt-BR' ? 'palavras' : 'words')}; ${formatCount(initial.h1?.length, 'H1', 'H1')}; ${formatCount(initial.links?.internal, language === 'pt-BR' ? 'link interno' : 'internal link', language === 'pt-BR' ? 'links internos' : 'internal links')}; ${formatCount(jsonLdCount, language === 'pt-BR' ? 'bloco JSON-LD' : 'JSON-LD block', language === 'pt-BR' ? 'blocos JSON-LD' : 'JSON-LD blocks')}.`,
    `- **${t.renderedBeforeScroll}:** ${formatCount(beforeScrollWords, language === 'pt-BR' ? 'palavra' : 'word', language === 'pt-BR' ? 'palavras' : 'words')}; ${formatCount(beforeScroll?.sections, language === 'pt-BR' ? 'seção' : 'section', language === 'pt-BR' ? 'seções' : 'sections')}.`,
    `- **${t.renderedAfterScroll}:** ${formatCount(afterScrollWords, language === 'pt-BR' ? 'palavra' : 'word', language === 'pt-BR' ? 'palavras' : 'words')}; ${formatCount(afterScroll?.sections, language === 'pt-BR' ? 'seção' : 'section', language === 'pt-BR' ? 'seções' : 'sections')}; ${formatCount(renderedDocument.h1?.length, 'H1', 'H1')}; ${formatCount(renderedDocument.links?.internal, language === 'pt-BR' ? 'link interno' : 'internal link', language === 'pt-BR' ? 'links internos' : 'internal links')}.`,
    `- **${language === 'pt-BR' ? 'Como interpretar as contagens' : 'How to interpret the counts'}:** ${t.wordCountContext}`,
    `- **${t.resourceBudget}:** ${language === 'pt-BR' ? 'scripts' : 'scripts'} ${formatBytes(totals.script?.transferSize)}; ${language === 'pt-BR' ? 'imagens' : 'images'} ${formatBytes(totals.image?.transferSize)}; ${language === 'pt-BR' ? 'vídeo' : 'video'} ${formatBytes(totals.video?.transferSize)}; CSS ${formatBytes(totals.stylesheet?.transferSize)}.`,
    `- **Lab:** LCP ${formatDuration(performance.vitals?.lcp)}; CLS ${formatDecimal(performance.vitals?.cls)}; ${formatCount(rendered.pageErrors?.length, language === 'pt-BR' ? 'erro de página' : 'page error', language === 'pt-BR' ? 'erros de página' : 'page errors')}; ${formatCount(rendered.consoleErrors?.length, language === 'pt-BR' ? 'erro de console' : 'console error', language === 'pt-BR' ? 'erros de console' : 'console errors')}.`,
    `- **${language === 'pt-BR' ? 'Escopo da matriz' : 'Matrix scope'}:** ${language === 'pt-BR' ? 'User-Agents simulados a partir da máquina de auditoria; não são requisições originadas em IPs verificados dos crawlers.' : 'Simulated User-Agents from the audit machine; these are not requests from verified crawler IP ranges.'}`,
    `- **${language === 'pt-BR' ? 'Confiança automatizada' : 'Automated confidence'}:** ${mdCode(report.confidence?.level || 'not-determined')}. ${language === 'pt-BR' ? 'Dados de campo, indexação, posicionamento e citações exigem validação externa.' : 'Field data, indexing, rankings and citations require external validation.'}`,
  ].join('\n');
}

function sitemapFacts(report) {
  const t = COPY[language];
  const statusCounts = countValues((report.results || []).map((result) => result.status ?? 'error'));
  const issueCounts = report.issueCounts || Object.fromEntries([...groupSitemapIssues(report.results || [])].map(([code, urls]) => [code, urls.length]));
  const statusText = Object.entries(statusCounts).map(([status, count]) => `${status}: ${number(count)}`).join('; ') || '-';
  const issueText = Object.entries(issueCounts).map(([code, count]) => `${mdCode(code)}: ${number(count)}`).join('; ') || t.noFindings;
  return `- **HTTP:** ${statusText}\n- **${t.findings}:** ${issueText}\n- **${t.duplicateTitles}:** ${number(Object.keys(report.duplicateTitles || {}).length)}\n- **${t.duplicateDescriptions}:** ${number(Object.keys(report.duplicateDescriptions || {}).length)}`;
}

function renderBatches(items, renderItem) {
  const t = COPY[language];
  const groups = [
    [t.batch1, items.filter((item) => item.severity === 'BLOCKER')],
    [t.batch2, items.filter((item) => item.severity === 'HIGH')],
    [t.batch3, items.filter((item) => item.severity === 'MEDIUM')],
    [t.batch4, items.filter((item) => item.severity === 'LOW')],
  ];
  return groups.filter(([, group]) => group.length).map(([title, group]) => `### ${title}\n\n${group.map(renderItem).join('\n\n')}`).join('\n\n');
}

function renderPageIssue(issue, report) {
  const t = COPY[language];
  const guidance = guidanceFor(issue.code, report);
  const evidence = issue.evidence == null ? '' : `\n\n**${t.evidence}:**\n\n${jsonFence(issue.evidence)}`;
  return `#### [${issue.severity}] ${mdInline(issue.code)}\n\n- **${t.fact}:** ${mdInline(localizedPageFact(issue))}\n- **${t.inference}:** ${select(guidance.inference)}\n- **${t.recommendation}:** ${select(guidance.recommendation)}\n- **${t.acceptance}:** ${select(guidance.acceptance)}\n- **${t.verification}:** ${select(guidance.verification)}${evidence}`;
}

function renderSitemapIssue(finding) {
  const t = COPY[language];
  const guidance = guidanceFor(normalizeIssueCode(finding.code));
  return `#### [${finding.severity}] ${mdInline(finding.code)}\n\n- **${t.fact}:** ${mdInline(finding.message)}\n- **${t.inference}:** ${select(guidance.inference)}\n- **${t.recommendation}:** ${select(guidance.recommendation)}\n- **${t.acceptance}:** ${select(guidance.acceptance)}\n- **${t.verification}:** ${select(guidance.verification)}\n\n**${t.affectedUrls} (${number(finding.urls.length)}):**\n\n${bulletList(finding.urls.map((url) => mdCode(url)), false)}`;
}

function consumerTable(entries) {
  const t = COPY[language];
  const headerRow = `| ${t.consumer} | ${t.status} | ${t.finalUrl} | ${t.titleLabel} | ${t.canonical} |\n|---|---:|---|---|---|`;
  const rows = entries.map((entry) => {
    const document = entry.document || {};
    return `| ${mdCell(entry.userAgent)} | ${mdCell(entry.status ?? 'error')} | ${mdCell(entry.finalUrl || '-')} | ${mdCell(document.title || '-')} | ${mdCell(first(document.canonical) || '-')} |`;
  });
  return [headerRow, ...rows].join('\n');
}

function duplicateGroups(label, groups) {
  const entries = Object.entries(groups || {});
  if (!entries.length) return `### ${label}\n\n0`;
  const groupLabel = language === 'pt-BR' ? 'Grupo' : 'Group';
  return `### ${label} (${number(entries.length)})\n\n${entries.map(([value, urls], index) => `<details>\n<summary>${groupLabel} ${index + 1}: ${escapeHtmlSummary(value)} (${number(urls.length)} URLs)</summary>\n\n${bulletList(urls.map((url) => mdCode(url)), false)}\n\n</details>`).join('\n\n')}`;
}

function sitemapInventory(results) {
  const t = COPY[language];
  if (!results.length) return t.noAffectedUrls;
  const rows = results.map((result) => `| ${mdCell(result.url)} | ${mdCell(result.status ?? 'error')} | ${mdCell(result.finalUrl || '-')} | ${mdCell((result.issues || []).join(', ') || '-')} |`);
  return `| URL | ${t.status} | ${t.finalUrl} | ${t.findings} |\n|---|---:|---|---|\n${rows.join('\n')}`;
}

function guidanceFor(code, report) {
  if (code === 'missing-json-ld') return schemaGuidance(report);
  if (code.startsWith('schema-')) return structuredDataGuidance();
  return GUIDANCE[code] || {
    inference: ['O achado pode reduzir a consistência técnica ou a compreensão da página e requer confirmação no código e no ambiente publicado.', 'The finding may reduce technical consistency or page understanding and requires confirmation in code and in the deployed environment.'],
    recommendation: ['Localizar a fonte de verdade responsável pelo valor observado e corrigir o padrão na camada mais próxima da origem.', 'Locate the source of truth responsible for the observed value and fix the pattern at the layer closest to its origin.'],
    acceptance: ['O achado não reaparece na auditoria e não há regressão visual, funcional ou de indexabilidade.', 'The finding no longer appears in the audit and there is no visual, functional or indexability regression.'],
    verification: ['Reexecutar o mesmo teste no build e na produção, registrando antes e depois.', 'Rerun the same test against the build and production, recording before and after.'],
  };
}

function structuredDataGuidance() {
  return {
    inference: ['O JSON-LD pode ser sintaticamente legível, mas está incompleto ou diverge da URL e do conteúdo visível.', 'JSON-LD may be syntactically readable while remaining incomplete or inconsistent with the page URL and visible content.'],
    recommendation: ['Corrigir a propriedade indicada, alinhar URLs com a canônica e manter somente dados verdadeiros e visíveis. Confirmar requisitos específicos do tipo na documentação oficial.', 'Fix the named property, align URLs with the canonical and keep only truthful visible data. Confirm type-specific requirements in official documentation.'],
    acceptance: ['O auditor não encontra divergências comuns e o HTML publicado passa no Schema Markup Validator e, quando aplicável, no Rich Results Test.', 'The auditor finds no common consistency issue and published HTML passes Schema Markup Validator and, where applicable, Rich Results Test.'],
    verification: ['Comparar cada propriedade material com o conteúdo visível e executar os validadores oficiais após o deploy.', 'Compare each material property with visible content and run official validators after deployment.'],
  };
}

function schemaGuidance(report) {
  const baseline = report?.noJavaScript?.find((entry) => entry.userAgent === 'browser-no-js') || report?.noJavaScript?.[0] || {};
  const title = baseline.document?.title || '';
  let pathname = '/';
  try {
    pathname = new URL(report?.targetUrl || 'https://example.com/').pathname.toLowerCase();
  } catch {
    pathname = '/';
  }
  const context = `${pathname} ${title}`.toLowerCase();
  let recommendation;
  if (pathname === '/') {
    recommendation = ['Adicionar no HTML inicial um grafo JSON-LD com `Organization` e `WebSite`, usando URLs e identidade públicas estáveis. Incluir outros tipos somente quando representarem conteúdo visível.', 'Add an initial-HTML JSON-LD graph with `Organization` and `WebSite`, using stable public identity and URLs. Include other types only when they represent visible content.'];
  } else if (/\/(blog|insights|artigos?|noticias?)\//.test(pathname)) {
    recommendation = ['Adicionar `Article` ou `BlogPosting` e `BreadcrumbList` no HTML inicial, com autor, publisher, imagem e datas que coincidam com o conteúdo visível. Usar `FAQPage` somente se houver FAQ editorial visível e elegível.', 'Add `Article` or `BlogPosting` plus `BreadcrumbList` to initial HTML, with author, publisher, image and dates matching visible content. Use `FAQPage` only when a visible eligible editorial FAQ exists.'];
  } else if (/\/(faq|perguntas?)\//.test(pathname)) {
    recommendation = ['Adicionar `FAQPage` somente quando cada pergunta e resposta estiver visível e tiver uma única resposta editorial, além de `BreadcrumbList` quando a navegação correspondente existir.', 'Add `FAQPage` only when every question and answer is visible and has one editorial answer, plus `BreadcrumbList` when matching navigation exists.'];
  } else if (/(produto|product|software|plataforma|solu[cç][aã]o|service|servi[cç]o|power)/.test(context)) {
    recommendation = ['Escolher entre `SoftwareApplication`, `Product` ou `Service` conforme a oferta real e adicionar `BreadcrumbList` quando aplicável. Preço, disponibilidade, avaliações e funcionalidades só devem entrar quando estiverem visíveis e verificáveis.', 'Choose `SoftwareApplication`, `Product` or `Service` according to the real offer and add `BreadcrumbList` when applicable. Price, availability, reviews and features must be included only when visible and verifiable.'];
  } else {
    recommendation = ['Adicionar `WebPage` com a entidade principal mais específica e verdadeira para o conteúdo visível; incluir `BreadcrumbList` somente quando corresponder à navegação real.', 'Add `WebPage` with the most specific truthful main entity for the visible content; include `BreadcrumbList` only when it matches real navigation.'];
  }
  return {
    inference: ['Mecanismos e agentes precisam inferir entidades e relações apenas do texto, sem uma declaração estruturada complementar.', 'Search engines and agents must infer entities and relationships from text alone, without a complementary structured declaration.'],
    recommendation,
    acceptance: ['O HTML inicial contém JSON-LD válido, com URLs absolutas e propriedades coerentes com a página visível, sem tipos ou dados inventados.', 'Initial HTML contains valid JSON-LD with absolute URLs and properties consistent with the visible page, without invented types or data.'],
    verification: ['Validar o HTML publicado no Schema Markup Validator e, para recursos compatíveis, no Rich Results Test; comparar cada propriedade material com a página visível.', 'Validate published HTML in Schema Markup Validator and, for supported features, Rich Results Test; compare every material property with the visible page.'],
  };
}

function normalizeIssueCode(code) {
  if (/^http-/.test(code) || /^fetch-error/.test(code)) return 'crawler-non-200';
  if (/^canonical-count-/.test(code)) return 'canonical-count';
  return code;
}

function localizedPageFact(issue) {
  if (language === 'en') return issue.message;
  const facts = {
    'crawler-fetch-failed': 'Ao menos uma identidade de crawler não conseguiu buscar a página.',
    'crawler-non-200': 'Ao menos uma identidade de crawler recebeu uma resposta HTTP diferente de 200.',
    noindex: 'A resposta inicial contém uma diretiva que bloqueia indexação.',
    'missing-title': 'O HTML inicial não contém título.',
    'missing-description': 'O HTML inicial não contém meta description.',
    'missing-h1': 'O HTML inicial não contém H1.',
    'multiple-h1': `O HTML inicial contém ${extractFirstNumber(issue.message)} elementos H1.`,
    'canonical-count': `A auditoria esperava uma canônica e encontrou ${extractFirstNumber(issue.message)}.`,
    'canonical-mismatch': 'A canônica não corresponde à URL final esperada para a página.',
    'social-url-mismatch': 'A URL Open Graph não corresponde à canônica.',
    'robots-disallowed': 'O robots.txt bloqueia a URL para um mecanismo de busca pretendido.',
    'robots-unavailable': 'A política do robots.txt não pôde ser determinada com confiança.',
    'ai-crawler-disallowed': 'O robots.txt bloqueia a URL para um crawler de busca por IA.',
    'no-internal-links': 'O HTML inicial não contém links internos rastreáveis.',
    'thin-initial-html': `O conteúdo principal sem JavaScript contém somente ${extractFirstNumber(issue.message)} palavras; essa contagem é uma heurística, não um limite de ranqueamento.`,
    'invalid-json-ld': 'Ao menos um bloco JSON-LD do HTML inicial é inválido.',
    'missing-json-ld': 'O HTML inicial não contém dados estruturados JSON-LD.',
    'soft-404': 'Uma URL propositalmente inexistente retornou HTTP 200, indicando que rotas ausentes podem gerar soft 404.',
    'missing-social-tag': `O HTML inicial não contém ${issue.message.match(/missing ([^.]+)/)?.[1] || 'uma tag social esperada'}.`,
    'og-image-unreachable': 'A imagem Open Graph não carregou.',
    'og-image-dimensions': `A imagem Open Graph possui ${issue.message.match(/is ([0-9]+x[0-9]+)/)?.[1] || 'dimensão divergente'} e foge da proporção de aproximadamente 1.91:1 esperada pelas plataformas.`,
    'missing-lang': 'O HTML inicial não declara o idioma do documento (html[lang]).',
    'missing-json-ld': 'O HTML inicial não contém dados estruturados JSON-LD.',
    'soft-404': 'Uma URL propositalmente inexistente retornou HTTP 200, indicando soft 404 para rotas ausentes.',
    'robots-disallow-all': 'O robots.txt bloqueia o site inteiro para todos os crawlers.',
    'robots-txt-unavailable': 'O robots.txt não retornou 200; crawlers assumem permissão total, mas a descoberta de sitemap via robots.txt fica indisponível.',
    'sitemap-not-in-robots': 'O robots.txt não declara uma linha Sitemap:.',
    'search-crawler-blocked-robots': `O robots.txt bloqueia crawlers de busca (${issue.message.match(/blocks (.+) from crawling/)?.[1] || 'ao menos um'}) de rastrear esta página.`,
    'ai-search-crawler-blocked': `O robots.txt bloqueia crawlers de busca de IA (${issue.message.match(/\(([^)]+)\)/)?.[1] || 'ao menos um'}); a página não pode ser citada por esses mecanismos de resposta de IA.`,
    'user-fetcher-blocked': `O robots.txt bloqueia fetchers de IA acionados por usuários (${issue.message.match(/\(([^)]+)\)/)?.[1] || 'ao menos um'}); aberturas ao vivo por assistentes podem falhar.`,
    'snippet-restricted': 'Controles de snippet (nosnippet ou max-snippet:0) removem a página das prévias de busca e das respostas de IA do Google.',
    'snippet-limited': `O max-snippet limita as prévias a ${extractFirstNumber(issue.message)} caracteres, o que também restringe respostas de IA.`,
    'data-nosnippet-present': `${extractFirstNumber(issue.message)} elementos usam data-nosnippet; o texto deles fica fora das prévias e das respostas de IA.`,
    'hreflang-invalid': `${extractFirstNumber(issue.message)} alternates hreflang têm códigos de idioma inválidos ou URLs não absolutas.`,
    'hreflang-missing-self': 'O conjunto hreflang não referencia a própria página; a autorreferência é obrigatória para reciprocidade válida.',
    'article-missing-dates': 'Os dados estruturados de artigo não trazem datePublished/dateModified nem metas article:; sinais de frescor ausentes.',
    'main-thread-blocking': `Tarefas longas bloquearam a thread principal por cerca de ${extractFirstNumber(issue.message)} ms no total (proxy de TBT em laboratório).`,
    'hidden-loaded-media-desktop': `${extractFirstNumber(issue.message)} elementos de mídia ocultos adicionais carregaram recursos no viewport desktop (1366x900).`,
    'canonical-hydration-mismatch': 'A canônica muda depois da renderização JavaScript.',
    'title-hydration-mismatch': 'O título muda depois da renderização JavaScript.',
    'main-content-js-dependent': 'A maior parte do conteúdo principal aparece somente depois da renderização JavaScript.',
    'scroll-dependent-content': 'Conteúdo relevante é montado no DOM somente depois da rolagem.',
    'crawler-divergence': 'Ao menos uma identidade de crawler recebe título ou canônica divergente.',
    'large-script-transfer': `O teste renderizado transferiu ${issue.message.match(/transferred ([^.]+) of/)?.[1] || 'um volume elevado'} de scripts.`,
    'large-image-transfer': `O teste renderizado transferiu ${issue.message.match(/transferred ([^.]+) of/)?.[1] || 'um volume elevado'} de imagens.`,
    'large-video-transfer': `O teste renderizado transferiu ${issue.message.match(/transferred ([^.]+) of/)?.[1] || 'um volume elevado'} de vídeo.`,
    'hidden-loaded-media': `${formatCount(extractFirstNumber(issue.message), 'elemento de mídia oculto carregou recursos', 'elementos de mídia ocultos carregaram recursos')}.`,
    'unnamed-interactive': `${formatCount(extractFirstNumber(issue.message), 'elemento interativo parece não ter nome acessível', 'elementos interativos parecem não ter nome acessível')}.`,
    'page-errors': 'A página renderizada produziu erros JavaScript.',
    cls: `O CLS de laboratório observado foi ${issue.message.match(/was ([0-9.]+)/)?.[1] || 'superior ao orçamento'}.`,
    lcp: `O LCP de laboratório observado foi ${issue.message.match(/was ([0-9]+ ms)/)?.[1] || 'superior ao orçamento'}.`,
    'title-length': `O título possui ${extractFirstNumber(issue.message)} caracteres; é necessário avaliar clareza e truncamento, sem aplicar um limite rígido.`,
    'description-length': `A descrição possui ${extractFirstNumber(issue.message)} caracteres e pode truncar em algumas superfícies.`,
  };
  if (issue.code.startsWith('schema-')) return `Os dados estruturados apresentam a inconsistência ${mdInline(issue.code)}.`;
  return facts[issue.code] || issue.message;
}

function externalActions(items) {
  const codes = new Set(items.map((item) => normalizeIssueCode(item.code)));
  const actions = language === 'pt-BR'
    ? [
        'Publicar as correções no ambiente de produção antes de validar o resultado externo.',
        'Repetir a auditoria na produção com cache frio e guardar JSON, HTML e Markdown como evidência pós-deploy.',
      ]
    : [
        'Deploy corrections to production before validating the external result.',
        'Repeat the production audit with a cold cache and retain JSON, HTML and Markdown as post-deploy evidence.',
      ];
  if ([...codes].some((code) => ['crawler-fetch-failed', 'crawler-non-200', 'crawler-divergence', 'og-image-unreachable'].includes(code))) {
    actions.push(language === 'pt-BR'
      ? 'Revalidar CDN, WAF e origem; limpar cache somente quando a evidência mostrar resposta antiga ou divergente.'
      : 'Revalidate CDN, WAF and origin behavior; purge cache only when evidence shows a stale or divergent response.');
  }
  if ([...codes].some((code) => ['noindex', 'canonical-count', 'canonical-mismatch', 'canonical-hydration-mismatch', 'redirected-sitemap-url', 'missing-title', 'missing-h1', 'main-content-js-dependent', 'scroll-dependent-content'].includes(code))) {
    actions.push(language === 'pt-BR'
      ? 'Atualizar o sitemap quando necessário e solicitar recrawl seletivo das URLs estratégicas depois que a produção estiver correta.'
      : 'Refresh the sitemap when needed and request selective recrawling for strategic URLs after production is correct.');
  }
  if ([...codes].some((code) => ['missing-social-tag', 'missing-og-image', 'missing-twitter-image', 'og-image-unreachable', 'og-image-dimensions'].includes(code))) {
    actions.push(language === 'pt-BR'
      ? 'Solicitar nova leitura nos depuradores sociais após confirmar que as tags e a imagem pública estão corretas.'
      : 'Request a fresh scrape in social debuggers after confirming tags and the public image are correct.');
  }
  return actions;
}

function extractFirstNumber(value) {
  return String(value || '').match(/[0-9]+(?:\.[0-9]+)?/)?.[0] || '-';
}

function sitemapSeverity(code) {
  if (code === 'noindex-in-sitemap' || /^http-(?!200)/.test(code) || /^fetch-error/.test(code)) return 'BLOCKER';
  if (code.startsWith('schema-')) return 'HIGH';
  if (['redirected-sitemap-url', 'canonical-mismatch', 'missing-title', 'missing-description', 'missing-h1', 'invalid-json-ld'].includes(code) || /^canonical-count-/.test(code)) return 'HIGH';
  if (['missing-og-image', 'missing-twitter-image', 'multiple-h1', 'html-over-10mb'].includes(code)) return 'MEDIUM';
  return 'LOW';
}

function sitemapOutcome(findings) {
  if (findings.some((item) => item.severity === 'BLOCKER')) return 'FAIL';
  if (findings.some((item) => item.severity === 'HIGH')) return 'NEEDS FIXES';
  if (findings.some((item) => item.severity === 'MEDIUM')) return 'CONDITIONAL PASS';
  return 'PASS';
}

function pageOutcome(issues) {
  if (issues.some((item) => item.severity === 'BLOCKER')) return 'FAIL';
  if (issues.some((item) => item.severity === 'HIGH')) return 'NEEDS FIXES';
  if (issues.some((item) => item.severity === 'MEDIUM')) return 'CONDITIONAL PASS';
  return 'PASS';
}

function sitemapFact(code, count) {
  if (language === 'pt-BR') {
    return count === 1
      ? `1 URL apresentou o código automatizado ${code}.`
      : `${number(count)} URLs apresentaram o código automatizado ${code}.`;
  }
  return count === 1
    ? `1 URL produced the automated code ${code}.`
    : `${number(count)} URLs produced the automated code ${code}.`;
}

function sitemapFindingSummary(findings) {
  const occurrences = findings.reduce((total, item) => total + item.urls.length, 0);
  if (language === 'pt-BR') return `${number(occurrences)} ocorrências em ${number(findings.length)} padrões.`;
  return `${number(occurrences)} occurrences across ${number(findings.length)} patterns.`;
}

function groupSitemapIssues(results) {
  const groups = new Map();
  for (const result of results) {
    for (const code of result.issues || []) {
      if (!groups.has(code)) groups.set(code, []);
      groups.get(code).push(result.url);
    }
  }
  return groups;
}

function compareSeverity(left, right) {
  return SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity) || String(left.code).localeCompare(String(right.code));
}

function countBySeverity(items) {
  return Object.fromEntries(SEVERITY_ORDER.map((severity) => [severity, items.filter((item) => item.severity === severity).length]));
}

function countValues(values) {
  return values.reduce((counts, value) => ({ ...counts, [value]: (counts[value] || 0) + 1 }), {});
}

function summaryLine(total, counts) {
  if (!total) return COPY[language].noFindings;
  const breakdown = SEVERITY_ORDER.map((severity) => `${severity}: ${number(counts[severity])}`).join('; ');
  if (language === 'pt-BR') return `${number(total)} ${total === 1 ? 'padrão priorizado' : 'padrões priorizados'}. ${breakdown}.`;
  return `${number(total)} prioritized ${total === 1 ? 'pattern' : 'patterns'}. ${breakdown}.`;
}

function select(pair) {
  return pair?.[language === 'pt-BR' ? 0 : 1] || '-';
}

function normalizeLanguage(value) {
  return String(value || '').toLowerCase().startsWith('en') ? 'en' : 'pt-BR';
}

function first(value) {
  return Array.isArray(value) ? value[0] || '' : value || '';
}

function number(value) {
  return new Intl.NumberFormat(language).format(Number(value) || 0);
}

function formatCount(value, singular, plural) {
  const count = Number(value) || 0;
  return `${number(count)} ${count === 1 ? singular : plural}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return mdCode(value || '-');
  return `${new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date)} UTC`;
}

function displayEvidenceSource(source) {
  const value = String(source || 'JSON audit report');
  if (/^https?:\/\//i.test(value) || !/[\\/]/.test(value)) return value;
  return path.basename(value);
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDuration(value) {
  return value == null ? '-' : `${Math.round(Number(value) || 0)} ms`;
}

function formatDecimal(value) {
  return value == null ? '-' : (Number(value) || 0).toFixed(3);
}

function bulletList(items, escape = true) {
  return items.map((item) => `- ${escape ? mdInline(item) : item}`).join('\n');
}

function mdInline(value) {
  return String(value ?? '').replaceAll('\\', '\\\\').replace(/([\[\]*_<>|])/g, '\\$1').replace(/\s+/g, ' ').trim();
}

function mdCode(value) {
  return `\`${String(value ?? '-').replaceAll('`', '\\`')}\``;
}

function mdCell(value) {
  return String(value ?? '-').replaceAll('|', '\\|').replace(/\s+/g, ' ').trim();
}

function jsonFence(value) {
  return `\`\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\``;
}

function escapeHtmlSummary(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/\s+/g, ' ').trim();
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    if (['--report', '--output', '--lang'].includes(values[index])) {
      parsed[values[index].slice(2)] = values[index + 1];
      index += 1;
    }
  }
  return parsed;
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.report || !args.output) {
    console.error('Usage: node generate-technical-handoff.mjs --report report.json --output handoff.md [--lang pt-BR|en]');
    process.exitCode = 2;
    return;
  }
  const reportPath = path.resolve(args.report);
  const outputPath = path.resolve(args.output);
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, renderTechnicalHandoff(report, { lang: args.lang, source: reportPath }), 'utf8');
  console.log(`Technical handoff: ${outputPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await runCli();
}
