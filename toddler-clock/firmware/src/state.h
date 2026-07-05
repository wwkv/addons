#pragma once

#include <Arduino.h>

#include <functional>
#include <vector>

// Single source of truth for what the device is doing. Every input path
// (web app, MQTT/Home Assistant, button, wave sensor, schedule) funnels
// through here, and every output (display, night light, web sockets, MQTT
// state topics) is notified via the change callbacks.

// symbol: "off" | "clock" | "test" | built-in icon id | "custom:<file.png>"
struct DeviceState {
  String symbol = "moon";
  bool nightlightOn = false;
};

class StateManager {
 public:
  void begin();
  void loop();

  const DeviceState& get() const { return state_; }

  void setSymbol(const String& symbol);
  void setNightlight(bool on);
  void toggleNightlight() { setNightlight(!state_.nightlightOn); }

  // Called after any state change (symbol and/or night light).
  void onChange(std::function<void()> cb) { callbacks_.push_back(cb); }

 private:
  void notify();
  void evaluateSchedule();

  DeviceState state_;
  std::vector<std::function<void()>> callbacks_;
  uint32_t nightlightOffAtMs_ = 0;  // 0 = no timeout armed
  int lastScheduleMinute_ = -1;
};

extern StateManager stateManager;
