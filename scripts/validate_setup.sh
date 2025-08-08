#!/usr/bin/env bash
set -euo pipefail
echo "[validate] Python venv"; [[ -d ".venv" ]] || { echo "missing .venv"; exit 1; }
source .venv/bin/activate
python -c "import flask, requests" || { echo "missing flask/requests"; exit 1; }
echo "[validate] Docker"; docker info >/dev/null 2>&1 || { echo "docker not available"; exit 1; }
echo "[validate] Jenkins container"; docker ps --format '{{.Names}}' | grep -q '^jenkins$' || { echo "jenkins not running"; exit 1; }
echo "[validate] FJIRA container"; docker ps --format '{{.Names}}' | grep -q '^fjira$' || { echo "fjira not running"; exit 1; }
echo "[validate] Dashboard"; curl -sSf http://localhost:5005 >/dev/null || { echo "dashboard not responding"; exit 1; }
echo "[validate] OK"
