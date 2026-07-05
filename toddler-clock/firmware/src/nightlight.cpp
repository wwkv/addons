#include "nightlight.h"

#include <Arduino.h>

#include "config.h"
#include "settings.h"
#include "state.h"

#if HAS_RING
#include <FastLED.h>

namespace {
CRGB leds[RING_NUM_LEDS];
uint8_t currentLevel = 0;  // fade position, 0..255
uint32_t lastStepMs = 0;
constexpr uint8_t FADE_STEP = 8;       // per tick
constexpr uint32_t FADE_TICK_MS = 20;  // full fade ~0.6 s

void show(uint8_t level) {
  const auto& nl = settings.nightlight;
  CRGB color = CRGB(nl.r, nl.g, nl.b);
  color.nscale8_video(scale8(nl.brightness, level));
  fill_solid(leds, RING_NUM_LEDS, level == 0 ? CRGB::Black : color);
  FastLED.show();
}
}  // namespace
#endif

namespace nightlight {

void begin() {
#if HAS_RING
  FastLED.addLeds<WS2812B, PIN_RING_DATA, GRB>(leds, RING_NUM_LEDS);
  show(0);
#endif
}

void apply() {
#if HAS_RING
  // If already fully on, re-show immediately so live color/brightness
  // tweaks in the web app are visible while adjusting.
  if (stateManager.get().nightlightOn && currentLevel == 255) show(255);
#endif
}

void loop() {
#if HAS_RING
  uint8_t target = stateManager.get().nightlightOn ? 255 : 0;
  if (currentLevel == target) return;
  uint32_t now = millis();
  if (now - lastStepMs < FADE_TICK_MS) return;
  lastStepMs = now;
  if (target > currentLevel) {
    currentLevel = qadd8(currentLevel, FADE_STEP);
  } else {
    currentLevel = qsub8(currentLevel, FADE_STEP);
  }
  show(currentLevel);
#endif
}

}  // namespace nightlight
