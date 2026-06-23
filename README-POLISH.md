# CrimeLens Documentation Visual Polish Patch

This build is a complete static version of the CrimeLens documentation site with an added visual polish layer.

## What changed

The following ASCII/code diagrams and raw Markdown-looking blocks were replaced at runtime with responsive visual components:

- `#/docs/overview` — The Approach: AI-Originated CAD
- `#/docs/architecture` — High-Level Diagram
- `#/docs/actors` — Authority Matrix
- `#/docs/workflow` — The CAD Pipeline
- `#/docs/workflow` — Stage 5 — Field Response
- `#/docs/dispatch` — Incident Sources & Statuses
- `#/docs/dispatch` — Dispatcher Console tri-pane mockup
- `#/docs/crime-lifecycle` — The Status Machine
- `#/docs/testing` — Structure

## Files added

- `assets/enterprise-doc-polish.css`
- `assets/enterprise-doc-polish.js`

## File modified

- `index.html` now loads the new CSS and JS after the original app files.

## Usage

Replace the current project folder contents with this folder, or upload these files to the GitHub Pages repository root.

Then hard refresh the browser:

```text
Ctrl + Shift + R
```
