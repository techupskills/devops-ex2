# Jenkins with Node.js for CI/CD Demo
FROM jenkins/jenkins:lts

# Switch to root user to install packages
USER root

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    lsb-release \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Verify Node.js installation
RUN node --version && npm --version

# Switch back to jenkins user
USER jenkins

# Skip initial setup wizard and set admin user
ENV JAVA_OPTS -Djenkins.install.runSetupWizard=false
ENV JENKINS_ADMIN_ID=admin
ENV JENKINS_ADMIN_PASSWORD=admin

# Install most common pipeline plugins on first startup
RUN jenkins-plugin-cli --plugins workflow-aggregator git credentials-binding || true