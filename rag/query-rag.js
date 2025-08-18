#!/usr/bin/env node

const SimpleVectorStore = require('./simple-vector-store');
const { pipeline } = require('@xenova/transformers');
const path = require('path');

class CodebaseRAGQuery {
  constructor() {
    this.vectorStore = null;
    this.embedder = null;
  }

  async initialize() {
    console.log('🔍 Initializing RAG query system...');
    
    // Initialize vector store
    this.vectorStore = new SimpleVectorStore(path.join(__dirname, 'vector_store.json'));
    await this.vectorStore.initialize();
    
    // Check if store has data
    const count = await this.vectorStore.count();
    if (count === 0) {
      throw new Error('RAG database not found. Please run "npm run build-rag" first.');
    }
    
    // Initialize text embedding pipeline
    console.log('🤖 Loading embedding model...');
    this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('✅ Query system ready');
  }

  async query(queryText, options = {}) {
    const {
      limit = 5,
      contentType = null,
      fileType = null,
      includeCode = true
    } = options;

    console.log(`🔎 Searching for: "${queryText}"`);
    
    // Generate embedding for query
    const queryEmbedding = await this.embedder(queryText, { pooling: 'mean', normalize: true });
    
    // Build where clause for filtering
    let whereClause = {};
    if (contentType) {
      whereClause.content_type = { "$eq": contentType };
    }
    if (fileType) {
      whereClause.file_type = { "$eq": fileType };
    }
    
    // Search in vector store
    const results = await this.vectorStore.query(
      Array.from(queryEmbedding.data),
      limit,
      Object.keys(whereClause).length > 0 ? whereClause : undefined
    );

    return this.formatResults(results, includeCode);
  }

  formatResults(results, includeCode = true) {
    const formattedResults = [];
    
    for (let i = 0; i < results.ids[0].length; i++) {
      const result = {
        id: results.ids[0][i],
        score: 1 - results.distances[0][i], // Convert distance to similarity
        metadata: results.metadatas[0][i],
        document: includeCode ? results.documents[0][i] : null
      };
      
      formattedResults.push(result);
    }
    
    return formattedResults;
  }

  displayResults(results, queryText) {
    console.log(`\n🎯 Found ${results.length} relevant results for: "${queryText}"\n`);
    
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.metadata.file_path} (${(result.score * 100).toFixed(1)}% match)`);
      console.log(`   Type: ${result.metadata.content_type} | Lines: ${result.metadata.start_line}-${result.metadata.end_line}`);
      
      if (result.document) {
        const preview = result.document.length > 200 
          ? result.document.substring(0, 200) + '...'
          : result.document;
        console.log(`   Preview: ${preview.replace(/\n/g, '\\n')}`);
      }
      console.log('');
    });
  }

  async searchByCategory(category) {
    const queries = {
      'api-endpoints': 'REST API routes endpoints GET POST PUT DELETE',
      'tests': 'unit tests jest describe test expect',
      'config': 'configuration settings package.json environment variables',
      'documentation': 'README documentation setup instructions',
      'error-handling': 'error handling try catch exception validation',
      'database': 'database data storage persistence todos',
      'middleware': 'middleware express authentication cors',
      'deployment': 'deployment CI/CD Jenkins pipeline build'
    };

    if (!(category in queries)) {
      throw new Error(`Unknown category. Available: ${Object.keys(queries).join(', ')}`);
    }

    return await this.query(queries[category]);
  }

  async analyze(analysis) {
    const analyses = {
      'architecture': 'application architecture structure components modules',
      'dependencies': 'dependencies libraries frameworks packages imports',
      'security': 'security authentication authorization validation sanitization',
      'performance': 'performance optimization caching async await',
      'patterns': 'design patterns MVC REST API structure organization'
    };

    if (!(analysis in analyses)) {
      throw new Error(`Unknown analysis. Available: ${Object.keys(analyses).join(', ')}`);
    }

    return await this.query(analyses[analysis], { limit: 10 });
  }

  async getStats() {
    const count = await this.vectorStore.count();
    
    console.log(`\n📊 RAG Database Statistics:`);
    console.log(`- Total chunks: ${count}`);
    
    // Get sample of metadata to analyze
    const sample = await this.vectorStore.get({ limit: 1000 });
    
    const contentTypes = {};
    const fileTypes = {};
    const files = new Set();
    
    sample.metadatas.forEach(meta => {
      contentTypes[meta.content_type] = (contentTypes[meta.content_type] || 0) + 1;
      fileTypes[meta.file_type] = (fileTypes[meta.file_type] || 0) + 1;
      files.add(meta.file_path);
    });
    
    console.log(`- Unique files: ${files.size}`);
    console.log(`- Content types: ${Object.entries(contentTypes).map(([t, c]) => `${t}(${c})`).join(', ')}`);
    console.log(`- File types: ${Object.entries(fileTypes).map(([t, c]) => `${t}(${c})`).join(', ')}\n`);
  }
}

// CLI interface
async function runCLI() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔍 CodeRAG Query Tool

Usage:
  node query-rag.js "search query"              - Search codebase
  node query-rag.js --category api-endpoints    - Search by category
  node query-rag.js --analyze architecture      - Analyze codebase
  node query-rag.js --stats                     - Show database stats
  
Categories: api-endpoints, tests, config, documentation, error-handling, database, middleware, deployment
Analyses: architecture, dependencies, security, performance, patterns
`);
    return;
  }
  
  const querySystem = new CodebaseRAGQuery();
  await querySystem.initialize();
  
  if (args[0] === '--stats') {
    await querySystem.getStats();
  } else if (args[0] === '--category' && args[1]) {
    const results = await querySystem.searchByCategory(args[1]);
    querySystem.displayResults(results, `Category: ${args[1]}`);
  } else if (args[0] === '--analyze' && args[1]) {
    const results = await querySystem.analyze(args[1]);
    querySystem.displayResults(results, `Analysis: ${args[1]}`);
  } else {
    const query = args.join(' ');
    const results = await querySystem.query(query);
    querySystem.displayResults(results, query);
  }
}

// Run if called directly
if (require.main === module) {
  runCLI().catch(console.error);
}

module.exports = CodebaseRAGQuery;