#!/usr/bin/with-contenv bashio

echo "Starting Squirrel..."

# Navigate to the backend folder
cd /app/backend

# Store data in HA's persistent config directory so it survives updates
export DATA_DIR=/config

# Start the node application
node server.js