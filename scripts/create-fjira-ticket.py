import os, sys, requests
FJIRA_URL = os.environ.get("FJIRA_URL", "http://localhost:3000/api/issues")
payload = {
    "summary": os.environ.get("FJIRA_SUMMARY", "Build failed in Jenkins pipeline"),
    "description": os.environ.get("FJIRA_DESCRIPTION", "Copilot-generated report of Jenkins build failure"),
    "project": os.environ.get("FJIRA_PROJECT", "DEVOPS"),
    "assignee": os.environ.get("FJIRA_ASSIGNEE", "devops-user")
}
r = requests.post(FJIRA_URL, json=payload, timeout=20)
if r.status_code in (200,201):
    print("Ticket created in FJIRA."); sys.exit(0)
print(f"Failed to create ticket: HTTP {r.status_code} {r.text}", file=sys.stderr); sys.exit(1)
