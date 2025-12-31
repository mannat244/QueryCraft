# 🚀 QueryCraft - Quick Start Guide

## One-Click Startup (Recommended)

1. **Extract the ZIP** file.
2. **Double-click `QueryCraft.bat`**.

That's it! The script will guide you through:
- Installing Node.js dependencies automatically.
- Configuring your LLM (Groq, Gemini, Azure, or Local).
- Starting the servers and opening your browser.

---

## Technical Details

If you prefer to run things manually:

1. **Root Folder**: `npm install`
2. **Server Folder**: `cd server && npm install`
3. **Build Frontend**: `npm run build`
4. **Start Backend**: `cd server/src && node index.js`
5. **Start Frontend**: `npm start`

---

## Stopping QueryCraft

Simply close the two command prompt windows that are running the Backend and Frontend services.

---

## Minimum Requirements
- **OS**: Windows 10/11
- **Node**: Node.js 18+
- **Database**: MySQL 5.7+ or MariaDB
