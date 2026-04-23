#!/usr/bin/env bash
# ============================================================
# Nexy - one-shot VPS bootstrap
# ============================================================
# Idempotent: safe to re-run. Does the minimum to get the
# nexy-web container running next to the existing studio stack.
#
# Prerequisites on the VPS:
#   - /opt/studio/docker-compose.yml exists with studio-postgres,
#     studio-minio, caddy, `studio_default` network.
#   - DB `nexy_db` created and populated (per MIGRATION_GUIDE.md).
#   - MinIO bucket `scenes` exists with public read policy.
#
# Run as root on the VPS:
#   curl -fsSL https://raw.githubusercontent.com/Progress-One/Nexy/main/deploy/bootstrap.sh | bash
# or from a local checkout:
#   cd /opt/studio/nexy/src && bash deploy/bootstrap.sh

set -euo pipefail

# ── Config ──────────────────────────────────────────────────
REPO_URL="${REPO_URL:-https://github.com/Progress-One/Nexy.git}"
BRANCH="${BRANCH:-main}"
STUDIO_DIR="${STUDIO_DIR:-/opt/studio}"
APP_DIR="${APP_DIR:-$STUDIO_DIR/nexy}"
SRC_DIR="$APP_DIR/src"
ENV_FILE="$APP_DIR/.env"
COMPOSE_FRAGMENT="deploy/docker-compose.nexy.yml"
CADDY_FRAGMENT="deploy/Caddyfile.nexy"

log() { echo -e "\033[1;34m[bootstrap]\033[0m $*"; }
err() { echo -e "\033[1;31m[bootstrap]\033[0m $*" >&2; exit 1; }

# ── Preflight ───────────────────────────────────────────────
command -v docker >/dev/null || err "docker not installed"
command -v git    >/dev/null || err "git not installed"
[[ -f "$STUDIO_DIR/docker-compose.yml" ]] || err "studio stack missing at $STUDIO_DIR/docker-compose.yml"
docker network inspect studio_default >/dev/null 2>&1 || err "docker network 'studio_default' missing - bring studio stack up first"

# ── 1. Clone / update repo ──────────────────────────────────
mkdir -p "$APP_DIR"
if [[ -d "$SRC_DIR/.git" ]]; then
  log "updating $SRC_DIR"
  git -C "$SRC_DIR" fetch --quiet origin "$BRANCH"
  git -C "$SRC_DIR" checkout --quiet "$BRANCH"
  git -C "$SRC_DIR" reset --hard --quiet "origin/$BRANCH"
else
  log "cloning $REPO_URL -> $SRC_DIR"
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$SRC_DIR"
fi

# ── 2. Seed .env ────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  log "creating $ENV_FILE from template - EDIT IT BEFORE CONTINUING"
  cp "$SRC_DIR/deploy/.env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo ""
  echo "  Edit $ENV_FILE with real secrets, then re-run this script."
  exit 0
fi
chmod 600 "$ENV_FILE"

# ── 3. Merge compose fragment into /opt/studio/docker-compose.yml ──
MARKER_BEGIN="# >>> nexy compose (managed by bootstrap.sh) >>>"
MARKER_END="# <<< nexy compose <<<"
COMPOSE_FILE="$STUDIO_DIR/docker-compose.yml"

if grep -qF "$MARKER_BEGIN" "$COMPOSE_FILE"; then
  log "compose fragment already merged into $COMPOSE_FILE (skipping)"
else
  log "appending Nexy service to $COMPOSE_FILE"
  {
    echo ""
    echo "$MARKER_BEGIN"
    echo "# Edit via deploy/docker-compose.nexy.yml and re-run bootstrap.sh"
    cat "$SRC_DIR/$COMPOSE_FRAGMENT"
    echo "$MARKER_END"
  } >> "$COMPOSE_FILE"
fi

# ── 4. Merge Caddy fragment ────────────────────────────────
CADDY_FILE="$STUDIO_DIR/caddy/Caddyfile"
CADDY_MARKER_BEGIN="# >>> nexy caddy (managed by bootstrap.sh) >>>"
CADDY_MARKER_END="# <<< nexy caddy <<<"

if [[ -f "$CADDY_FILE" ]]; then
  if grep -qF "$CADDY_MARKER_BEGIN" "$CADDY_FILE"; then
    log "Caddy fragment already present (skipping)"
  else
    log "appending Nexy routes to $CADDY_FILE"
    {
      echo ""
      echo "$CADDY_MARKER_BEGIN"
      echo "# Edit via deploy/Caddyfile.nexy and re-run bootstrap.sh"
      cat "$SRC_DIR/$CADDY_FRAGMENT"
      echo "$CADDY_MARKER_END"
    } >> "$CADDY_FILE"
  fi
else
  log "WARN: $CADDY_FILE missing - skipping Caddy merge"
fi

# ── 5. Build image ──────────────────────────────────────────
log "building nexy-web (this takes a few minutes)"
cd "$SRC_DIR"
docker build -f deploy/Dockerfile.web -t nexy-web:latest .

# ── 6. Up services ──────────────────────────────────────────
log "starting service via $COMPOSE_FILE"
cd "$STUDIO_DIR"
docker compose up -d nexy-web

# ── 7. Reload Caddy (if running) ────────────────────────────
if docker compose ps caddy 2>/dev/null | grep -q "Up"; then
  log "reloading caddy"
  docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile || log "WARN: caddy reload failed - check Caddyfile syntax"
fi

# ── 8. Smoke ────────────────────────────────────────────────
log "smoke tests"
sleep 5
curl -fsS http://127.0.0.1:3002/api/health >/dev/null && log "  nexy-web OK" || log "  WARN: health check failed"

log "done. tail logs with:  docker compose logs -f nexy-web"
