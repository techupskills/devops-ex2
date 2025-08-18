#!/usr/bin/env python3

import json
import requests
from flask import Flask, render_template, jsonify, request
from datetime import datetime

app = Flask(__name__)

# JIRA Mock API endpoint
JIRA_API_URL = "http://localhost:3000/api/issues"

@app.route('/')
def dashboard():
    """Main JIRA dashboard page"""
    return render_template('dashboard.html')

@app.route('/api/issues')
def get_issues():
    """Proxy to JIRA mock API with additional formatting"""
    try:
        response = requests.get(JIRA_API_URL, timeout=5)
        if response.status_code == 200:
            issues = response.json()
            
            # Enhance issues with additional display data
            for issue in issues:
                # Add priority colors
                priority_colors = {
                    'High': 'danger',
                    'Medium': 'warning', 
                    'Low': 'info',
                    'Critical': 'dark'
                }
                issue['priority_color'] = priority_colors.get(issue.get('priority', 'Medium'), 'secondary')
                
                # Add status colors
                status_colors = {
                    'To Do': 'secondary',
                    'In Progress': 'primary',
                    'Done': 'success',
                    'Blocked': 'danger'
                }
                issue['status_color'] = status_colors.get(issue.get('status', 'To Do'), 'secondary')
                
                # Add type icons
                type_icons = {
                    'Bug': '🐛',
                    'Feature': '✨',
                    'Task': '📋',
                    'Story': '📖',
                    'Build': '🔨',
                    'Deployment': '🚀'
                }
                issue['type_icon'] = type_icons.get(issue.get('type', 'Task'), '📋')
                
                # Format created date if available
                if 'created' in issue:
                    try:
                        # Parse and format date
                        created_date = datetime.fromisoformat(issue['created'].replace('Z', '+00:00'))
                        issue['created_formatted'] = created_date.strftime('%Y-%m-%d %H:%M')
                    except:
                        issue['created_formatted'] = issue['created']
            
            return jsonify(issues)
        else:
            return jsonify({'error': 'Failed to fetch issues from JIRA API'}), 500
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'JIRA API unavailable: {str(e)}'}), 503

@app.route('/api/create-issue', methods=['POST'])
def create_issue():
    """Create a new issue via JIRA mock API"""
    try:
        issue_data = request.json
        response = requests.post(JIRA_API_URL, json=issue_data, timeout=5)
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to create issue: {str(e)}'}), 503

@app.route('/health')
def health():
    """Health check endpoint"""
    try:
        # Check if JIRA mock is available
        response = requests.get(JIRA_API_URL, timeout=2)
        jira_status = "up" if response.status_code == 200 else "down"
    except:
        jira_status = "down"
    
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'jira_api': jira_status
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001, debug=True)