pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
        APP_NAME = 'todo-app-demo'
        JIRA_URL = 'http://localhost:3000'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code...'
                // In real scenario, this would checkout from SCM
                script {
                    env.BUILD_VERSION = "1.0.${BUILD_NUMBER}"
                    env.JIRA_TICKET = "DEMO-${BUILD_NUMBER}"
                }
            }
        }
        
        stage('Setup') {
            steps {
                echo 'Setting up Node.js environment...'
                sh '''
                    echo "Node version: $(node --version)"
                    echo "NPM version: $(npm --version)"
                    echo "Current directory: $(pwd)"
                    echo "Directory contents: $(ls -la)"
                    
                    # Check if we're in workspace or need to navigate
                    if [ -d "/workspace/app" ]; then
                        echo "Using workspace mount"
                        cd /workspace/app
                    elif [ -d "app" ]; then
                        echo "Using current directory"
                        cd app
                    else
                        echo "Looking for app directory..."
                        find . -name "app" -type d | head -1
                        cd "$(find . -name "app" -type d | head -1)"
                    fi
                    
                    echo "Installing dependencies in: $(pwd)"
                    npm install
                '''
            }
        }
        
        stage('Lint') {
            steps {
                echo 'Running linting...'
                sh '''
                    cd /workspace/app 2>/dev/null || cd app
                    npm run lint
                '''
            }
        }
        
        stage('Test') {
            steps {
                echo 'Running tests...'
                sh '''
                    cd /workspace/app 2>/dev/null || cd app
                    npm test
                '''
            }
            post {
                always {
                    // In real scenario, publish test results
                    echo 'Test results would be published here'
                }
            }
        }
        
        stage('Build') {
            steps {
                echo 'Building application...'
                sh '''
                    cd /workspace/app 2>/dev/null || cd app
                    npm run build
                '''
            }
        }
        
        stage('Package') {
            steps {
                echo 'Packaging application...'
                sh '''
                    APP_DIR="/workspace/app"
                    [ ! -d "$APP_DIR" ] && APP_DIR="app"
                    
                    mkdir -p dist
                    cp -r "$APP_DIR"/* dist/
                    tar -czf ${APP_NAME}-${BUILD_VERSION}.tar.gz dist/
                    echo "Package created: ${APP_NAME}-${BUILD_VERSION}.tar.gz"
                    ls -la *.tar.gz
                '''
            }
        }
        
        stage('Integration Test') {
            steps {
                echo 'Running integration tests...'
                sh '''
                    cd /workspace/app 2>/dev/null || cd app
                    
                    # Start the app in background on different port to avoid conflicts
                    PORT=4001 npm start &
                    APP_PID=$!
                    
                    # Wait for app to start
                    echo "Waiting for app to start on port 4001..."
                    sleep 5
                    
                    # Test health endpoint
                    curl -f http://localhost:4001/health || {
                        echo "Health check failed"
                        kill $APP_PID || true
                        exit 1
                    }
                    
                    # Test API endpoints
                    curl -f http://localhost:4001/api/todos || {
                        echo "API test failed"
                        kill $APP_PID || true
                        exit 1
                    }
                    
                    echo "Integration tests passed!"
                    
                    # Cleanup
                    kill $APP_PID || true
                '''
            }
        }
        
        stage('Deploy to Staging') {
            steps {
                echo 'Deploying to staging environment...'
                script {
                    // Simulate deployment
                    echo "Deploying ${APP_NAME} version ${BUILD_VERSION} to staging"
                    
                    // Update JIRA ticket
                    sh '''
                        curl -X POST ${JIRA_URL}/api/issues \
                            -H "Content-Type: application/json" \
                            -d '{
                                "summary": "Deploy '${APP_NAME}' v'${BUILD_VERSION}' to staging",
                                "description": "Automated deployment of build #'${BUILD_NUMBER}' to staging environment",
                                "status": "In Progress",
                                "type": "Deployment"
                            }' || echo "Failed to create JIRA ticket"
                    '''
                }
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline completed successfully!'
            script {
                // Update JIRA ticket on success
                sh '''
                    curl -X POST ${JIRA_URL}/api/issues \
                        -H "Content-Type: application/json" \
                        -d '{
                            "summary": "BUILD SUCCESS: '${APP_NAME}' v'${BUILD_VERSION}'",
                            "description": "Build #'${BUILD_NUMBER}' completed successfully and deployed to staging",
                            "status": "Done",
                            "type": "Build"
                        }' || echo "Failed to update JIRA"
                '''
            }
        }
        failure {
            echo 'Pipeline failed!'
            script {
                // Create JIRA ticket for failure
                sh '''
                    curl -X POST ${JIRA_URL}/api/issues \
                        -H "Content-Type: application/json" \
                        -d '{
                            "summary": "BUILD FAILURE: '${APP_NAME}' v'${BUILD_VERSION}'",
                            "description": "Build #'${BUILD_NUMBER}' failed during CI/CD pipeline",
                            "status": "To Do",
                            "type": "Bug",
                            "priority": "High"
                        }' || echo "Failed to create failure JIRA ticket"
                '''
            }
        }
        always {
            echo 'Cleaning up...'
            // Archive artifacts
            archiveArtifacts artifacts: '*.tar.gz', allowEmptyArchive: true
        }
    }
}