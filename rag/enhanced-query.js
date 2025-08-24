#!/usr/bin/env node

const CodebaseRAGQuery = require('./query-rag');

class EnhancedRAGQuery extends CodebaseRAGQuery {
  constructor() {
    super();
    this.ollamaUrl = 'http://localhost:11434';
    this.model = 'llama3.2:latest';
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
            num_predict: 50
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

    // Build context from top results with more detail for better LLM integration
    const topResults = ragResults.slice(0, 3); // Use top 3 results only
    const context = topResults.map((result, index) => {
      const preview = result.document.substring(0, 500); // More context for better analysis
      return `## Code Result ${index + 1}: ${result.metadata.file_path} (${(result.score * 100).toFixed(1)}% relevance match)
File Type: ${result.metadata.file_type} | Content Type: ${result.metadata.content_type}
Lines: ${result.metadata.start_line}-${result.metadata.end_line}

\`\`\`${result.metadata.file_type}
${preview}${result.document.length > 500 ? '\n... [truncated for brevity]' : ''}
\`\`\``;
    }).join('\n\n');

    const prompt = `You are a senior software engineer analyzing a codebase. A developer is asking: "${query}"

The RAG system found ${ragResults.length} relevant code chunks. Here are the top 3 most relevant results:

${context}

IMPORTANT: Your response must directly reference and analyze the specific code shown above. 

Provide a comprehensive analysis that:

1. **Directly quotes and references the actual code** from the files shown above
2. **Explains how each code result addresses the developer's question**
3. **Identifies patterns, techniques, and implementation details** found in the specific code
4. **Points out potential issues or improvements** based on what you see in the actual code
5. **Provides actionable next steps** using the file paths and line numbers from the results

Format your response with clear references like:
- "In Code Result 1 (${topResults[0]?.metadata?.file_path}), lines ${topResults[0]?.metadata?.start_line}-${topResults[0]?.metadata?.end_line}..."
- "The code shows: \`specific code snippet\`"
- "Looking at the ${topResults[1]?.metadata?.file_type} file..."

Your analysis should be grounded in the actual codebase content, not generic advice.

Answer:`;

    try {
      console.log(`🤖 Generating LLM response...`);
      
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120000), // 120 second timeout for generation
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.2,
            top_p: 0.9,
            num_predict: 800,
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

  // Override with more comprehensive categories for enhanced RAG
  async searchByCategory(category) {
    const queries = {
      'api-endpoints': 'REST API routes endpoints GET POST PUT DELETE express router middleware',
      'authentication': 'JWT token authentication middleware passport login session security',
      'database': 'database connection pool ORM queries transactions migration schema',
      'error-handling': 'error handling try catch validation middleware logging custom errors',
      'testing': 'unit integration tests jest mocha describe expect mock fixtures',
      'security': 'authentication authorization validation sanitization CORS helmet rate limiting',
      'caching': 'cache redis memcached memory store performance optimization',
      'monitoring': 'logging metrics monitoring health checks alerts prometheus winston',
      'deployment': 'docker kubernetes CI/CD pipeline deploy build production environment',
      'async-patterns': 'promise async await queue workers background jobs event emitters'
    };

    if (!(category in queries)) {
      throw new Error(`Unknown category. Available: ${Object.keys(queries).join(', ')}`);
    }

    return await this.query(queries[category]);
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
  npm run enhanced-query "how to implement JWT authentication"
  npm run enhanced-query "database connection pooling strategies"  
  npm run enhanced-query "async job processing with retries"
  npm run enhanced-query "input validation middleware patterns"
  
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
    "how to implement JWT authentication middleware",
    "database connection pooling and error recovery patterns",
    "async job queue processing with retry mechanisms",
    "input validation with custom error messages",
    "implementing rate limiting for API endpoints"
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

🔍 What RAG Found vs 🤖 What LLM Added:

RAG RETRIEVAL (Vector Search):
• Finds code chunks semantically similar to your query
• Returns raw code with similarity scores
• Good for: "Where is the authentication middleware?"

LLM ENHANCEMENT (Understanding):
• Explains HOW the code works and WHY it's structured that way  
• Connects multiple code pieces into a coherent explanation
• Identifies patterns, potential issues, and implementation details
• Good for: "How does the authentication flow work in practice?"

🚀 ENHANCED RAG = RAG's precision + LLM's comprehension
   Perfect for: Understanding unfamiliar codebases quickly!
`);
}

// Run if called directly
if (require.main === module) {
  runEnhancedCLI().catch(console.error);
}

module.exports = EnhancedRAGQuery;