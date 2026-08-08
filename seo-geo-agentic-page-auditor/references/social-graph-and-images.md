# Social Graph and Images

## Contents

- Metadata contract
- Social card composition
- Deterministic generation
- Separate social and content images
- Validation
- Cache behavior

## Metadata contract

Put these tags in initial HTML:

- `og:title`
- `og:description`
- `og:type`
- `og:url`
- `og:site_name`
- `og:image`
- `og:image:width`
- `og:image:height`
- `og:image:alt`
- `twitter:card=summary_large_image`
- `twitter:title`
- `twitter:description`
- `twitter:image`
- `twitter:image:alt`

Use absolute HTTPS URLs. The image must return `200` without cookies, authentication, JavaScript, referer assumptions, or bot challenges.

Use 1200x630 pixels for the main social card unless the target platform has a documented reason for another asset. Keep critical content away from edges because crops vary.

## Social card composition

Make the small-preview test the design target. Include:

- recognizable brand mark or name;
- short page-specific headline;
- one clear visual tied to the page;
- high contrast and generous whitespace;
- optional category/eyebrow and CTA only when they improve comprehension.

Avoid screenshots with unreadable UI, generic dashboards unrelated to the page, tiny text, duplicate titles, excessive badges, and decorative overlays. Do not put private customer, account, payment, or contract data into shared images.

## Deterministic generation

Generate cards from structured page data so title, visual, colors, logo, and output path are reviewable in code. Use local, licensed fonts and assets where possible. Fail generation when:

- the canvas is not exactly 1200x630;
- headline or description overflows;
- the visual cannot load;
- the output is blank or suspiciously small;
- a required brand asset is missing.

Use `scripts/generate-og-image.mjs` and inspect both full-size output and a thumbnail.

## Separate social and content images

A social card with headline text is useful on social platforms, but may be a poor primary image for Google Images. Prefer two intentional roles when needed:

- social card: branded, text-aware, optimized for link previews;
- content/primary image: relevant visual with minimal embedded text, descriptive filename, alt text, caption, responsive sources, and schema association.

Use `primaryImageOfPage` or the main entity's image for the actual page image. Do not blindly point every image field to the same generic asset.

## Validation

Verify:

- raw/no-JS HTML contains all tags;
- title, description, canonical, `og:url`, and JSON-LD identify the same page;
- image MIME type, dimensions, byte size, and status are correct;
- preview remains legible around 300 pixels wide;
- image has meaningful alt text;
- production URL, not localhost or a build path, appears in metadata.

Title and description length warnings are platform heuristics, not protocol failures. Prefer meaning and distinctiveness while avoiding obvious truncation.

## Cache behavior

Social platforms cache previews independently. After publishing:

- keep the image URL immutable when content is immutable;
- change the image filename/version when the artwork changes materially;
- use the platform's re-scrape/debug tool when available;
- verify the origin response before blaming social cache;
- remember that query strings may be normalized or cached inconsistently.

Do not change a canonical page URL merely to refresh a social preview.
