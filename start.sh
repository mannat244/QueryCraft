#!/bin/bash

# Start backend
cd server/src
node index.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
cd ../../UI
npm start &
FRONTEND_PID=$!

echo "========================================="
echo "   QueryCraft is running!"
echo "========================================="
echo ""
echo "Backend:  http://localhost:4000 (PID: $BACKEND_PID)"
echo "Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
