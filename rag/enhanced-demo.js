#!/usr/bin/env node

const EnhancedRAGQuery = require('./enhanced-query');

class EnhancedRAGDemo {
  constructor() {
    this.enhancedQuery = new EnhancedRAGQuery();
  }

  async initialize() {
    await this.enhancedQuery.initialize();
  }

  async runDemo() {
    console.log(`
🎬 Enhanced RAG Demo: Traditional vs LLM-Powered Code Search
==========================================================

This demo showcases the evolution from traditional vector search to 
LLM-enhanced RAG that provides intelligent explanations and synthesis.

We'll demonstrate with real scenarios using your codebase...
`);

    await this.pause(2000);

    // Check LLM availability first
    const status = await this.enhancedQuery.checkOllamaStatus();
    if (!status.running || !status.hasModel) {
      console.log(`
❌ LLM not available for enhanced features
📊 Running traditional RAG comparison only

To enable LLM enhancement:
1. Install Ollama: https://ollama.ai/
2. Run: ollama pull qwen2.5:1.5b
3. Ensure Ollama is running on port 11434
`);
      return this.runTraditionalDemo();
    }

    console.log(`✅ LLM Enhancement Ready: ${this.enhancedQuery.model}\n`);

    // Scenario 1: API Development
    await this.enhancedScenario1();
    
    // Scenario 2: Error Handling
    await this.enhancedScenario2();
    
    // Scenario 3: Testing Strategy
    await this.enhancedScenario3();

    await this.showFinalComparison();
  }

  async enhancedScenario1() {
    console.log(`
📍 Enhanced Scenario 1: "How do I add new API endpoints?"
========================================================`);
    
    await this.pause(1000);
    
    console.log("🔄 Step 1: Traditional RAG Search...");
    const ragResults = await this.enhancedQuery.query('how to create new API endpoints routes', { limit: 3 });
    
    console.log("📊 Traditional RAG Results:");
    ragResults.slice(0, 2).forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path} (${(result.score * 100).toFixed(1)}% match)`);
      const preview = result.document.substring(0, 100).replace(/\n/g, ' ');
      console.log(`   Raw: ${preview}...`);
    });

    console.log("\n🤖 Step 2: LLM Enhancement...");
    await this.pause(1000);

    try {
      const enhanced = await this.enhancedQuery.enhanceWithLLM(
        'how to create new API endpoints', 
        ragResults
      );
      
      console.log("🚀 Enhanced LLM Response:");
      console.log("─".repeat(60));
      console.log(enhanced);
      console.log("─".repeat(60));
      
    } catch (error) {
      console.log(`❌ LLM enhancement failed: ${error.message}`);
    }

    await this.showScenarioComparison("API Development");
    await this.pause(3000);
  }

  async enhancedScenario2() {
    console.log(`
📍 Enhanced Scenario 2: "Why am I getting validation errors?"
============================================================`);
    
    await this.pause(1000);
    
    console.log("🔄 Step 1: Traditional RAG Search...");
    const ragResults = await this.enhancedQuery.query('error handling validation middleware', { limit: 3 });
    
    console.log("📊 Traditional RAG Results:");
    ragResults.slice(0, 2).forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path} (${(result.score * 100).toFixed(1)}% match)`);
      const preview = result.document.substring(0, 100).replace(/\n/g, ' ');
      console.log(`   Raw: ${preview}...`);
    });

    console.log("\n🤖 Step 2: LLM Enhancement...");
    await this.pause(1000);

    try {
      const enhanced = await this.enhancedQuery.enhanceWithLLM(
        'explain error handling and validation', 
        ragResults
      );
      
      console.log("🚀 Enhanced LLM Response:");
      console.log("─".repeat(60));
      console.log(enhanced);
      console.log("─".repeat(60));
      
    } catch (error) {
      console.log(`❌ LLM enhancement failed: ${error.message}`);
    }

    await this.showScenarioComparison("Error Handling");
    await this.pause(3000);
  }

  async enhancedScenario3() {
    console.log(`
📍 Enhanced Scenario 3: "What testing strategy should I follow?"
===============================================================`);
    
    await this.pause(1000);
    
    console.log("🔄 Step 1: Traditional RAG Search...");
    const ragResults = await this.enhancedQuery.query('testing framework unit tests jest', { limit: 3 });
    
    console.log("📊 Traditional RAG Results:");
    ragResults.slice(0, 2).forEach((result, i) => {
      console.log(`${i + 1}. ${result.metadata.file_path} (${(result.score * 100).toFixed(1)}% match)`);
      const preview = result.document.substring(0, 100).replace(/\n/g, ' ');
      console.log(`   Raw: ${preview}...`);
    });

    console.log("\n🤖 Step 2: LLM Enhancement...");
    await this.pause(1000);

    try {
      const enhanced = await this.enhancedQuery.enhanceWithLLM(
        'explain the testing approach and how to write tests', 
        ragResults
      );
      
      console.log("🚀 Enhanced LLM Response:");
      console.log("─".repeat(60));
      console.log(enhanced);
      console.log("─".repeat(60));
      
    } catch (error) {
      console.log(`❌ LLM enhancement failed: ${error.message}`);
    }

    await this.showScenarioComparison("Testing Strategy");
    await this.pause(3000);
  }

  async showScenarioComparison(scenario) {
    console.log(`
💡 ${scenario} - Key Differences:
────────────────────────────────────────
Traditional RAG:  Finds relevant code chunks
Enhanced RAG:     Explains HOW to implement + WHY it works
                  Synthesizes multiple files into actionable guidance
                  Provides step-by-step instructions
`);
  }

  async showFinalComparison() {
    console.log(`
🎯 Enhanced RAG Demo Complete: Evolution of Code Search
======================================================

Traditional RAG (Vector Search Only):
────────────────────────────────────
✅ Fast and efficient code location
✅ Semantic similarity matching  
✅ Cross-file search capabilities
❌ Requires developer interpretation
❌ Raw code chunks without context
❌ No synthesis or explanation

Enhanced RAG (Vector Search + LLM):
─────────────────────────────────────
✅ Everything traditional RAG provides
✅ Human-readable explanations
✅ Synthesis across multiple code chunks
✅ Step-by-step implementation guidance
✅ Context-aware responses
✅ Connects concepts and relationships
✅ Tailored answers to specific questions

🚀 The Power of LLM Enhancement:
────────────────────────────────
• Transforms raw code search into intelligent code assistance
• Bridges the gap between finding code and understanding it
• Provides actionable guidance for implementation
• Makes codebase exploration accessible to all skill levels

💡 Use Cases:
Traditional RAG: "Where is the login logic?"
Enhanced RAG:   "How do I implement secure authentication?"

Traditional RAG: "Find error handling code"  
Enhanced RAG:   "How should I handle validation errors properly?"

Try the enhanced system yourself:
  npm run enhanced-query "how to add user authentication"
  npm run enhanced-query "explain the testing approach"
  npm run enhanced-query "how to deploy this application"
`);
  }

  async runTraditionalDemo() {
    console.log("🔄 Running traditional RAG demonstration only...\n");
    
    const scenarios = [
      "how to create new API endpoints",
      "error handling validation",
      "testing framework setup"
    ];

    for (const query of scenarios) {
      console.log(`🔍 Query: "${query}"`);
      const results = await this.enhancedQuery.query(query, { limit: 2 });
      
      results.forEach((result, i) => {
        console.log(`${i + 1}. ${result.metadata.file_path} (${(result.score * 100).toFixed(1)}% match)`);
        const preview = result.document.substring(0, 150).replace(/\n/g, ' ');
        console.log(`   ${preview}...\n`);
      });
    }
  }

  async pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Interactive CLI interface
