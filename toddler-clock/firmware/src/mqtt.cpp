#include "mqtt.h"

#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>

#include "config.h"
#include "display.h"
#include "nightlight.h"
#include "settings.h"
#include "state.h"

namespace {

WiFiClient net;
PubSubClient client(net);
uint32_t lastAttemptMs = 0;

const char* kBase = "toddlerclock";

String topic(const char* suffix) { return String(kBase) + "/" + suffix; }

void publishDiscovery() {
  // Shared device block so all entities group under one HA device.
  auto addDevice = [](JsonObject root) {
    JsonObject dev = root["device"].to<JsonObject>();
    dev["identifiers"].to<JsonArray>().add(kBase);
    dev["name"] = "Toddler Clock";
    dev["manufacturer"] = "DIY";
    dev["model"] = "Projection sleep trainer";
  };
  auto publish = [](const String& t, JsonDocument& doc) {
    String payload;
    serializeJson(doc, payload);
    client.publish(t.c_str(), payload.c_str(), /*retained=*/true);
  };

  {
    JsonDocument doc;
    doc["name"] = "Symbol";
    doc["unique_id"] = "toddlerclock_symbol";
    doc["state_topic"] = topic("symbol/state");
    doc["command_topic"] = topic("symbol/set");
    doc["availability_topic"] = topic("status");
    JsonArray opts = doc["options"].to<JsonArray>();
    opts.add("off");
    opts.add("clock");
    size_t n;
    const char* const* icons = display::builtinIcons(&n);
    for (size_t i = 0; i < n; i++) opts.add(icons[i]);
    doc["icon"] = "mdi:projector";
    addDevice(doc.as<JsonObject>());
    publish("homeassistant/select/toddlerclock/symbol/config", doc);
  }
  {
    JsonDocument doc;
    doc["name"] = "Night light";
    doc["unique_id"] = "toddlerclock_nightlight";
    doc["schema"] = "json";
    doc["state_topic"] = topic("light/state");
    doc["command_topic"] = topic("light/set");
    doc["availability_topic"] = topic("status");
    doc["brightness"] = true;
    doc["supported_color_modes"].to<JsonArray>().add("rgb");
    addDevice(doc.as<JsonObject>());
    publish("homeassistant/light/toddlerclock/nightlight/config", doc);
  }
  {
    JsonDocument doc;
    doc["name"] = "Projector brightness";
    doc["unique_id"] = "toddlerclock_lamp";
    doc["state_topic"] = topic("lamp/state");
    doc["command_topic"] = topic("lamp/set");
    doc["availability_topic"] = topic("status");
    doc["min"] = 0;
    doc["max"] = 100;
    doc["unit_of_measurement"] = "%";
    doc["icon"] = "mdi:brightness-6";
    addDevice(doc.as<JsonObject>());
    publish("homeassistant/number/toddlerclock/lamp/config", doc);
  }
}

void onMessage(char* rawTopic, byte* payload, unsigned int length) {
  String t(rawTopic);
  String body;
  body.reserve(length);
  for (unsigned int i = 0; i < length; i++) body += (char)payload[i];

  if (t == topic("symbol/set")) {
    stateManager.setSymbol(body);
  } else if (t == topic("lamp/set")) {
    settings.lampBrightness = constrain(body.toInt(), 0, 100);
    settings.requestSave();
    display::applySettings();
    mqtt::publishState();
  } else if (t == topic("light/set")) {
    JsonDocument doc;
    if (deserializeJson(doc, body) != DeserializationError::Ok) return;
    if (doc["brightness"].is<uint8_t>()) {
      settings.nightlight.brightness = doc["brightness"];
      settings.requestSave();
    }
    JsonObject color = doc["color"];
    if (!color.isNull()) {
      settings.nightlight.r = color["r"] | settings.nightlight.r;
      settings.nightlight.g = color["g"] | settings.nightlight.g;
      settings.nightlight.b = color["b"] | settings.nightlight.b;
      settings.requestSave();
    }
    nightlight::apply();
    const char* st = doc["state"] | "";
    if (strcmp(st, "ON") == 0) stateManager.setNightlight(true);
    if (strcmp(st, "OFF") == 0) stateManager.setNightlight(false);
    mqtt::publishState();  // even if only color changed
  }
}

void onConnected() {
  client.publish(topic("status").c_str(), "online", /*retained=*/true);
  client.subscribe(topic("symbol/set").c_str());
  client.subscribe(topic("light/set").c_str());
  client.subscribe(topic("lamp/set").c_str());
  publishDiscovery();
  mqtt::publishState();
  Serial.println("[mqtt] connected");
}

}  // namespace

namespace mqtt {

void begin() {
  client.setBufferSize(1024);
  client.setCallback(onMessage);
}

void publishState() {
  if (!client.connected()) return;

  client.publish(topic("symbol/state").c_str(),
                 stateManager.get().symbol.c_str(), true);

  char lamp[8];
  snprintf(lamp, sizeof(lamp), "%u", settings.lampBrightness);
  client.publish(topic("lamp/state").c_str(), lamp, true);

  JsonDocument doc;
  doc["state"] = stateManager.get().nightlightOn ? "ON" : "OFF";
  doc["brightness"] = settings.nightlight.brightness;
  JsonObject color = doc["color"].to<JsonObject>();
  color["r"] = settings.nightlight.r;
  color["g"] = settings.nightlight.g;
  color["b"] = settings.nightlight.b;
  String payload;
  serializeJson(doc, payload);
  client.publish(topic("light/state").c_str(), payload.c_str(), true);
}

void loop() {
  if (settings.mqttHost.isEmpty() || WiFi.status() != WL_CONNECTED) return;

  if (!client.connected()) {
    if (millis() - lastAttemptMs < 5000) return;
    lastAttemptMs = millis();
    client.setServer(settings.mqttHost.c_str(), settings.mqttPort);
    bool ok = client.connect(
        kBase, settings.mqttUser.isEmpty() ? nullptr : settings.mqttUser.c_str(),
        settings.mqttPass.isEmpty() ? nullptr : settings.mqttPass.c_str(),
        topic("status").c_str(), 0, true, "offline");
    if (ok) onConnected();
    return;
  }
  client.loop();
}

}  // namespace mqtt
