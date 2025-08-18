#!/usr/bin/env node

const CodebaseRAGQuery = require('./query-rag');
const fetch = require('node-fetch');

class EnhancedRAGQuery extends CodebaseRAGQuery {
  constructor() {
    super();
    this.ollamaUrl = 'http://localhost:11434';
    this.model = 'qwen2.5:1.5b';
  }

  async checkOllamaStatus() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`);
      if (!response.ok) throw new Error('Ollama not responding');
      
      const data = await response.json();
      const hasModel = data.models?.some(m => m.name.includes(this.model));
      
      return {
        running: true,
        hasModel,
        models: data.models?.map(m => m.name) || []
      };
    } catch (error) {
      return {
        running: false,
        hasModel: false,
        error: error.message
      };
    }
  }

  async enhanceWithLLM(query, ragResults) {
    const status = await this.checkOllamaStatus();
    
    if (!status.running) {
      throw new Error(`Ollama not running: ${status.error}`);
    }
    
    if (!status.hasModel) {
      throw new Error(`Model ${this.model} not found. Available: ${status.models.join(', ')}`);
    }

    // Build context from RAG results
    const context = ragResults.map((result, index) => {
      return `## Result ${index + 1}: ${result.metadata.file_path}
**Type:** ${result.metadata.content_type}
**Lines:** ${result.metadata.start_line}-${result.metadata.end_line}
**Relevance:** ${(result.score * 100).toFixed(1)}%

\`\`\`
${result.document}
\`\`\``;
    }).join('\n\n');

    const prompt = `You are a helpful coding assistant analyzing a codebase. Based on the following code search results, provide a comprehensive and helpful answer to the user's question.

**User Question:** ${query}

**Code Search Results:**
${context}

**Instructions:**
- Provide a clear, helpful answer based on the code search results
- Reference specific files and line numbers when relevant
- Explain how the code works and how it relates to the question
- If multiple approaches are shown, explain the differences
- Be concise but thorough
- Use technical language appropriate for developers

**Answer:**`;

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.1,  // Lower temperature for more focused responses
            top_p: 0.9,
            top_k: 40,
            num_predict: 512   // Limit response length
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'No response generated';
    } catch (error) {
      throw new Error(`LLM enhancement failed: ${error.message}`);
    }
  }

  async enhancedQuery(queryText, options = {}) {
    const {
      showComparison = true,
      previewLength = 200,
      ...ragOptions
    } = options;

    console.log(`🔍 Enhanced RAG Query: "${queryText}"`);
    console.log('=' .repeat(60));

    // Step 1: Get RAG results
    console.log('🔎 Step 1: Searching codebase with vector similarity...');
    const ragResults = await this.query(queryText, ragOptions);
    
    if (showComparison) {
      console.log('\n📊 Raw RAG Results:');
      console.log('-'.repeat(40));
      this.displayResults(ragResults, queryText, previewLength);
    }

    // Step 2: Check Ollama status
    console.log('\n🦙 Step 2: Checking Ollama LLM status...');
    const status = await this.checkOllamaStatus();
    
    if (!status.running) {
      console.log('❌ Ollama not running. Showing RAG results only.');
      console.log('💡 Run "bash setup-ollama.sh" to enable LLM enhancement.');
      return { ragResults, enhancedResponse: null, error: status.error };
    }

    if (!status.hasModel) {
      console.log(`❌ Model ${this.model} not found.`);
      console.log(`💡 Available models: ${status.models.join(', ')}`);
      console.log('💡 Run "ollama pull qwen2.5:1.5b" to install the model.');
      return { ragResults, enhancedResponse: null, error: 'Model not found' };
    }

    console.log(`✅ Ollama ready with ${this.model}`);

    // Step 3: Enhance with LLM
    console.log('\n🤖 Step 3: Enhancing results with LLM...');
    
    try {
      const enhancedResponse = await this.enhanceWithLLM(queryText, ragResults);
      
      console.log('\n🚀 Enhanced Response:');
      console.log('='.repeat(60));
      console.log(enhancedResponse);
      console.log('='.repeat(60));

      return { ragResults, enhancedResponse, error: null };
    } catch (error) {
      console.log(`❌ LLM enhancement failed: ${error.message}`);
      return { ragResults, enhancedResponse: null, error: error.message };
    }
  }

  displayComparison(query, ragResults, enhancedResponse) {
    console.log('\n📈 RAG vs Enhanced Comparison:');
    console.log('='.repeat(80));
    
    console.log('\n🔍 Traditional RAG (Vector Search Only):');
    console.log('- Returns raw code chunks ranked by similarity');
    console.log('- Requires developer to interpret and connect the dots');
    console.log('- Good for finding relevant code locations');
    console.log(`- Found ${ragResults.length} relevant code chunks`);
    
    if (enhancedResponse) {
      console.log('\n🤖 Enhanced RAG (Vector Search + LLM):');
      console.log('- Provides synthesized, human-readable explanations');
      console.log('- Connects multiple code chunks into coherent answers');
      console.log('- Explains how code works and relationships between parts');
      console.log('- Tailored responses based on specific questions');
      
      const wordCount = enhancedResponse.split(' ').length;
      console.log(`- Generated ${wordCount} words of explanation`);
    } else {
      console.log('\n❌ Enhanced RAG: Not available (LLM not ready)');
    }
    
    console.log('\n💡 This demonstrates the power of combining:');
    console.log('   Vector Search (finding relevant code) + LLM (understanding & explaining)');
  }
}

