# DevOps AI with GitHub Codespaces, Jenkins, and FJIRA

Endpoints:
- Jenkins: http://localhost:8080
- FJIRA: http://localhost:3000
- Dashboard: http://localhost:5005

Steps:
1) Create Jenkins user token in Jenkins UI.
2) Export credentials:
   export JENKINS_USER=admin
   export JENKINS_TOKEN=YOUR_TOKEN
3) Create the Jenkins job:
   python3 scripts/create-jenkins-job.py
4) Create a FJIRA ticket:
   python3 scripts/create-fjira-ticket.py
5) Multi-agent simulation:
   python3 scripts/multi_agent_sim.py
