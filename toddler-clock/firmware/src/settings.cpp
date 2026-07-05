#include "settings.h"

#include <Preferences.h>

Settings settings;

static const char* kNamespace = "toddlerclock";
static const char* kKey = "settings";

void Settings::toJson(JsonObject obj, bool includeSecrets) const {
  obj["wifiSsid"] = wifiSsid;
  if (includeSecrets) {
    obj["wifiPass"] = wifiPass;
    obj["mqttPass"] = mqttPass;
  }
  obj["mqttHost"] = mqttHost;
  obj["mqttPort"] = mqttPort;
  obj["mqttUser"] = mqttUser;
  obj["lampBrightness"] = lampBrightness;
  obj["mirror"] = mirror;
  obj["scheduleEnabled"] = scheduleEnabled;

  JsonObject nl = obj["nightlight"].to<JsonObject>();
  nl["r"] = nightlight.r;
  nl["g"] = nightlight.g;
  nl["b"] = nightlight.b;
  nl["brightness"] = nightlight.brightness;
  nl["timeoutS"] = nightlight.timeoutS;

  JsonArray sched = obj["schedule"].to<JsonArray>();
  for (const auto& e : schedule) {
    JsonObject o = sched.add<JsonObject>();
    char buf[6];
    snprintf(buf, sizeof(buf), "%02u:%02u", e.hh, e.mm);
    o["time"] = buf;
    o["symbol"] = e.symbol;
  }
}

void Settings::fromJson(JsonObjectConst obj) {
  // Only touch fields that are present, so partial updates work.
  if (obj["wifiSsid"].is<const char*>()) wifiSsid = obj["wifiSsid"].as<String>();
  if (obj["wifiPass"].is<const char*>()) wifiPass = obj["wifiPass"].as<String>();
  if (obj["mqttHost"].is<const char*>()) mqttHost = obj["mqttHost"].as<String>();
  if (obj["mqttPort"].is<uint16_t>()) mqttPort = obj["mqttPort"];
  if (obj["mqttUser"].is<const char*>()) mqttUser = obj["mqttUser"].as<String>();
  if (obj["mqttPass"].is<const char*>()) mqttPass = obj["mqttPass"].as<String>();
  if (obj["lampBrightness"].is<uint8_t>())
    lampBrightness = min<uint8_t>(obj["lampBrightness"], 100);
  if (obj["mirror"].is<bool>()) mirror = obj["mirror"];
  if (obj["scheduleEnabled"].is<bool>()) scheduleEnabled = obj["scheduleEnabled"];

  JsonObjectConst nl = obj["nightlight"];
  if (!nl.isNull()) {
    if (nl["r"].is<uint8_t>()) nightlight.r = nl["r"];
    if (nl["g"].is<uint8_t>()) nightlight.g = nl["g"];
    if (nl["b"].is<uint8_t>()) nightlight.b = nl["b"];
    if (nl["brightness"].is<uint8_t>()) nightlight.brightness = nl["brightness"];
    if (nl["timeoutS"].is<uint16_t>()) nightlight.timeoutS = nl["timeoutS"];
  }

  JsonArrayConst sched = obj["schedule"];
  if (!sched.isNull()) {
    schedule.clear();
    for (JsonObjectConst o : sched) {
      ScheduleEntry e;
      const char* t = o["time"] | "";
      unsigned hh, mm;
      if (sscanf(t, "%2u:%2u", &hh, &mm) == 2 && hh < 24 && mm < 60) {
        e.hh = hh;
        e.mm = mm;
        e.symbol = o["symbol"] | "sun";
        schedule.push_back(e);
      }
    }
  }
}

void Settings::load() {
  Preferences prefs;
  prefs.begin(kNamespace, /*readOnly=*/true);
  String json = prefs.getString(kKey, "");
  prefs.end();
  if (json.isEmpty()) return;

  JsonDocument doc;
  if (deserializeJson(doc, json) == DeserializationError::Ok) {
    fromJson(doc.as<JsonObjectConst>());
  }
}

namespace {
uint32_t saveDueAtMs = 0;
}

void Settings::requestSave() { saveDueAtMs = millis() + 2000; }

void Settings::loop() {
  if (saveDueAtMs != 0 && (int32_t)(millis() - saveDueAtMs) >= 0) {
    saveDueAtMs = 0;
    save();
    Serial.println("[settings] saved");
  }
}

void Settings::save() const {
  JsonDocument doc;
  toJson(doc.to<JsonObject>(), /*includeSecrets=*/true);
  String json;
  serializeJson(doc, json);

  Preferences prefs;
  prefs.begin(kNamespace, /*readOnly=*/false);
  prefs.putString(kKey, json);
  prefs.end();
}
