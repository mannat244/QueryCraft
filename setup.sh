#!/bin/bash
set -e

echo "🚀 QueryCraft Setup"
echo "=================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo "   - Root dependencies..."
npm install --silent

echo "   - Server dependencies..."
cd server && npm install --silent && cd ..

echo "   - UI dependencies..."
cd UI && npm install --silent && cd ..

echo "✅ Dependencies installed"
echo ""

# Setup environment
echo "⚙️  Setting up environment..."
if [ ! -f server/src/.env ]; then
    cp ENV_TEMPLATE.txt server/src/.env
    echo "✅ Created server/src/.env from template"
    echo ""
    echo "⚠️  IMPORTANT: Edit server/src/.env with your database credentials!"
    echo ""
else
    echo "✅ server/src/.env already exists"
fi

# Build frontend
echo "🔨 Building frontend..."
cd UI && npm run build --silent && cd ..
echo "✅ Frontend built successfully"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit server/src/.env with your database credentials"
echo "2. (Optional) Add API keys for cloud LLMs"
echo "3. Run: ./start.sh"
echo ""
echo "Or double-click START.bat on Windows"
