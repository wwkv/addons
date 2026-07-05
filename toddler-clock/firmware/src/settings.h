#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

#include <vector>

struct NightLightSettings {
  uint8_t r = 255, g = 130, b = 30;  // warm amber default
  uint8_t brightness = 60;           // 0-255
  uint16_t timeoutS = 900;           // auto-off after 15 min; 0 = stay on
};

struct ScheduleEntry {
  uint8_t hh = 7, mm = 0;
  String symbol = "sun";
};

struct Settings {
  String wifiSsid;
  String wifiPass;

  String mqttHost;  // empty = MQTT disabled
  uint16_t mqttPort = 1883;
  String mqttUser;
  String mqttPass;

  // Projector lamp brightness, 0-100 %. Deliberately low default: projected
  // black leakage scales with lamp power, and a dark room needs little light.
  uint8_t lampBrightness = 30;
  bool mirror = true;  // projection lens flips the image
  bool scheduleEnabled = true;

  NightLightSettings nightlight;
  std::vector<ScheduleEntry> schedule;

  void load();
  void save() const;
  // Debounced save: NVS flash shouldn't be written on every slider tick.
  void requestSave();
  void loop();
  void toJson(JsonObject obj, bool includeSecrets) const;
  void fromJson(JsonObjectConst obj);
};

extern Settings settings;
