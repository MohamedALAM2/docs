# Real-Time & Notifications

---

CrimeLens is an event-driven system: the moment something changes, every screen that cares finds out. This page documents the two delivery rails (WebSockets for consoles, FCM for mobile), the channel topology, and the full event catalogue.

- [Two Delivery Rails](#rails)
- [Channel Topology](#channels)
- [Channel Authorization](#authorization)
- [Event Catalogue](#catalogue)
- [Consistency Patterns](#patterns)
- [Push Notifications (FCM)](#fcm)

<a name="rails"></a>
## Two Delivery Rails

| Rail | Transport | Audience | Used for |
|------|-----------|----------|----------|
| **Laravel Echo / Pusher** | WebSockets | Web consoles (admin, station) | Live queue, map, toasts, presence. |
| **Firebase Cloud Messaging** | Push | Mobile (officer, station companion) | Background delivery of assignments, panic, BOLO. |

Broadcast events implement `ShouldBroadcast` and are dispatched onto the Redis queue, processed by a dedicated Horizon supervisor, and delivered through Pusher. Consoles subscribe through the module bootstrap that wires Echo to the correct `/broadcasting/auth` endpoint per guard.

<a name="channels"></a>
## Channel Topology

Channels are private (or presence) and scoped to a tenant or a person:

| Channel | Subscribers | Carries |
|---------|-------------|---------|
| `station.{id}` | station web guards | Incidents, citizen tips, BOLO, proximity, pattern alerts. |
| `police-station.{id}.officers` | station guards | Officer locations for the dispatch map. |
| `officer.{id}` | the officer | Their assignments and status. |
| `officer.location.{id}` | officer, station, admin | Full-fidelity GPS stream. |
| `panic.station.{id}` / `panic.officer.{id}` | station / officer | Panic activation & resolution. |
| `admin.camera-health` | admins | Camera tamper events. |
| `admin.officers-locations.{id}` | admins | Officer positions per station. |
| `chat.{conversationKey}` (presence) | participants | Chat messages & transcripts. |
| `admin.*` | admins | System-level alerts (escalations, AI offline). |

<a name="authorization"></a>
## Channel Authorization

Every private channel has an authorization callback (`Modules/*/routes/channels.php`). `station.{id}` is authorised for both the institutional `police_station_web` account and the individual `station_user_web` — so an operator only ever subscribes to *their* station. Officer and panic channels are bound to the owning officer; admin channels to administrators. This is the multi-tenant boundary enforced at the socket layer.

<a name="catalogue"></a>
## Event Catalogue

Eighteen domain events drive the real-time experience:

**Incidents & Dispatch**

| Event | Channel · `broadcastAs` | Key payload |
|-------|------------------------|-------------|
| `IncidentCreated` | `station.{id}` · `incident.created` | id, camera_id, priority_tier, priority_score, source |
| `IncidentAssigned` | `station.{id}` · `incident.assigned` | incident_id, assigned_dispatcher_id, dispatcher_name, action (`claimed`/`released`/`rebalanced`), full incident |
| `IncidentReviewed` | `station.{id}` · `incident.reviewed` | id, status, action (`dispatched`/`rejected`), crime_id |

**Crimes & Officers**

| Event | Channel · `broadcastAs` | Key payload |
|-------|------------------------|-------------|
| `CrimeAssigned` | `officer.{id}`, `station.{id}` · `crime.assigned` | crime_id, severity, location, officer_id, station_id |
| `CrimeEscalated` | `station.{id}`, `admin.*` · `crime.escalated` | crime_id, attempt_number, previous/new officer |
| `CrimeResolved` | `station.{id}`, `admin.*` · `crime.resolved` | crime_id, officer_id, resolved_at |
| `OfficerLocationUpdated` | `officer.location.{id}`, `police-station.{id}.officers`, `admin.officers-locations.{id}` · `officer.location-updated` | officer_id, lat, lng, name |
| `OfficerProximityChanged` | `station.{id}` · `officer.approaching`/`officer.arrived` | crime_id, officer_id, distance_meters, state |

**Safety & Community**

| Event | Channel · `broadcastAs` | Key payload |
|-------|------------------------|-------------|
| `PanicActivated` | `panic.station.{id}`, `panic.officer.{id}` · `panic.activated` | id, officer_id, lat, lng, officer_name |
| `PanicResolved` | `panic.station.{id}`, `panic.officer.{id}` · `panic.resolved` | id, ended_at |
| `CitizenTipReceived` | `station.{id}` · `citizen-tip.received` | id, source, masked_sender, message_preview, media_count |
| `BoloBroadcasted` | `police-station.{id}.officers`, `station.{id}` · `bolo.broadcasted` | id, subject_type, description, severity, photo_url |
| `WeaponClusterDetected` | `station.{id}` · `pattern.weapon-cluster.detected` | alert_id, incident_count, incident_ids, center_lat/lng |

**Infrastructure**

| Event | Channel · `broadcastAs` | Key payload |
|-------|------------------------|-------------|
| `CameraOffline` | `station.{id}`, `admin.*` · `camera.offline` | camera_id, name, last_seen_at |
| `CameraTamperDetected` | `admin.camera-health` · `camera.tamper.detected` | event_id, camera_id, signal_type, status |
| `AiModelOffline` | `admin.*` · `ai_model.offline` | model_id, name, last_heartbeat_at |

**Communications**

| Event | Channel · `broadcastAs` | Key payload |
|-------|------------------------|-------------|
| `ChatMessageSent` | `chat.{key}` (presence) + station/admin · `ChatMessageSent` | id, sender, message, message_type, media URLs, transcript |
| `ChatTranscriptUpdated` | `chat.{key}` (presence) · `ChatTranscriptUpdated` | id, transcript |

<a name="patterns"></a>
## Consistency Patterns

Two patterns keep the consoles correct under concurrency:

- **`toOthers()` on operator actions** — when a dispatcher claims/releases/dispatches, the broadcast excludes the acting socket. The actor's own UI already updated optimistically (and showed a personal success toast); only *other* operators receive the third-person echo. This avoids double toasts and flicker.
- **Per-callback listener cleanup** — multiple console components subscribe to the same `station.{id}` channel. Each registers and tears down its *own* named callback (never a blanket `stopListening(event)`), so one component unmounting can't silently kill another's live updates.

<a name="fcm"></a>
## Push Notifications (FCM)

Mobile clients register an FCM token (polymorphic `firebase_tokens`, per device type). The backend (via `kreait/laravel-firebase`) pushes notifications for crime assignment, escalation, panic/backup, and chat — the background rail that reaches an officer whose app is closed. Database notifications (`notifications` table) back the in-app notification centre on every surface.

Continue to the [Data Model](/{{route}}/{{version}}/data-model).
