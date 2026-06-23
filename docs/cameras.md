# Cameras & Streaming

---

CrimeLens treats a camera as both a **sensor** (for the AI) and an **evidence source** (for the dispatcher and the courtroom). This page covers the camera model, device control, the streaming gateway, and the recording/evidence pipeline.

- [The Camera Model](#model)
- [Coverage Cones](#coverage)
- [Device Control (Tapo / ONVIF)](#control)
- [The Streaming Gateway](#gateway)
- [Stream Formats](#formats)
- [Continuous Recording](#recording)
- [Scene Extraction (Evidence)](#scene)
- [Tamper Detection](#tamper)
- [Detection Filters](#filters)
- [Health & Cleanup](#health)

<a name="model"></a>
## The Camera Model

A `Camera` belongs to a police station and carries everything needed to reach, stream, and place it on a map:

| Field | Purpose |
|-------|---------|
| `gateway_stream_key` | Unique key the streaming gateway uses to route this camera. |
| `ip_address`, `rtsp_port` | Network address (RTSP default 554). |
| `user_name`, `password`, `tapo_email`, `tapo_password` | **Encrypted-at-rest** credentials (Laravel `encrypted` casts). |
| `stream_path` | JSON map of stream IDs (e.g. `stream1` HD, `stream2` SD). |
| `storage_type` | `none` / `sd_card` / `cloud` — selects the recording strategy. |
| `lat`, `lang`, `location` | Coordinates + a **PostGIS** `geography(Point, 4326)` for spatial queries. |
| `coverage_radius_meters`, `coverage_angle_degrees`, `coverage_bearing_degrees` | The camera's field-of-view cone. |
| `is_active`, `last_seen_at`, `offline_notified_at` | Health state. |

Credentials are never returned raw — the model exposes **gateway URLs** instead (`gateway_rtsp_url`, `gateway_hls_url`, `gateway_webrtc_url`), and the HLS accessor returns a short-lived **signed route** (`/gateway/hls/{key}/index.m3u8`, ~5-minute TTL).

<a name="coverage"></a>
## Coverage Cones

Each camera stores a directional field-of-view (radius + angle + bearing). The dispatcher map renders these as **coverage cones**, so operators can see exactly what is and isn't observable — and where the blind spots are. The PostGIS `location` point (kept in sync with `lat`/`lang`) powers nearest-camera and heatmap queries.

<a name="control"></a>
## Device Control (Tapo / ONVIF)

The backend — and only the backend — can command a camera. Control flows through the `TapoCameraController` (`/api/camera/*`), every route protected by gateway IP allow-listing + **HMAC** (`gateway.ip`, `gateway.hmac`) and rate-limited. The surface is broad (40+ actions), grouped as:

| Group | Actions |
|-------|---------|
| **Privacy / safety** | `privacy`, `alarm` (siren + light), `whitelamp`, `cover`, `led` |
| **PTZ & tracking** | `motor` (move/calibrate), `preset` (list/set/save/delete), `cruise`, `autotrack`, `smarttrack` |
| **Detection toggles** | `motion`, `person`, `babycry`, `tamper` (sensitivity-tunable) |
| **Image** | `daynight`, `flip`, `ldc`, `osd`, `light-freq`, `video-qualities` |
| **Audio** | `microphone`, `speaker`, `audio-config`, `record-audio` |
| **Recording / storage** | `recordings`, `record-plan`, `circular-recording`, `sdcard`, `media-encrypt` |
| **Device** | `status`, `basic-info`, `time`, `timezone`, `firmware`, `reboot`, `diagnose`, `stream-url`, `events` |

Each action takes an `action` discriminator (e.g. `on`/`off`/`status`) plus action-specific params. The controller forwards the command to the Python gateway, which talks to the camera over Tapo's API.

<a name="gateway"></a>
## The Streaming Gateway

A camera emits one RTSP feed, but three consumers need three formats. The **Python Camera Gateway** (`Modules/Gateway/tapo_server.py`, a persistent Flask service) solves the fan-out. Laravel drives it through `CameraGatewayService`:

| Operation | Gateway endpoint |
|-----------|------------------|
| Register camera | `POST /gateway/cameras/register` |
| Start stream | `POST /gateway/cameras/{key}/stream/start` |
| Stop stream | `POST /gateway/cameras/{key}/stream/stop` |
| Stream status | `GET /gateway/cameras/{key}/stream/status` |
| Execute command | `POST /gateway/cameras/{key}/command` |
| Health | `GET /gateway/health` |

Laravel-to-Python requests carry an `X-Gateway-Token` shared secret. The gateway keeps **persistent, pooled `pytapo` connections** (cached by `ip:user`, 5-minute TTL) so it doesn't re-handshake per request, and tracks one `ffmpeg` process per active stream. The token authenticates the service call; use localhost/private networking/VPN or HTTPS to protect credential-bearing traffic.

Camera state is kept in sync with the gateway by jobs — `SyncCameraGatewayStreamJob` (register + start / stop), `SyncCameraRecordingJob`, and `SyncCameraPrivacyJob` (privacy follows `is_active`) — and the scheduled `camera:gateway:boot` command re-establishes all active streams after a restart.

<a name="formats"></a>
## Stream Formats

| Format | Produced by | Consumer | Why |
|--------|-------------|----------|-----|
| **HLS** | gateway ffmpeg | mobile + lightweight web | Robust over poor networks; served via a signed route. |
| **RTSP relay** | gateway → MediaMTX | internal | Re-publishes the feed for WebRTC. |
| **WebRTC** | MediaMTX | dispatcher monitoring grid | Sub-second latency for live ops. |
| **RTSP relay** | gateway / MediaMTX | AI service + recording | Stable internal source for detection and recording. |

The gateway transcodes RTSP → HLS with tunable, low-latency `ffmpeg` settings (1-second segments, `zerolatency`, configurable codec/bitrate/GOP), all driven by environment variables.

<a name="recording"></a>
## Continuous Recording

For cameras with `storage_type = none` (no on-device storage), `CameraRecordingService` runs a continuous server-side recording: one `ffmpeg` process per camera writing **60-second MKV segments**:

```bash
ffmpeg -rtsp_transport tcp -use_wallclock_as_timestamps 1 \
  -i {rtsp_url} -map 0:v -c:v copy -map 0:a? -c:a copy \
  -f segment -segment_time 60 -reset_timestamps 1 -strftime 1 \
  storage/recordings/{camera_id}/%Y-%m-%d_%H-%M-%S.mkv
```

Process PIDs are tracked in Redis (`camera_recording:{id}`) so the service can `start` / `stop` / `restart` / `isRecording` reliably. Recording starts automatically when such a camera is activated.

<a name="scene"></a>
## Scene Extraction (Evidence)

When `ExtractCrimeScene` is dispatched, `SceneExtractorService` on the `scenes` queue produces the evidence clip:

- **SD-card / cloud cameras** — pull the clip directly from the camera for the incident window.
- **Storage-less cameras** — find the recorded segments overlapping `[start − 30s, end + 30s]`, concat-merge them with `ffmpeg`, and transcode to a single faststart MP4.

It also extracts a **thumbnail** (first frame) for quick preview, and writes both to `crimes/{crime_id}/`. The result is persisted as a `Scene` record linked to the crime.

> {warning} The legacy direct model-report flow dispatches this job. The current AI → Incident → Crime flow accepts a time window but does not persist it on the Incident, so automatic extraction is not yet guaranteed for every AI-originated Crime.

<a name="tamper"></a>
## Tamper Detection

Cameras can be blinded — covered, sprayed, re-aimed, or cut off. The gateway analyses the feed and reports tamper signals to a webhook (`POST /v1/webhooks/camera-tamper`), creating a `CameraTamperEvent`:

- **Signal types** — `blackout`, `variance_collapse`, `fov_shift`, `static_stream`, `heartbeat_gap`.
- **Status** — `active` → `acknowledged` / `resolved` / `false_alarm`, with an admin acknowledgement note and an optional evidence frame (served via a 30-minute signed URL).

A `CameraTamperDetected` event broadcasts on the private `admin.camera-health` channel so operators see blind-spots forming in real time.

<a name="filters"></a>
## Detection Filters

`CameraDetectionFilter` lets a camera be tuned per crime type: a `min_confidence` threshold (default `0.700`) and an enabled flag, keyed uniquely by `(camera, crime_type)`. When the AI reports a detection, the filter decides whether it is **accepted** or **filtered** (by type or confidence) — and that decision is recorded in `ai_detection_logs`, giving a measurable view of model precision per camera.

<a name="health"></a>
## Health & Cleanup

- **Health checks** — the `camera:health-check` schedule pings cameras; unreachable cameras flip to offline (`CameraOffline` event) and notify their station.
- **Cleanup** — the `CleanupOldRecordings` job (maintenance queue) deletes recording segments past the retention window (default 7 days) and crime evidence past its window (default 90 days).

Continue to [AI Model Integration](/{{route}}/{{version}}/ai-integration).
