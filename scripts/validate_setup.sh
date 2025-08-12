#!/usr/bin/env bash
set -euo pipefail

fail() { echo "[validate] $1"; exit 1; }
ok()   { echo "[validate] $1"; }

# venv + deps
[[ -d ".venv" ]] || fail "Python venv (.venv) not found"
# shellcheck disable=SC1091
source .venv/bin/activate
python -c "import requests, flask" || fail "Python packages 'requests' and 'flask' missing"

# Jenkins (optional if Docker available)
if docker info >/dev/null 2>&1; then
  docker ps --format '{{.Names}}' | grep -q '^jenkins$' || fail "Jenkins container not running"
  curl -sSf http://localhost:8080/login >/dev/null || fail "Jenkins UI not reachable on :8080"
  ok "Jenkins reachable"
else
  echo "[validate] Docker not available; skipping Jenkins checks"
fi

# Jira mock
curl -sSf http://localhost:3000/api/issues >/dev/null || fail "Jira mock API not responding on :3000"

# Dashboard
curl -sSf http://localhost:5005 >/dev/null || fail "Dashboard not responding on :5005"

ok "All checks passed."