# Incident & Dispatch

---

The incident/dispatch layer is the governance core of CrimeLens — the deliberate boundary that turns an AI detection into a *reviewable* unit of work before any officer is committed. This page documents the incident model, the dispatcher console, the queue ownership model, and the concurrency machinery that keeps multiple dispatchers consistent.

- [The Incident Entity](#incident-entity)
- [Incident Sources & Statuses](#sources-statuses)
- [The Dispatcher Console](#console)
- [Queue Ownership: Mine vs Shared](#ownership)
- [Claim & Release](#claim-release)
- [Supervisory vs Operator Identity](#identity)
- [Presence & Load Balancing](#presence)
- [Auto-Release of Stale Claims](#stale)
- [Dispatch & Reject](#dispatch-reject)
- [Real-Time Consistency](#realtime)
- [Endpoints](#endpoints)

<a name="incident-entity"></a>
## The Incident Entity

An **`Incident`** is a candidate event awaiting a dispatch decision. It is deliberately *not* a crime — a crime is only created when a dispatcher (or a narrow auto-dispatch policy) commits to a response.

Key attributes:

| Field | Purpose |
|-------|---------|
| `source` | Where it came from — `ai_alert`, `ai_crime`, `citizen`, `manual`. |
| `police_station_id` | Owning station (tenancy boundary). |
| `camera_id`, `ai_model_id` | Originating device / detector (nullable for manual & citizen). |
| `status` | Lifecycle state (see below). |
| `priority_score` | `[0,1]` score from the [Priority Engine](/{{route}}/{{version}}/priority-engine). |
| `priority_tier` | `critical` / `high` / `medium` / `low`. |
| `priority_factors` | JSON breakdown of *why* the score is what it is (auditable). |
| `confidence_score` | The AI's confidence, when applicable. |
| `lat` / `lang` | Geolocation. |
| `assigned_dispatcher_id` | The `station_user` currently handling it (`null` = shared). |
| `assigned_at` | When it was claimed. |
| `crime_id` | The crime created on dispatch (set after review). |
| `reviewed_at`, `dispatched_at`, `rejected_at` | Audit timestamps. |

<a name="sources-statuses"></a>
## Incident Sources & Statuses

The status machine is intentionally small:

```
                ┌──────────────────┐
   created ────▶│  pending_review  │
                └────────┬─────────┘
                  dispatch│  │reject
                          ▼  ▼
            ┌──────────────┐ ┌────────────────────────┐
            │  dispatched  │ │  rejected_false_alarm  │
            └──────────────┘ └────────────────────────┘
                          (or) expired — aged out without review
```

`dispatched` incidents carry a `crime_id`; `rejected_false_alarm` ones carry a reason and feed back into model-quality metrics. The status field is a PHP backed enum (`IncidentStatus`), cast on the model.

<a name="console"></a>
## The Dispatcher Console

The console (`Modules/Police/resources/js/Pages/Station/Dispatcher.tsx`, served by `DispatcherController`) is a **tri-pane operations screen**:

```
┌──────────────┬───────────────────────────┬────────────────────┐
│ Pending Queue│         Live Map          │   Side Panels      │
│  • My tasks  │   incidents · officers ·  │  • Chat preview    │
│  • Shared    │   cameras (MapLibre)      │  • Citizen tips    │
│              ├───────────────────────────┤  • Pattern alerts  │
│  (claim/     │   Selected Incident Panel │  • Active crimes   │
│   release)   │   (evidence · actions)    │  • On-shift officers│
└──────────────┴───────────────────────────┴────────────────────┘
```

The controller hydrates the page with the station's queue, on-shift officers (with live Redis GPS), cameras, active crimes, citizen tips, and the active-dispatcher count. Heavier panels (`officers`, `cameras`, `activeCrimes`) are streamed via Inertia **deferred props** with skeletons.

<a name="ownership"></a>
## Queue Ownership: Mine vs Shared

The pending queue is split into two lists, computed server-side by `DispatcherSnapshotService::pending()` with a single PostgreSQL query:

- **Mine** — incidents where `assigned_dispatcher_id = <current dispatcher>`.
- **Shared** — unassigned incidents (`assigned_dispatcher_id IS NULL`), capped and ordered by `priority_score DESC, created_at ASC`.

This split lets several dispatchers work the same station without colliding: each sees their own committed work separately from the open pool.

<a name="claim-release"></a>
## Claim & Release

Taking ownership is an atomic, race-safe operation in `DispatcherAssignmentService`:

```php
// claim — succeeds for exactly one dispatcher
UPDATE incidents
   SET assigned_dispatcher_id = :dispatcher, assigned_at = now()
 WHERE id = :incident
   AND police_station_id = :station
   AND status = 'pending_review'
   AND assigned_dispatcher_id IS NULL;   // ← the guard that prevents double-claim
```

If the conditional `UPDATE` affects zero rows, the incident was already taken and the API returns **409 Conflict**. **Release** is the inverse, guarded by `assigned_dispatcher_id = :dispatcher` so only the owner can return an incident to the shared pool. Both actions broadcast an `IncidentAssigned` event so every console updates instantly.

<a name="identity"></a>
## Supervisory vs Operator Identity

A station has two console identities, and they are treated differently on purpose:

- **`station_user_web`** (an individual person) **has** a dispatcher identity. They can claim, release, dispatch, and reject under their own name. Their "Mine" lane reflects their personal workload.
- **`police_station_web`** (the institutional account) is **supervisory**. It has *no* dispatcher identity (`currentDispatcherId` is `null`), so it never shows a false "Mine" lane and the claim/release controls are hidden. It is a read-and-oversee view.

This prevents the institutional account from impersonating an arbitrary "default" user and corrupting ownership — claiming is strictly a per-person action (`IncidentClaimController` rejects a claim from the institutional account with **403**).

<a name="presence"></a>
## Presence & Load Balancing

Active dispatchers are tracked in a **Redis sorted set** keyed by station, scored by timestamp. Each console pings a presence endpoint; entries older than the TTL are trimmed, giving a live "who is online" count and feeding the **rebalance** routine.

`DispatcherAssignmentService::rebalance()` distributes unassigned incidents round-robin across currently-active dispatchers, respecting each dispatcher's `dispatcher_focus_count` cap, and unassigns work from dispatchers who have gone offline. A rebalance broadcasts so consoles re-pull their queues.

<a name="stale"></a>
## Auto-Release of Stale Claims

A claimed incident must never be silently stuck behind an absent dispatcher. The scheduled **`ReleaseStaleDispatcherAssignmentsJob`** (every minute) returns incidents whose claim has gone stale back to the shared pool, so the queue is self-healing.

<a name="dispatch-reject"></a>
## Dispatch & Reject

From the selected-incident panel a dispatcher commits the decision:

- **Dispatch** — creates a `Crime` linked to the incident, runs nearest-officer assignment (see [Crime Lifecycle](/{{route}}/{{version}}/crime-lifecycle)), marks the incident `dispatched`, and notifies the officer (FCM + Echo).
- **Reject** — marks the incident `rejected_false_alarm` with a reason code/note; the rejection is recorded in the decision ledger and contributes to AI-quality analytics.

Both transitions are guarded against races so a single incident can never produce two crimes.

<a name="realtime"></a>
## Real-Time Consistency

Every consequential action broadcasts on the private `station.{id}` channel and is consumed by the console:

| Event | Effect on the console |
|-------|----------------------|
| `IncidentCreated` | New incident drops into the shared queue (+ siren for critical/high). |
| `IncidentAssigned` (`claimed`/`released`/`rebalanced`) | Incident moves between Mine/Shared lanes. |
| `IncidentReviewed` (`dispatched`/`rejected`) | Incident leaves the queue. |

Broadcasts use `toOthers()` so the acting dispatcher — who already updated their own UI optimistically and saw a personal success toast — does not receive a redundant third-person echo, while every *other* operator does. This is what makes claim/release/dispatch feel instant and consistent across screens.

<a name="endpoints"></a>
## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/station` | Dispatcher console (Inertia page). |
| `POST` | `/station/api/incidents/{incident}/claim` | Claim an incident (per-person). |
| `POST` | `/station/api/incidents/{incident}/release` | Release a claimed incident. |
| `POST` | `/station/api/incidents/{incident}/dispatch` | Dispatch → create crime + assign. |
| `POST` | `/station/api/incidents/{incident}/reject` | Reject as false alarm. |
| `POST` | `/station/api/incidents` | Create a manual incident. |
| `POST` | `/station/api/dispatcher-presence/ping` | Heartbeat presence. |

All are behind the station web guards (`police_station_web` / `station_user_web`). Continue to the [Priority Engine](/{{route}}/{{version}}/priority-engine).
