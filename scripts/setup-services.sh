#!/usr/bin/env bash
set -e

echo "▶️ Creating Python venv..."
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip

echo "🐳 Starting Jenkins container..."
docker run -d \
  --name jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts

echo "📋 Starting FJIRA (fake JIRA) container..."
docker run -d \
  --name fjira \
  -p 3000:3000 \
  ghcr.io/atlassian-fugue/fjira:latest

echo "✅ Jenkins running at http://localhost:8080"
echo "✅ FJIRA (JIRA clone) running at http://localhost:3000"
