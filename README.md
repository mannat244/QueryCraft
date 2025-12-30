# QueryCraft - AI-Powered SQL Assistant 🚀

Transform natural language into SQL queries with AI. QueryCraft supports multiple LLM providers and offers both fast and deep-thinking modes for intelligent database interactions.

## ✨ Features

- 🤖 **Multiple LLM Support**: Groq, Gemini, Azure OpenAI, Local (Ollama/Llama.cpp)
- ⚡ **Fast Mode**: Quick SQL generation (8-12s)
- 🧠 **Think Mode**: Deep analysis with multi-step reasoning (25-35s)
- 🎯 **Smart Suggestions**: AI-generated questions based on your database schema
- 📊 **Real-time Results**: Streaming responses with live data visualization
- 🔒 **Read-Only Mode**: Safe database exploration
- 🌐 **Modern UI**: Beautiful Next.js interface with dark mode

## 🚀 Quick Start (One Command!)

### Prerequisites
- Node.js 18+ and npm
- MySQL database
- (Optional) API keys for cloud LLMs

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/QueryCraft.git
cd QueryCraft

# Run the setup script
npm run setup
```

That's it! The setup script will:
1. Install all dependencies (UI + server)
2. Create environment file template
3. Guide you through configuration
4. Build the frontend
5. Start the application

## 📝 Manual Setup

If you prefer manual control:

```bash
# 1. Install dependencies
npm install
cd server && npm install && cd ..
cd UI && npm install && cd ..

# 2. Configure environment
cp ENV_TEMPLATE.txt server/src/.env
# Edit server/src/.env with your database credentials

# 3. Build frontend
cd UI && npm run build && cd ..

# 4. Start application
# Windows: Double-click START.bat
# Linux/Mac: ./start.sh
```

## ⚙️ Configuration

Edit `server/src/.env`:

```env
# Database (REQUIRED)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_database

# Default LLM (Recommended)
GROQ_API_KEY=your_groq_key_here

# Optional: Other providers
GEMINI_API_KEY=your_gemini_key
AZURE_APIKEY=your_azure_key
```

## 🎮 Usage

1. **Start the app**: Double-click `START.bat` (Windows) or run `./start.sh` (Linux/Mac)
2. **Open browser**: Navigate to `http://localhost:3000`
3. **Ask questions**: Type natural language queries about your database
4. **Toggle Think Mode**: Enable for deeper analysis and insights

### Example Queries

- "What is the average salary by department?"
- "Show me the top 5 highest paid employees"
- "How many orders were placed last month?"
- "Which products have low stock?"

## 🏗️ Project Structure

```
QueryCraft/
├── UI/                    # Next.js frontend
│   ├── app/              # Pages and API routes
│   ├── components/       # React components
│   └── package.json
├── server/               # Express backend
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── providers/   # LLM integrations
│   │   ├── libs/        # Utilities
│   │   └── .env         # Configuration
│   └── package.json
├── START.bat            # Windows startup
├── start.sh             # Linux/Mac startup
└── ENV_TEMPLATE.txt     # Config template
```

## 🔧 Development

```bash
# Start backend (dev mode)
cd server/src
nodemon index.js

# Start frontend (dev mode)
cd UI
npm run dev
```

## 🐛 Troubleshooting

**Models not loading?**
- Check `GROQ_API_KEY` in `server/src/.env`
- Verify backend is running on port 4000

**Database connection failed?**
- Verify credentials in `server/src/.env`
- Ensure MySQL is running
- Check firewall settings

**Port already in use?**
- Run `STOP.bat` to kill existing processes
- Or change `PORT` in `.env`

## 📚 Documentation

- [Deployment Guide](deployment_guide.md) - Production deployment options
- [Project Structure](PROJECT_STRUCTURE.md) - Detailed architecture
- [Quick Start](QUICKSTART.md) - Step-by-step setup

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use in your projects!

## 🙏 Acknowledgments

- Built with Next.js, Express, and MySQL
- LLM providers: Groq, Google Gemini, Azure OpenAI
- Local inference: Ollama, Llama.cpp

---

**Made with ❤️ for developers who love databases**
