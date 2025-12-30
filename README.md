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

# Run the unified setup & start script
QueryCraft.bat
```

That's it! The script will interactively guide you through:
1. Configuring your API keys (Azure, Gemini, Groq)
2. Setting up local LLMs (Ollama, Llama.cpp)
3. Installing all dependencies automatically
4. Starting both backend and frontend servers

If you prefer manual control:

```bash
# 1. Install dependencies
npm install
cd server && npm install

# 2. Configure environment
cp ENV_TEMPLATE.txt server/src/.env
# Edit server/src/.env with your database credentials

# 3. Start application
# Windows: Double-click QueryCraft.bat
# Linux: ./start.sh (if available)
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
├── app/                  # Next.js pages and API routes
├── components/           # React UI components
├── server/               # Express backend
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── providers/   # LLM integrations
│   │   ├── libs/        # Utilities
│   │   └── .env         # Configuration
│   └── package.json
├── QueryCraft.bat       # Unified Setup & Start script
└── ENV_TEMPLATE.txt     # Configuration template
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
- Close existing command windows
- Or change `PORT` in `server/src/.env`

## 📚 Documentation

- [Deployment Guide](deployment_guide.md) - Production deployment options
- [Project Structure](PROJECT_STRUCTURE.md) - Detailed architecture
- [Quick Start](QUICKSTART.md) - Step-by-step setup

## 🛡️ Security & Safety

- **Strictly Read-Only**: QueryCraft Engine uses `runSafeSQL` to ensure only `SELECT`, `SHOW`, and `DESCRIBE` queries are executed. 
- **Destructive Block**: Keywords like `DELETE`, `DROP`, `UPDATE`, and `ALTER` are blocked at the code level.
- **Auto-Protection**: The app will **never** attempt to create, edit, or delete your database or its contents.
- **Privacy First**: All your database schema embeddings and results stay on your local machine. No database content is ever uploaded to the cloud.

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
