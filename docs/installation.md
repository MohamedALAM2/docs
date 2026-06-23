# Installation & Setup

---

This page gets CrimeLens running locally — the Laravel application, its services, and the Python camera gateway.

- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Environment](#environment)
- [Running in Development](#dev)
- [The Camera Gateway](#gateway)
- [Production Notes](#production)

<a name="requirements"></a>
## Requirements

| Component | Version / Notes |
|-----------|-----------------|
| PHP | 8.4 (with `pdo_pgsql`, `redis`, `gd`, `openssl`) |
| Composer | 2.x |
| Node.js | 20+ (Vite 7, React 19) |
| PostgreSQL | 14+ with the **PostGIS** extension |
| Redis | 6+ (cache, queues, presence, GPS) |
| FFmpeg | required by the gateway & scene extraction |
| Python | 3.10+ for the camera gateway (Flask, pytapo) |

External services (optional for a basic demo): a **Pusher** app (or compatible), **Firebase** credentials for FCM, and a **Twilio** number for SMS tips.

<a name="quick-start"></a>
## Quick Start

```bash
git clone <repo> && cd final-project

# One-shot bootstrap (install, env, key, migrate, npm, build)
composer run setup
```

`composer run setup` runs: `composer install` → copy `.env` → `key:generate` → `migrate --force` → `npm install` → `npm run build`.

Then seed demo data and create the queue/dashboard:

```bash
php artisan migrate --seed     # demo stations, officers, cameras, crimes, incidents
php artisan horizon            # start the queue workers
```

<a name="environment"></a>
## Environment

Key `.env` values:

```ini
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=pgsql
DB_DATABASE=crimelens

QUEUE_CONNECTION=redis
CACHE_STORE=redis

BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=...
PUSHER_APP_KEY=...
PUSHER_APP_SECRET=...
PUSHER_APP_CLUSTER=eu

# Camera gateway
CAMERA_GATEWAY_API_BASE_URL=http://127.0.0.1:5555
CAMERA_GATEWAY_SHARED_SECRET=...

# Optional integrations
FIREBASE_CREDENTIALS=...
TWILIO_SID=...   TWILIO_TOKEN=...
```

> {warning} `BROADCAST_CONNECTION` and `QUEUE_CONNECTION` are set to `null`/`sync` in the test environment so the suite never makes live network calls.

<a name="dev"></a>
## Running in Development

A single command runs the whole local stack:

```bash
composer run dev
```

This boots the gateway streams and runs, concurrently: the PHP server, the queue listener, the Pail log tail, the Vite dev server, and the scheduler — colour-coded under one process. Visit:

- `http://127.0.0.1:8000/admin` — admin console
- `http://127.0.0.1:8000/station` — dispatcher console
- `http://127.0.0.1:8000/docs` — this documentation
- `http://127.0.0.1:8000/horizon` — queue dashboard
- `http://127.0.0.1:8000/telescope` — request/debug telemetry

<a name="gateway"></a>
## The Camera Gateway

The Python gateway (`Modules/Gateway/tapo_server.py`) is a persistent Flask service that pools `pytapo` connections and fans each camera's RTSP into HLS (and, with MediaMTX, RTSP/WebRTC). Run it alongside Laravel:

```bash
GATEWAY_BIND_PORT=5555 \
CAMERA_GATEWAY_SHARED_SECRET=<same as .env> \
python Modules/Gateway/tapo_server.py
```

Then `php artisan camera:gateway:boot` (also run by `composer run dev` and the scheduler) registers and starts streams for all active cameras. See [Cameras & Streaming](/{{route}}/{{version}}/cameras) for the full pipeline.

<a name="production"></a>
## Production Notes

- Serve PHP-FPM 8.4 behind Nginx; run **Horizon** as a supervised process and the **scheduler** via a one-minute cron (`schedule:run`).
- Run the gateway (and MediaMTX, for WebRTC) on a host with FFmpeg and network reach to the cameras.
- Use Redis for cache/queue/session; PostgreSQL + PostGIS for the system of record.
- Build assets with `npm run build` (and `build:ssr` if using SSR).

Continue to the [Glossary](/{{route}}/{{version}}/glossary).
