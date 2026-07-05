#pragma once

// Toddler-facing inputs: the big button and the VL53L0X "wave over the
// device" gesture. Both toggle the night light via stateManager.

namespace triggers {

void begin();
void loop();

}  // namespace triggers
