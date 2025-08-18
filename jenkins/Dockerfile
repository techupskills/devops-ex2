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

# Install suggested plugins automatically
COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

# Skip initial setup wizard
ENV JAVA_OPTS -Djenkins.install.runSetupWizard=false

# Set default admin user
ENV JENKINS_ADMIN_ID=admin
ENV JENKINS_ADMIN_PASSWORD=admin

# Copy Jenkins configuration
COPY --chown=jenkins:jenkins jenkins-config/ /usr/share/jenkins/ref/