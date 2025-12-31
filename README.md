# QueryCraft - AI-Powered Data Analyst 🚀

Your conversational AI data analyst. Ask questions in plain English, get instant insights - no SQL knowledge required.

## ✨ Features

- 🤖 **Multi-Provider Support**: Seamlessly switch between Groq, Gemini, Azure OpenAI, and Local LLMs.
- ⚡ **Instant Insights**: Get answers to your data questions in seconds (1-2s).
- 🧠 **Deep Analysis**: Complex reasoning for comprehensive insights (10-15s).
- 🎯 **Smart Suggestions**: AI recommends questions based on your database schema.
- 📊 **Conversational Interface**: Ask follow-up questions naturally, like talking to an analyst.
- 🔒 **Read-Only Safety**: Strictly executes `SELECT`, `SHOW`, and `DESCRIBE` to keep your data safe.
- 🌐 **Modern UI**: Sleek, responsive Next.js interface with dark mode.

---

## 🚀 Getting Started

QueryCraft is designed for ease of use. You don't need to manually configure environment files or install dependencies step-by-step.

### 1. Prerequisites
- **Node.js 18+** installed on your system.
- **MySQL Database** (must be reachable).

### 2. Run the Unified Setup
Simply double-click:
👉 **`QueryCraft.bat`**

This script handles **everything**:
1. Checks for required ports (3000 & 4000).
2. Sets up your `.env` configuration interactively.
3. Automatically installs all dependencies (`npm install`).
4. Offers to build the production frontend.
5. Launches both backend and frontend servers.
6. Automatically opens your browser.

---

## 🔑 How to Get API Keys

QueryCraft works best when connected to a powerful LLM. Here is how to get your keys:

### 1. Groq (Recommended - Free & Fast)
- **Visit**: [Groq Console](https://console.groq.com/keys)
- **Steps**: Create a free account, go to "API Keys", and click "Create API Key".
- **Why?**: It offers the fastest response times for SQL generation.

### 2. Google Gemini
- **Visit**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Steps**: Click "Create API key" and copy the key.
- **Why?**: Excellent reasoning capabilities and a large free tier.

### 3. Azure OpenAI
- **Visit**: [Azure Portal](https://portal.azure.com)
- **Steps**: Navigate to your Azure OpenAI resource, go to "Keys and Endpoint". You will also need your **Deployment Name** and **Endpoint URL**.

---

## 🏠 Running Local Models

For 100% privacy and no cost, you can run QueryCraft entirely on your machine.

### Option A: GGUF Files (Quickest - CPU Only)
1. Download any GGUF model from [Hugging Face](https://huggingface.co/models?search=gguf).
2. When `QueryCraft.bat` asks about Llama.cpp, choose **Y**.
3. Place your `.gguf` file in `server\src\localLLM\models`.

**No installation needed** - just download and run on CPU!

### Option B: Ollama (Alternative)
1. Download and install [Ollama](https://ollama.com).
2. Run `ollama run gemma3:4b` in your terminal to download the model.
3. When `QueryCraft.bat` asks if you want to use Ollama, choose **Y**.

---

## 🔧 Usage Tips

- **Reconfiguration**: If you need to change your API keys later, just run `QueryCraft.bat` and press **'R'** within 2 seconds of the startup.
- **Production vs Dev**: Production mode is much faster and cleaner (no hydration warnings), but requires a build step the first time.
- **Stop Services**: Simply close the command prompt windows opened by the script.

## 🧪 Evaluation

QueryCraft includes a robust evaluation suite to measure SQL generation accuracy.

- **Dataset**: [eval.json](server/eval.json) (Natural language queries + Ground Truth SQL)

## 🛡️ Security

- **Safe Execution**: All queries are passed through a `runSafeSQL` layer that blocks `DELETE`, `DROP`, `UPDATE`, and `ALTER`.
- **Local Vectors**: Your database schema embeddings are stored locally (using Vectra), ensuring your data structure never leaves your machine.

---
**Made with ❤️ for developers who love databases**
