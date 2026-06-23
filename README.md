# CrimeLens Documentation Static Site

A frontend-only enterprise documentation website generated from the provided CrimeLens Markdown documentation files.

## Run locally

Open `index.html` directly in your browser.

No backend, database, API server, build step, or hosting is required.

## Included features

- Fixed left sidebar with collapsible sections
- Center documentation content area
- Right-side table of contents
- Responsive mobile / tablet / desktop layout
- Light and dark mode saved in Local Storage
- Local full-documentation search (`Ctrl/Cmd + K`)
- Breadcrumbs, active navigation, smooth scrolling
- Scroll progress indicator and Back to Top button
- Copy code buttons
- Keyboard shortcuts: `Ctrl/Cmd+K`, `/`, `D`, `[`, `]`
- SEO meta tags and local static assets

## Source content

The `docs/` folder contains normalized copies of the provided Markdown files. The generated page data is embedded in `data/docs-data.js` for fast local loading without fetch/backend limitations.
