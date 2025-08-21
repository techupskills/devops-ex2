#!/usr/bin/env node

const CodebaseRAGQuery = require('./query-rag');

class TODOAppRAGDemo {
  constructor() {
    this.querySystem = new CodebaseRAGQuery();
  }

  async initialize() {
    await this.querySystem.initialize();
  }

  async runDemo() {
    console.log(`
🎬 TODO App RAG Demo: Understanding a Real Web Application
=========================================================

This demo shows how RAG helps developers understand a complete TODO 
application with frontend, backend, and testing. Perfect for:
- New team members exploring the codebase
- Code reviews and architecture understanding  
- Finding specific implementation patterns

Let's explore the TODO app structure...
`);

    await this.pause(2000);

    // Scenario 1: Understanding the API
    await this.apiScenario();
    
    // Scenario 2: Frontend interaction
    await this.frontendScenario();
    
    // Scenario 3: Testing approach
    await this.testingScenario();
    
    // Scenario 4: Error handling
    await this.errorHandlingScenario();
    
    // Scenario 5: Adding new features
    await this.featureAdditionScenario();

    console.log(`
🎯 TODO App Demo Complete: Key Insights
======================================

✅ **API Structure**: Found REST endpoints for CRUD operations
✅ **Frontend Pattern**: Vanilla JS with fetch API for server communication
✅ **Testing Strategy**: Jest tests covering API endpoints and edge cases
✅ **Error Handling**: Proper HTTP status codes and client-side error display
✅ **Architecture**: Simple MVC pattern with in-memory data storage

💡 **Next Steps for Development**:
1. Add authentication and user management
2. Implement persistent data storage (database)
3. Add form validation and better UX
4. Set up automated deployment pipeline
5. Add more comprehensive test coverage

Try exploring yourself:
  npm run query "how to add new todo items"
  npm run query "validation and error handling"
  npm run query "frontend todo rendering"
`);
  }

  async apiScenario() {
    console.log(`
📍 Scenario 1: New Developer - "How does the TODO API work?"
==========================================================`);
    
    console.log("🔍 RAG Search: 'API endpoints CRUD operations todos'");
    await this.pause(1000);
    
    const results = await this.querySystem.query('API endpoints CRUD operations todos', { limit: 3 });
    
    console.log("✨ RAG found these API implementations:");
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path}:${result.metadata.start_line} (${(result.score * 100).toFixed(1)}% relevant)`);
      
      // Check for specific patterns
      if (result.document.includes('app.get(') || result.document.includes('app.post(')) {
        console.log("   🎯 HTTP Route Handler - Core API functionality!");
      }
      if (result.document.includes('res.json(') || result.document.includes('res.status(')) {
        console.log("   📡 Response handling with proper HTTP codes");
      }
      
      const preview = result.document.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
      console.log('');
    });

    console.log("💡 Insight: Found complete CRUD API with GET, POST, PUT, DELETE operations!");
    await this.pause(3000);
  }

  async frontendScenario() {
    console.log(`
📍 Scenario 2: UI Developer - "How does the frontend interact with the API?"
==========================================================================`);
    
    console.log("🔍 RAG Search: 'frontend fetch API javascript DOM manipulation'");
    await this.pause(1000);
    
    const results = await this.querySystem.query('frontend fetch API javascript DOM manipulation', { limit: 3 });
    
    console.log("✨ RAG found frontend interaction patterns:");
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path}:${result.metadata.start_line} (${(result.score * 100).toFixed(1)}% relevant)`);
      
      if (result.document.includes('fetch(') || result.document.includes('async')) {
        console.log("   🌐 Async API calls using modern fetch API");
      }
      if (result.document.includes('getElementById') || result.document.includes('innerHTML')) {
        console.log("   🎨 DOM manipulation for dynamic UI updates");
      }
      if (result.document.includes('addEventListener') || result.document.includes('onclick')) {
        console.log("   ⚡ Event handling for user interactions");
      }
      
      const preview = result.document.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
      console.log('');
    });

    console.log("💡 Insight: Clean separation between frontend UI and backend API calls!");
    await this.pause(3000);
  }

  async testingScenario() {
    console.log(`
📍 Scenario 3: QA Engineer - "What testing coverage exists for this app?"
========================================================================`);
    
    console.log("🔍 RAG Search: 'unit tests jest supertest API testing'");
    await this.pause(1000);
    
    const results = await this.querySystem.query('unit tests jest supertest API testing', { limit: 3 });
    
    console.log("✨ RAG found testing implementation:");
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path}:${result.metadata.start_line} (${(result.score * 100).toFixed(1)}% relevant)`);
      
      if (result.document.includes('describe(') || result.document.includes('test(')) {
        console.log("   🧪 Jest test structure with organized test suites");
      }
      if (result.document.includes('supertest') || result.document.includes('request(')) {
        console.log("   🔌 API integration testing with supertest");
      }
      if (result.document.includes('expect(') || result.document.includes('.toBe(')) {
        console.log("   ✅ Comprehensive assertions covering edge cases");
      }
      
      const preview = result.document.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
      console.log('');
    });

    console.log("💡 Insight: Good test coverage for API endpoints including error cases!");
    await this.pause(3000);
  }

  async errorHandlingScenario() {
    console.log(`