// CLI interface
async function runEnhancedCLI() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🤖 Enhanced RAG Query Tool (with LLM)

Usage:
  node enhanced-query.js "search query"                   - Enhanced search with LLM
  node enhanced-query.js --raw "search query"             - Show RAG only (no LLM)
  node enhanced-query.js --preview 500 "search query"     - Custom preview length
  node enhanced-query.js --status                         - Check Ollama status
  node enhanced-query.js --demo                           - Run comparison demo

Examples:
  node enhanced-query.js "how to create API endpoints"
  node enhanced-query.js "error handling validation"
  node enhanced-query.js "testing framework setup"
  
Prerequisites:
  1. RAG database built: npm run build-rag
  2. Ollama installed: bash setup-ollama.sh
`);
    return;
  }
  
  const enhancedQuery = new EnhancedRAGQuery();
  await enhancedQuery.initialize();
  
  // Parse arguments
  let query = '';
  let showComparison = true;
  let previewLength = 150;
  let rawOnly = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--status') {
      const status = await enhancedQuery.checkOllamaStatus();
      console.log('\n🦙 Ollama Status:');
      console.log(`Running: ${status.running ? '✅' : '❌'}`);
      console.log(`Model Ready: ${status.hasModel ? '✅' : '❌'}`);
      if (status.models.length > 0) {
        console.log(`Available Models: ${status.models.join(', ')}`);
      }
      if (status.error) {
        console.log(`Error: ${status.error}`);
      }
      return;
    } else if (args[i] === '--raw') {
      rawOnly = true;
    } else if (args[i] === '--preview' && args[i + 1]) {
      previewLength = parseInt(args[i + 1]);
      i++; // skip next arg
    } else if (args[i] === '--demo') {
      await runDemo(enhancedQuery);
      return;
    } else if (!args[i].startsWith('--')) {
      query += args[i] + ' ';
    }
  }
  
  query = query.trim();
  
  if (!query) {
    console.log('❌ Please provide a search query');
    return;
  }
  
  if (rawOnly) {
    const results = await enhancedQuery.query(query);
    enhancedQuery.displayResults(results, query, previewLength);
  } else {
    const { ragResults, enhancedResponse } = await enhancedQuery.enhancedQuery(query, { 
      showComparison: true,
      previewLength 
    });
    
    enhancedQuery.displayComparison(query, ragResults, enhancedResponse);
  }
}

async function runDemo(enhancedQuery) {
  console.log(`
🎬 Enhanced RAG Demo: Traditional vs LLM-Enhanced Search
=======================================================`);

  const demoQueries = [
    "how to create new API endpoints",
    "error handling and validation",
    "what testing framework is used"
  ];

  for (const query of demoQueries) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Demo Query: "${query}"`);
    console.log(`${'='.repeat(80)}`);
    
    await enhancedQuery.enhancedQuery(query, { showComparison: false, previewLength: 100 });
    
    // Pause between queries
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`
🎯 Demo Complete! 

Key Takeaways:
1. Traditional RAG: Great for finding relevant code locations
2. Enhanced RAG: Provides explanations and synthesizes information
3. Best of both: Precise search + intelligent interpretation

The combination makes codebase exploration much more accessible!
`);
}

// Run if called directly
if (require.main === module) {
  runEnhancedCLI().catch(console.error);
}

module.exports = EnhancedRAGQuery;