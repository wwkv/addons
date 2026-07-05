#include <Arduino.h>
#include <ArduinoOTA.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <LittleFS.h>
#include <WiFi.h>

#include "config.h"
#include "display.h"
#include "mqtt.h"
#include "nightlight.h"
#include "settings.h"
#include "state.h"
#include "timekeeping.h"
#include "triggers.h"
#include "webserver.h"

namespace {

DNSServer dnsServer;
bool apMode = false;

void startWifi() {
  WiFi.setHostname(DEVICE_HOSTNAME);

  if (!settings.wifiSsid.isEmpty()) {
    Serial.printf("[wifi] connecting to %s\n", settings.wifiSsid.c_str());
    WiFi.mode(WIFI_STA);
    WiFi.begin(settings.wifiSsid.c_str(), settings.wifiPass.c_str());
    if (WiFi.waitForConnectResult(15000) == WL_CONNECTED) {
      Serial.printf("[wifi] connected, http://%s.local (%s)\n", DEVICE_HOSTNAME,
                    WiFi.localIP().toString().c_str());
      WiFi.setAutoReconnect(true);
      return;
    }
    Serial.println("[wifi] connect failed");
  }

  // No credentials or connect failed: open the setup AP with captive portal.
  Serial.println("[wifi] starting setup AP " SETUP_AP_SSID);
  apMode = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP(SETUP_AP_SSID, SETUP_AP_PASS);
  dnsServer.start(53, "*", WiFi.softAPIP());
  Serial.printf("[wifi] AP up, http://%s\n", WiFi.softAPIP().toString().c_str());
}

}  // namespace

void setup() {
  Serial.begin(115200);
  Serial.println("\n[boot] toddler projection clock");

  if (!LittleFS.begin(true)) {
    Serial.println("[boot] LittleFS mount failed");
  }

  settings.load();

  stateManager.begin();
  display::begin();
  nightlight::begin();
  triggers::begin();

  startWifi();
  timekeeping::begin();

  MDNS.begin(DEVICE_HOSTNAME);
  MDNS.addService("http", "tcp", 80);

  webserver::begin();
  mqtt::begin();

  ArduinoOTA.setHostname(DEVICE_HOSTNAME);
  ArduinoOTA.begin();

  // Fan every state change out to all outputs.
  stateManager.onChange([]() {
    display::showSymbol(stateManager.get().symbol);
    webserver::broadcastState();
    mqtt::publishState();
  });

  // Show the current symbol now that everything is up.
  display::showSymbol(stateManager.get().symbol);
}

void loop() {
  if (apMode) dnsServer.processNextRequest();
  stateManager.loop();
  display::loop();
  nightlight::loop();
  triggers::loop();
  timekeeping::loop();
  webserver::loop();
  mqtt::loop();
  settings.loop();
  ArduinoOTA.handle();
}
