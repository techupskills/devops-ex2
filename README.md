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
- **JIRA Dashboard**: http://localhost:3001 ✨ *NEW*
- **DevOps Dashboard**: http://localhost:5005
- **Ollama LLM API**: http://localhost:11434 ✨ *NEW*

## ✨ New Features

### 🎯 JIRA Dashboard (http://localhost:3001)
Visual dashboard for viewing and managing JIRA issues:
- **Issue Cards**: See all issues in a clean, organized table
- **Status Tracking**: Color-coded status badges (To Do, In Progress, Done)
- **Priority Levels**: Visual priority indicators with appropriate colors
- **Statistics**: Real-time counts of total, in-progress, and completed issues
- **Create Issues**: Add new issues directly from the dashboard
- **Auto-refresh**: Updates every 30 seconds automatically

### 🤖 Enhanced RAG with LLM (Ollama)
Combines traditional vector search with LLM-powered explanations:

**Setup:**
```bash
cd rag
npm run setup-ollama    # Install Ollama + Qwen2.5 1.5B model
```

**Usage:**
```bash
# Enhanced queries with LLM explanations
npm run enhanced-query "how to create API endpoints"
npm run enhanced-query "error handling validation"

# Compare traditional vs enhanced RAG
npm run enhanced-demo

# Check Ollama status
npm run enhanced-query -- --status
```

**What's Different:**
- **Traditional RAG**: Returns raw code chunks ranked by similarity
- **Enhanced RAG**: Provides synthesized explanations connecting multiple code pieces
- **LLM Model**: Qwen2.5 1.5B (optimized for code tasks, CPU-friendly)
- **Smart Analysis**: Understands code relationships and provides context