# Agentic Web

## Contents

- Stable foundation
- AI crawler controls
- Accessibility tree
- llms.txt
- WebMCP
- Agent-safe actions
- Testing

## Stable foundation

Agentic readiness starts with a conventional, accessible website:

- semantic landmarks and heading hierarchy;
- real links with `href`;
- real buttons for actions;
- explicit visible labels for inputs;
- programmatic names, roles, states, and errors;
- predictable focus and keyboard operation;
- stable layout and deterministic loading;
- concise, structured responses and confirmation states.

Browser agents often use the accessibility tree as their machine view. Accessibility defects are therefore both human usability defects and agent reliability defects.

## AI crawler controls

Audit robots.txt and infrastructure separately. A permitted crawler can still be blocked by WAF, CDN bot protection, JavaScript challenges, CAPTCHA, authentication, geo rules, or rate limiting.

Test at least:

- Googlebot Smartphone;
- Bingbot;
- OAI-SearchBot;
- representative social crawlers.

Keep search inclusion controls separate from model-training preferences when providers expose separate crawler identities. Verify current official crawler documentation before editing policies.

## llms.txt

`/llms.txt` is a proposal, not a universal search or ranking standard. Use it as a curated machine-readable navigation aid when the site has high-value documentation or resources.

If present:

- return `200` Markdown at the root;
- include an H1;
- explain the site's purpose concisely;
- link to canonical, public, useful resources;
- omit private, transactional, duplicate, preview, and low-value URLs;
- keep it synchronized with actual content;
- do not use it instead of sitemap, robots, canonical, or accessible HTML.

## WebMCP

WebMCP is a proposed, experimental standard for exposing browser-visible tools to AI agents. Treat it as progressive enhancement, never as baseline SEO.

Consider it when a page contains a concrete user action such as search, filtering, configuration, booking, or checkout and structured invocation materially improves reliability. Do not expose a tool only to pass an audit.

Prefer declarative annotations for straightforward forms and imperative tools for real application logic. Use clear verb-led names, narrow input schemas, explicit descriptions, and structured outputs.

## Agent-safe actions

For consequential actions:

- preserve the visible browser context;
- authenticate and authorize on the server;
- validate all inputs and outputs;
- require confirmation near purchases, messages, publishing, deletion, permissions, and sensitive changes;
- make retryable operations idempotent;
- return clear success and error states;
- prevent prompt injection from tool descriptions, third-party content, and tool output;
- minimize data exposure and never put secrets in tool output;
- log actions appropriately without logging secrets.

Do not trust an agent-supplied price, identity, permission, inventory value, or destination when the server can derive it.

## Testing

When supported, run Lighthouse Agentic Browsing and WebMCP-specific tests, but label results experimental. Also test manually through the accessibility tree and with realistic natural-language tasks.

Evaluate:

- tool discovery;
- correct tool selection;
- schema-valid arguments;
- cancellation and confirmation;
- repeated invocation;
- malicious or contaminated content;
- stale page state;
- mobile and keyboard operation;
- output clarity.

A passing experimental audit does not prove safe or useful agent behavior.
