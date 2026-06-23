# Authentication & Security

---

CrimeLens handles sensitive law-enforcement data and can command physical devices. Its security posture is **defense in depth** — no single control is trusted alone.

- [Multi-Guard Authentication](#guards)
- [Machine-Client Hardening](#machine)
- [Encryption](#encryption)
- [Signed Media URLs](#signed)
- [Multi-Tenant Isolation](#tenancy)
- [Role-Based Access Control](#rbac)
- [The Decision Ledger](#ledger)
- [Rate Limiting & Forced Rotation](#rate)

<a name="guards"></a>
## Multi-Guard Authentication

Eight Laravel guards run off one application, each scoped to a user type and transport:

| Guard | Driver | For |
|-------|--------|-----|
| `admin` | session | Admin console |
| `police_station_web` | session | Station console (institutional) |
| `station_user_web` | session | Station console (individual dispatcher) |
| `police_station` | sanctum | Station companion mobile |
| `officer` | sanctum | Officer mobile |
| `ai_model` | sanctum | AI detection service |
| `api` | sanctum | Default API |
| `web` | session | Framework default |

Session guards protect the web consoles (CSRF-protected); Sanctum bearer guards protect mobile and machine clients. Tokens are issued at login with a bounded TTL and revoked on logout.

<a name="machine"></a>
## Machine-Client Hardening

The two non-human actors get extra layers:

**AI detection service**
- **IP allow-listing** — every request (including login) must originate from the model's whitelisted `ip_address` (`hash_equals`, **403** on mismatch).
- **HMAC request signing** — `/alert` and `/crime` carry an `X-Signature` (SHA-256 over the body with the model's `signing_secret`), an `X-Timestamp` (±60 s), and an `X-Nonce` (Redis-cached 5 min to block replays).

**Camera gateway**
- All `/api/camera/*` control routes and the tamper webhook require gateway **IP allow-listing** plus HMAC headers (`X-Signature`, `X-Timestamp`, `X-Nonce`) and are rate-limited.
- Laravel-to-Python gateway requests use `X-Gateway-Token`. This authenticates the internal service call but does not encrypt the network, so credential-bearing traffic must stay on localhost/private networking/VPN or HTTPS.

<a name="encryption"></a>
## Encryption

- **Per-session credential encryption** — camera stream URLs/credentials returned to the AI are encrypted with **AES-256-CBC + HMAC** using a key regenerated on every login, so an intercepted response expires at the next login.
- **Encryption at rest** — camera credentials (`user_name`, `password`, `tapo_*`) and the model `signing_secret` use Laravel's `encrypted` cast.
- Passwords are `hashed`; encryption keys are hidden from serialization.

<a name="signed"></a>
## Signed Media URLs

Evidence and media are private and served only through **signed URLs** with bounded TTLs — HLS playlists/segments, crime scene clips, tamper sample frames, body-cam footage, chat voice notes, and citizen-tip media. Citizen-tip media uses a **relative** signature so an `<img>`/`<video>` works across hosts (localhost vs a tunnelled public URL) without leaking the domain into the signature. Streaming routes deliberately bypass session/CSRF middleware so players can fetch them statelessly.

<a name="tenancy"></a>
## Multi-Tenant Isolation

A station can only ever see its own data. Isolation is enforced at three layers: query scoping (every station query is filtered by `police_station_id`), explicit ownership checks (cross-station access returns **404**), and **channel authorization** — private broadcast channels (`station.{id}`, `officer.{id}`, `panic.*`) authorise only the owning tenant/person, so isolation holds even on the WebSocket layer.

<a name="rbac"></a>
## Role-Based Access Control

Within a station, `spatie/laravel-permission` grants fine-grained roles/permissions to `station_users` (e.g. `incidents.dispatch`, `chat.send`, `incidents.create_manual`). The institutional account is supervisory; individual users act under their own permissioned identity.

<a name="ledger"></a>
## The Decision Ledger

Every consequential action — dispatch, reject, claim, escalation, tip promotion — is written to an **append-only, hash-chained** `ledger_entries` table: each row stores the `previous_hash` and its own `hash`, forming a tamper-evident chain. Database triggers enforce immutability, and the scheduled `ledger:verify` command re-walks the chain to detect any break. This is the "defensible audit trail" that lets CrimeLens answer *who decided what, when, and why* — a differentiator over phone-call-first CAD systems.

<a name="rate"></a>
## Rate Limiting & Forced Rotation

Sensitive endpoints are throttled (login `5/min`, dispatch/reject `30/min`, panic `1/30 s`, body-cam `5/min`, …). New station/officer accounts carry `must_change_password`, and a `force_password_change` middleware blocks the console until the password is rotated.

Continue to [Background Jobs & Scheduling](/{{route}}/{{version}}/jobs).
