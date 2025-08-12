# DevOps AI Codespace Demo

This repository provides a GitHub Codespace with:
- Jenkins in Docker (if Docker is available in the Codespace)
- A lightweight Python Jira mock on port 3000
- A Flask dashboard on port 5005
- Scripts to create a Jenkins job, file a Jira ticket, and simulate a multi-agent flow

## Quick start
1. Open in GitHub Codespaces and wait for setup.
2. If using Jenkins:
   - Create a Jenkins API token in the UI.
   - Export:
     ```bash
     export JENKINS_USER=admin
     export JENKINS_TOKEN=YOUR_API_TOKEN
     ```
   - Create the job:
     ```bash
     python3 scripts/create-jenkins-job.py
     ```
3. Open the dashboard: http://localhost:5005
4. Create a Jira ticket:
   ```bash
   python3 scripts/create-fjira-ticket.py