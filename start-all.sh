#!/bin/bash

# Start both frontend and API server for development

echo "🚀 Starting DBTV Playlist Manager..."

# Check if .env exists in server directory
if [ ! -f "./server/.env" ]; then
    echo "⚠️  Warning: server/.env file not found!"
    echo "Please copy server/.env.example to server/.env and configure your R2 credentials."
    echo ""
fi

# Function to kill both processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $FRONTEND_PID $SERVER_PID 2>/dev/null
    exit
}

# Set up trap to catch CTRL+C
trap cleanup INT TERM

# Start the API server
echo "📦 Starting API server on port 3001..."
cd server && npm start &
SERVER_PID=$!
cd ..

# Give server a moment to start
sleep 2

# Start the frontend dev server
echo "🎨 Starting frontend on port 5173..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services started!"
echo "   Frontend: http://localhost:5173"
echo "   API Server: http://localhost:3001/api"
echo ""
echo "Press CTRL+C to stop all services"

# Wait for both processes
wait $FRONTEND_PID $SERVER_PID