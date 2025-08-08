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

echo "[setup] Starting Jira mock API via Mockoon (mockoon/cli:latest) on :3000"
/usr/bin/env bash -c '
  if docker ps -a --format "{{.Names}}" | grep -q "^jira-mock$"; then
    docker rm -f jira-mock >/dev/null 2>&1 || true
  fi
'
# Ensure mocks directory exists (mounted read-only into the container)
mkdir -p mocks
# Write default mock file if not present
if [ ! -f mocks/jira-mock.json ]; then
  cat > mocks/jira-mock.json << "EOF"
{
  "source": "mockoon:1.24.0",
  "data": {
    "id": "jira-mock",
    "name": "jira-mock",
    "endpointPrefix": "",
    "port": 3000,
    "routes": [
      {
        "uuid": "get-issues",
        "documentation": "List issues",
        "method": "get",
        "endpoint": "api/issues",
        "responses": [
          {
            "uuid": "get-issues-200",
            "statusCode": 200,
            "label": "OK",
            "headers": [{"key":"Content-Type","value":"application/json"}],
            "body": "[\n  {\"id\": 1, \"summary\": \"Demo issue\", \"description\": \"Seed data from mock\"}\n]"
          }
        ]
      },
      {
        "uuid": "post-issues",
        "documentation": "Create issue",
        "method": "post",
        "endpoint": "api/issues",
        "responses": [
          {
            "uuid": "post-issues-201",
            "statusCode": 201,
            "label": "Created",
            "headers": [{"key":"Content-Type","value":"application/json"}],
            "body": "{{body}}"
          }
        ]
      }
    ]
  }
}
EOF
fi

docker run -d --name jira-mock \
  -p 3000:3000 \
  -v "$(pwd)/mocks:/data:ro" \
  mockoon/cli:latest \
  -d /data/jira-mock.json \
  -p 3000 \
  --disable-logfile

echo "[setup] Waiting 12s for services to initialize"
sleep 12

echo "[setup] Starting Flask dashboard on http://localhost:5005"
cd dashboard
nohup python3 app.py > ../dashboard.log 2>&1 & disown
cd ..

echo "[setup] Done. Jenkins :8080, Jira mock :3000, Dashboard :5005"