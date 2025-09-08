#!/bin/bash

# Start ProSearch Intelligence Demo - ELI MOTORS LTD

echo "🔍 Starting ProSearch Intelligence Demo"
echo "======================================"
echo "🏢 ELI MOTORS LTD - Intelligence Platform"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js first: https://nodejs.org/"
    exit 1
fi

# Navigate to prosearch demo directory
cd prosearch-demo

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found in prosearch-demo directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the ProSearch Intelligence demo
echo "🚀 Starting ProSearch Intelligence on port 3001..."
echo ""
echo "🌐 Local URL: http://localhost:3001"
echo "🔗 Professional Tunnel: https://pro-search.eu.ngrok.io"
echo ""
echo "🛑 Press Ctrl+C to stop"
echo ""

# Start the server
npm start
