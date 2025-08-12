from flask import Flask, render_template
import requests
import xml.etree.ElementTree as ET

app = Flask(__name__)

JENKINS_URL = "http://localhost:8080"
FJIRA_URL = "http://localhost:3000/api/issues"

def get_jenkins_status():
    try:
        res = requests.get(f"{JENKINS_URL}/job/copilot-demo-job/api/xml", timeout=10)
        if res.status_code != 200:
            return "Unavailable"
        tree = ET.fromstring(res.content)
        color = tree.findtext("color")
        return "Success" if (color and "blue" in color) else "Unknown"
    except Exception:
        return "Unavailable"

def get_fjira_issues():
    try:
        res = requests.get(FJIRA_URL, timeout=10)
        if res.headers.get("content-type", "").startswith("application/json"):
            return res.json()
        return []
    except Exception:
        return []

@app.route("/")
def index():
    jenkins_status = get_jenkins_status()
    fjira_issues = get_fjira_issues()
    return render_template("index.html", jenkins=jenkins_status, issues=fjira_issues)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005, debug=True)