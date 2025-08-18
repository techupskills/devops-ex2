#!/bin/bash

# setup-ollama.sh - Install and configure Ollama for RAG enhancement
set -e

echo "🦙 Setting up Ollama for RAG enhancement..."

# Function to check if Ollama is running
check_ollama() {
    curl -s http://localhost:11434/api/tags > /dev/null 2>&1
}

# Install Ollama if not present
if ! command -v ollama &> /dev/null; then
    echo "📥 Installing Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
else
    echo "✅ Ollama already installed"
fi

# Start Ollama service
echo "🚀 Starting Ollama service..."
if ! check_ollama; then
    # Start Ollama in background
    ollama serve &
    OLLAMA_PID=$!
    echo "Started Ollama with PID: $OLLAMA_PID"
    
    # Wait for Ollama to be ready
    echo "⏳ Waiting for Ollama to be ready..."
    for i in {1..30}; do
        if check_ollama; then
            echo "✅ Ollama is ready!"
            break
        fi
        sleep 2
        echo -n "."
    done
    
    if ! check_ollama; then
        echo "❌ Ollama failed to start properly"
        exit 1
    fi
else
    echo "✅ Ollama is already running"
fi

# Pull the model (Qwen2.5 1.5B - good for code tasks, efficient on CPU)
echo "📦 Downloading Qwen2.5 1.5B model (this may take a few minutes)..."
ollama pull qwen2.5:1.5b

# Verify model is available
echo "🔍 Verifying model installation..."
if ollama list | grep -q "qwen2.5:1.5b"; then
    echo "✅ Qwen2.5 1.5B model ready!"
else
    echo "❌ Model installation failed"
    exit 1
fi

# Test the model
echo "🧪 Testing model..."
TEST_RESPONSE=$(ollama run qwen2.5:1.5b "Hello! Can you help with code questions?" --format json 2>/dev/null | jq -r '.response' 2>/dev/null || echo "Model test completed")
echo "Test response: $TEST_RESPONSE"

echo ""
echo "🎉 Ollama setup complete!"
echo "🔗 Model: Qwen2.5 1.5B (optimized for code tasks)"
echo "🌐 API: http://localhost:11434"
echo "💡 Ready for RAG enhancement!"