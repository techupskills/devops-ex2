#!/bin/bash

# service-manager.sh - Comprehensive service management for DevOps demo
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m' 
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[service-manager]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[service-manager]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[service-manager]${NC} $1"
}

log_error() {
    echo -e "${RED}[service-manager]${NC} $1"
}

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    local endpoint=${3:-"/"}
    
    if curl -s -f "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_wait=${3:-30}
    local endpoint=${4:-"/"}
    
    local count=0
    while [ $count -lt $max_wait ]; do
        if check_service "$service_name" $port "$endpoint"; then
            log_success "$service_name is ready on port $port"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        if [ $((count % 5)) -eq 0 ]; then
            log_info "Still waiting for $service_name... ($count/$max_wait)"
        fi
    done
    
    log_warning "$service_name may not be ready yet (timeout after ${max_wait}s)"
    return 1
}

# Function to start a service
start_service() {
    local service_name=$1
    local command=$2
    local port=$3
    local max_wait=${4:-30}
    local endpoint=${5:-"/"}
    
    log_info "Starting $service_name..."
    
    # Kill any existing process on the port
    if lsof -i :$port > /dev/null 2>&1; then
        log_warning "Port $port is in use, attempting to free it..."
        pkill -f ".*:$port" || true
        sleep 2
    fi
    
    # Start the service
    cd "$PROJECT_ROOT"
    eval "nohup $command > logs/$service_name.log 2>&1 &"
    local pid=$!
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Wait for service to be ready
    if wait_for_service "$service_name" $port $max_wait "$endpoint"; then
        log_success "$service_name started successfully (PID: $pid)"
        echo "$pid" > "logs/$service_name.pid"
        return 0
    else
        log_error "$service_name failed to start properly"
        return 1
    fi
}

# Function to stop a service
stop_service() {
    local service_name=$1
    local port=$2
    
    log_info "Stopping $service_name..."
    
    # Try to kill by PID file first
    if [ -f "logs/$service_name.pid" ]; then
        local pid=$(cat "logs/$service_name.pid")
        if kill -0 $pid 2>/dev/null; then
            kill $pid
            log_success "$service_name stopped (PID: $pid)"
        fi
        rm -f "logs/$service_name.pid"
    fi
    
    # Also kill any process using the port
    if lsof -i :$port > /dev/null 2>&1; then
        pkill -f ".*:$port" || true
        log_info "Freed port $port"
    fi
}

# Function to show service status
status_services() {
    log_info "Service Status Check:"
    echo ""
    
    local services=(
        "TODO App:4000:/"
        "JIRA Mock:3000:/api/issues"
        "DevOps Dashboard:5005:/"
        "Jenkins:8080:/login"
    )
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r name port endpoint <<< "$service_info"
        if check_service "$name" $port "$endpoint"; then
            echo -e "  ✅ $name - http://localhost:$port"
        else
            echo -e "  ❌ $name - not running"
        fi
    done
    echo ""
}

# Main command handling
case "${1:-status}" in
    "start")
        log_info "Starting all DevOps demo services..."
        
        # Ensure dependencies are ready
        cd "$PROJECT_ROOT"
        
        # Start TODO App
        if ! check_service "TODO App" 4000; then
            if [ -d "app/node_modules" ]; then
                start_service "TODO App" "cd app && npm start" 4000 30
            else
                log_warning "TODO App dependencies not found. Run setup first."
            fi
        else
            log_success "TODO App already running"
        fi
        
        # Start JIRA Mock
        if ! check_service "JIRA Mock" 3000 "/api/issues"; then
            if [ -d ".venv" ]; then
                start_service "JIRA Mock" "source .venv/bin/activate && python scripts/jira_mock.py" 3000 15 "/api/issues"
            else
                log_warning "Python environment not found. Run setup first."
            fi
        else
            log_success "JIRA Mock already running"
        fi
        
        # Start DevOps Dashboard
        if ! check_service "DevOps Dashboard" 5005; then
            if [ -d ".venv" ]; then
                start_service "DevOps Dashboard" "source .venv/bin/activate && cd dashboard && python app.py" 5005 15
            else
                log_warning "Python environment not found. Run setup first."
            fi
        else
            log_success "DevOps Dashboard already running"
        fi
        
        log_success "Service startup complete!"
        status_services
        ;;
        
    "stop")
        log_info "Stopping all services..."
        stop_service "TODO App" 4000
        stop_service "JIRA Mock" 3000
        stop_service "DevOps Dashboard" 5005
        log_success "All services stopped"
        ;;
        
    "restart")
        "$0" stop
        sleep 2
        "$0" start
        ;;
        
    "status")
        status_services
        ;;
        
    "logs")
        local service=${2:-"all"}
        if [ "$service" = "all" ]; then
            log_info "Recent logs from all services:"
            for logfile in logs/*.log; do
                if [ -f "$logfile" ]; then
                    echo -e "\n${BLUE}=== $(basename "$logfile") ===${NC}"
                    tail -n 10 "$logfile"
                fi
            done
        else
            if [ -f "logs/$service.log" ]; then
                tail -f "logs/$service.log"
            else
                log_error "Log file for $service not found"
            fi
        fi
        ;;
        
    *)
        echo "Usage: $0 {start|stop|restart|status|logs [service_name]}"
        echo ""
        echo "Commands:"
        echo "  start    - Start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  status   - Show service status"
        echo "  logs     - Show logs (optionally for specific service)"
        exit 1
        ;;
esac