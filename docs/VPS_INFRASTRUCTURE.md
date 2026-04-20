# Studio VPS Infrastructure

> Единый сервер для всех проектов студии. PostgreSQL, S3 storage, reverse proxy.

## Server Details

| | |
|---|---|
| **Provider** | Hosting Ukraine (adm.tools) |
| **VPS ID** | 56624 |
| **IP** | 173.242.60.76 |
| **OS** | Ubuntu 24.04 LTS |
| **CPU** | 1 core |
| **RAM** | 2 GB |
| **Disk** | 20 GB NVMe |
| **Panel** | https://adm.tools/vps/56624/ |
| **Expires** | 2026-05-10 (renew!) |

## SSH Access

```bash
ssh root@173.242.60.76
```

- SSH key: `~/.ssh/id_ed25519` (ed25519, generated 2026-04-10)
- Key fingerprint: `SHA256:LxVjwRodLyedB+9MH1ewFu11LYVG62MkPpzjs+meeJ4`
- SSH key-based auth enabled, password auth also available via panel

## Services

All services run via Docker Compose in `/opt/studio/`.

| Service | Container | Port | URL |
|---------|-----------|------|-----|
| **PostgreSQL 16** (pgvector) | studio-postgres | 5432 | `postgres://studio:***@173.242.60.76:5432/` |
| **MinIO** (S3 storage) | studio-minio | 9000 (API), 9001 (console) | http://173.242.60.76:9001 |
| **pgAdmin 4** | studio-pgadmin | 8080 | http://173.242.60.76:8080 |
| **Caddy** (reverse proxy) | studio-caddy | 80, 443 | http://173.242.60.76 |

## Credentials

### PostgreSQL
```
Host:     173.242.60.76
Port:     5432
User:     studio
Password: EAfQuTx55t8wl0yICHb4Rp6z1LvSxJav
```

### Connection strings per project
```
# PulseFactory
postgresql://studio:EAfQuTx55t8wl0yICHb4Rp6z1LvSxJav@173.242.60.76:5432/pulse_db

# Nexy
postgresql://studio:EAfQuTx55t8wl0yICHb4Rp6z1LvSxJav@173.242.60.76:5432/nexy_db

# CourseForge
postgresql://studio:EAfQuTx55t8wl0yICHb4Rp6z1LvSxJav@173.242.60.76:5432/courseforge_db

# StayRadar
postgresql://studio:EAfQuTx55t8wl0yICHb4Rp6z1LvSxJav@173.242.60.76:5432/stayradar_db
```

### MinIO (S3-compatible storage)
```
Endpoint: http://173.242.60.76:9000
Console:  http://173.242.60.76:9001
User:     admin
Password: JxX9ml-3coRzS501ZdddT25xykItNj1X
```

### pgAdmin
```
URL:      http://173.242.60.76:8080
Email:    alex@skill.im
Password: o0AhTpKo6dPQfgk-9R0WEQ
```

## Databases

| Database | Project | pgvector | Notes |
|----------|---------|----------|-------|
| `pulse_db` | PulseFactory | enabled | 57 tables + auth_tokens, embeddings ✅ migrated |
| `nexy_db` | Nexy | enabled | profiles, scenes |
| `courseforge_db` | CourseForge | enabled | courses, personas |
| `stayradar_db` | StayRadar | enabled | listings, analyses |
| `studio` | default/shared | enabled | - |

## Backups

- **Schedule:** Daily at 3:00 AM UTC via cron
- **Script:** `/opt/studio/scripts/backup.sh`
- **Location:** `/opt/studio/backups/daily/`
- **Retention:** 7 days (auto-rotate)
- **Format:** `pg_dumpall_YYYYMMDD_HHMMSS.sql.gz`

### Manual backup
```bash
/opt/studio/scripts/backup.sh
```

### Restore from backup
```bash
gunzip -c /opt/studio/backups/daily/pg_dumpall_XXXXXXXX_XXXXXX.sql.gz | docker exec -i studio-postgres psql -U studio
```

## Firewall (UFW)

Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 5432 (PostgreSQL)

```bash
ufw status          # check rules
ufw allow 3000/tcp  # open new port
```

## Common Operations

### Add a new project database
```bash
docker exec studio-postgres createdb -U studio new_project_db
docker exec studio-postgres psql -U studio -d new_project_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Update all services
```bash
cd /opt/studio
docker compose pull
docker compose up -d
```

### View logs
```bash
docker logs studio-postgres --tail 50
docker logs studio-minio --tail 50
docker logs studio-caddy --tail 50
```

### Restart a service
```bash
docker restart studio-postgres
```

### Check resource usage
```bash
docker stats --no-stream
free -h
df -h
```

## Add a website

1. Put static files in `/opt/studio/sites/yourdomain.com/`
2. Edit `/opt/studio/caddy/Caddyfile`:
```
yourdomain.com {
    root * /srv/sites/yourdomain.com
    file_server
}
```
3. Restart Caddy:
```bash
docker restart studio-caddy
```
Caddy auto-provisions SSL via Let's Encrypt.

## Migration from Supabase

Per project:
1. Export from Supabase: `pg_dump` via Supabase CLI or dashboard
2. Import to VPS: `docker exec -i studio-postgres psql -U studio -d project_db < dump.sql`
3. Update `DATABASE_URL` in project env
4. For Nexy: create MinIO bucket, update storage config to point to MinIO
5. Auth: keep Supabase Free for Auth (Nexy, PF Dashboard), or migrate to Better Auth

## File Structure

```
/opt/studio/
├── docker-compose.yml
├── .env                      # credentials (DO NOT COMMIT)
├── init-databases.sql        # initial DB setup
├── caddy/
│   └── Caddyfile
├── data/                     # Docker volumes (auto-managed)
├── backups/
│   └── daily/                # pg_dump files
├── sites/                    # static websites
└── scripts/
    └── backup.sh
```

## Security

- SSH key auth enabled (ed25519)
- UFW firewall active (22, 80, 443, 5432)
- fail2ban installed (brute-force protection)
- All service passwords are random 24+ char tokens
- PostgreSQL exposed on 5432 — restrict to known IPs if needed:
  ```bash
  ufw delete allow 5432/tcp
  ufw allow from YOUR_IP to any port 5432
  ```
