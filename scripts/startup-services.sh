#!/bin/bash

# startup-services.sh - Auto-restart services on codespace resume
set -e

echo "🚀 DevOps AI Demo - Auto Service Startup"
echo "========================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Navigate to project root
cd "$PROJECT_ROOT"

# Check if we're in the right directory
if [ ! -f "scripts/setup-services.sh" ]; then
    # Try codespace path
    if [ -d "/workspaces/devops-ex2" ]; then
        cd /workspaces/devops-ex2
    else
        echo "❌ Error: Cannot find project root directory"
        exit 1
    fi
fi

# Give the system a moment to stabilize after restart
echo "⏳ Waiting for system to stabilize..."
sleep 3

# Check if initial setup was completed
if [ ! -d ".venv" ] || [ ! -d "app/node_modules" ]; then
    echo "⚠️  Initial setup incomplete. Running quick dependency check..."
    
    # Ensure Python virtual environment
    if [ ! -d ".venv" ]; then
        echo "📦 Creating Python virtual environment..."
        python3 -m venv .venv
        source .venv/bin/activate
        pip install -r requirements/requirements.txt > /dev/null 2>&1
    fi
    
    # Ensure Node.js dependencies  
    if [ ! -d "app/node_modules" ]; then
        echo "📦 Installing Node.js dependencies..."
        cd app && npm install > /dev/null 2>&1 && cd ..
    fi
fi

# Use the service manager to start services
echo "🔧 Starting services using service manager..."
bash scripts/service-manager.sh start

echo ""
echo "✅ Auto-startup complete!"
echo ""
echo "💡 Service Management Commands:"
echo "   scripts/service-manager.sh status   - Check service status"
echo "   scripts/service-manager.sh restart  - Restart all services"
echo "   scripts/service-manager.sh logs     - View service logs"
echo ""