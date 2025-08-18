const fs = require('fs');
const path = require('path');

class SimpleVectorStore {
  constructor(storePath = './vector_store.json') {
    this.storePath = storePath;
    this.data = {
      documents: [],
      embeddings: [],
      metadata: [],
      ids: []
    };
  }

  async initialize() {
    // Load existing data if available
    if (fs.existsSync(this.storePath)) {
      try {
        const rawData = fs.readFileSync(this.storePath, 'utf-8');
        this.data = JSON.parse(rawData);
        console.log(`📚 Loaded ${this.data.documents.length} existing documents`);
      } catch (error) {
        console.log('Starting with empty vector store');
      }
    }
  }

  async add(documents, embeddings, metadata, ids) {
    // Clear existing data
    this.data = {
      documents: [...documents],
      embeddings: [...embeddings],
      metadata: [...metadata],
      ids: [...ids]
    };
    
    // Save to file
    fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2));
    console.log(`💾 Saved ${documents.length} documents to vector store`);
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async query(queryEmbedding, limit = 5, where = null) {
    const similarities = this.data.embeddings.map((embedding, index) => ({
      index,
      similarity: this.cosineSimilarity(queryEmbedding, embedding)
    }));

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Apply filters if provided
    let filteredResults = similarities;
    if (where) {
      filteredResults = similarities.filter(result => {
        const meta = this.data.metadata[result.index];
        return Object.entries(where).every(([key, condition]) => {
          if (condition.$eq) {
            return meta[key] === condition.$eq;
          }
          return true;
        });
      });
    }

    // Limit results
    const topResults = filteredResults.slice(0, limit);

    return {
      ids: [topResults.map(r => this.data.ids[r.index])],
      distances: [topResults.map(r => 1 - r.similarity)], // Convert similarity to distance
      metadatas: [topResults.map(r => this.data.metadata[r.index])],
      documents: [topResults.map(r => this.data.documents[r.index])]
    };
  }

  async count() {
    return this.data.documents.length;
  }

  async get(options = {}) {
    const limit = options.limit || this.data.documents.length;
    const results = {
      ids: this.data.ids.slice(0, limit),
      metadatas: this.data.metadata.slice(0, limit),
      documents: this.data.documents.slice(0, limit)
    };
    return results;
  }
}

module.exports = SimpleVectorStore;