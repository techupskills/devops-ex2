import os, sys, requests
from requests.auth import HTTPBasicAuth

JENKINS_URL = os.environ.get("JENKINS_URL", "http://localhost:8080")
JOB_NAME = os.environ.get("JOB_NAME", "copilot-demo-job")
USER = os.environ.get("JENKINS_USER", "admin")
TOKEN = os.environ.get("JENKINS_TOKEN", "")
CONFIG_PATH = os.environ.get("JOB_XML", "jenkins/simple-job-config.xml")

def get_crumb():
    try:
        r = requests.get(f"{JENKINS_URL}/crumbIssuer/api/json", auth=HTTPBasicAuth(USER, TOKEN), timeout=15)
        if r.status_code == 200:
            d = r.json()
            return {d['crumbRequestField']: d['crumb']}
    except Exception:
        pass
    return {}

def main():
    if not TOKEN:
        print("JENKINS_TOKEN is required (user API token).", file=sys.stderr); sys.exit(2)
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        config_xml = f.read()
    headers = {"Content-Type": "application/xml"}; headers.update(get_crumb())
    r = requests.post(f"{JENKINS_URL}/createItem?name={JOB_NAME}", data=config_xml, headers=headers,
                      auth=HTTPBasicAuth(USER, TOKEN), timeout=30)
    if r.status_code in (200,201): print(f"Job '{JOB_NAME}' created or already exists."); sys.exit(0)
    if r.status_code == 400 and "already exists" in r.text.lower(): print(f"Job '{JOB_NAME}' already exists."); sys.exit(0)
    print(f"Failed to create job: HTTP {r.status_code} {r.text}", file=sys.stderr); sys.exit(1)

if __name__ == "__main__": main()
