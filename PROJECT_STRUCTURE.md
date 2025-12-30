# QueryCraft Project Structure

```
QueryCraft/
├── UI/                    # Frontend (Next.js)
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── public/           # Static assets
│   ├── package.json
│   └── ...
│
├── server/               # Backend (Express)
│   ├── src/
│   │   ├── index.js     # Main server file
│   │   ├── routes/      # API routes
│   │   ├── libs/        # Utilities
│   │   ├── providers/   # LLM providers
│   │   ├── .env         # Environment config
│   │   └── ...
│   └── package.json
│
├── START.bat            # One-click startup
├── STOP.bat             # One-click shutdown
└── ENV_TEMPLATE.txt     # Config template
```

## Running the App

**One-click start:**
```bash
START.bat
```

**Manual start:**
```bash
# Terminal 1: Backend
cd server\src
node index.js

# Terminal 2: Frontend  
cd UI
npm run dev
```

## Ports
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
