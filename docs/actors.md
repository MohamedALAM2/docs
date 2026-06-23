# Actors & Roles

---

CrimeLens has five actors — three human, two machine. Each is confined to the surface and authority appropriate to its role. The golden rule: **only the dispatcher commits a dispatch decision, and only the backend commands a camera.**

- [System Administrator](#admin)
- [Dispatcher / Station Operator](#dispatcher)
- [Field Officer](#officer)
- [AI Detection Service](#ai)
- [Camera Device](#camera)
- [Authority Matrix](#authority-matrix)

<a name="admin"></a>
## System Administrator

Governs the platform from the **Admin Console** (web). Administrators do not handle live incidents; they configure the system the dispatchers operate.

**Can:**
- Manage police stations (CRUD, Excel import, password resets).
- Register and manage AI detection services (IP whitelist, camera assignment, activation).
- Configure system settings and preview/persist priority-weight proposals. Live incident scoring currently still uses fixed service constants.
- View nationwide analytics, heatmaps, and system health (heartbeats, camera status, queue depth).
- Inspect audit logs / the decision ledger.

<a name="dispatcher"></a>
## Dispatcher / Station Operator

The operational core of the system, working from the **Station / Dispatcher Console** (web). There are two console identities:

- **`police_station_web`** — the institutional station account, a **supervisory** view that sees the full queue but does not take ownership of individual incidents.
- **`station_user_web`** — an individual person (e.g. a dispatcher or station manager) who can **claim**, **release**, dispatch, and reject incidents under their own identity.

**Can:**
- Review the live incident queue and triage by priority.
- **Claim / release** incidents (individual users) and dispatch (create crime + assign officer) or reject as a false alarm.
- Create **manual incidents** (e.g. from a phone call or beat report).
- Triage **citizen tips** — promote to incident, dismiss, or reply (SMS).
- Monitor cameras live (HLS/WebRTC grid) and the station heatmap.
- Broadcast **BOLO** alerts, manage officers/cameras, and chat with officers.

<a name="officer"></a>
## Field Officer

Works exclusively from the **Officer mobile app**. Officers receive work; they never manage stations or move cameras.

**Can:**
- Receive assigned incidents/crimes (push + in-app), with map, evidence, and a pre-arrival brief.
- **Accept**, mark **arrived**, **resolve**, or decline (`no-visit` with a reason).
- Stream their GPS location (every ~100 m or 30 s) and toggle availability status.
- Trigger a **panic / SOS** button and request backup.
- Chat with their station and capture body-cam evidence.

<a name="ai"></a>
## AI Detection Service

A machine client (Python) that watches camera streams and **reports** what it sees. It is the most tightly constrained actor.

**Can:**
- Authenticate (email + password, **verified against a whitelisted IP**).
- Fetch its assigned cameras with **encrypted** credentials (AES-256, per-session key).
- Send periodic **heartbeats**.
- Raise an **alert** (suspicious activity) or a confirmed **crime detection** (with timestamps and confidence).

**Cannot:**
- Create a crime directly, dispatch an officer, or command a camera. It only feeds the [incident layer](/{{route}}/{{version}}/dispatch).

<a name="camera"></a>
## Camera Device

Tapo / ONVIF street cameras. A camera streams RTSP and accepts control commands (PTZ, alarm, privacy) **only from the backend**, never from the AI or the officer. The [Camera Gateway](/{{route}}/{{version}}/cameras) brokers the stream into the formats each consumer needs.

<a name="citizen"></a>
## Citizen (External Reporter)

Not an authenticated actor, but a source. Members of the public submit tips through a public web form or by SMS. Tips land in a triage queue for a dispatcher to review — see [Citizen Tips](/{{route}}/{{version}}/citizen-tips).

<a name="authority-matrix"></a>
## Authority Matrix

| Capability | Admin | Dispatcher | Officer | AI | Camera |
|------------|:----:|:----------:|:-------:|:--:|:------:|
| Configure system / stations | ✅ | — | — | — | — |
| Review & dispatch incidents | — | ✅ | — | — | — |
| Create manual incident | — | ✅ | — | — | — |
| Report detection (alert/crime) | — | — | — | ✅ | — |
| Accept / resolve assigned crime | — | — | ✅ | — | — |
| Command camera (PTZ/alarm) | via backend | via backend | — | ❌ | receives |
| Stream GPS / panic | — | — | ✅ | — | — |
| Submit a tip | — | — | — | — | — |

Continue to [End-to-End Workflow](/{{route}}/{{version}}/workflow).
