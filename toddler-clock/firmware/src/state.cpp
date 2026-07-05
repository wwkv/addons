#include "state.h"

#include <time.h>

#include "settings.h"

StateManager stateManager;

void StateManager::begin() {
  // Remember which minute we booted in so a schedule entry for the current
  // minute still fires (lastScheduleMinute_ starts at -1).
}

void StateManager::setSymbol(const String& symbol) {
  if (state_.symbol == symbol) return;
  state_.symbol = symbol;
  Serial.printf("[state] symbol -> %s\n", symbol.c_str());
  notify();
}

void StateManager::setNightlight(bool on) {
  if (state_.nightlightOn == on) return;
  state_.nightlightOn = on;
  if (on && settings.nightlight.timeoutS > 0) {
    nightlightOffAtMs_ = millis() + settings.nightlight.timeoutS * 1000UL;
  } else {
    nightlightOffAtMs_ = 0;
  }
  Serial.printf("[state] nightlight -> %s\n", on ? "on" : "off");
  notify();
}

void StateManager::notify() {
  for (auto& cb : callbacks_) cb();
}

void StateManager::evaluateSchedule() {
  if (!settings.scheduleEnabled || settings.schedule.empty()) return;

  time_t now = time(nullptr);
  if (now < 1600000000) return;  // clock not set yet (no NTP/RTC)

  struct tm local;
  localtime_r(&now, &local);
  int minuteOfDay = local.tm_hour * 60 + local.tm_min;
  if (minuteOfDay == lastScheduleMinute_) return;
  lastScheduleMinute_ = minuteOfDay;

  for (const auto& e : settings.schedule) {
    if (e.hh * 60 + e.mm == minuteOfDay) {
      Serial.printf("[state] schedule %02u:%02u -> %s\n", e.hh, e.mm,
                    e.symbol.c_str());
      setSymbol(e.symbol);
    }
  }
}

void StateManager::loop() {
  if (nightlightOffAtMs_ != 0 && (int32_t)(millis() - nightlightOffAtMs_) >= 0) {
    nightlightOffAtMs_ = 0;
    setNightlight(false);
  }
  evaluateSchedule();
}
