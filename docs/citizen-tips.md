# Citizen Tips

---

Citizen Tips is CrimeLens's public-intake lane: a way for members of the public to report incidents by web form or SMS, with a dispatcher triage workflow that promotes a credible tip into a first-class incident. It mirrors the "NG9-1-1-lite" capability of commercial CAD systems.

- [Why a Triage Lane](#why)
- [The Tip Entity](#tip-entity)
- [Intake Channels](#intake)
- [Geolocation & Routing](#routing)
- [The Triage Inbox](#inbox)
- [Promote, Dismiss, Reply](#actions)
- [Media Handling](#media)
- [Retention & Privacy](#retention)
- [Real-Time](#realtime)
- [Endpoints](#endpoints)

<a name="why"></a>
## Why a Triage Lane

A citizen tip is **not** automatically an incident — most public reports are noise, duplicates, or non-emergencies. Tips therefore land in a separate triage queue where a dispatcher reviews them and decides whether to **promote** a tip into the main incident pipeline (where it inherits the same [priority scoring](/{{route}}/{{version}}/priority-engine) and dispatcher → crime → officer flow) or **dismiss** it. This keeps the operational queue clean while still capturing the public as a sensor.

<a name="tip-entity"></a>
## The Tip Entity

A **`CitizenTip`** captures one public report:

| Field | Purpose |
|-------|---------|
| `station_id` | The station that owns/handles the tip. |
| `source` | `web`, `sms`, `whatsapp`, or `phone_logged`. |
| `sender_identifier` | The contact handle (phone/anon token). |
| `sender_display_name` | Optional friendly name. |
| `message` | The free-text report. |
| `media_paths` | JSON list of uploaded photos/videos (`path`, `mime`, `size`, `original_name`). |
| `lat` / `lng` / `reported_address` | Location (raw + reverse-geocoded). |
| `status` | `pending` → `in_review` → `promoted` / `dismissed` / `expired`. |
| `promoted_incident_id` | Set when promoted into an incident. |
| `reviewed_by_station_user_id`, `reviewed_at` | Triage audit. |
| `dismissal_reason` | Why a tip was dismissed. |
| `expires_at` | Auto-purge horizon. |

<a name="intake"></a>
## Intake Channels

All channels funnel through a single **`TipIntakeService::intake()`**, which normalises the sender, stores media, sets the retention window, and broadcasts a real-time notification.

**Web portal** — a public, unauthenticated form per station:

```
GET  /tip/{stationCode}        → the public submission form
POST /tip/{stationCode}        → submit (description, contact, lat/lng, address, media[])
GET  /tip/{tipId}/thanks       → confirmation with a TIP-XXXXXXXX reference
```

Submissions are rate-limited per sender IP (configurable hourly cap) and require at least a description or one media file. Anonymous submitters get a random `anon_…` identifier.

**SMS / WhatsApp (Twilio)** — an inbound webhook per station:

```
POST /api/v1/webhooks/twilio/inbound/{stationCode}
```

`TwilioInboundController` resolves the station from the URL, downloads any MMS media, and calls the same intake service with `source = sms`.

<a name="routing"></a>
## Geolocation & Routing

The receiving station is determined by the **station code in the URL** (the link/QR a citizen uses, or the Twilio number's mapping) — explicit routing rather than guesswork. A geospatial `findNearestStation()` (Haversine over station coordinates) exists for location-based routing where a station code is not available.

After intake, **`GeocodeCitizenTipJob`** reverse-geocodes the coordinates into a human-readable `reported_address` off the request cycle.

<a name="inbox"></a>
## The Triage Inbox

Dispatchers work tips in two places:

1. **The console side-panel** — recent unresolved tips surface live on the Dispatcher Console; clicking one opens a detail dialog. The console seeds its list from the server (`pending` + `in_review`) so tips survive a page refresh, then keeps it live over WebSockets.
2. **The dedicated "Citizen Tips" page** (`/station/citizen-tips`) — a full, filterable, paginated inbox with per-status tabs (All / Pending / In review / Promoted / Dismissed) and counts, for working through the backlog.

Both open the same review dialog, which loads full tip details (including signed media URLs) on demand.

<a name="actions"></a>
## Promote, Dismiss, Reply

From the review dialog a dispatcher can:

- **Promote** — opens a form (severity, crime type, notes) and creates a real `Incident` (`source = citizen`) linked back via `promoted_incident_id`. The new incident is broadcast (`IncidentCreated`) so it appears on every console's queue in real time, and the promoter's own queue reloads immediately. Promotion requires a location on the tip.
- **Dismiss** — records a reason and closes the tip; logged to the decision ledger.
- **Reply** (SMS tips only) — sends an SMS back to the reporter via `SendTwilioReplyJob`, gated on chat permission.

Every triage action is permission-checked and station-scoped (a dispatcher can only act on their own station's tips — cross-station access returns **404**).

<a name="media"></a>
## Media Handling

Uploaded photos and videos are stored privately and served through a **relative signed URL** (`signed:relative` middleware), so an `<img>`/`<video>` tag works regardless of the host the console is opened on (localhost vs a tunnelled public URL) — the signature covers only the path, not the domain. The review dialog renders `<video controls>` for video MIME types and `<img>` for images, with a click-to-zoom lightbox.

<a name="retention"></a>
## Retention & Privacy

Tips carry an `expires_at` set from a configurable retention window. The scheduled **`PurgeExpiredCitizenTipsJob`** (daily) deletes expired tips and their media. Sender identifiers are masked in list views and only revealed to operators with the appropriate chat permission.

<a name="realtime"></a>
## Real-Time

On intake, `TipIntakeService` broadcasts a **`CitizenTipReceived`** event on the `station.{id}` channel with a masked-sender preview, media count, and message snippet. The console adds it to the side-panel live (with an audible cue), and the promote action broadcasts `IncidentCreated` to surface the resulting incident everywhere at once.

<a name="endpoints"></a>
## Endpoints

**Public intake**

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/tip/{stationCode}` | Public form |
| `POST` | `/tip/{stationCode}` | Submit a tip |
| `GET` | `/tip/{tipId}/thanks` | Confirmation |
| `POST` | `/api/v1/webhooks/twilio/inbound/{stationCode}` | Twilio inbound webhook |

**Dispatcher triage** (station web guards)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/station/citizen-tips` | Inbox page (filterable, paginated) |
| `GET` | `/station/api/citizen-tips` | Tips JSON list |
| `GET` | `/station/api/citizen-tips/{tip}` | Full tip detail (+ signed media URLs) |
| `POST` | `/station/api/citizen-tips/{tip}/promote` | Promote → incident |
| `POST` | `/station/api/citizen-tips/{tip}/dismiss` | Dismiss with reason |
| `POST` | `/station/api/citizen-tips/{tip}/reply` | Reply via SMS |
| `GET` | `/station/api/citizen-tips/{tip}/media/{index}` | Serve media (relative-signed) |

Continue to [Cameras & Streaming](/{{route}}/{{version}}/cameras).
