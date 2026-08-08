# Structured Data

## Contents

- Selection rules
- Common page mapping
- Graph design
- Validation
- Anti-patterns

## Selection rules

Use JSON-LD unless the project has a valid established alternative. Mark up only visible, truthful page content. Choose the most specific type supported by the page and follow Google-specific requirements for Google rich-result eligibility.

Schema.org vocabulary can express more than Google rich results support. Distinguish semantic usefulness from eligibility for a Google feature.

## Common page mapping

- Home/about: `Organization` or a more specific subtype, with stable identity and `sameAs` where verified.
- Article/insight: `Article`, `BlogPosting`, or `NewsArticle` as appropriate.
- Product: `Product` with real offers, availability, brand, identifiers, and reviews only when present and policy-compliant.
- Software/service page: `SoftwareApplication`, `WebApplication`, `Service`, or `Product` based on what is actually offered.
- FAQ: `FAQPage` only for publisher-authored questions with one authoritative answer each.
- Community Q&A: `QAPage`, not `FAQPage`.
- Breadcrumbs: `BreadcrumbList` matching visible/site navigation.
- Video: `VideoObject` when the page exposes a real video and required metadata.
- Dataset/research: `Dataset` with provenance and access details.
- Local operation: `LocalBusiness` subtype with accurate public business data.

Do not add every type to every page. Add a main entity and complementary items that describe visible content.

## Graph design

Use stable absolute `@id` values and connect entities instead of duplicating conflicting objects. Align:

- page URL and canonical;
- `WebPage.mainEntity` and the primary entity;
- author/publisher identity;
- image URLs and dimensions;
- dates and visible byline;
- breadcrumbs and internal hierarchy.

Use ISO dates and valid absolute URLs. Include recommended properties when accurate; fewer complete fields are better than invented completeness.

## Validation

Perform three checks:

1. parse every JSON-LD block as JSON;
2. validate the vocabulary and required fields;
3. compare every material field with visible page content.

Use Google's Rich Results Test for supported features and schema validators for vocabulary checks. Re-test deployed HTML because templates, escaping, and caches can differ from source.

## Anti-patterns

- schema generated only after a delayed API call;
- FAQ answers in JSON-LD that are absent from the page;
- fake ratings or self-serving review markup;
- generic organization graph copied with wrong URLs;
- multiple primary entities that contradict each other;
- old dates changed automatically on every build;
- schema used to compensate for thin or inaccessible content;
- `HowTo` or `FAQPage` added solely because an audit tool requests it.
