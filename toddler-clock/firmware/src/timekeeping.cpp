#include "timekeeping.h"

#include <Arduino.h>
#include <sys/time.h>
#include <time.h>

#include "config.h"

#if HAS_RTC
#include <RTClib.h>
#include <Wire.h>
#endif

namespace {

constexpr time_t kMinValidTime = 1600000000;  // sanity floor (2020-09)

#if HAS_RTC
RTC_DS3231 rtc;
bool rtcOk = false;
bool rtcSynced = false;

void seedFromRtc() {
  if (!rtcOk) return;
  DateTime dt = rtc.now();
  if (dt.unixtime() < (uint32_t)kMinValidTime) return;
  timeval tv;
  tv.tv_sec = (time_t)dt.unixtime();
  tv.tv_usec = 0;
  settimeofday(&tv, nullptr);
  Serial.println("[time] system clock seeded from DS3231");
}
#endif

}  // namespace

namespace timekeeping {

void begin() {
  configTzTime(TZ_INFO, NTP_SERVER);
#if HAS_RTC
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  rtcOk = rtc.begin();
  if (rtcOk) {
    seedFromRtc();
  } else {
    Serial.println("[time] DS3231 not found");
  }
#endif
}

bool timeValid() { return time(nullptr) >= kMinValidTime; }

void loop() {
#if HAS_RTC
  // Once NTP has produced a valid time, push it into the RTC (once per boot).
  if (rtcOk && !rtcSynced && timeValid()) {
    rtcSynced = true;
    rtc.adjust(DateTime((uint32_t)time(nullptr)));
    Serial.println("[time] DS3231 updated from NTP");
  }
#endif
}

}  // namespace timekeeping
