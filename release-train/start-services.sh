#!/bin/bash
# Release Train Management System - Service Startup Script
# Usage: ./start-services.sh [--build]

set -e

PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SERVER_DIR="$PROJECT_DIR/apps/server"
WEB_DIR="$PROJECT_DIR/apps/web"

# Build flag
BUILD=false

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --build) BUILD=true ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "=== Release Train Management System ==="
echo "Project Directory: $PROJECT_DIR"
echo ""

# Build shared package first
echo "[1/4] Building shared package..."
cd "$PROJECT_DIR/packages/shared"
pnpm run build

# Build server if requested
if [ "$BUILD" = true ]; then
    echo "[2/4] Building server..."
    cd "$SERVER_DIR"
    pnpm run build
fi

# Build web if requested
if [ "$BUILD" = true ]; then
    echo "[3/4] Building web..."
    cd "$WEB_DIR"
    pnpm run build
fi

# Start services
echo "[4/4] Starting services..."
echo ""

# Start backend server in background
echo "Starting Backend Server..."
cd "$SERVER_DIR"
pnpm start &
SERVER_PID=$!
echo "Backend Server PID: $SERVER_PID"
echo ""

# Wait for server to start
sleep 3

# Start frontend dev server in background
echo "Starting Frontend Dev Server..."
cd "$WEB_DIR"
pnpm dev &
WEB_PID=$!
echo "Frontend Dev Server PID: $WEB_PID"
echo ""

echo "=== Services Started ==="
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo ""
echo "To stop services, run:"
echo "  kill $SERVER_PID $WEB_PID"
echo ""

# Keep script running
wait