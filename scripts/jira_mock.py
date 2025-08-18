#!/usr/bin/env python3
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

# Sample JIRA tickets for the TODO app demo
ISSUES = [
    {
        "id": 1,
        "key": "DEMO-1", 
        "summary": "Add user authentication to TODO app",
        "description": "Implement login/logout functionality so users can have personal TODO lists",
        "status": "To Do",
        "type": "Story",
        "priority": "Medium",
        "reporter": "product.manager@company.com",
        "assignee": "dev.team@company.com",
        "created": "2025-01-15T10:00:00Z",
        "updated": "2025-01-15T10:00:00Z"
    },
    {
        "id": 2,
        "key": "DEMO-2",
        "summary": "Fix: TODO items not saving properly",
        "description": "Users report that TODO items sometimes disappear after page refresh. Investigate data persistence issue.",
        "status": "In Progress", 
        "type": "Bug",
        "priority": "High",
        "reporter": "qa.tester@company.com",
        "assignee": "dev.team@company.com",
        "created": "2025-01-16T14:30:00Z",
        "updated": "2025-01-17T09:15:00Z"
    },
    {
        "id": 3,
        "key": "DEMO-3",
        "summary": "Improve TODO app UI/UX design",
        "description": "Make the TODO app more visually appealing with better colors, fonts, and responsive design",
        "status": "To Do",
        "type": "Improvement", 
        "priority": "Low",
        "reporter": "ux.designer@company.com",
        "assignee": "dev.team@company.com",
        "created": "2025-01-18T11:20:00Z",
        "updated": "2025-01-18T11:20:00Z"
    }
]

@app.get("/api/issues")
def list_issues():
    return jsonify(ISSUES), 200

@app.post("/api/issues")
def create_issue():
    data = request.get_json(force=True, silent=True) or {}
    
    # Generate new issue with defaults
    new_id = (ISSUES[-1]["id"] + 1) if ISSUES else 1
    new_issue = {
        "id": new_id,
        "key": f"DEMO-{new_id}",
        "summary": data.get("summary", "New Issue"),
        "description": data.get("description", ""),
        "status": data.get("status", "To Do"),
        "type": data.get("type", "Task"),
        "priority": data.get("priority", "Medium"),
        "reporter": data.get("reporter", "system@company.com"),
        "assignee": data.get("assignee", "dev.team@company.com"),
        "created": datetime.now().isoformat() + "Z",
        "updated": datetime.now().isoformat() + "Z"
    }
    
    ISSUES.append(new_issue)
    return jsonify(new_issue), 201

@app.get("/api/issues/<int:issue_id>")
def get_issue(issue_id):
    issue = next((issue for issue in ISSUES if issue["id"] == issue_id), None)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404
    return jsonify(issue), 200

@app.put("/api/issues/<int:issue_id>")
def update_issue(issue_id):
    issue = next((issue for issue in ISSUES if issue["id"] == issue_id), None)
    if not issue:
        return jsonify({"error": "Issue not found"}), 404
    
    data = request.get_json(force=True, silent=True) or {}
    
    # Update fields
    for field in ["summary", "description", "status", "type", "priority", "assignee"]:
        if field in data:
            issue[field] = data[field]
    
    issue["updated"] = datetime.now().isoformat() + "Z"
    return jsonify(issue), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3000)