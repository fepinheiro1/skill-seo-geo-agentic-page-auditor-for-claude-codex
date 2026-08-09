import { sameUrl } from './url-safety.mjs';

function valuesForType(node) {
  const type = node?.['@type'];
  return Array.isArray(type) ? type : type ? [type] : [];
}

function flattenSchema(value) {
  if (Array.isArray(value)) return value.flatMap(flattenSchema);
  if (!value || typeof value !== 'object') return [];
  const graph = Array.isArray(value['@graph']) ? value['@graph'].flatMap(flattenSchema) : [];
  return [value, ...graph];
}

function textContains(haystack, needle) {
  const normalize = (value) => String(value || '').replace(/<[^>]*>/g, ' ').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const normalizedNeedle = normalize(needle);
  return !normalizedNeedle || normalize(haystack).includes(normalizedNeedle);
}

function pageReference(node) {
  const mainEntity = node?.mainEntityOfPage;
  return node?.url || (typeof mainEntity === 'string' ? mainEntity : mainEntity?.['@id']) || node?.['@id'] || null;
}

export function auditStructuredData(blocks, context) {
  const findings = [];
  const add = (severity, code, message, evidence) => findings.push({ severity, code, message, evidence });
  const validBlocks = blocks.filter((block) => block.valid && block.value);
  const nodes = validBlocks.flatMap((block) => flattenSchema(block.value));

  for (const block of validBlocks) {
    const contexts = flattenSchema(block.value).flatMap((node) => Array.isArray(node?.['@context']) ? node['@context'] : node?.['@context'] ? [node['@context']] : []);
    if (!contexts.some((schemaContext) => String(schemaContext).includes('schema.org'))) {
      add('HIGH', 'schema-missing-context', 'A JSON-LD block does not declare a schema.org context.', { index: block.index });
    }
  }

  for (const node of nodes) {
    const types = valuesForType(node);
    const primaryType = types[0] || 'Unknown';
    if (!types.length) add('MEDIUM', 'schema-missing-type', 'A structured data node has no @type.', { id: node['@id'] || null });

    if (types.some((type) => ['WebPage', 'Article', 'BlogPosting', 'NewsArticle', 'Product'].includes(type))) {
      const reference = pageReference(node);
      if (reference && !sameUrl(String(reference).split('#')[0], context.canonical, context.finalUrl)) {
        add('HIGH', 'schema-page-url-mismatch', `${primaryType} structured data points to a different page URL.`, { schemaUrl: reference, canonical: context.canonical });
      }
    }

    if (types.includes('Product')) {
      if (!node.name) add('HIGH', 'schema-product-missing-name', 'Product structured data is missing name.');
      if (!node.offers && !node.review && !node.aggregateRating) {
        add('HIGH', 'schema-product-missing-commercial-data', 'Product structured data needs offers, review or aggregateRating for product rich-result eligibility.');
      }
      const offers = Array.isArray(node.offers) ? node.offers : node.offers ? [node.offers] : [];
      for (const offer of offers) {
        if (offer.price != null && (!Number.isFinite(Number(offer.price)) || Number(offer.price) < 0)) {
          add('HIGH', 'schema-invalid-price', 'Product structured data contains an invalid price.', { price: offer.price });
        }
        if (offer.price != null && !/^[A-Z]{3}$/.test(String(offer.priceCurrency || ''))) {
          add('HIGH', 'schema-invalid-currency', 'Product structured data contains an invalid or missing ISO 4217 currency.', { priceCurrency: offer.priceCurrency || null });
        }
      }
      if (node.name && !textContains(context.visibleText, node.name)) {
        add('HIGH', 'schema-content-mismatch', 'The Product name was not found in visible page content.', { name: node.name });
      }
    }

    if (types.some((type) => ['Article', 'BlogPosting', 'NewsArticle'].includes(type))) {
      if (!node.headline) add('HIGH', 'schema-article-missing-headline', 'Article structured data is missing headline.');
      if (!node.author) add('MEDIUM', 'schema-article-missing-author', 'Article structured data is missing author.');
      if (!node.datePublished) add('MEDIUM', 'schema-article-missing-date', 'Article structured data is missing datePublished.');
      if (node.headline && !textContains(context.visibleText, node.headline)) {
        add('HIGH', 'schema-content-mismatch', 'The Article headline was not found in visible page content.', { headline: node.headline });
      }
    }

    if (types.includes('FAQPage')) {
      const questions = Array.isArray(node.mainEntity) ? node.mainEntity : [];
      if (!questions.length) add('HIGH', 'schema-faq-empty', 'FAQPage structured data has no questions.');
      for (const question of questions) {
        if (!question?.name || !question?.acceptedAnswer?.text) {
          add('HIGH', 'schema-faq-incomplete', 'A FAQPage question is missing its visible question or accepted answer.');
        } else if (!textContains(context.visibleText, question.name) || !textContains(context.visibleText, question.acceptedAnswer.text)) {
          add('HIGH', 'schema-content-mismatch', 'FAQPage structured data does not match visible page content.', { question: question.name });
        }
      }
    }

    if (types.includes('BreadcrumbList')) {
      const items = Array.isArray(node.itemListElement) ? node.itemListElement : [];
      if (items.length < 2 || items.some((item) => !item?.position || !item?.name)) {
        add('MEDIUM', 'schema-breadcrumb-incomplete', 'BreadcrumbList structured data is incomplete.');
      }
    }

    if (types.includes('Organization') && (!node.name || !node.url)) {
      add('MEDIUM', 'schema-organization-incomplete', 'Organization structured data should identify its name and URL.');
    }
  }

  return dedupe(findings);
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.severity}:${finding.code}:${finding.message}:${JSON.stringify(finding.evidence || null)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
