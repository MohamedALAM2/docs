# API Reference

---

CrimeLens exposes **345 non-vendor application routes** as discovered on 23 June 2026 across six modules. They divide by audience: machine APIs (AI, camera gateway), mobile APIs (officer, station companion), web consoles (admin, station), and public intake. This page is a navigational map — each group links conceptually to its feature page.

- [Conventions](#conventions)
- [Shared & Auth (`/api/v1/{guard}`)](#shared)
- [Officer Mobile API](#officer)
- [Police Station API](#station-api)
- [AI Model API](#model)
- [Camera Control API](#camera)
- [Station Web Console](#station-web)
- [Admin Console](#admin)
- [Public & Webhooks](#public)
- [Media & Streaming](#media)

<a name="conventions"></a>
## Conventions

- **Response envelope** — most JSON APIs use `{ status, data, message }`; a few utility endpoints return purpose-specific payloads. Web consoles use Inertia responses.
- **Versioning** — mobile/machine APIs are under `/api/v1`.
- **Auth** — bearer (Sanctum) for mobile/machine; session for web consoles; signed URLs for media.
- **Rate limiting** — sensitive routes are throttled (login `5/min`, dispatch/reject `30/min`, presence/claim `60/min`, body-cam `5/min`, etc.).

<a name="shared"></a>
## Shared & Auth — `/api/v1/{guard}`

A dynamic-guard group (`police-station` | `officer`) handled by one set of controllers via a `resolve.guard` middleware:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/{guard}/login` | Authenticate → token + encryption_key. |
| `POST` | `/{guard}/password/{forgot,verify-code,reset}` | Password-reset flow. |
| `GET/PUT` | `/{guard}/profile`, `/{guard}/password/change`, `/{guard}/logout` | Profile & session. |
| `GET` | `/{guard}/crimes`, `/{guard}/crimes/{crime}` | Crime list/detail. |
| `GET/PUT/DELETE` | `/{guard}/notifications…` | Notification centre. |
| `POST` | `/{guard}/firebase-token` | Register FCM token. |
| `GET/POST` | `/{guard}/chat…` | Chat. |
| `GET` | `/v1/settings/language` | Public app-language setting. |

<a name="officer"></a>
## Officer Mobile API — `/api/v1/officer` (`auth:officer`)

| Method | Path | Purpose |
|--------|------|---------|
| `PUT` | `/crimes/{crime}/accept` \| `/no-visit` \| `/resolve` | Crime lifecycle actions. |
| `GET` | `/crimes/{crime}/brief` | Pre-arrival tactical brief. |
| `POST` | `/location` | GPS update (Redis-backed). |
| `GET/PUT` | `/status`, `/status/daily-activity` | Availability + daily summary. |
| `POST` | `/panic`, `/panic/{panic}/cancel` | Officer-safety SOS. |
| `POST` | `/crimes/{crime}/body-cam` | Upload body-cam footage. |
| `POST` | `/chat/voice`, `/chat/quick-reply` | Voice & quick-reply chat. |
| `GET` | `/bolos/active`, `/task-history` | Active BOLOs, history. |

See [Crime Lifecycle & Field Ops](/{{route}}/{{version}}/crime-lifecycle).

<a name="station-api"></a>
## Police Station API — `/api/v1/police-station` (`auth:police_station`)

The mobile/companion API for stations: officer CRUD + import + password reset + activity; camera CRUD + import + test; crime assignment (`candidate-officers`, `assign`); incident ops (`dispatch`, `reject`, `link`, `nearest-officers`); and `panic/{panic}/resolve`. Mirrors the web console's capabilities over bearer auth.

<a name="model"></a>
## AI Model API — `/api/v1/model` (`auth:ai_model` + IP + HMAC)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/login`, `/logout` | Session (IP-verified). |
| `GET` | `/cameras` | Assigned cameras (encrypted URLs). |
| `POST` | `/heartbeat` | Liveness. |
| `POST` | `/alert`, `/crime` | Report detection (HMAC-signed). |

See [AI Model Integration](/{{route}}/{{version}}/ai-integration).

<a name="camera"></a>
## Camera Control API — `/api/camera` (`gateway.ip` + `gateway.hmac`)

~40 POST actions covering privacy, alarm, LED, PTZ/preset/tracking, detection toggles, image, audio, recording/SD, and device control — plus the `/v1/webhooks/camera-tamper` ingress. Only the backend reaches these; see [Cameras & Streaming](/{{route}}/{{version}}/cameras).

<a name="station-web"></a>
## Station Web Console — `/station` (`police_station_web` | `station_user_web`)

The Inertia/React dispatcher surface. Pages: dispatcher dashboard (`/`), monitoring, heatmap, crimes, officers, cameras, users, bolos, citizen-tips, chat, notifications, profile. The `/station/api/*` lane backs them with: incidents (`dispatch`/`reject`/`link`/`claim`/`release`/`nearest-officers`), dispatcher presence (`ping`/`leave`), citizen-tips (`promote`/`dismiss`/`reply`/`media`), pattern-alerts, camera control (`alarm`/`move`/`test-connection`), chat, notifications, and HLS stream URLs. Behind `force_password_change` middleware.

See [Incident & Dispatch](/{{route}}/{{version}}/dispatch) and [Citizen Tips](/{{route}}/{{version}}/citizen-tips).

<a name="admin"></a>
## Admin Console — `/admin` (`auth:admin`)

Police-station CRUD + cities + password reset; AI-model CRUD + camera assignment + per-model analytics + comparison; crimes + tracking; heatmap; reports; settings + **priority-weights (dry-run/apply)**; notifications; system **health**; **audit** (+ CSV export); **simulation** trigger; chat; **camera-health** (tamper acknowledge); **camera-gateway** test console.

<a name="public"></a>
## Public & Webhooks

| Method | Path | Purpose |
|--------|------|---------|
| `GET/POST` | `/tip/{stationCode}` | Citizen tip form & submission. |
| `GET` | `/tip/{tipId}/thanks` | Confirmation. |
| `POST` | `/api/v1/webhooks/twilio/inbound/{stationCode}` | Twilio SMS intake. |
| `POST` | `/v1/webhooks/camera-tamper` | Gateway tamper signal. |

<a name="media"></a>
## Media & Streaming (signed)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/gateway/hls/{cameraKey}/index.m3u8` + segments | HLS playback (signed, sessionless). |
| `GET` | `/media/private-scene/{path}` | Crime scene evidence. |
| `GET` | `/media/private-tamper-sample/{path}` | Tamper sample frame. |
| `GET` | `/station/api/citizen-tips/{tip}/media/{index}` | Tip media (relative-signed). |
| `GET` | `/api/v1/body-cam/{upload}/serve`, `/api/v1/chat-voice/{message}/serve` | Officer media (signed). |

Continue to [Authentication & Security](/{{route}}/{{version}}/security).
