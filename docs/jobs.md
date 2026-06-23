# Background Jobs & Scheduling

---

Anything slow, periodic, or fan-out runs off the request cycle on **Redis queues under Laravel Horizon**. This keeps the dispatcher console snappy and the API responsive.

- [Queue Topology](#topology)
- [Queued Jobs](#jobs)
- [Scheduled Tasks](#schedule)
- [Why Queue These](#why)

<a name="topology"></a>
## Queue Topology

Horizon runs several supervisors, each watching a purpose-named queue so heavy work can't starve latency-sensitive work:

| Queue | Carries |
|-------|---------|
| `default` | General jobs. |
| `notifications` | FCM / database notifications. |
| `broadcasts`, `fcm` | Real-time broadcasts and push. |
| `incidents` | Incident-pipeline jobs (auto-dispatch). |
| `scenes` | Evidence extraction (heavy ffmpeg). |
| `camera-alarms` | Camera alarm triggering. |
| `reports` | PDF/Excel generation. |
| `health` | Camera/model health checks. |
| `maintenance` | Cleanup & purges. |

<a name="jobs"></a>
## Queued Jobs

| Job | Purpose |
|-----|---------|
| `MaybeAutoDispatchIncident` | Evaluate the auto-dispatch policy for a new incident. |
| `ExtractCrimeScene` | Cut/merge evidence video for a confirmed crime (`scenes`). |
| `TriggerCameraAlarmJob` | Fire a camera alarm (`camera-alarms`). |
| `SyncCameraGatewayStreamJob` / `SyncCameraPrivacyJob` / `SyncCameraRecordingJob` | Keep the streaming gateway in sync with camera state. |
| `CheckCameraHealth` | Ping a camera and update its status. |
| `NotifyNearbyOfficersForBackup` | Fan a panic event out to nearby officers. |
| `EscalateStationCrimesJob` | Reassign stale crimes for a station. |
| `ReleaseStaleDispatcherAssignmentsJob` | Return stale claims to the shared queue. |
| `GeocodeCitizenTipJob` | Reverse-geocode a citizen tip. |
| `SendTwilioReplyJob` | Send an SMS reply to a tipster. |
| `PurgeExpiredCitizenTipsJob` | Delete expired tips and media. |
| `ProcessDailyOfficerRoutes` | Encode each officer's daily GPS trail (polyline). |
| `TranscribeChatVoice` | Transcribe an officer voice note. |
| `GenerateReport` / `GenerateDailyReportJob` | Build analytics reports. |
| `ProcessExcelImport` / `ImportPoliceStationsJob` / `ImportAiModelsJob` | Bulk imports. |
| `ExportPoliceStationsJob` / `ExportAiModelsJob` | Bulk exports. |
| `CleanupOldRecordings` | Delete aged recording segments and evidence (`maintenance`). |

<a name="schedule"></a>
## Scheduled Tasks

| Cadence | Task | Purpose |
|---------|------|---------|
| Every second | `camera:health-check` | Near-real-time camera liveness. |
| Every second | `model:check-heartbeats` | Flag AI models that stopped pinging. |
| Every minute | `ReleaseStaleDispatcherAssignmentsJob` | Self-heal stuck claims. |
| Every 2 min | `camera:gateway:boot` | Re-establish gateway streams. |
| Every 5 min | `horizon:snapshot` | Queue metrics. |
| Daily 00:05 | `ProcessDailyOfficerRoutes` | Yesterday's patrol routes. |
| Daily 02:00 | `ledger:verify` | Verify the decision-ledger hash chain. |
| Daily 03:00 | `camera:cleanup-recordings`, `PurgeExpiredCitizenTipsJob` | Storage hygiene. |
| Daily 06:00 | `GenerateDailyReportJob` | Daily crime summary. |
| Daily | `telescope:prune` | Trim debug telemetry. |

> {warning} `EscalationService`, `EscalateStationCrimesJob`, and the `crime:escalate-stale` command exist, but the command is not currently registered in the scheduler. The every-minute scheduled task releases stale dispatcher claims; it does not escalate stale Crime assignments.

<a name="why"></a>
## Why Queue These

Three reasons recur:

1. **Latency** — ffmpeg evidence extraction can take tens of seconds; it must never block a dispatch.
2. **Fan-out** — one panic event notifies many officers; one crime broadcasts to multiple channels.
3. **External I/O** — Twilio, Firebase, the camera gateway, and geocoding are network calls with their own failure modes, so they run with retries/backoff off the request path.

Continue to [Testing](/{{route}}/{{version}}/testing).
