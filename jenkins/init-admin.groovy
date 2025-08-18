#!groovy

import jenkins.model.*
import hudson.security.*
import jenkins.security.s2m.AdminWhitelistRule

def instance = Jenkins.getInstance()

// Create admin user if it doesn't exist
def hudsonRealm = new HudsonPrivateSecurityRealm(false)
if (!hudsonRealm.getAllUsers().find { it.getId() == "admin" }) {
    hudsonRealm.createAccount("admin", "admin")
    instance.setSecurityRealm(hudsonRealm)
    
    // Set up authorization strategy
    def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
    strategy.setAllowAnonymousRead(false)
    instance.setAuthorizationStrategy(strategy)
    
    instance.save()
    println "Admin user created: admin/admin"
} else {
    println "Admin user already exists"
}

// Disable CLI for security
instance.getDescriptor("jenkins.CLI").get().setEnabled(false)

instance.save()