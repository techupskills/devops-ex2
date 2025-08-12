#!/usr/bin/env bash
set -euo pipefail

echo "[setup] Starting DevOps AI demo services..."

# --- Python venv and deps ---
if [[ ! -d ".venv" ]]; then
  echo "[setup] Creating Python venv"
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
pip install --upgrade pip >/dev/null
sed -i 's/\r$//' requirements/requirements.txt || true
pip install -r requirements/requirements.txt >/dev/null

# --- Jenkins via Docker (optional if Docker available) ---
if docker info >/dev/null 2>&1; then
  echo "[setup] Starting Jenkins container..."
  docker rm -f jenkins >/dev/null 2>&1 || true
  docker run -d --name jenkins \
    -p 8080:8080 -p 50000:50000 \
    -v jenkins_home:/var/jenkins_home \
    jenkins/jenkins:lts >/dev/null || true

  # Wait for Jenkins (best effort)
  echo -n "[setup] Waiting for Jenkins"
  for i in {1..60}; do
    if curl -sSf http://localhost:8080/login >/dev/null 2>&1; then
      echo " ✓"
      break
    fi
    echo -n "."
    sleep 2
  done
else
  echo "[setup] Docker not available; skipping Jenkins."
fi

# --- Start Jira mock (Python Flask) on :3000 ---
echo "[setup] Starting Jira mock (Python) on :3000"
# Kill anything on 3000 (best effort)
if command -v lsof >/dev/null 2>&1; then
  lsof -ti:3000 | xargs -r kill -9 || true
fi
nohup python3 scripts/jira_mock.py >/tmp/jira_mock.log 2>&1 & disown

# Wait for Jira mock
echo -n "[setup] Waiting for Jira mock"
for i in {1..30}; do
  if curl -sSf http://localhost:3000/api/issues >/dev/null 2>&1; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 1
done

# --- Start Dashboard on :5005 ---
echo "[setup] Starting Flask dashboard on :5005"
if command -v lsof >/dev/null 2>&1; then
  lsof -ti:5005 | xargs -r kill -9 || true
fi
nohup python3 dashboard/app.py > /tmp/dashboard.log 2>&1 & disown

echo
echo "[setup] All services started (where available)."
echo "Jenkins : http://localhost:8080"
echo "Jira API: http://localhost:3000/api/issues"
echo "Dashboard: http://localhost:5005"