# Glossary

---

A quick reference for the domain terms used throughout CrimeLens.

<a name="terms"></a>

**CAD (Computer-Aided Dispatch)** — software that manages the lifecycle of an emergency response from report to resolution. CrimeLens is an *AI-originated* CAD: the report usually comes from an AI detection rather than a phone call.

**Incident** — a candidate event awaiting a dispatch decision. Created from an AI alert/crime, a citizen tip, or a manual entry. Lives in `pending_review` until a dispatcher dispatches or rejects it. **Not** yet a crime.

**Crime** — a committed response, created when an incident is dispatched. Carries the assigned officer, evidence, and the full response lifecycle.

**Dispatcher** — the human operator who reviews incidents and commits dispatch decisions, working from the Station Console. The role that keeps AI in the loop, not in charge.

**Priority Engine** — the explainable weighted scorer that turns an incident's factors (confidence, crime type, weapon, repeat area, time of day, crowd) into a `priority_score` and a tier.

**Tier** — the operational bucket of a priority score: Critical / High / Medium / Low.

**Auto-Dispatch Policy** — the narrow rule allowing a critical, high-confidence, weapon-bearing incident to skip manual review. Everything else waits for a human.

**Claim / Release** — a dispatcher taking (or returning) personal ownership of an incident, so colleagues can see who is handling what. Race-safe at the database level.

**Citizen Tip** — a public report (web form or SMS) that enters a triage queue. A dispatcher **promotes** it into an incident or **dismisses** it.

**BOLO** — "Be On the Look-Out": a station-wide broadcast about a person, vehicle, or object, with an area and an expiry.

**Panic / SOS** — an officer-safety alert that pages nearby officers for backup and raises a blocking modal on the station console.

**Scene** — the recorded video evidence for a crime, cut from camera storage or merged from gateway recording segments.

**Camera Gateway** — the Python (Flask + FFmpeg + MediaMTX) service that fans one camera's RTSP feed into HLS, WebRTC, and pass-through RTSP, and brokers control commands.

**HLS / WebRTC / RTSP** — streaming formats: HLS for resilient mobile/web playback, WebRTC for low-latency monitoring, RTSP as the raw camera source.

**Detection Filter** — a per-camera, per-crime-type confidence threshold that decides whether an AI detection is accepted or filtered.

**Tamper Event** — a detected attempt to blind a camera (blackout, variance collapse, FOV shift, static stream, heartbeat gap).

**Pattern Alert** — an automatically-detected cluster of related incidents (e.g. multiple weapon detections in one area).

**Decision Ledger** — the append-only, hash-chained audit trail of every consequential action; the system's "defensible record".

**Heartbeat** — a periodic liveness ping. AI models and cameras that stop pinging are flagged offline.

**Guard** — a Laravel authentication context. CrimeLens runs eight (admin, station web ×2, station/officer/AI mobile-or-machine, plus framework defaults).

**Presence** — the live set of online dispatchers (tracked in Redis), used for "who's online" and queue load-balancing.

**Escalation** — reassignment/escalation capability for a Crime whose assigned officer has not responded within the timeout. The command exists; periodic scheduling is not currently enabled.

**Station User vs Police Station account** — an individual dispatcher (`station_user_web`) versus the institutional, supervisory station login (`police_station_web`).

---

That completes the CrimeLens documentation. Return to the [Overview](/{{route}}/{{version}}/overview).
