# Testing

---

As discovered from the repository on **23 June 2026**, CrimeLens contains **884 Pest test cases across 148 Laravel test files**, plus **38 Flutter test files** and a small isolated AI-client suite. Every behavioural change is expected to ship with a test.

> {warning} These are discovered test counts, not a claim that every test passed in the latest run. The full Laravel suite requires the PostgreSQL `final-project-testing` database and Redis to be running.

- [Philosophy](#philosophy)
- [Structure](#structure)
- [What's Covered](#coverage)
- [Browser & Smoke Tests](#browser)
- [Running the Suite](#running)
- [Quality Gates](#gates)

<a name="philosophy"></a>
## Philosophy

Tests are treated as part of the feature, not an afterthought. The bias is toward **feature tests** that exercise a real HTTP request through the full stack (routing → middleware → controller → service → database), with unit tests reserved for pure logic such as geometry, the priority formula, and the ledger hash chain.

<a name="structure"></a>
## Structure

Each module owns its tests under `Modules/<Module>/tests/`, split into `Feature/` and `Unit/`, plus app-level `tests/Feature` and `tests/Browser`:

```
Modules/Police/tests/Feature/      → dispatcher, incidents, citizen tips, crimes, officers, panic, BOLO…
Modules/Camera/tests/Feature/      → control, recording, scene extraction, tamper, gateway sync
Modules/AiModel/tests/Feature/     → login, IP/HMAC, encryption, alert→incident, heartbeat
Modules/Admin/tests/Feature/       → stations, AI models, settings, auth, camera-health
Modules/Core/tests/Feature/        → chat, settings, ledger
tests/Browser/                     → end-to-end smoke flows
```

<a name="coverage"></a>
## What's Covered

The suite concentrates on the critical paths a graduation demo must never break:

- **Auth** — every guard's login/logout/profile, password reset, forced rotation, IP/HMAC enforcement.
- **Incident → dispatch** — creation from AI/manual/citizen, priority scoring, claim/release race safety, dispatch/reject (single-crime guarantee), supervisory vs operator identity.
- **Field ops** — assignment by proximity, accept/no-visit/resolve, escalation timeouts, panic + backup, BOLO.
- **Citizen tips** — web/SMS intake, triage, promote/dismiss/reply, signed media serving, station isolation.
- **Cameras** — control commands, recording lifecycle, scene extraction (both storage strategies), tamper events, detection filters.
- **Real-time** — events dispatched on the right channels with the right payloads.
- **Security** — cross-station 404s, signed-URL validity, ledger immutability/verification.

<a name="browser"></a>
## Browser & Smoke Tests

`tests/Browser` uses Pest's browser testing (Playwright under the hood) to smoke the React consoles — loading the key station pages and asserting they render without JavaScript errors — catching integration breaks the PHP feature tests can't see.

<a name="running"></a>
## Running the Suite

```bash
# Everything (compact output)
php artisan test --compact

# A single file or filter
php artisan test --compact Modules/Police/tests/Feature/Station/Web/DispatcherPageTest.php
php artisan test --compact --filter=claim

# Code style (must pass before finalising)
vendor/bin/pint --dirty
```

<a name="gates"></a>
## Quality Gates

Two gates guard every change: the relevant **tests** must pass, and **Laravel Pint** must report a clean format. The frontend additionally builds (`npm run build`) to catch TypeScript/JSX breakage. This trio — tests green, Pint clean, build green — is the definition of "done" for a change.

The Vite production build currently succeeds. A separate strict TypeScript `--noEmit` run still reports existing type/declaration issues, so a production release should include both build and type-check gates.

Continue to [Installation & Setup](/{{route}}/{{version}}/installation).
