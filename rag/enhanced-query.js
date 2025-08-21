#!/usr/bin/env node

const CodebaseRAGQuery = require('./query-rag');

class EnhancedRAGQuery extends CodebaseRAGQuery {
  constructor() {
    super();
    this.ollamaUrl = 'http://localhost:11434';
    this.model = 'qwen2.5:1.5b';
  }

  // Check if Ollama is running and has the required model
  async checkOllamaStatus() {
    try {
      console.log(`🔍 Checking Ollama at ${this.ollamaUrl}...`);
      
      // Test basic connectivity
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📊 Found ${data.models?.length || 0} models in Ollama`);

      // Check for exact model match
      const availableModels = data.models?.map(m => m.name) || [];
      const hasExactModel = availableModels.includes(this.model);
      
      console.log(`🔍 Looking for model: ${this.model}`);
      console.log(`📋 Available models: ${availableModels.join(', ')}`);
      console.log(`✅ Model found: ${hasExactModel ? 'YES' : 'NO'}`);

      return {
        running: true,
        hasModel: hasExactModel,
        models: availableModels,
        error: null
      };
    } catch (error) {
      console.log(`❌ Ollama check failed: ${error.message}`);
      return {
        running: false,
        hasModel: false,
        models: [],
        error: error.message
      };
    }
  }

  // Test a simple generation to ensure the model works
  async testModelGeneration() {
    try {
      console.log(`🧪 Testing model ${this.model}...`);
      
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000), // 30 second timeout
        body: JSON.stringify({
          model: this.model,
          prompt: 'Test: Respond with just "OK" if you can understand this.',
          stream: false,
          options: {
            temperature: 0.1,
            max_tokens: 50
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Model test successful: ${data.response?.substring(0, 50)}...`);
      return true;
    } catch (error) {
      console.log(`❌ Model test failed: ${error.message}`);
      return false;
    }
  }

  // Enhance RAG results with LLM analysis
  async enhanceWithLLM(query, ragResults) {
    if (!ragResults || ragResults.length === 0) {
      throw new Error('No RAG results to enhance');
    }

    // Build context from top results
    const topResults = ragResults.slice(0, 5); // Use top 5 results
    const context = topResults.map((result, index) => {
      const preview = result.document.substring(0, 500); // Limit context size
      return `## Code Context ${index + 1}: ${result.metadata.file_path}
File Type: ${result.metadata.content_type}
Lines: ${result.metadata.start_line}-${result.metadata.end_line}
Relevance: ${(result.score * 100).toFixed(1)}%

\`\`\`
${preview}${result.document.length > 500 ? '...' : ''}
\`\`\``;
    }).join('\n\n');

    const prompt = `You are an expert code analyst. A developer asked: "${query}"

Based on the following code search results from their codebase, provide a clear, helpful answer.

${context}

Please:
1. Answer the developer's question directly
2. Reference specific files when relevant  
3. Explain how the code works
4. Provide practical guidance
5. Keep it concise but thorough

Answer:`;

    try {
      console.log(`🤖 Generating LLM response...`);
      
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(60000), // 60 second timeout for generation
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 1000,
            stop: ['Human:', 'User:', 'Question:']
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.response || data.response.trim().length === 0) {
        throw new Error('Empty response from LLM');
      }

      return data.response.trim();
    } catch (error) {
      throw new Error(`LLM generation failed: ${error.message}`);
    }
  }

  // Main enhanced query function
  async enhancedQuery(queryText, options = {}) {
    const {
      showRawResults = true,
      previewLength = 200,
      ...ragOptions
    } = options;

    console.log(`\n🔍 Enhanced RAG Query: "${queryText}"`);
    console.log('='.repeat(60));

    // Step 1: Vector similarity search
    console.log('🔎 Step 1: Searching codebase with vector similarity...');
    console.log(`🔎 Searching for: "${queryText}"`);
    
    const ragResults = await this.query(queryText, ragOptions);
    
    if (showRawResults && ragResults.length > 0) {
      console.log('\n📊 Raw RAG Results:');
      console.log('-'.repeat(40));
      this.displayResults(ragResults, queryText, previewLength);
    } else if (ragResults.length === 0) {
      console.log('❌ No relevant results found in codebase');
      return { ragResults: [], enhancedResponse: null, error: 'No results found' };
    }

    // Step 2: Check Ollama and model
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
      console.log(`💡 Run "ollama pull ${this.model}" to install the model.`);
      return { ragResults, enhancedResponse: null, error: 'Model not found' };
    }

    console.log(`✅ Ollama ready with ${this.model}`);

    // Step 3: Test model
    const modelWorks = await this.testModelGeneration();
    if (!modelWorks) {
      console.log('❌ Model test failed. Using RAG results only.');
      return { ragResults, enhancedResponse: null, error: 'Model not responding' };
    }

    // Step 4: Enhance with LLM
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
      console.log('📊 Falling back to RAG results only.');
      return { ragResults, enhancedResponse: null, error: error.message };
    }
  }

  // Display comparison between traditional and enhanced RAG
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
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
🤖 Enhanced RAG Query Tool (with LLM)

Usage:
  npm run enhanced-query "search query"           - Enhanced search with LLM
  npm run enhanced-query --status                 - Check Ollama status  
  npm run enhanced-query --demo                   - Run comparison demo
  npm run enhanced-query --test                   - Test model generation

Examples:
  npm run enhanced-query "how to create API endpoints"
  npm run enhanced-query "error handling validation"
  npm run enhanced-query "testing framework setup"
  
Prerequisites:
  1. RAG database built: npm run build-rag
  2. Ollama running with qwen2.5:1.5b model
`);
    return;
  }
  
  const enhancedQuery = new EnhancedRAGQuery();
  
  try {
    console.log('🔍 Initializing RAG query system...');
    await enhancedQuery.initialize();
    console.log('✅ Query system ready');
  } catch (error) {
    console.error('❌ Failed to initialize RAG system:', error.message);
    return;
  }
  
  // Handle special commands
  if (args[0] === '--status') {
    const status = await enhancedQuery.checkOllamaStatus();
    console.log('\n🦙 Ollama Status Report:');
    console.log(`Running: ${status.running ? '✅' : '❌'}`);
    console.log(`Model Available: ${status.hasModel ? '✅' : '❌'}`);
    if (status.models.length > 0) {
      console.log(`Available Models: ${status.models.join(', ')}`);
    }
    if (status.error) {
      console.log(`Error: ${status.error}`);
    }
    return;
  }
  
  if (args[0] === '--test') {
    await enhancedQuery.checkOllamaStatus();
    await enhancedQuery.testModelGeneration();
    return;
  }

  if (args[0] === '--demo') {
    await runDemo(enhancedQuery);
    return;
  }
  
  // Parse query
  const query = args.join(' ').trim();
  
  if (!query) {
    console.log('❌ Please provide a search query');
    return;
  }
  
  try {
    const { ragResults, enhancedResponse } = await enhancedQuery.enhancedQuery(query);
    enhancedQuery.displayComparison(query, ragResults, enhancedResponse);
  } catch (error) {
    console.error('❌ Query failed:', error.message);
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
    
    try {
      await enhancedQuery.enhancedQuery(query, { showRawResults: false });
    } catch (error) {
      console.log(`❌ Demo query failed: ${error.message}`);
    }
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