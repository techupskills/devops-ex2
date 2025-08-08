# DevOps AI Codespace Demo

This repository provides a GitHub Codespace with Jenkins and a JIRA-like API (FJIRA), plus a Flask dashboard and automation scripts.

Quick start:
- Open in Codespaces, wait for setup.
- Create Jenkins token in UI. Then:
  export JENKINS_USER=admin
  export JENKINS_TOKEN=YOUR_API_TOKEN
- Create job:
  python3 scripts/create-jenkins-job.py
- Dashboard: http://localhost:5005
