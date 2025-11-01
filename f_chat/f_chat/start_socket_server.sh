#!/bin/bash


echo "Starting Chat Socket.IO Server..."

cd "$(dirname "$0")"

export PYTHONPATH="${PYTHONPATH}:$(pwd)/../.."

python3 socket_server.py &

echo $! > socket_server.pid

echo "Socket.IO server started with PID $(cat socket_server.pid)"
echo "Server running on http://127.0.0.1:8001"