# 🚀 QueryCraft - Quick Start Guide

## One-Click Startup (Windows)

### First Time Setup

1. **Install dependencies** (only once):
```bash
npm install
cd server && npm install && cd ..
```

2. **Configure database**:
   - Copy `ENV_TEMPLATE.txt` to `server\src\.env`
   - Edit `server\src\.env` with your database credentials

3. **Build the app** (only once):
```bash
npm run build
```

### Running QueryCraft

**Double-click `START.bat`** - That's it! 🎉

Two windows will open:
- **Backend Server** (port 4000)
- **Frontend Server** (port 3000)

Open your browser: **http://localhost:3000**

### Stopping QueryCraft

**Double-click `STOP.bat`** - Stops all servers

---

## Manual Start (Alternative)

If you prefer manual control:

```bash
# Terminal 1: Backend
cd server\src
node index.js

# Terminal 2: Frontend
npm start
```

---

## Troubleshooting

**Problem**: "Port already in use"
- **Fix**: Run `STOP.bat` first, then `START.bat`

**Problem**: "Cannot connect to database"
- **Fix**: Check `server\src\.env` database credentials

**Problem**: "Models not loading"
- **Fix**: Add `GROQ_API_KEY` to `server\src\.env`

---

## What's Included

✅ **START.bat** - One-click startup
✅ **STOP.bat** - One-click shutdown
✅ **ENV_TEMPLATE.txt** - Configuration template
✅ Production-ready build

---

## For Users

**Minimum Requirements**:
- Windows 10/11
- Node.js 18+
- MySQL database

**Installation**:
1. Extract ZIP
2. Run `npm install` in root folder
3. Run `npm install` in server folder
4. Copy `ENV_TEMPLATE.txt` to `server\src\.env`
5. Edit `.env` with your database info
6. Run `npm run build`
7. Double-click `START.bat`

**That's it!** 🚀
