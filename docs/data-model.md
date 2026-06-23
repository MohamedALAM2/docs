# Data Model

---

CrimeLens persists to **PostgreSQL + PostGIS** across roughly 35 tables. This page groups them by domain, lists the columns that matter, and calls out the enums and spatial columns that make the system work.

- [Spatial & Enum Conventions](#conventions)
- [Incident & Dispatch](#incident)
- [Cameras & AI Detection](#cameras)
- [Officers & Field Ops](#officers)
- [Stations, Users & Admins](#stations)
- [Citizen Engagement](#citizen)
- [Evidence & Media](#evidence)
- [Communications](#comms)
- [Audit & Ledger](#audit)
- [Configuration](#config)

<a name="conventions"></a>
## Spatial & Enum Conventions

- **Spatial** — `cameras.location` and `officers.current_location` are PostGIS `geography(Point, 4326)` columns with GiST indexes, kept in sync with their `lat`/`lang` pairs. They power nearest-officer/nearest-camera and heatmap queries.
- **Enums** — every status/type column is a PHP backed enum cast on the model (e.g. `IncidentStatus`, `CrimeStatus`, `CrimeSeverity`, `OfficerStatus`, `StorageType`).
- **Polymorphism** — `created_by`, `loggable`, `notifiable`, `tokenable`, `resettable`, and chat `sender`/`receiver` are polymorphic so a single table serves admins, stations, officers, and AI models.

<a name="incident"></a>
## Incident & Dispatch

| Table | Key columns | Notes |
|-------|-------------|-------|
| `incidents` | source, status, priority_score, priority_tier, priority_factors (json), confidence_score, camera_id, ai_model_id, police_station_id, crime_id, assigned_dispatcher_id, created_by (morph) | The review queue. Source `ai_alert`/`ai_crime`/`manual`/`citizen`; status `pending_review`/`dispatched`/`rejected_false_alarm`/`expired`. |
| `crimes` | officer_id, camera_id, incident_id, scene_id, status, severity, confidence_score, priority_score_snapshot, accepted_at, officer_arrive_time, resolved_at, response_time_minutes, escalation_count | The committed response. Status `pending`/`assigned`/`in_progress`/`not_visited`/`resolved`/`escalated`/`false_alarm`. |
| `crime_types` | name, slug, severity_weight | Seeded catalogue + the per-type weight used by the priority engine. |
| `incident_links` | incident_a_id, incident_b_id, link_type | Dispatcher-drawn links between related incidents. |
| `pattern_alerts` | station_id, rule_key, geohash, incident_ids (jsonb), status | Output of cross-incident pattern detection (e.g. weapon clusters). |

<a name="cameras"></a>
## Cameras & AI Detection

| Table | Key columns | Notes |
|-------|-------------|-------|
| `cameras` | police_station_id, name, ip_address, gateway_stream_key, encrypted credentials, stream_path (json), storage_type, coverage_* , lat/lang, `location` (PostGIS), is_active, last_seen_at | The device. |
| `camera_ai_model` | camera_id, ai_model_id | Assignment pivot (unique pair). |
| `ai_models` | name, email, ip_address, encryption_key, signing_secret (encrypted), is_active, last_heartbeat_at | The detection service identity. |
| `camera_detection_filters` | camera_id, crime_type_id, min_confidence, is_enabled | Per-camera detection thresholds. |
| `camera_tamper_events` | camera_id, signal_type, status, started_at, ended_at, detection_metric, sample_frame_path, acknowledged_by_admin_id | Tamper signals (`blackout`/`variance_collapse`/`fov_shift`/`static_stream`/`heartbeat_gap`). |
| `ai_detection_logs` | camera_id, crime_type_id, ai_model_id, confidence, decision, detected_at | Every detection + the filter decision — feeds model analytics. |

<a name="officers"></a>
## Officers & Field Ops

| Table | Key columns | Notes |
|-------|-------------|-------|
| `officers` | police_station_id, name, email, rank, badge_number, status, is_on_shift, encryption_key, `current_location` (PostGIS) | The responder. |
| `officer_shifts` | officer_id, shift_start, shift_end, patrol_polygon (json), zone_name, is_active | Shift windows + patrol zones. |
| `officer_status_logs` | officer_id, status, reason, started_at, ended_at | Status-change accountability. |
| `officer_activity_logs` | officer_id, date, encoded_route, total_distance_km, location_updates_count | Daily polyline-encoded patrol history. |
| `panic_events` | officer_id, station_id, lat, lng, status, started_at, ended_at, audio_recording_path | Officer-safety SOS. |
| `bolos` | police_station_id, subject_type, description, photo_path, area_lat/lng, radius_meters, severity, expires_at, is_active, created_by (morph) | Be-On-the-Look-Out broadcasts. |

<a name="stations"></a>
## Stations, Users & Admins

| Table | Key columns | Notes |
|-------|-------------|-------|
| `police_stations` | name, email, phone, address, city, governorate, latitude, longitude, must_change_password | The tenant + institutional login. |
| `station_users` | police_station_id, name, email, is_active, last_login_at, created_by_police_station_id | Individual dispatchers within a station. |
| `admins` | name, email, phone | System administrators. |
| `admin_station` | admin_id, police_station_id | Optional admin→station scoping. |

<a name="citizen"></a>
## Citizen Engagement

| Table | Key columns | Notes |
|-------|-------------|-------|
| `citizen_tips` | station_id, source, sender_identifier, message, media_paths (jsonb), lat/lng, reported_address, status, promoted_incident_id, reviewed_by_station_user_id, expires_at | Public intake + triage. Status `pending`/`in_review`/`promoted`/`dismissed`/`expired`. |

<a name="evidence"></a>
## Evidence & Media

| Table | Key columns | Notes |
|-------|-------------|-------|
| `scenses` | crime_id, sence_path, start_date, end_date | Extracted camera evidence clip per crime. |
| `body_cam_uploads` | crime_id, officer_id, media_path, duration_seconds, file_size_bytes, mime_type | Officer body-cam footage. |

<a name="comms"></a>
## Communications

| Table | Key columns | Notes |
|-------|-------------|-------|
| `chat_messages` | conversation_key, sender (morph), receiver (morph), message, media_path, message_type, media_type, is_read | Hierarchical chat (`text`/`image`/`voice`/`quick_reply`). |
| `notifications` | (uuid) type, notifiable (morph), data, notification_type, is_read | Laravel database notifications. |
| `firebase_tokens` | token, tokenable (morph), device_type | FCM device registration. |

<a name="audit"></a>
## Audit & Ledger

| Table | Key columns | Notes |
|-------|-------------|-------|
| `ledger_entries` | event_type, subject (type/id), actor (type/id), payload (jsonb), previous_hash, hash, recorded_at | **Append-only, hash-chained** decision ledger; immutability enforced at the DB level and verified by `ledger:verify`. |
| `activity_logs` | loggable (morph), action, description, properties (json), ip_address | General audit trail. |

<a name="config"></a>
## Configuration

| Table | Key columns | Notes |
|-------|-------------|-------|
| `settings` | key, value, group | Key/value system config, Redis-cached. |
| `password_reset_codes` | resettable (morph), code, token, is_verified, expires_at | Multi-guard password-reset codes. |

> {info} The relationships above form the spine: `Camera → Incident → Crime → Officer`, with `Scene`/`BodyCamUpload` hanging off the crime, `CitizenTip`/`PatternAlert` feeding the incident queue, and `LedgerEntry`/`ActivityLog` recording every consequential step.

> {warning} The current `incidents` table does not persist the AI report's `start_time` and `end_time`. Also, persisted priority factors use the key `weapon`, while one pattern-detection path currently reads `weapon_detected`.

Continue to the [API Reference](/{{route}}/{{version}}/api).
