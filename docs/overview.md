# Overview

---

- [What is CrimeLens?](#what-is-crimelens)
- [The Problem](#the-problem)
- [The Approach: AI-Originated CAD](#the-approach)
- [Surfaces](#surfaces)
- [Key Capabilities](#key-capabilities)
- [Technology Stack](#tech-stack)

<a name="what-is-crimelens"></a>
## What is CrimeLens?

**CrimeLens** is an AI-assisted **Computer-Aided Dispatch (CAD)** platform for law enforcement. It connects surveillance cameras to AI detection services, turns their detections into reviewable **incidents**, and routes confirmed crimes to field officers. Human dispatcher review is the default, with a deliberately narrow optional auto-dispatch policy.

Where traditional CAD systems start from a phone call, CrimeLens starts from an **AI detection** and carries a defensible, audited trail from the moment a camera sees something until an officer closes the case.

> {primary} CrimeLens is a graduation project built as a production-grade reference implementation. It is intentionally architected like a real CAD product: multi-tenant, multi-guard, event-driven, and observable.

<a name="the-problem"></a>
## The Problem

Manual, radio-driven police response has three structural weaknesses:

1. **Detection is reactive.** Incidents are only known once a citizen calls them in — minutes after they start.
2. **Dispatch is opaque.** Decisions live in a dispatcher's head and on a radio log; there is no machine-readable, replayable record of *why* an officer was sent.
3. **AI is untrusted.** Pure "AI auto-dispatch" is dangerous and politically unacceptable — a false positive sends armed officers to an innocent person.

CrimeLens addresses all three: proactive AI detection, a fully audited decision ledger, and a mandatory **human-in-the-loop** review layer before any officer is dispatched.

<a name="the-approach"></a>
## The Approach: AI-Originated CAD

The core design principle is the **incident layer**. AI never creates a crime or commands a camera directly. Instead:

```
AI detection  ─▶  Incident (pending_review)  ─▶  Dispatcher review  ─▶  Crime  ─▶  Officer
                       │                                                  ▲
                       └── Priority Engine scores it ─────────────────────┘
```

- The **AI service** only *reports* — it raises alerts and confirmed detections through an authenticated API.
- The **Priority Engine** scores every incident with a transparent, auditable weighted formula.
- A **human dispatcher** reviews the incident on a live console and decides to **dispatch** (creating a crime + assigning an officer) or **reject** it as a false alarm.
- Only the **backend** commands cameras (alarms, PTZ) — never the AI and never the field officer.

See [End-to-End Workflow](/{{route}}/{{version}}/workflow) for the full lifecycle.

<a name="surfaces"></a>
## Surfaces

CrimeLens exposes three distinct user surfaces, each tuned to its operator:

| Surface | Audience | Stack |
|---------|----------|-------|
| **Admin Console** | System administrators | Web (Inertia + React) |
| **Station / Dispatcher Console** | Police-station operators & dispatchers | Web (Inertia + React) |
| **Officer App** | Field officers | Mobile (Flutter) + API |

Two non-human surfaces complete the system: the **AI Detection Service** (API client) and the **Camera Gateway** (RTSP fan-out service).

<a name="key-capabilities"></a>
## Key Capabilities

- **Dispatcher Console** — a tri-pane operations screen (live queue · map · incident detail) with claim/release, manual incident creation, and live updates over WebSockets.
- **Priority Engine** — weighted, explainable incident scoring into Critical / High / Medium / Low tiers.
- **Citizen Tips** — public web + SMS (Twilio) intake, with dispatcher triage to promote a tip into an incident.
- **Camera Streaming** — a Python gateway fans a single RTSP feed into HLS (mobile), WebRTC (web), and raw RTSP (AI), plus on-demand evidence recording.
- **AI Integration** — IP-whitelisted, per-session AES-256 encrypted camera credentials, heartbeat monitoring, alert & crime reporting.
- **Field Operations** — officer assignment by proximity, escalation on no-response, GPS tracking, panic/SOS, BOLO broadcasts, patrol zones.
- **Pattern Detection** — cross-incident weapon-cluster alerts.
- **Decision Ledger** — an append-only, hash-chained audit trail of every consequential action.
- **Real-Time** — Laravel Echo / Pusher channels for the web consoles; Firebase Cloud Messaging for mobile.

<a name="tech-stack"></a>
## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | PHP 8.4, Laravel 13 |
| Modularity | `nwidart/laravel-modules` (6 modules) |
| Web frontend | Inertia.js v3 + React 19, Tailwind CSS v4, Vite |
| Maps & video | MapLibre GL, HLS.js |
| Auth | Laravel Sanctum (multi-guard) |
| Database | PostgreSQL + PostGIS |
| Cache / Queue / Presence | Redis |
| Queues & monitoring | Laravel Horizon |
| Real-time | Pusher protocol (Laravel Echo) |
| Push notifications | Firebase Cloud Messaging (`kreait/laravel-firebase`) |
| SMS / voice intake | Twilio |
| RBAC | `spatie/laravel-permission` |
| DTOs | `spatie/laravel-data` |
| Reports | `barryvdh/laravel-dompdf`, `maatwebsite/excel` |
| Camera gateway | Python (Flask + FFmpeg + MediaMTX) |
| Testing | Pest (PHP), Playwright (E2E) |
| Observability | Laravel Telescope, Pail |

Continue to [System Architecture](/{{route}}/{{version}}/architecture).
