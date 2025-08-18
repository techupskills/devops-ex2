# 🤖 Codebase RAG (Retrieval-Augmented Generation)

Transform your codebase into an intelligent, searchable knowledge base using RAG technology. Instead of traditional keyword-based search, RAG understands the semantic meaning of code and provides contextually relevant results.

## 🌟 What This Demonstrates

**RAG Value Proposition**: Traditional code search tools like `grep`, IDE search, or GitHub search rely on exact keyword matching. RAG understands concepts, relationships, and intent - making codebase exploration intuitive and powerful.

### Key Benefits:
- **Semantic Understanding**: Find code by describing what you want, not remembering exact keywords
- **Context Awareness**: Understands relationships between different parts of your codebase  
- **Intelligent Ranking**: Returns most relevant results first based on similarity
- **Cross-language Support**: Works across different file types and programming languages
- **Natural Language Queries**: Ask questions in plain English about your code

## 🚀 Quick Start

```bash
# 1. Install dependencies
cd rag
npm install

# 2. Build the RAG database (scans your entire codebase)
npm run build-rag

# 3. Try some queries
npm run query "how to create API endpoints"
npm run query "error handling validation"
npm run query "configuration settings"

# 4. Run the full demo
npm run demo
```

## 🔍 Usage Examples

### Basic Queries
```bash
# Natural language search
npm run query "how do I add new todo items"
npm run query "where are validation errors handled"
npm run query "what testing framework is used"

# Concept-based search  
npm run query "REST API routes"
npm run query "database operations"
npm run query "middleware functions"

# Control preview length (default: 200 characters)
npm run query -- --preview 500 "API endpoints"
npm run query -- --preview 100 "error handling"
```

### Advanced Queries
```bash
# Search by category
npm run query -- --category api-endpoints
npm run query -- --category tests
npm run query -- --category documentation

# Architectural analysis
npm run query -- --analyze architecture
npm run query -- --analyze dependencies
npm run query -- --analyze security

# Database statistics
npm run query -- --stats

# Combine options (preview length with categories/analysis)
npm run query -- --preview 300 --category api-endpoints
npm run query -- --preview 150 --analyze security
```

## 🎯 Demo Scenarios

The demo showcases 5 real-world scenarios that highlight RAG's value:

1. **New Team Member**: "How do I add new features to the API?"
   - RAG finds route definitions without exact keyword matching

2. **Debugging**: "The app returns error 400, where's the validation?"
   - RAG connects error codes with validation logic semantically

3. **DevOps Engineer**: "How is this application configured?"
   - RAG finds configuration across different file types

4. **QA Engineer**: "What testing approach does this project use?"
   - RAG locates both test files AND testing configuration

5. **Platform Engineer**: "How is deployment automated here?"
   - RAG understands CI/CD concepts across various files

## 🔧 How It Works

### 1. Code Analysis & Chunking
- Scans your entire codebase (excluding node_modules, .git, etc.)
- Intelligently splits large files into semantic chunks
- Classifies content types (API routes, tests, config, etc.)

### 2. Embedding Generation
- Uses `all-MiniLM-L6-v2` model to create vector embeddings
- Each code chunk becomes a high-dimensional vector representing its meaning
- Embeddings capture semantic relationships between code concepts

### 3. Vector Storage
- Stores embeddings in ChromaDB vector database
- Includes rich metadata (file paths, content types, line numbers)
- Enables fast similarity search and filtering

### 4. Semantic Search
- Converts your query into the same vector space
- Finds most similar code chunks using cosine similarity
- Returns results ranked by relevance, not keyword frequency

## 📊 What Gets Indexed

**File Types**: `.js`, `.json`, `.md`, `.yml`, `.yaml`, `.sh`, `.py`, `.html`, `.css`, `.txt`

**Content Classification**:
- `api_route` - Express routes and API endpoints
- `test` - Unit tests and test configurations  
- `module` - JavaScript modules and exports
- `package_config` - package.json and dependency configs
- `config` - Configuration files and settings
- `documentation` - README files and docs
- `script` - Shell scripts and automation
- `template` - HTML templates and views
- `stylesheet` - CSS and styling

## 🆚 RAG vs Traditional Search

| Traditional Search | RAG Semantic Search |
|---|---|
| `grep -r "API"` finds text "API" | Understands "API endpoints" means route definitions |
| `grep -r "error"` finds all error text | Connects "400 error" with validation logic |
| `grep -r "config"` finds config text | Recognizes configuration includes dependencies |
| `grep -r "test"` finds test word | Knows testing approach means framework + tests |

## 🛠️ Technical Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Codebase      │───▶│  RAG Builder    │───▶│  ChromaDB       │
│   Files         │    │  - File parsing │    │  - Embeddings   │
│   - .js, .json  │    │  - Chunking     │    │  - Metadata     │
│   - .md, .yml   │    │  - Embedding    │    │  - Vector index │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Query Results │◀───│  RAG Query      │◀───│  User Query     │
│   - Ranked      │    │  - Embed query  │    │  "Find API      │
│   - Contextual  │    │  - Similarity   │    │   routes"       │
│   - Relevant    │    │  - Format       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 💡 Use Cases

### For Development Teams:
- **Onboarding**: New developers can explore codebase intuitively
- **Code Discovery**: Find similar patterns and implementations
- **Documentation**: Understand how features are implemented
- **Debugging**: Locate error handling and edge cases quickly

### For DevOps/SRE:
- **Configuration Management**: Find all configuration touchpoints  
- **Deployment Analysis**: Understand CI/CD pipeline structure
- **Security Auditing**: Locate authentication and authorization code
- **Performance Optimization**: Find performance-critical code paths

### For Product Teams:
- **Feature Planning**: Understand implementation complexity
- **Technical Debt**: Identify areas needing refactoring
- **Risk Assessment**: Find fragile or complex code areas
- **Integration Planning**: Understand system boundaries

## 🔮 Future Enhancements

- **Code Generation**: Use RAG results to suggest code implementations
- **Documentation Generation**: Auto-generate docs from code understanding
- **Refactoring Suggestions**: Identify patterns and suggest improvements  
- **Security Analysis**: Find potential vulnerabilities semantically
- **API Documentation**: Auto-generate API docs from route analysis
- **Test Coverage**: Suggest test cases based on code analysis

## 🤝 Contributing

This RAG implementation is designed to be:
- **Extensible**: Easy to add new content types and analyzers
- **Configurable**: Adjust chunking strategies and embedding models
- **Scalable**: Works with codebases of any size
- **Language Agnostic**: Add support for more programming languages

Ready to make your codebase searchable and intelligent? Start with `npm run demo` to see the magic! ✨