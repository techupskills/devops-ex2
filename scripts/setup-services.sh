#!/usr/bin/env bash
set -euo pipefail

echo "[setup] Creating Python venv and installing dependencies"
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install flask requests

echo "[setup] Verifying Docker availability"
if ! docker info > /dev/null 2>&1; then
  echo "[error] Docker is not accessible in this Codespace."
  exit 1
fi

echo "[setup] Starting Jenkins container (jenkins/jenkins:lts)"
if ! docker ps -a --format '{{.Names}}' | grep -q '^jenkins$'; then
  docker run -d --name jenkins -p 8080:8080 -p 50000:50000 -v jenkins_home:/var/jenkins_home jenkins/jenkins:lts
else
  docker start jenkins || true
fi

echo "[setup] Starting FJIRA container (ghcr.io/atlassian-fugue/fjira:latest)"
if ! docker ps -a --format '{{.Names}}' | grep -q '^fjira$'; then
  docker run -d --name fjira -p 3000:3000 ghcr.io/atlassian-fugue/fjira:latest
else
  docker start fjira || true
fi

echo "[setup] Waiting 15s for services to initialize"
sleep 15

echo "[setup] Starting Flask dashboard on http://localhost:5005"
cd dashboard
nohup python3 app.py > ../dashboard.log 2>&1 & disown
cd ..

echo "[setup] Done."
