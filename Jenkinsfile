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
                dir('app') {
                    sh '''
                        echo "Node version: $(node --version)"
                        echo "NPM version: $(npm --version)"
                        npm install
                    '''
                }
            }
        }
        
        stage('Lint') {
            steps {
                echo 'Running linting...'
                dir('app') {
                    sh 'npm run lint'
                }
            }
        }
        
        stage('Test') {
            steps {
                echo 'Running tests...'
                dir('app') {
                    sh 'npm test'
                }
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
                dir('app') {
                    sh 'npm run build'
                }
            }
        }
        
        stage('Package') {
            steps {
                echo 'Packaging application...'
                script {
                    // Create a simple deployment package
                    sh '''
                        mkdir -p dist
                        cp -r app/* dist/
                        tar -czf ${APP_NAME}-${BUILD_VERSION}.tar.gz dist/
                        echo "Package created: ${APP_NAME}-${BUILD_VERSION}.tar.gz"
                    '''
                }
            }
        }
        
        stage('Integration Test') {
            steps {
                echo 'Running integration tests...'
                dir('app') {
                    sh '''
                        # Start the app in background
                        npm start &
                        APP_PID=$!
                        
                        # Wait for app to start
                        sleep 5
                        
                        # Test health endpoint
                        curl -f http://localhost:4000/health || exit 1
                        
                        # Test API endpoints
                        curl -f http://localhost:4000/api/todos || exit 1
                        
                        # Cleanup
                        kill $APP_PID || true
                    '''
                }
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