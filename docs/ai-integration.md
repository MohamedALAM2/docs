# AI Model Integration

---

The AI detection service is a first-class but **tightly constrained** client. It watches camera streams and reports what it sees — and nothing more. This page documents its identity, the multi-layer security on its API, the encrypted camera handshake, and how its reports become incidents.

- [Trust Model](#trust-model)
- [The AiModel Identity](#identity)
- [Security in Depth](#security)
- [The Encrypted Camera Handshake](#handshake)
- [The API](#api)
- [From Report to Incident](#report-to-incident)
- [Heartbeat & Liveness](#heartbeat)
- [Detection Logging](#logging)

<a name="trust-model"></a>
## Trust Model

The AI is treated as a useful but **untrusted** sensor. Through the normal production API it does not:

- create a crime directly,
- dispatch an officer,
- or command a camera (alarm, PTZ).

Everything it sends becomes a **pending incident** that a human dispatcher reviews, unless the optional auto-dispatch policy qualifies it. In the current model endpoint the backend sets the weapon signal to false, so a policy requiring weapon detection is not reached by normal model traffic.

<a name="identity"></a>
## The AiModel Identity

An `AiModel` is a machine account registered by an administrator:

| Field | Purpose |
|-------|---------|
| `email`, `password` | Login credentials (password hashed). |
| `ip_address` | The single whitelisted source IP. |
| `encryption_key` | A 64-char hex key, **regenerated on every login** (per-session). |
| `signing_secret` | An HMAC secret (encrypted at rest) for request signing. |
| `is_active`, `last_heartbeat_at`, `offline_notified_at` | Liveness state. |

A model sees only the cameras assigned to it through the `camera_ai_model` pivot — never the whole fleet.

<a name="security"></a>
## Security in Depth

Three independent layers protect the model API; a request must pass all of them:

1. **Sanctum bearer token** (`ai_model` guard) — issued at login with a 7-day TTL; old tokens are revoked on each login (single active session).
2. **IP allow-listing** (`VerifyModelIpMiddleware`) — every request's source IP is compared (`hash_equals`) against the model's whitelisted `ip_address`; a mismatch is **403**. Login itself verifies the IP *before* issuing a token, so stolen credentials are useless from another host.
3. **HMAC request signing** (`VerifyAiSignature`, on `/alert` and `/crime`) — the body is signed `sha256` with the model's `signing_secret`, sent as `X-Signature` with an `X-Timestamp` (±60 s window) and an `X-Nonce` (cached in Redis for 5 minutes to block replays).

<a name="handshake"></a>
## The Encrypted Camera Handshake

Camera credentials are never sent in the clear, even over TLS. On login the model receives a fresh `encryption_key`; when it fetches its cameras the sensitive fields are encrypted with **AES-256-CBC + HMAC** (via the shared `EncryptionService`):

```
login → { token, encryption_key }     (key regenerated, stored in DB)
GET /cameras → per-camera { encrypted gateway_rtsp_url, gateway_webrtc_url, ... }
model decrypts locally with encryption_key
```

The envelope is a base64 JSON `{ iv, value, mac }`: a random 16-byte IV, the ciphertext, and an HMAC-SHA256 over `IV + ciphertext` that the model verifies before decrypting. Because the key rotates per login, an intercepted response is worthless after the next login.

<a name="api"></a>
## The API

Base prefix `/api/v1/model`, guard `ai_model`:

| Method | Path | Auth chain | Purpose |
|--------|------|-----------|---------|
| `POST` | `/login` | throttle | Authenticate (IP-verified) → token + encryption_key. |
| `POST` | `/logout` | token + IP | Revoke the current token. |
| `GET` | `/cameras` | token + IP | Assigned cameras with encrypted stream URLs. |
| `POST` | `/heartbeat` | token + IP | Liveness ping. |
| `POST` | `/alert` | token + IP + HMAC | Report suspicious activity (`camera_id`, `confidence_score`). |
| `POST` | `/crime` | token + IP + HMAC | Report a confirmed crime (`camera_id`, `description`, `confidence_score`, `start_time`, `end_time`). |

Model endpoints return the standard `{ status, data, message }` envelope.

<a name="report-to-incident"></a>
## From Report to Incident

`AlertService` turns a report into an incident through the [incident layer](/{{route}}/{{version}}/dispatch):

1. **Authorization** — confirms the camera is actually assigned to the calling model.
2. **Filtering** — applies the camera's enabled detection filter and minimum confidence. The decision is written to `ai_detection_logs`. In the current implementation a camera with no enabled filter returns `filtered_type`; `no_filter_config` is used only when no camera is available to the decision method.
3. **Incident creation** — `IncidentService::createFromAiAlert()` / `createFromAiCrime()` builds an `Incident` (`source = ai_alert` / `ai_crime`, status `pending_review`), copies the camera's station and location, stores the raw `confidence_score`, and runs the [Priority Engine](/{{route}}/{{version}}/priority-engine) to compute `priority_score`, `priority_tier`, and the explainable `priority_factors`.
4. **Auto-dispatch check** — `AutoDispatchPolicy` evaluates the incident. The policy is deliberately narrow; however, the real model endpoint currently passes `weapon = false`, so weapon-gated auto-dispatch is effectively unavailable through that route.
5. **Notification** — a job notifies the station, and the incident broadcasts onto the dispatcher console.

<a name="heartbeat"></a>
## Heartbeat & Liveness

A model is expected to ping `/heartbeat` periodically. The scheduled `model:check-heartbeats` command reads the configured timeout (default 2 minutes), flags any model whose `last_heartbeat_at` is stale as `is_active = false`, records `offline_notified_at`, fires the `AiModelOffline` broadcast (to the admin channel), and notifies administrators — so a dead detector is never silently trusted.

<a name="logging"></a>
## Detection Logging

Every detection — accepted or filtered — is recorded in `ai_detection_logs` with the camera, crime type, model, confidence, decision, and timestamp. This feeds the **AI model analytics** in the admin console: acceptance rate, false-alarm rate, and per-camera precision, which together surface **model drift** before it can cause a bad dispatch.

The Crime API accepts `start_time` and `end_time`, but the current Incident schema does not retain them. The legacy direct Crime flow supports automatic Scene extraction; the newer Incident flow needs an additional persistence/extraction link before the same guarantee can be made.

Continue to the [Priority Engine](/{{route}}/{{version}}/priority-engine).
