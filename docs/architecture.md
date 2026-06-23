# System Architecture

---

- [High-Level Diagram](#high-level)
- [Modular Monolith](#modular-monolith)
- [Request & Auth Flow](#request-flow)
- [Real-Time Backbone](#realtime-backbone)
- [Streaming Pipeline](#streaming-pipeline)
- [Data & Storage](#data-storage)
- [Layered Code Conventions](#conventions)

<a name="high-level"></a>
## High-Level Diagram

```
                 ┌───────────────┐   ┌────────────────┐   ┌──────────────┐
                 │ Admin Console │   │ Station Console│   │  Officer App │
                 │  (React/Web)  │   │  (React/Web)   │   │   (Flutter)  │
                 └──────┬────────┘   └───────┬────────┘   └──────┬───────┘
                        │  Inertia            │ Inertia / Echo    │ REST + FCM
                        ▼                     ▼                   ▼
        ┌───────────────────────────────────────────────────────────────────┐
        │                      Laravel 13 Modular Monolith                    │
        │  Admin · Police · Camera · Gateway · AiModel · Core   (6 modules)   │
        │  Controllers → FormRequests/DTOs → Services/Actions → Models        │
        └───────┬───────────────┬──────────────────┬─────────────┬───────────┘
                │               │                  │             │
          ┌─────▼────┐    ┌─────▼─────┐      ┌──────▼─────┐  ┌────▼─────┐
          │PostgreSQL│    │   Redis   │      │  Horizon   │  │  Pusher  │
          │ + PostGIS│    │ cache/    │      │  queues    │  │  (Echo)  │
          │          │    │ presence  │      │            │  │          │
          └──────────┘    └───────────┘      └────────────┘  └──────────┘
                │                                                  
          ┌─────▼──────────────┐        ┌──────────────────────────────┐
          │   AI Detection     │◀──RTSP─│   Camera Gateway (Python)     │◀── Tapo / ONVIF cameras
          │   Service (API)    │        │   Flask + FFmpeg + MediaMTX   │──▶ HLS / WebRTC
          └────────────────────┘        └──────────────────────────────┘
```

<a name="modular-monolith"></a>
## Modular Monolith

CrimeLens is a **modular monolith** built on `nwidart/laravel-modules`. Each module is a self-contained bounded context with its own routes, controllers, services, models, migrations, translations, and tests, while sharing a single deployable application and database.

| Module | Responsibility |
|--------|----------------|
| **Core** | Cross-cutting services: chat, settings, the decision ledger, geocoding, shared concerns. |
| **Police** | The heart of the system: incidents, dispatcher console, crimes, officers, citizen tips, BOLO, panic, patrol, station web UI. |
| **Camera** | Camera CRUD, Tapo/ONVIF control, recording, scene extraction, tamper detection, detection filters. |
| **Gateway** | Bridge to the Python streaming gateway: HLS/WebRTC stream provisioning and proxying. |
| **AiModel** | AI service identity, camera assignment, encrypted credential delivery, alert/crime intake, heartbeat. |
| **Admin** | Administrative console: police-station & AI-model management, settings, notifications, system health. |

See [Modules](/{{route}}/{{version}}/modules) for a deeper breakdown.

<a name="request-flow"></a>
## Request & Auth Flow

CrimeLens exposes **eight application-facing authentication guards** from one Laravel app — session guards for the web consoles and Sanctum bearer guards for mobile/API and machine clients. Laravel also registers its internal `sanctum` guard:

| Guard | Driver | Provider | Used by |
|-------|--------|----------|---------|
| `admin` | session | admins | Admin web console |
| `police_station_web` | session | police_stations | Station console (institutional login) |
| `station_user_web` | session | station_users | Station console (individual dispatcher) |
| `police_station` | sanctum | police_stations | Station companion mobile |
| `officer` | sanctum | officers | Officer mobile app |
| `ai_model` | sanctum | ai_models | AI detection service |
| `api` | sanctum | officers | Default API guard |
| `web` | session | users | Framework default |

Every layer is thin and single-purpose: **Controller** (HTTP only) → **FormRequest / Spatie Data DTO** (validation) → **Service / Action** (business logic) → **Model** (persistence). See [Authentication & Security](/{{route}}/{{version}}/security).

<a name="realtime-backbone"></a>
## Real-Time Backbone

Browser consoles subscribe to **private Pusher channels** through Laravel Echo. The principal channel is `station.{id}`, authorised for both `police_station_web` and `station_user_web` guards. Domain events (`IncidentCreated`, `IncidentAssigned`, `CitizenTipReceived`, `PanicActivated`, …) are broadcast on these channels and consumed by the React consoles to update queues, maps, and toasts without a page refresh.

Mobile clients receive **Firebase Cloud Messaging** push for background delivery. See [Real-Time & Notifications](/{{route}}/{{version}}/realtime).

<a name="streaming-pipeline"></a>
## Streaming Pipeline

A camera produces one RTSP feed, but three consumers need different formats. The **Python Camera Gateway** (Flask + FFmpeg + MediaMTX) solves this by fanning a single source into:

- **HLS** — for mobile and lightweight web playback,
- **WebRTC** — for low-latency monitoring grids in the dispatcher console,
- **RTSP** — passed through to the AI detection service.

The camera subsystem can cut evidence on demand by merging segments overlapping an incident window. The legacy direct model-report flow queues this extraction. The newer AI → Incident → Crime path currently accepts the model time window but does not persist it on the Incident, so automatic extraction is not yet guaranteed for every AI-originated incident. See [Cameras & Streaming](/{{route}}/{{version}}/cameras).

<a name="data-storage"></a>
## Data & Storage

- **PostgreSQL + PostGIS** — the system of record (~35 tables) and spatial queries for historical analytics and heatmaps.
- **Redis** — cache, queues, dispatcher presence (sorted sets), and high-frequency officer GPS lookup (hot path). The current location service also synchronizes the latest point to PostGIS.
- **Object/file storage** — recorded evidence, citizen-tip media, and report exports.

<a name="conventions"></a>
## Layered Code Conventions

The codebase follows a strict separation of concerns:

- **Thin controllers** — accept the request, call a service/action, return a resource.
- **FormRequests & DTOs** — all validation lives outside controllers (`spatie/laravel-data` for typed transfer objects).
- **Services** — CRUD and simple business logic.
- **Actions** — complex, multi-step operations with side effects.
- **Events & Listeners** — broadcasting and decoupled side effects.
- **Jobs** — anything slow runs on a Redis queue under Horizon.
- **Enums** — PHP 8 backed enums for every status/type field.
- **API Resources** — every response is shaped; raw models are never returned.

Continue to [Modules](/{{route}}/{{version}}/modules).