📍 Scenario 4: DevOps Engineer - "How are errors handled in this application?"
=============================================================================`);
    
    console.log("🔍 RAG Search: 'error handling validation status codes 400 404'");
    await this.pause(1000);
    
    const results = await this.querySystem.query('error handling validation status codes 400 404', { limit: 3 });
    
    console.log("✨ RAG found error handling patterns:");
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path}:${result.metadata.start_line} (${(result.score * 100).toFixed(1)}% relevant)`);
      
      if (result.document.includes('400') || result.document.includes('404')) {
        console.log("   🚨 Proper HTTP status codes for different error types");
      }
      if (result.document.includes('error') || result.document.includes('catch')) {
        console.log("   🛡️ Error handling with try-catch patterns");
      }
      if (result.document.includes('validation') || result.document.includes('required')) {
        console.log("   ✋ Input validation preventing bad data");
      }
      
      const preview = result.document.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
      console.log('');
    });

    console.log("💡 Insight: Robust error handling with proper HTTP codes and validation!");
    await this.pause(3000);
  }

  async featureAdditionScenario() {
    console.log(`
📍 Scenario 5: Product Manager - "How would we add user authentication?"
======================================================================`);
    
    console.log("🔍 RAG Search: 'middleware express authentication user session'");
    await this.pause(1000);
    
    const results = await this.querySystem.query('middleware express authentication user session', { limit: 3 });
    
    console.log("✨ RAG found application structure for extensions:");
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path}:${result.metadata.start_line} (${(result.score * 100).toFixed(1)}% relevant)`);
      
      if (result.document.includes('app.use(') || result.document.includes('middleware')) {
        console.log("   🔧 Express middleware pattern - perfect for auth integration");
      }
      if (result.document.includes('express') || result.document.includes('require')) {
        console.log("   📦 Module structure supports adding auth libraries");
      }
      
      const preview = result.document.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
      console.log('');
    });

    console.log(`💡 Insight: Express app structure is ready for authentication middleware!

🚀 **Recommended Implementation Plan**:
1. Add passport.js or similar auth middleware  
2. Create user model and registration/login routes
3. Protect todo routes with authentication middleware
4. Update frontend to handle login/logout flow
5. Add user-specific todo filtering`);
    
    await this.pause(3000);
  }

  async pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Comparison with generic RAG
async function showTODOAppComparison() {
  console.log(`
🆚 Generic Codebase vs Focused TODO App RAG
==========================================

Generic full codebase RAG:
❌ Mixes TODO app code with Jenkins, JIRA, dashboard code
❌ Diluted results across multiple unrelated projects  
❌ Harder to understand specific application patterns
❌ Returns configuration files from other services

Focused TODO app RAG:
✅ Pure focus on TODO application code only
✅ Clear understanding of single application architecture
✅ Relevant examples for web development patterns
✅ Perfect for onboarding developers to this specific app
✅ Better context for feature planning and code reviews

🎯 **Use Cases for Focused RAG**:
- **Onboarding**: New developers learning the TODO app
- **Code Reviews**: Understanding changes in context  
- **Feature Planning**: Seeing how to extend existing patterns
- **Documentation**: Auto-generating app-specific docs
- **Debugging**: Finding related code for specific issues

Build focused RAG databases: npm run build-rag-app
`);
}

// Run demo if called directly
if (require.main === module) {
  const demo = new TODOAppRAGDemo();
  
  demo.initialize()
    .then(() => demo.runDemo())
    .then(() => showTODOAppComparison())
    .catch(error => {
      if (error.message.includes('RAG database not found')) {
        console.log(`
❗ RAG database not found. Build focused TODO app database:

  cd rag
  npm install
  npm run build-rag-app
  
Then run the demo:
  node app-demo.js
`);
      } else {
        console.error('Demo error:', error);
      }
    });
}

module.exports = TODOAppRAGDemo;