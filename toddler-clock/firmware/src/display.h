#pragma once

#include <Arduino.h>

// Projection panel (ST7789) rendering + projector lamp control.
//
// Contrast rules implemented here:
//  - every frame is drawn on a pure black background
//  - symbol "off" blanks the panel AND cuts the lamp PWM to 0 (true black)
//  - lamp duty follows settings.lampBrightness (low default) with a gamma
//    curve so the parent-facing % feels linear

namespace display {

void begin();
void loop();  // periodic redraws (clock face minute tick)

// Draw the given symbol and set the lamp accordingly.
// symbol: "off" | "clock" | "test" | built-in id | "custom:<file.png>"
void showSymbol(const String& symbol);

// Re-apply lamp brightness / mirror after settings changed.
void applySettings();

// Built-in icon ids, for the API/UI.
const char* const* builtinIcons(size_t* count);

}  // namespace display
