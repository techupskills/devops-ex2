#!/usr/bin/env bash
set -euo pipefail

JENKINS_URL="http://localhost:8080"
JOB_NAME="todo-app-demo-pipeline"
CONFIG_FILE="jenkins/jenkins-job-config.xml"

echo "[Jenkins Setup] Setting up Jenkins job: ${JOB_NAME}"

# Wait for Jenkins to be ready
echo -n "[Jenkins Setup] Waiting for Jenkins to be ready"
for i in {1..60}; do
  if curl -sSf "${JENKINS_URL}/api/json" >/dev/null 2>&1; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 2
done

# Get Jenkins crumb for CSRF protection
CRUMB=$(curl -s "${JENKINS_URL}/crumbIssuer/api/xml?xpath=concat(//crumbRequestField,\":\",//crumb)" 2>/dev/null || echo "")

# Create or update the job
if [ -n "$CRUMB" ]; then
  echo "[Jenkins Setup] Creating job with CSRF protection..."
  curl -X POST "${JENKINS_URL}/createItem?name=${JOB_NAME}" \
    -H "$CRUMB" \
    -H "Content-Type: application/xml" \
    --data-binary "@${CONFIG_FILE}" \
    -s >/dev/null || {
    echo "[Jenkins Setup] Job might already exist, trying to update..."
    curl -X POST "${JENKINS_URL}/job/${JOB_NAME}/config.xml" \
      -H "$CRUMB" \
      -H "Content-Type: application/xml" \
      --data-binary "@${CONFIG_FILE}" \
      -s >/dev/null || echo "[Jenkins Setup] Failed to update job"
  }
else
  echo "[Jenkins Setup] Creating job without CSRF protection..."
  curl -X POST "${JENKINS_URL}/createItem?name=${JOB_NAME}" \
    -H "Content-Type: application/xml" \
    --data-binary "@${CONFIG_FILE}" \
    -s >/dev/null || {
    echo "[Jenkins Setup] Job might already exist, trying to update..."
    curl -X POST "${JENKINS_URL}/job/${JOB_NAME}/config.xml" \
      -H "Content-Type: application/xml" \
      --data-binary "@${CONFIG_FILE}" \
      -s >/dev/null || echo "[Jenkins Setup] Failed to update job"
  }
fi

echo "[Jenkins Setup] ✓ Jenkins job '${JOB_NAME}' configured"
echo "[Jenkins Setup] Access at: ${JENKINS_URL}/job/${JOB_NAME}"