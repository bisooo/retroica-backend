#!/bin/bash
echo "🚀 Starting Retroica Development Environment..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    cd ../retroica-backend  # Go back to backend directory
    docker-compose down
    echo "✅ Services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Start backend services in background
echo "📦 Starting backend services..."
docker-compose up -d

# Wait for backend port to be available
echo "⏳ Waiting for backend to be ready..."
until nc -z localhost 9000; do
    echo "   ... backend not ready yet"
    sleep 2
done

echo "✅ Backend is ready!"

# Show what's running
docker-compose ps

# Start frontend
cd ../retroica
echo "🎨 Starting frontend..."
echo ""
echo "✅ Backend API: http://localhost:9000"
echo "⚙️  Admin Dashboard: http://localhost:9000/app"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start frontend (blocks here until Ctrl+C)
npm run dev