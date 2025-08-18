#!/usr/bin/env node

const CodebaseRAGQuery = require('./query-rag');

class RAGDemo {
  constructor() {
    this.querySystem = new CodebaseRAGQuery();
  }

  async initialize() {
    await this.querySystem.initialize();
  }

  async runDemo() {
    console.log(`
🎬 RAG Codebase Demo: Showcasing Intelligent Code Search
=========================================================

This demo shows how RAG (Retrieval-Augmented Generation) transforms 
traditional code search by understanding semantic meaning rather than 
just keyword matching.

Let's explore your TODO app codebase with some real scenarios...
`);

    await this.pause(2000);

    // Scenario 1: Finding API endpoints
    await this.scenario1();
    
    // Scenario 2: Understanding error handling
    await this.scenario2();
    
    // Scenario 3: Finding configuration
    await this.scenario3();
    
    // Scenario 4: Understanding the testing approach
    await this.scenario4();
    
    // Scenario 5: Deployment and CI/CD
    await this.scenario5();

    console.log(`
🎯 Demo Complete: Key RAG Benefits Demonstrated
==============================================

1. **Semantic Understanding**: Found relevant code even with different terminology
2. **Context Awareness**: Understood intent behind queries, not just keywords
3. **Cross-file Search**: Located related functionality across the entire codebase
4. **Content Classification**: Automatically categorized code by purpose and type
5. **Intelligent Ranking**: Returned most relevant results first based on similarity

Traditional grep/search tools require exact keyword matches. RAG understands 
concepts, relationships, and intent - making codebase exploration much more intuitive!

Try your own queries:
  npm run query "how to add new todo items"
  npm run query "where are validation errors handled"
  npm run query "what testing framework is used"
`);
  }

  async scenario1() {
    console.log(`
📍 Scenario 1: New Team Member - "How do I add new features to the API?"
================================================================`);
    
    console.log("🔍 RAG Search: 'how to create new API endpoints routes'");
    await this.pause(1000);
    
    const results = await this.querySystem.query('how to create new API endpoints routes', { limit: 3 });
    
    console.log("✨ RAG found these relevant code sections:");
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path}:${result.metadata.start_line} (${(result.score * 100).toFixed(1)}% relevant)`);
      if (result.metadata.content_type === 'api_route') {
        console.log("   🎯 This is an API route - perfect match!");
      }
      const preview = result.document.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
      console.log('');
    });

    console.log("💡 Value: RAG understood you wanted API routes without exact keyword matching!");
    await this.pause(3000);
  }

  async scenario2() {
    console.log(`
📍 Scenario 2: Debugging - "The app returns error 400, where's the validation?"
===========================================================================`);
    
    console.log("🔍 RAG Search: 'error handling validation 400 bad request'");
    await this.pause(1000);
    
    const results = await this.querySystem.query('error handling validation 400 bad request', { limit: 3 });
    
    console.log("✨ RAG found validation logic:");
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path}:${result.metadata.start_line} (${(result.score * 100).toFixed(1)}% relevant)`);
      if (result.document.includes('400') || result.document.includes('error')) {
        console.log("   🎯 Contains error handling - exactly what we need!");
      }
      const preview = result.document.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
      console.log('');
    });

    console.log("💡 Value: RAG connected '400 error' concept with validation code semantically!");
    await this.pause(3000);
  }

  async scenario3() {
    console.log(`
📍 Scenario 3: DevOps Engineer - "How is this application configured?"
================================================================`);
    
    console.log("🔍 RAG Search: 'application configuration settings dependencies'");
    await this.pause(1000);
    
    const results = await this.querySystem.query('application configuration settings dependencies', { limit: 3 });
    
    console.log("✨ RAG found configuration files:");
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path}:${result.metadata.start_line} (${(result.score * 100).toFixed(1)}% relevant)`);
      if (result.metadata.content_type === 'package_config' || result.metadata.content_type === 'config') {
        console.log("   🎯 Configuration file - exactly what DevOps needs!");
      }
      const preview = result.document.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
      console.log('');
    });

    console.log("💡 Value: RAG understood configuration context and found relevant files!");
    await this.pause(3000);
  }

  async scenario4() {
    console.log(`
📍 Scenario 4: QA Engineer - "What testing approach does this project use?"
======================================================================`);
    
    console.log("🔍 RAG Search: 'unit tests testing framework jest'");
    await this.pause(1000);
    
    const results = await this.querySystem.query('unit tests testing framework jest', { limit: 3 });
    
    console.log("✨ RAG found testing information:");
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path}:${result.metadata.start_line} (${(result.score * 100).toFixed(1)}% relevant)`);
      if (result.metadata.content_type === 'test' || result.document.includes('jest') || result.document.includes('test')) {
        console.log("   🎯 Testing-related content - perfect for QA!");
      }
      const preview = result.document.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
      console.log('');
    });

    console.log("💡 Value: RAG found both test files AND testing configuration together!");
    await this.pause(3000);
  }

  async scenario5() {
    console.log(`
📍 Scenario 5: Platform Engineer - "How is deployment automated here?"
=================================================================`);
    
    console.log("🔍 RAG Search: 'CI/CD pipeline deployment jenkins automation'");
    await this.pause(1000);
    
    const results = await this.querySystem.query('CI/CD pipeline deployment jenkins automation', { limit: 3 });
    
    console.log("✨ RAG found deployment automation:");
    results.forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path}:${result.metadata.start_line} (${(result.score * 100).toFixed(1)}% relevant)`);
      if (result.document.includes('Jenkins') || result.document.includes('pipeline') || result.document.includes('deploy')) {
        console.log("   🎯 CI/CD content - exactly what platform engineers need!");
      }
      const preview = result.document.substring(0, 150).replace(/\n/g, ' ');
      console.log(`   Preview: ${preview}...`);
      console.log('');
    });

    console.log("💡 Value: RAG understood deployment concepts across different file types!");
    await this.pause(3000);
  }

  async pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Comparison with traditional search
async function showComparison() {
  console.log(`
🆚 Traditional Search vs RAG Comparison
======================================

Traditional grep/search:
❌ "grep -r 'API'" - finds 'API' text but misses routes without that word
❌ "grep -r 'error'" - finds all error text, not specifically validation
❌ "grep -r 'config'" - misses package.json and other config patterns
❌ "grep -r 'test'" - finds 'test' word but not testing framework info

RAG semantic search:
✅ Understands "API endpoints" means route definitions
✅ Connects "400 error" with validation logic semantically  
✅ Recognizes "configuration" includes dependencies and settings
✅ Knows "testing approach" means framework + test files + setup

🚀 The difference: RAG understands MEANING, not just text matching!
`);
}

// Run demo if called directly
if (require.main === module) {
  const demo = new RAGDemo();
  
  demo.initialize()
    .then(() => demo.runDemo())
    .then(() => showComparison())
    .catch(error => {
      if (error.message.includes('RAG database not found')) {
        console.log(`
❗ RAG database not found. Please build it first:

  cd rag
  npm install
  npm run build-rag
  
Then run the demo again:
  npm run demo
`);
      } else {
        console.error('Demo error:', error);
      }
    });
}

module.exports = RAGDemo;