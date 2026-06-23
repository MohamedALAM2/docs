# Crime Lifecycle & Field Ops

---

Once a dispatcher commits a dispatch, an incident becomes a **crime** and the field-operations layer takes over: assignment, navigation, the officer's status machine, escalation, and officer-safety features.

- [The Crime Entity](#crime-entity)
- [The Status Machine](#status-machine)
- [Officer Assignment](#assignment)
- [Officer Actions](#actions)
- [Escalation](#escalation)
- [Location Tracking & Proximity](#location)
- [Panic / Officer Safety](#panic)
- [BOLO Broadcasts](#bolo)
- [Shifts, Status & Daily Routes](#shifts)
- [Body-Cam Evidence](#bodycam)

<a name="crime-entity"></a>
## The Crime Entity

A `Crime` is a committed response, linked back to the incident that spawned it:

| Field | Purpose |
|-------|---------|
| `incident_id` | The originating incident. |
| `officer_id` | The assigned responder (nullable until assigned). |
| `camera_id`, `scene_id` | Source camera and recorded evidence. |
| `status`, `severity` | Lifecycle state and severity. |
| `confidence_score`, `priority_score_snapshot` | The AI confidence and the priority at assignment time. |
| `accepted_at`, `officer_arrive_time`, `resolved_at` | Lifecycle timestamps. |
| `response_time_minutes` | Computed responsiveness metric. |
| `escalation_count` | How many times it was reassigned. |
| `no_visit_reason`, `no_visit_type`, `resolution_note` | Outcome detail. |

<a name="status-machine"></a>
## The Status Machine

```
 assigned ──accept──▶ in_progress ──arrive──▶ (visited) ──resolve──▶ resolved
    │                                                                     
    ├── no-visit (reason required) ─────────────▶ not_visited
    │
    └── no response in N min ───────────────────▶ escalated ──▶ reassigned
```

`status` is a `CrimeStatus` backed enum (`pending`, `assigned`, `in_progress`, `not_visited`, `resolved`, `escalated`, `false_alarm`). Every transition broadcasts back to the station console so the live map and timeline stay current.

<a name="assignment"></a>
## Officer Assignment

`NearestOfficerService` finds responders with a two-tier strategy:

1. **Redis GEO (hot path)** — officer positions are kept in a Redis geo set per station; a `GEORADIUS` returns nearby officers in microseconds, using the *live* GPS rather than a stale database row.
2. **PostGIS fallback** — a `ST_DWithin` + KNN (`<->`) query over `officers.current_location` when Redis is cold.

The Redis hot path filters to `is_on_shift = true`, `status = available`, the same station, and returns nearby candidates ordered by distance. The PostGIS fallback provides durable spatial lookup; its availability filter should be kept aligned with the Redis path. The chosen officer is assigned, notified by FCM + Echo (`CrimeAssigned`), and the crime moves to `assigned`.

<a name="actions"></a>
## Officer Actions

From the mobile app (`auth:officer` guard):

| Action | Endpoint | Effect |
|--------|----------|--------|
| **Accept** | `PUT /api/v1/officer/crimes/{crime}/accept` | `accepted_at` set, status → `in_progress`. |
| **No-visit** | `PUT …/no-visit` | Decline with a reason/type → `not_visited`. |
| **Resolve** | `PUT …/resolve` | Close with a resolution note → `resolved`. |
| **Brief** | `GET …/brief` | Pre-arrival tactical brief (crime type, weapon flag, snapshots, location history). |

Supporting endpoints cover task history (`/task-history`) and the pre-arrival brief that gives an officer situational awareness *before* arriving.

<a name="escalation"></a>
## Escalation

`EscalationService::escalateStaleCrimes()` finds crimes still `assigned` past the timeout with fewer than the maximum attempts, groups them by station, and dispatches `EscalateStationCrimesJob`. Each escalation increments `escalation_count`, attempts reassignment, broadcasts `CrimeEscalated`, and flags the station for manual intervention when required. The command exists but is **not currently registered in the scheduler**.

<a name="location"></a>
## Location Tracking & Proximity

Officers stream GPS every ~100 m or 30 s to `POST /api/v1/officer/location`. Redis is the live geospatial path, and the current service also synchronizes the latest location to PostGIS. `OfficerLocationUpdated` broadcasts on the officer's location channel and the station dispatch-map channel.

A proximity detector compares an en-route officer's position to their target crime and emits `OfficerProximityChanged` with a state of `approaching` or `arrived`, so the dispatcher map can show responders converging in real time.

<a name="panic"></a>
## Panic / Officer Safety

An officer in danger taps SOS → `POST /api/v1/officer/panic` (rate-limited 1 / 30 s), creating a `PanicEvent` (status `active`, with location and optional audio). This:

- broadcasts `PanicActivated` to the station and the officer's own channel, and
- dispatches `NotifyNearbyOfficersForBackup`, which finds available officers within ~2 km (Redis geo, PostGIS fallback) and pushes a backup request to them.

Cancelling (`POST …/panic/{panic}/cancel`) broadcasts `PanicResolved`. The station console raises a blocking panic modal over everything else — officer safety preempts the queue.

<a name="bolo"></a>
## BOLO Broadcasts

A **BOLO** ("Be On the Look-Out") is a station-wide alert about a person/vehicle/object. A `Bolo` carries a subject type, description, photo, an area (`lat`/`lng` + radius), a severity, and an expiry. Creating one fires `BoloBroadcasted` to all on-shift officers and the station map; officers fetch the active set via `GET /api/v1/officer/bolos/active`.

<a name="shifts"></a>
## Shifts, Status & Daily Routes

- **Status** — `available` / `busy` / `offline`, changed via `PUT /api/v1/officer/status`; every transition is recorded in `officer_status_logs` for accountability and a daily-activity summary (service minutes, completed tasks, average response time).
- **Shifts & patrol zones** — `officer_shifts` defines shift windows and an optional patrol polygon/zone, set by the station.
- **Daily routes** — `ProcessDailyOfficerRoutes` (scheduled, chunked) pulls each officer's GPS trail from Redis for the previous day, encodes it as a polyline, and stores it in `officer_activity_logs` with total distance and update count — a compact, replayable patrol history.

<a name="bodycam"></a>
## Body-Cam Evidence

Officers can attach body-cam footage to a crime (`POST /api/v1/officer/crimes/{crime}/body-cam`), stored as a `body_cam_upload` and served through a signed URL. Combined with the camera [scene evidence](/{{route}}/{{version}}/cameras), a crime carries both the detecting camera's clip and the responding officer's footage.

Continue to [Real-Time & Notifications](/{{route}}/{{version}}/realtime).
