# DevOps CI/CD Demo Environment

A complete GitHub Codespace environment demonstrating CI/CD pipelines with Jenkins, JIRA integration, and a sample TODO application.

## 🚀 Quick Start

This Codespace automatically sets up:
- **TODO Demo App** (http://localhost:4000) - Sample web application
- **Jenkins** (http://localhost:8080) - CI/CD pipeline automation  
- **JIRA Mock** (http://localhost:3000) - Issue tracking simulation
- **DevOps Dashboard** (http://localhost:5005) - Service monitoring

All services start automatically when the Codespace launches!

## 🎯 What's Included

### Sample Application
- Node.js/Express TODO app with REST API
- Frontend web interface
- Unit tests and linting
- Complete CI/CD pipeline (Jenkinsfile)

### Jenkins Pipeline
- Automated build, test, and deployment
- Integration with JIRA for issue tracking
- Pipeline-as-code with Jenkinsfile
- Pre-configured job: `todo-app-demo-pipeline`

### JIRA Integration
- Mock JIRA API with realistic sample tickets
- Automatic ticket creation for builds/deployments
- RESTful API endpoints for issue management

### Monitoring Dashboard
- Service health monitoring
- Jenkins build status integration
- JIRA ticket overview

## 📖 Documentation

See [docs/DEMO-GUIDE.md](docs/DEMO-GUIDE.md) for detailed usage instructions, architecture overview, and troubleshooting tips.

## 🔄 Auto-Restart Services

Services automatically restart when your codespace resumes! The devcontainer is configured to:
1. **Detect existing services** and restart only what's needed
2. **Quick dependency check** to ensure everything is ready  
3. **Intelligent startup** with proper service health checks

## 🛠️ Manual Service Management

If you need manual control:

```bash
# Check service status
scripts/service-manager.sh status

# Start all services
scripts/service-manager.sh start

# Stop all services  
scripts/service-manager.sh stop

# Restart all services
scripts/service-manager.sh restart

# View logs
scripts/service-manager.sh logs

# Initial setup (only needed once)
bash scripts/setup-services.sh
```

## 🌐 Service URLs

- **TODO App**: http://localhost:4000
- **Jenkins**: http://localhost:8080 (admin/admin)
- **JIRA API**: http://localhost:3000/api/issues
- **Dashboard**: http://localhost:5005