async function runEnhancedDemo() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
🤖 Enhanced RAG Demo - Traditional vs LLM-Powered Search

Usage:
  npm run enhanced-demo                    - Full interactive demo
  npm run enhanced-demo --quick           - Quick comparison demo
  npm run enhanced-demo --traditional     - Traditional RAG only
  npm run enhanced-demo --status          - Check LLM status

Examples of enhanced queries:
  npm run enhanced-query "how to add authentication"
  npm run enhanced-query "explain error handling patterns"
  npm run enhanced-query "what is the deployment process"
`);
    return;
  }
  
  const demo = new EnhancedRAGDemo();
  
  try {
    console.log('🔍 Initializing Enhanced RAG system...');
    await demo.initialize();
    console.log('✅ System ready\n');
  } catch (error) {
    console.error('❌ Failed to initialize RAG system:', error.message);
    console.log(`
💡 Troubleshooting:
1. Ensure RAG database is built: npm run build-rag
2. Check if you're in the correct directory
3. Verify all dependencies are installed: npm install
`);
    return;
  }
  
  if (args.includes('--status')) {
    const status = await demo.enhancedQuery.checkOllamaStatus();
    console.log('\n🦙 Enhanced RAG Status:');
    console.log(`LLM Running: ${status.running ? '✅' : '❌'}`);
    console.log(`Model Available: ${status.hasModel ? '✅' : '❌'}`);
    if (status.models.length > 0) {
      console.log(`Available Models: ${status.models.join(', ')}`);
    }
    return;
  }
  
  if (args.includes('--traditional')) {
    await demo.runTraditionalDemo();
  } else if (args.includes('--quick')) {
    console.log('🚀 Quick Enhanced RAG Demo\n');
    await demo.enhancedScenario1();
  } else {
    await demo.runDemo();
  }
}

// Run if called directly
if (require.main === module) {
  runEnhancedDemo().catch(console.error);
}

module.exports = EnhancedRAGDemo;