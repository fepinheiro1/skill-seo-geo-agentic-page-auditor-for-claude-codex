# Performance and Assets

## Contents

- Measurement hierarchy
- Core Web Vitals
- JavaScript and third parties
- Images
- Video and animation
- Fonts
- Hidden resources
- Practical budgets

## Measurement hierarchy

Use field data when available and lab data for diagnosis. Compare the same URL, device class, network profile, and release. A single Lighthouse score is not a field outcome.

Measure before and after. Record bytes and requests by resource type, LCP element, long tasks, render-blocking resources, layout shifts, and interaction delays.

## Core Web Vitals

Current good thresholds at the 75th percentile are:

- LCP <= 2.5 seconds;
- INP <= 200 milliseconds;
- CLS <= 0.1.

Do not optimize a score by removing content or interactions that are central to the page. Fix the underlying loading, execution, and layout behavior.

## JavaScript and third parties

- Ship less code to public pages; split authenticated/app modules from marketing routes.
- Defer non-critical analytics, widgets, chat, heatmaps, and experimentation until appropriate consent or interaction.
- Remove duplicate libraries and unused polyfills.
- Avoid hydrating static content when the framework supports islands or server components.
- Reserve main-thread time for interaction; break long tasks and avoid expensive synchronous initialization.
- Fingerprint static assets so long-lived cache does not serve stale bundles.

## Images

- Use `<img>` or `<picture>`, not CSS backgrounds, for discoverable meaningful images.
- Always include an `img src` fallback with `srcset`/`picture`.
- Provide intrinsic width and height or aspect ratio.
- Serve responsive dimensions rather than scaling a large source in CSS.
- Prefer AVIF/WebP with a compatible fallback when it reduces bytes without visible harm.
- Preload only the confirmed LCP image; do not preload carousels or below-fold media.
- Lazy-load below-fold images but never require user scroll/click for indexable text.
- Use descriptive filenames, useful alt text, and nearby context.

## Video and animation

Animated WebP is usually not a video optimization strategy. For visible motion previews, create short, muted, low-resolution MP4/WebM loops and preserve the full video for deliberate playback.

- Do not mount autoplay videos at mobile widths when the visual is absent.
- `preload="none"` does not prevent an autoplay video from fetching.
- Remove audio tracks from silent previews.
- Use `playsinline`, explicit dimensions, and a poster where a still loading state is acceptable.
- Gate desktop-only media in render logic, not only with CSS.
- Prefer one active hero animation over many simultaneous feeds.

## Fonts

- Self-host licensed WOFF2 subsets when practical.
- Load only used weights and scripts.
- Preload only fonts required above the fold.
- Use a fallback metric strategy to reduce layout shifts.
- Verify generated social images load the intended font instead of silently falling back.

## Hidden resources

CSS-hidden elements can still trigger image, video, iframe, and script downloads. Check network requests at mobile and desktop viewports. Treat hidden visual media separately from non-visual integration documents, and only report a performance problem when the resource has a measurable cost or blocks the user experience. Conditionally mount visual components when they do not exist in that experience.

## Practical budgets

Set budgets from the site's baseline and business needs. Useful initial review triggers, not universal laws:

- unexpected JavaScript above 200 KB compressed on a mostly static landing page;
- any single non-LCP image above 200 KB without a quality reason;
- autoplay preview media above 1 MB before interaction;
- third-party code that creates long tasks before the primary CTA works;
- hidden resources with any meaningful transfer cost.

Report exact before/after bytes. Do not claim a percentage improvement without measuring comparable artifacts.
