import os
import sys
import requests
from requests.auth import HTTPBasicAuth

JENKINS_URL = os.environ.get("JENKINS_URL", "http://localhost:8080")
JOB_NAME = os.environ.get("JOB_NAME", "copilot-demo-job")
USER = os.environ.get("JENKINS_USER", "admin")
TOKEN = os.environ.get("JENKINS_TOKEN", "")
FJIRA_URL = os.environ.get("FJIRA_URL", "http://localhost:3000/api/issues")

def crumb():
    try:
        r = requests.get(f"{JENKINS_URL}/crumbIssuer/api/json",
                         auth=HTTPBasicAuth(USER, TOKEN), timeout=10)
        if r.status_code == 200:
            d = r.json()
            return {d['crumbRequestField']: d['crumb']}
    except Exception:
        pass
    return {}

def trigger():
    h = crumb()
    r = requests.post(f"{JENKINS_URL}/job/{JOB_NAME}/build",
                      headers=h, auth=HTTPBasicAuth(USER, TOKEN), timeout=20)
    return r.status_code in (201, 302)

def ticket():
    r = requests.post(FJIRA_URL, json={
        "summary": "Jenkins build trigger failed",
        "description": f"Could not start job '{JOB_NAME}'.",
        "project": "DEVOPS",
        "assignee": "ai-bot"
    }, timeout=20)
    return r.status_code in (200, 201)

def main():
    if not TOKEN:
        print("JENKINS_TOKEN is required.", file=sys.stderr)
        sys.exit(2)
    if trigger():
        print("Build triggered.")
        sys.exit(0)
    print("Trigger failed. Creating ticket...")
    print("Ticket created." if ticket() else "Ticket creation failed.")
    sys.exit(1)

if __name__ == "__main__":
    main()