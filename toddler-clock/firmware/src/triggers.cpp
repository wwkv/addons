#include "triggers.h"

#include <Arduino.h>

#include "config.h"
#include "state.h"

#if HAS_TOF
#include <VL53L0X.h>
#include <Wire.h>
#endif

namespace {

#if HAS_BUTTON
bool lastStable = true;  // pull-up: true = released
bool lastRead = true;
uint32_t lastEdgeMs = 0;

void pollButton() {
  bool read = digitalRead(PIN_BUTTON);
  if (read != lastRead) {
    lastRead = read;
    lastEdgeMs = millis();
    return;
  }
  if (read != lastStable && millis() - lastEdgeMs >= BUTTON_DEBOUNCE_MS) {
    lastStable = read;
    if (!read) {  // pressed (active low)
      Serial.println("[triggers] button press");
      stateManager.toggleNightlight();
    }
  }
}
#endif

#if HAS_TOF
VL53L0X tof;
bool tofOk = false;
bool handWasNear = false;
uint32_t lastWaveMs = 0;

void pollTof() {
  if (!tofOk) return;
  uint16_t mm = tof.readRangeContinuousMillimeters();
  if (tof.timeoutOccurred()) return;
  bool near = mm < TOF_TRIGGER_MM;
  if (near && !handWasNear && millis() - lastWaveMs > TOF_COOLDOWN_MS) {
    lastWaveMs = millis();
    Serial.printf("[triggers] wave detected (%u mm)\n", mm);
    stateManager.toggleNightlight();
  }
  handWasNear = near;
}
#endif

}  // namespace

namespace triggers {

void begin() {
#if HAS_BUTTON
#ifdef PIN_BUTTON_EXTERNAL_PULLUP
  pinMode(PIN_BUTTON, INPUT);  // input-only pin, external 10k pull-up
#else
  pinMode(PIN_BUTTON, INPUT_PULLUP);
#endif
#endif
#if HAS_TOF
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  tof.setTimeout(100);
  tofOk = tof.init();
  if (tofOk) {
    tof.startContinuous(50);
    Serial.println("[triggers] VL53L0X ready");
  } else {
    Serial.println("[triggers] VL53L0X not found — wave disabled");
  }
#endif
}

void loop() {
#if HAS_BUTTON
  pollButton();
#endif
#if HAS_TOF
  static uint32_t lastPoll = 0;
  if (millis() - lastPoll >= 60) {
    lastPoll = millis();
    pollTof();
  }
#endif
}

}  // namespace triggers
