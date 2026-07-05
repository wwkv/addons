#pragma once

// NTP (Europe/Brussels) with optional DS3231 RTC: the RTC seeds the system
// clock at boot when WiFi/NTP is unavailable and is updated whenever NTP
// syncs, so schedules keep working through outages.

namespace timekeeping {

void begin();
void loop();

bool timeValid();

}  // namespace timekeeping
