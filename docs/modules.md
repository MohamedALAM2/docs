# Modules

---

CrimeLens is split into six Laravel modules under `Modules/`. Each owns its routes, controllers, services, models, migrations, translations, and tests.

- [Core](#core)
- [Police](#police)
- [Camera](#camera)
- [Gateway](#gateway)
- [AiModel](#aimodel)
- [Admin](#admin)
- [Dependency Direction](#dependencies)

<a name="core"></a>
## Core

Cross-cutting building blocks shared by every other module.

- **Chat** — conversations and messages between admin, station, and officers, with real-time delivery and voice-note transcription.
- **Settings** — key/value system configuration with Redis caching (`SettingsService`).
- **Decision Ledger** — an append-only, hash-chained audit trail (`ledger_entries`) with a `ledger:verify` integrity check.
- **Geocoding** — reverse-geocoding for incident and tip locations.

Routes: `Modules/Core/routes/{web,api}.php`.

<a name="police"></a>
## Police

The largest module and the operational heart of the platform. It owns the entire incident/dispatch domain and the station web console.

- **Incidents & Dispatch** — `Incident` model, dispatcher console (`DispatcherController`), claim/release (`IncidentClaimController`), priority scoring, snapshots, presence, and load-balancing.
- **Crimes** — crime lifecycle, officer actions, escalation.
- **Citizen Tips** — public intake (web + Twilio SMS), triage, promote/dismiss, media, the dispatcher inbox.
- **Officers** — CRUD, GPS/location, shifts, status, panic/SOS, BOLO, patrol zones.
- **Pattern detection** — cross-incident weapon-cluster alerts.
- **Station web UI** — all Inertia/React pages under `Modules/Police/resources/js`.

Routes: `Modules/Police/routes/{web,api,station.web,channels}.php`.

<a name="camera"></a>
## Camera

Everything about the physical cameras and their evidence.

- **Camera CRUD** and assignment.
- **Tapo / ONVIF control** — PTZ, alarm, privacy, LED, motion.
- **Recording & scene extraction** — continuous segment recording for storage-less cameras and on-demand evidence cutting.
- **Health & tamper** — health checks, offline detection, and tamper events.
- **Detection filters** — per-camera zones/rules that shape what the AI reports.

Routes: `Modules/Camera/routes/{web,api}.php`.

<a name="gateway"></a>
## Gateway

The Laravel-side bridge to the external **Python streaming gateway** (Flask + FFmpeg + MediaMTX). It provisions and proxies camera streams into HLS and WebRTC, and keeps the gateway's published streams in sync with camera state via jobs such as `SyncCameraGatewayStreamJob`.

Routes: `Modules/Gateway/routes/*`.

<a name="aimodel"></a>
## AiModel

The contract surface for the AI detection service.

- **Identity & security** — `AiModel` accounts, IP whitelisting, per-session AES-256 encryption keys.
- **Camera assignment** — many-to-many `camera_ai_model` pivot; the model only ever sees its assigned cameras.
- **Intake** — login, heartbeat, alert, and crime-detection endpoints that feed the incident layer.
- **Monitoring** — heartbeat timeout detection (`model:check-heartbeats`) and `ai_detection_logs`.

Routes: `Modules/AiModel/routes/{api,web}.php`.

<a name="admin"></a>
## Admin

The administrative console (Inertia + React).

- **Police-station management** — CRUD, Excel import/export, password resets.
- **AI-model management** — registration, IP whitelist, camera assignment.
- **Settings** — priority weights, radii, timeouts, Firebase, camera/gateway config.
- **Notifications & system health** — heartbeats, camera status, queue depth.

Routes: `Modules/Admin/routes/{web,channels}.php`.

<a name="dependencies"></a>
## Dependency Direction

`Core` sits at the bottom and is depended on by everyone. `Police` is the central domain and consumes `Camera`, `Gateway`, `AiModel`, and `Core`. `Admin` orchestrates configuration across all modules. No module reaches "upward" into the consoles; UI talks to modules through their controllers only.

Continue to [Installation & Setup](/{{route}}/{{version}}/installation).
