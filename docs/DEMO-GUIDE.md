# CI/CD Demo Environment Guide

This GitHub Codespace provides a complete CI/CD demonstration environment with Jenkins, JIRA integration, and a sample TODO application.

## 🚀 Quick Start

When the Codespace starts, all services will be automatically configured and started:

1. **TODO App** - http://localhost:4000
   - Simple todo application for demonstration
   - Built with Node.js/Express and vanilla JavaScript
   
2. **Jenkins** - http://localhost:8080
   - CI/CD pipeline automation
   - Pre-configured job: `todo-app-demo-pipeline`
   - Default credentials: admin/admin (may need initial setup)
   
3. **JIRA Mock** - http://localhost:3000/api/issues
   - Mock JIRA API with sample tickets
   - RESTful API for issue management
   
4. **DevOps Dashboard** - http://localhost:5005
   - Overview of all services and their status
   - Integration with Jenkins and JIRA

## 📋 Demo Scenarios

### 1. Basic TODO App Usage
- Visit http://localhost:4000
- Add, edit, and complete TODO items
- Demonstrates a simple web application ready for CI/CD

### 2. Jenkins CI/CD Pipeline
- Access Jenkins at http://localhost:8080
- Navigate to `todo-app-demo-pipeline` job
- Click "Build Now" to trigger the pipeline
- Pipeline includes: checkout, setup, lint, test, build, package, integration test, deploy

### 3. JIRA Integration
- View sample tickets: `curl http://localhost:3000/api/issues`
- Jenkins pipeline automatically creates JIRA tickets for:
  - Successful builds
  - Failed builds
  - Deployment notifications

### 4. DevOps Dashboard
- Visit http://localhost:5005
- Monitor overall system health
- View Jenkins build status
- Browse JIRA issues

## 🛠️ Sample JIRA Tickets

The environment comes with pre-configured sample tickets:

1. **DEMO-1**: Add user authentication to TODO app (Story, Medium Priority)
2. **DEMO-2**: Fix TODO items not saving properly (Bug, High Priority)  
3. **DEMO-3**: Improve TODO app UI/UX design (Improvement, Low Priority)

## 🔧 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   TODO App      │    │    Jenkins      │    │   JIRA Mock     │
│   Port: 4000    │    │   Port: 8080    │    │   Port: 3000    │
│                 │    │                 │    │                 │
│ • Node.js/Express │  │ • Pipeline Jobs │    │ • REST API      │
│ • REST API      │    │ • Build/Test    │    │ • Sample Tickets│  
│ • Web UI        │    │ • Deploy        │    │ • Webhooks      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Dashboard     │
                    │   Port: 5005    │
                    │                 │
                    │ • Status Monitor│
                    │ • Integration   │
                    │ • Reporting     │
                    └─────────────────┘
```

## 📝 Files Structure

```
/
├── app/                    # TODO demo application
│   ├── package.json       # Node.js dependencies
│   ├── server.js          # Express server
│   ├── server.test.js     # Unit tests
│   └── public/
│       └── index.html     # Frontend UI
├── jenkins/
│   └── jenkins-job-config.xml  # Jenkins job configuration
├── scripts/
│   ├── setup-services.sh      # Main setup script
│   ├── setup-jenkins-job.sh   # Jenkins job creation
│   └── jira_mock.py           # JIRA API mock server
├── dashboard/
│   └── app.py             # DevOps dashboard
├── Jenkinsfile            # Pipeline as code
└── devcontainer.json      # Codespace configuration
```

## 🔄 Running the Demo

### Full Reset
```bash
bash scripts/setup-services.sh
```

### Individual Services
```bash
# Start JIRA mock
python3 scripts/jira_mock.py

# Start TODO app
cd app && npm start

# Start dashboard
python3 dashboard/app.py

# Setup Jenkins job
bash scripts/setup-jenkins-job.sh
```

### Testing the Pipeline
```bash
# Trigger Jenkins build via CLI
curl -X POST http://localhost:8080/job/todo-app-demo-pipeline/build

# Check build status
curl http://localhost:8080/job/todo-app-demo-pipeline/api/json
```

## 🎯 Use Cases

This environment is perfect for demonstrating:

- **CI/CD Pipeline Setup** - Complete pipeline from code to deployment
- **Issue Tracking Integration** - Automatic JIRA ticket creation
- **Multi-Service Architecture** - Microservices communication patterns  
- **DevOps Best Practices** - Automated testing, building, and deployment
- **Monitoring & Dashboards** - Service health and status monitoring

## 🔍 Troubleshooting

### Services Not Starting
```bash
# Check logs
tail -f /tmp/jira_mock.log
tail -f /tmp/todo-app.log
tail -f /tmp/dashboard.log

# Check ports
lsof -i :3000,4000,5005,8080
```

### Jenkins Issues
- Initial admin password: `docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword`
- Skip plugin installation for faster setup
- Job creation may fail on first run - retry after Jenkins is fully initialized

### API Testing
```bash
# Test JIRA API
curl -s http://localhost:3000/api/issues | jq .

# Test TODO API  
curl -s http://localhost:4000/api/todos | jq .
curl -X POST http://localhost:4000/api/todos -H "Content-Type: application/json" -d '{"text":"Demo todo"}'

# Health checks
curl http://localhost:4000/health
```

## 🎓 Learning Resources

This demo environment covers:
- Docker containerization  
- Jenkins pipeline configuration
- REST API development
- Web application architecture
- Issue tracking integration
- Automated testing strategies
- DevOps monitoring practices