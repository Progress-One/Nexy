# Nexy - VPS deploy

> Self-hosted deployment on the shared studio VPS (`173.242.60.76`).
> Runs alongside Postgres/MinIO/Caddy in the same Docker network.

## Layout

```
Caddy :443 ──▶ nexy.life ──▶ nexy-web :3000 (Next.js standalone)
                              │
                              ├─▶ studio-postgres (nexy_db)
                              ├─▶ studio-minio (scenes bucket)
                              └─▶ external APIs (OpenAI/Anthropic/Replicate/Stripe/Resend)
```

One container, everything else on the shared studio stack.

## Prerequisites

1. **Studio stack up** (`/opt/studio/docker-compose.yml` with `studio-postgres`, `studio-minio`, `caddy`, network `studio_default`).
2. **Nexy DB migrated** - `nexy_db` exists with 29 tables + data (see `../../pulse_factory/docs/MIGRATION_GUIDE.md`).
3. **MinIO bucket** `scenes` with public read policy + 859 images already migrated.
4. **DNS A-record**: `nexy.life A 173.242.60.76` (and optionally `www.nexy.life A 173.242.60.76`).

## One-shot deploy

On the VPS as root:

```bash
curl -fsSL https://raw.githubusercontent.com/Progress-One/Nexy/main/deploy/bootstrap.sh | bash
# First run creates /opt/studio/nexy/.env from the template and exits.
# Edit that file with real secrets:
nano /opt/studio/nexy/.env
# Then re-run:
bash /opt/studio/nexy/src/deploy/bootstrap.sh
```

What bootstrap does (idempotent):

1. Clones/updates repo into `/opt/studio/nexy/src`.
2. Seeds `/opt/studio/nexy/.env` (chmod 600) from `deploy/.env.example`.
3. Appends `deploy/docker-compose.nexy.yml` into `/opt/studio/docker-compose.yml` (between managed markers).
4. Appends `deploy/Caddyfile.nexy` into `/opt/studio/caddy/Caddyfile`.
5. Builds `nexy-web` image.
6. `docker compose up -d nexy-web`.
7. Reloads Caddy.
8. `curl` health check on `/api/health`.

## Pieces

| File | Purpose |
|---|---|
| `Dockerfile.web` | Multi-stage build for Next.js 16. Emits `.next/standalone`, runs as non-root, final image ~150 MB. |
| `docker-compose.nexy.yml` | Single service bound to `127.0.0.1:3002` (Caddy publishes). Attached to external `studio_default` network. |
| `Caddyfile.nexy` | TLS termination + reverse proxy for `nexy.life` and `www.nexy.life` redirect. |
| `.env.example` | DB + JWT + MinIO + AI providers + Stripe + Resend. |
| `bootstrap.sh` | One-shot script - only thing you run on the VPS. |

## Manual ops

Rebuild after `git pull`:

```bash
cd /opt/studio/nexy/src
git pull
docker build -f deploy/Dockerfile.web -t nexy-web:latest .
cd /opt/studio
docker compose up -d nexy-web
```

Tail logs:

```bash
cd /opt/studio
docker compose logs -f --tail=100 nexy-web
```

Shell into container:

```bash
docker compose exec nexy-web sh
```

Health check:

```bash
curl http://127.0.0.1:3002/api/health
# {"ok":true,"service":"nexy-web","uptime_sec":123,"timestamp":"..."}
```

## Port allocation

`nexy-web` binds to `127.0.0.1:3002` on the host. Chosen to avoid conflict with:
- `3000` - commonly used local dev port
- `3001` - PulseFactory dashboard (if co-deployed)

Caddy uses Docker service DNS (`nexy-web:3000`) inside the network, not host port.

## Troubleshooting

- **Caddy returns 502 for nexy.life**: container hasn't passed health check yet. `docker compose logs nexy-web`. Common cause: missing env var in `/opt/studio/nexy/.env`.
- **`Module not found` during build**: `.dockerignore` missing or excluded `src/`. Check Dockerfile `COPY . ./` and `.dockerignore`.
- **`studio_default` network missing**: studio stack not up. `cd /opt/studio && docker compose up -d`.
- **Build OOM on 2 GB VPS**: temporarily add swap:
  ```bash
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  # and persist: echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```
  After build, swap can stay or be removed.
