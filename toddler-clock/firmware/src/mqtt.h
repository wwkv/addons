#pragma once

// MQTT with Home Assistant discovery. When settings.mqttHost is set, the
// device announces itself and HA shows:
//   - select:  projected symbol
//   - light:   night light (on/off, brightness, RGB)
//   - number:  projector lamp brightness (%)
// Symbol schedules can then be plain HA automations.

namespace mqtt {

void begin();
void loop();

// Push current state to the state topics (called on any state change).
void publishState();

}  // namespace mqtt
