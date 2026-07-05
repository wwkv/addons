#pragma once

// Async web server: serves the parent web app from LittleFS, exposes the
// REST API, pushes live state to connected clients over a WebSocket, and
// accepts custom icon uploads (240x240 PNG on black, see docs).

namespace webserver {

void begin();
void loop();

// Broadcast current state to all WebSocket clients (called on state change).
void broadcastState();

}  // namespace webserver
