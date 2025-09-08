#!/bin/bash
echo "🔄 Restarting Docker Desktop..."
killall Docker
sleep 3
open /Applications/Docker.app
echo "⏳ Waiting for Docker Desktop to start..."
while ! docker info >/dev/null 2>&1; do
    sleep 2
    echo "   Still waiting..."
done
echo "✅ Docker Desktop restarted successfully!"
