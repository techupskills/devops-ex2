from flask import Flask, render_template
import requests, xml.etree.ElementTree as ET

app = Flask(__name__)
JENKINS_URL = "http://localhost:8080"
FJIRA_URL = "http://localhost:3000/api/issues"

def jenkins_status():
    try:
        r = requests.get(f"{JENKINS_URL}/job/copilot-demo-job/api/xml", timeout=10)
        if r.status_code != 200: return "Unavailable"
        tree = ET.fromstring(r.content); color = tree.findtext("color")
        return "Success" if (color and "blue" in color) else "Unknown"
    except Exception:
        return "Unavailable"

def fjira_issues():
    try:
        r = requests.get(FJIRA_URL, timeout=10)
        return r.json() if r.headers.get("content-type","").startswith("application/json") else []
    except Exception:
        return []

@app.route("/")
def index():
    return render_template("index.html", jenkins=jenkins_status(), issues=fjira_issues())

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005, debug=True)
