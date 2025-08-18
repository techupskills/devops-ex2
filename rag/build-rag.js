#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const SimpleVectorStore = require('./simple-vector-store');
const { pipeline } = require('@xenova/transformers');

class CodebaseRAGBuilder {
  constructor() {
    this.vectorStore = null;
    this.embedder = null;
    this.codebaseRoot = path.resolve(__dirname, '..');
    this.documents = [];
    this.metadata = [];
    this.ids = [];
  }

  async initialize() {
    console.log('🚀 Initializing RAG builder...');
    
    // Initialize vector store
    this.vectorStore = new SimpleVectorStore(path.join(__dirname, 'vector_store.json'));
    await this.vectorStore.initialize();
    
    // Initialize text embedding pipeline
    console.log('🤖 Loading embedding model...');
    this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('✅ Model loaded successfully');
  }

  shouldIncludeFile(filePath) {
    const excludeDirs = ['node_modules', '.git', 'rag/node_modules', 'coverage', '.nyc_output', 'dist', 'build'];
    const includeExtensions = ['.js', '.json', '.md', '.yml', '.yaml', '.sh', '.py', '.html', '.css', '.txt'];
    
    // Check if file is in excluded directory
    for (const dir of excludeDirs) {
      if (filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`)) {
        return false;
      }
    }
    
    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    return includeExtensions.includes(ext);
  }

  async processDirectory(dirPath = this.codebaseRoot) {
    const relativePath = path.relative(this.codebaseRoot, dirPath);
    console.log(`📁 Processing directory: ${relativePath || '.'}`);
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const relativePath = path.relative(this.codebaseRoot, fullPath);
      
      // Skip node_modules and other excluded directories early
      if (item === 'node_modules' || item === '.git' || item.startsWith('.')) {
        continue;
      }
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.processDirectory(fullPath);
      } else if (this.shouldIncludeFile(fullPath)) {
        await this.processFile(fullPath);
      }
    }
  }

  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(this.codebaseRoot, filePath);
      
      console.log(`📄 Processing: ${relativePath}`);
      
      // Split large files into chunks
      const chunks = this.splitIntoChunks(content, relativePath);
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const id = chunks.length === 1 ? relativePath : `${relativePath}:chunk${i + 1}`;
        
        this.documents.push(chunk.content);
        this.metadata.push({
          file_path: relativePath,
          file_type: path.extname(filePath).substring(1),
          chunk_index: i,
          total_chunks: chunks.length,
          start_line: chunk.startLine,
          end_line: chunk.endLine,
          content_type: this.getContentType(filePath, chunk.content)
        });
        this.ids.push(id);
      }
    } catch (error) {
      console.warn(`⚠️  Skipping ${filePath}: ${error.message}`);
    }
  }

  splitIntoChunks(content, filePath) {
    const lines = content.split('\n');
    const maxChunkSize = 2000; // characters
    const chunks = [];
    
    // For small files, return as single chunk
    if (content.length <= maxChunkSize) {
      return [{
        content,
        startLine: 1,
        endLine: lines.length
      }];
    }
    
    // Split into logical chunks
    let currentChunk = '';
    let startLine = 1;
    let currentLine = 1;
    
    for (const line of lines) {
      if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          startLine,
          endLine: currentLine - 1
        });
        currentChunk = line + '\n';
        startLine = currentLine;
      } else {
        currentChunk += line + '\n';
      }
      currentLine++;
    }
    
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        startLine,
        endLine: lines.length
      });
    }
    
    return chunks;
  }

  getContentType(filePath, content) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.js') {
      if (content.includes('app.get(') || content.includes('app.post(')) return 'api_route';
      if (content.includes('describe(') || content.includes('test(')) return 'test';
      if (content.includes('module.exports')) return 'module';
      return 'javascript';
    }
    
    if (ext === '.json') {
      if (filePath.includes('package.json')) return 'package_config';
      return 'config';
    }
    
    if (ext === '.md') return 'documentation';
    if (ext === '.yml' || ext === '.yaml') return 'config';
    if (ext === '.sh') return 'script';
    if (ext === '.py') return 'python';
    if (ext === '.html') return 'template';
    if (ext === '.css') return 'stylesheet';
    
    return 'text';
  }

  async buildEmbeddings() {
    console.log(`🔍 Building embeddings for ${this.documents.length} code chunks...`);
    
    // Process documents in batches to avoid memory issues
    const batchSize = 10;
    const embeddings = [];
    
    for (let i = 0; i < this.documents.length; i += batchSize) {
      const batch = this.documents.slice(i, i + batchSize);
      console.log(`📊 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(this.documents.length / batchSize)}`);
      
      for (const doc of batch) {
        const output = await this.embedder(doc, { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(output.data));
      }
    }
    
    return embeddings;
  }

  async storeInVectorDB(embeddings) {
    console.log('💾 Storing embeddings in vector store...');
    
    // Store documents with embeddings
    await this.vectorStore.add(this.documents, embeddings, this.metadata, this.ids);
    
    console.log(`✅ Successfully stored ${this.documents.length} code chunks`);
  }

  async build() {
    const startTime = Date.now();
    
    try {
      await this.initialize();
      await this.processDirectory();
      
      console.log(`📈 Found ${this.documents.length} code chunks to process`);
      
      const embeddings = await this.buildEmbeddings();
      await this.storeInVectorDB(embeddings);
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`🎉 RAG database built successfully in ${duration.toFixed(2)}s`);
      
      // Print summary
      const summary = this.generateSummary();
      console.log('\n📊 Summary:');
      console.log(summary);
      
    } catch (error) {
      console.error('❌ Error building RAG database:', error);
      throw error;
    }
  }

  generateSummary() {
    const typeCount = {};
    this.metadata.forEach(meta => {
      typeCount[meta.content_type] = (typeCount[meta.content_type] || 0) + 1;
    });
    
    const fileCount = {};
    this.metadata.forEach(meta => {
      fileCount[meta.file_type] = (fileCount[meta.file_type] || 0) + 1;
    });
    
    return `
- Total chunks: ${this.documents.length}
- Content types: ${Object.entries(typeCount).map(([type, count]) => `${type}(${count})`).join(', ')}
- File types: ${Object.entries(fileCount).map(([type, count]) => `${type}(${count})`).join(', ')}
`;
  }
}

// Run if called directly
if (require.main === module) {
  const builder = new CodebaseRAGBuilder();
  builder.build().catch(console.error);
}

module.exports = CodebaseRAGBuilder;