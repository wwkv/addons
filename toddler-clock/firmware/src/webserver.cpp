#include "webserver.h"

#include <ArduinoJson.h>
#include <AsyncJson.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <WiFi.h>
#include <time.h>

#include "config.h"
#include "display.h"
#include "nightlight.h"
#include "settings.h"
#include "state.h"

namespace {

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
bool rebootRequested = false;
uint32_t rebootAtMs = 0;

String stateJson() {
  JsonDocument doc;
  doc["symbol"] = stateManager.get().symbol;
  doc["nightlightOn"] = stateManager.get().nightlightOn;

  JsonArray icons = doc["icons"].to<JsonArray>();
  size_t n;
  const char* const* builtin = display::builtinIcons(&n);
  for (size_t i = 0; i < n; i++) icons.add(builtin[i]);

  JsonArray custom = doc["customIcons"].to<JsonArray>();
  File dir = LittleFS.open("/icons");
  if (dir && dir.isDirectory()) {
    for (File f = dir.openNextFile(); f; f = dir.openNextFile()) {
      custom.add(String(f.name()));
    }
  }

  time_t now = time(nullptr);
  struct tm local;
  localtime_r(&now, &local);
  char buf[6];
  snprintf(buf, sizeof(buf), "%02d:%02d", local.tm_hour, local.tm_min);
  doc["time"] = buf;
  doc["timeValid"] = now >= 1600000000;

  doc["wifi"] = WiFi.status() == WL_CONNECTED;
  doc["rssi"] = WiFi.RSSI();
  doc["ip"] = WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString()
                                            : WiFi.softAPIP().toString();

  String out;
  serializeJson(doc, out);
  return out;
}

String sanitizeName(String name) {
  String out;
  for (char c : name) {
    if (isalnum(c) || c == '-' || c == '_' || c == '.') out += c;
  }
  return out;
}

void setupApi() {
  server.on("/api/state", HTTP_GET, [](AsyncWebServerRequest* req) {
    req->send(200, "application/json", stateJson());
  });

  server.addHandler(new AsyncCallbackJsonWebHandler(
      "/api/state", [](AsyncWebServerRequest* req, JsonVariant& json) {
        JsonObjectConst obj = json.as<JsonObjectConst>();
        if (obj["symbol"].is<const char*>())
          stateManager.setSymbol(obj["symbol"].as<String>());
        if (obj["nightlightOn"].is<bool>())
          stateManager.setNightlight(obj["nightlightOn"]);
        req->send(200, "application/json", stateJson());
      }));

  server.on("/api/settings", HTTP_GET, [](AsyncWebServerRequest* req) {
    JsonDocument doc;
    settings.toJson(doc.to<JsonObject>(), /*includeSecrets=*/false);
    String out;
    serializeJson(doc, out);
    req->send(200, "application/json", out);
  });

  server.addHandler(new AsyncCallbackJsonWebHandler(
      "/api/settings", [](AsyncWebServerRequest* req, JsonVariant& json) {
        JsonObjectConst obj = json.as<JsonObjectConst>();
        String oldSsid = settings.wifiSsid, oldPass = settings.wifiPass;
        String oldMqtt = settings.mqttHost;
        settings.fromJson(obj);
        settings.save();
        display::applySettings();
        nightlight::apply();
        bool rebootNeeded = settings.wifiSsid != oldSsid ||
                            settings.wifiPass != oldPass ||
                            settings.mqttHost != oldMqtt;
        JsonDocument resp;
        resp["ok"] = true;
        resp["rebootRequired"] = rebootNeeded;
        String out;
        serializeJson(resp, out);
        req->send(200, "application/json", out);
        webserver::broadcastState();
      }));

  // Custom icon upload: multipart form, field "file", PNG only.
  server.on(
      "/api/icons", HTTP_POST,
      [](AsyncWebServerRequest* req) {
        req->send(200, "application/json", "{\"ok\":true}");
        webserver::broadcastState();
      },
      [](AsyncWebServerRequest* req, String filename, size_t index,
         uint8_t* data, size_t len, bool final) {
        static File upload;
        if (index == 0) {
          String name = sanitizeName(filename);
          if (!name.endsWith(".png")) {
            return;  // silently drop non-PNG; UI enforces this too
          }
          LittleFS.mkdir("/icons");
          upload = LittleFS.open("/icons/" + name, "w");
          Serial.printf("[web] icon upload: %s\n", name.c_str());
        }
        if (upload) upload.write(data, len);
        if (final && upload) upload.close();
      });

  server.on("/api/icons", HTTP_DELETE, [](AsyncWebServerRequest* req) {
    if (!req->hasParam("name")) {
      req->send(400, "application/json", "{\"error\":\"name required\"}");
      return;
    }
    String name = sanitizeName(req->getParam("name")->value());
    bool ok = LittleFS.remove("/icons/" + name);
    req->send(ok ? 200 : 404, "application/json",
              ok ? "{\"ok\":true}" : "{\"error\":\"not found\"}");
    webserver::broadcastState();
  });

  // Serve uploaded icons so the web app can show previews.
  server.serveStatic("/icons/", LittleFS, "/icons/");

  server.on("/api/reboot", HTTP_POST, [](AsyncWebServerRequest* req) {
    req->send(200, "application/json", "{\"ok\":true}");
    rebootRequested = true;
    rebootAtMs = millis() + 500;  // let the response flush first
  });
}

}  // namespace

namespace webserver {

void begin() {
  ws.onEvent([](AsyncWebSocket*, AsyncWebSocketClient* client, AwsEventType type,
                void*, uint8_t*, size_t) {
    if (type == WS_EVT_CONNECT) client->text(stateJson());
  });
  server.addHandler(&ws);

  setupApi();

  server.serveStatic("/", LittleFS, "/www/").setDefaultFile("index.html");

  // Captive-portal friendliness in setup-AP mode: send unknown paths to the
  // app instead of a bare 404.
  server.onNotFound([](AsyncWebServerRequest* req) {
    if (WiFi.getMode() & WIFI_MODE_AP) {
      req->redirect("/");
    } else {
      req->send(404, "text/plain", "not found");
    }
  });

  server.begin();
  Serial.println("[web] server started");
}

void broadcastState() { ws.textAll(stateJson()); }

void loop() {
  ws.cleanupClients();
  if (rebootRequested && (int32_t)(millis() - rebootAtMs) >= 0) {
    ESP.restart();
  }
}

}  // namespace webserver
