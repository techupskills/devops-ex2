#!/usr/bin/env python3
from flask import Flask, request, jsonify

app = Flask(__name__)
ISSUES = [{"id": 1, "summary": "Demo issue", "description": "Seed data from mock"}]

@app.get("/api/issues")
def list_issues():
    return jsonify(ISSUES), 200

@app.post("/api/issues")
def create_issue():
    data = request.get_json(force=True, silent=True) or {}
    data.setdefault("id", (ISSUES[-1]["id"] + 1) if ISSUES else 1)
    ISSUES.append(data)
    return jsonify(data), 201

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)