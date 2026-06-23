# End-to-End Workflow

---

This is the spine of CrimeLens: how a pixel on a camera becomes a closed case, with a human dispatcher and a full audit trail in between.

- [The CAD Pipeline](#pipeline)
- [Stage 1 — Detection](#detection)
- [Stage 2 — Incident & Scoring](#incident)
- [Stage 3 — Dispatcher Review](#review)
- [Stage 4 — Crime & Assignment](#assignment)
- [Stage 5 — Field Response](#response)
- [Stage 6 — Escalation](#escalation)
- [Alternative Entry Points](#entry-points)

<a name="pipeline"></a>
## The CAD Pipeline

```
 ┌────────────┐   alert/crime   ┌──────────────────────┐
 │ AI Service │ ───────────────▶│  Incident            │
 └────────────┘                 │  status=pending_review│
                                └──────────┬────────────┘
                                           │ Priority Engine scores it
                                           ▼
                                ┌──────────────────────┐
                       ┌────────│   Dispatcher Console  │────────┐
                       │        └──────────────────────┘        │
                  reject│                                        │dispatch
                       ▼                                         ▼
            ┌────────────────────┐                  ┌────────────────────────┐
            │ rejected_false_alarm│                 │  Crime (status=assigned)│
            └────────────────────┘                  │  + nearest officer      │
                                                     └───────────┬────────────┘
                                                                 │ FCM + Echo
                                                                 ▼
                                        accept → in_progress → arrived → resolved
                                                                 │
                                            no response in N min │
                                                                 ▼
                                                      escalate → next officer
```

<a name="detection"></a>
## Stage 1 — Detection

The AI service watches the gateway RTSP streams of its assigned cameras. As confidence rises it raises a **suspicious-activity alert** (`POST /api/v1/model/alert`); when it confirms an event it posts a **crime detection** (`POST /api/v1/model/crime`) with `camera_id`, `description`, a start/end time window, and `confidence_score`. The current request schema does not include `crime_type`.

The AI never touches a crime record or a camera command — it only hands the backend a report. See [AI Model Integration](/{{route}}/{{version}}/ai-integration).

<a name="incident"></a>
## Stage 2 — Incident & Scoring

The backend creates an **`Incident`** in `pending_review` status, tagged with its source (`ai_alert`, `ai_crime`, `citizen`, `manual`), camera, station, and location. The [Priority Engine](/{{route}}/{{version}}/priority-engine) immediately computes a `priority_score` in `[0,1]` from a transparent weighted formula and assigns a tier:

| Tier | Score | Meaning |
|------|-------|---------|
| **Critical** | ≥ 0.85 | Eligible for auto-dispatch when the weapon + confidence gates pass |
| **High** | 0.65 – 0.85 | Top of the queue |
| **Medium** | 0.45 – 0.65 | Standard review |
| **Low** | < 0.45 | Background |

The full factor breakdown is stored as JSON (`priority_factors`) so any score can be explained and audited later.

<a name="review"></a>
## Stage 3 — Dispatcher Review

The incident appears **in real time** on the Dispatcher Console queue (broadcast via the `station.{id}` channel). A dispatcher:

1. **Claims** the incident under their own identity (so colleagues see it is being handled).
2. Reviews the available snapshot/camera context, map, priority factors, and pre-arrival brief.
3. **Dispatches** it (→ Stage 4) or **rejects** it as a false alarm.

A narrow **auto-dispatch policy** can skip manual review only for the highest-confidence, weapon-bearing critical incidents; everything else waits for a human. Claim/release and review actions are broadcast so every operator's screen stays consistent.

<a name="assignment"></a>
## Stage 4 — Crime & Assignment

On dispatch the backend creates a **`Crime`** record (linked to its originating incident), then finds the **nearest available officer** — same station, on shift, within the configured radius — using live GPS from Redis and a Haversine distance. The officer is assigned (`status = assigned`) and notified via **Firebase push** and an **Echo** event to the station.

<a name="response"></a>
## Stage 5 — Field Response

The officer receives the crime with its location and brief, plus evidence when a Scene is available, and drives the lifecycle from the mobile app:

```
assigned → accept → in_progress → arrive → visited → resolve → resolved
                 └─ decline → not_visited (reason required)
```

Status changes broadcast back to the station console and update the live map and timeline.

<a name="escalation"></a>
## Stage 6 — Escalation

The **escalation service** can reassign a stale Crime to another officer, increment the escalation counter, and notify the station. Its Artisan command exists, but it is not currently registered in the Laravel scheduler. Stale **dispatcher claims**, by contrast, are actively auto-released every minute.

<a name="entry-points"></a>
## Alternative Entry Points

Not every incident starts with the AI. The same pipeline absorbs:

- **Citizen tips** — a public web/SMS report becomes a tip; a dispatcher promotes it into an incident. See [Citizen Tips](/{{route}}/{{version}}/citizen-tips).
- **Manual incidents** — a dispatcher creates an incident directly from a phone call or beat report.

Both sources join the dispatcher queue and follow the same dispatcher → crime → officer path. Manual and citizen-originated incidents currently do not run the same automatic priority calculation as AI incidents. Continue to [Incident & Dispatch](/{{route}}/{{version}}/dispatch).
