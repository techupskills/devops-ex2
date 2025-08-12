# DevOps AI with GitHub Codespaces, Jenkins, and Jira Mock

Endpoints:
- Jenkins: http://localhost:8080
- Jira mock: http://localhost:3000
- Dashboard: http://localhost:5005

## Steps
1) Open in GitHub Codespaces (postCreate starts services).
2) Create a Jenkins API token in Jenkins UI (Manage Jenkins → Users → your user → Configure → API Token).
3) Export credentials:
   ```bash
   export JENKINS_USER=admin
   export JENKINS_TOKEN=YOUR_API_TOKEN