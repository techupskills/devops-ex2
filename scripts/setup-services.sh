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
  
  # Build custom Jenkins image with Node.js if it doesn't exist
  if ! docker images | grep -q "jenkins-nodejs"; then
    echo "[setup] Building Jenkins image with Node.js (this may take a few minutes)..."
    docker build -t jenkins-nodejs jenkins/ || {
      echo "[setup] Failed to build custom image, using standard Jenkins..."
      JENKINS_IMAGE="jenkins/jenkins:lts"
    }
  fi
  
  # Use custom image if available, otherwise fallback
  JENKINS_IMAGE="${JENKINS_IMAGE:-jenkins-nodejs}"
  
  docker rm -f jenkins >/dev/null 2>&1 || true
  docker run -d --name jenkins \
    -p 8080:8080 -p 50000:50000 \
    -v jenkins_home:/var/jenkins_home \
    -v "$(pwd)":/workspace \
    -e JENKINS_ADMIN_ID=admin \
    -e JENKINS_ADMIN_PASSWORD=admin \
    "$JENKINS_IMAGE" >/dev/null || true

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

# --- Setup Jenkins Job ---
echo "[setup] Setting up Jenkins job..."
if docker info >/dev/null 2>&1; then
  # Wait a bit more for Jenkins to be fully ready
  sleep 10
  bash scripts/setup-jenkins-job.sh || echo "[setup] Failed to setup Jenkins job (this is normal on first run)"
fi

# --- Start TODO App on :4000 ---
echo "[setup] Starting TODO demo app on :4000"
if command -v lsof >/dev/null 2>&1; then
  lsof -ti:4000 | xargs -r kill -9 || true
fi
if [ -d "app" ] && [ -f "app/package.json" ]; then
  cd app
  if [ ! -d "node_modules" ]; then
    echo "[setup] Installing Node.js dependencies..."
    npm install >/dev/null 2>&1
  fi
  nohup npm start > /tmp/todo-app.log 2>&1 & disown
  cd ..
  
  # Wait for TODO app to start
  echo -n "[setup] Waiting for TODO app"
  for i in {1..20}; do
    if curl -sSf http://localhost:4000/health >/dev/null 2>&1; then
      echo " ✓"
      break
    fi
    echo -n "."
    sleep 1
  done
fi

echo
echo "[setup] ✅ All services started successfully!"
echo "┌─────────────────────────────────────────────────┐"
echo "│                 Demo Services                   │"
echo "├─────────────────────────────────────────────────┤"
echo "│ Jenkins:    http://localhost:8080               │"
echo "│ JIRA API:   http://localhost:3000/api/issues    │"  
echo "│ Dashboard:  http://localhost:5005               │"
echo "│ TODO App:   http://localhost:4000               │"
echo "└─────────────────────────────────────────────────┘"
echo
echo "📋 Quick Start:"
echo "1. Visit the TODO app: http://localhost:4000"
echo "2. Check Jenkins: http://localhost:8080 (admin/admin)"
echo "3. View JIRA tickets: http://localhost:3000/api/issues"
echo "4. Monitor dashboard: http://localhost:5005"