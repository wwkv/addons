#pragma once

// WS2812 night light ring: color/brightness from settings, smooth fade
// in/out when toggled.

namespace nightlight {

void begin();
void loop();

// Called on state or settings changes; reads stateManager + settings.
void apply();

}  // namespace nightlight
