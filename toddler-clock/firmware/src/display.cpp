#include "display.h"

#include <LittleFS.h>
#include <LovyanGFX.hpp>
#include <time.h>

#include "config.h"
#include "settings.h"

namespace {

class ProjectionPanel : public lgfx::LGFX_Device {
  lgfx::Panel_ST7789 panel_;
  lgfx::Bus_SPI bus_;

 public:
  ProjectionPanel() {
    {
      auto cfg = bus_.config();
      cfg.spi_host = SPI2_HOST;
      cfg.spi_mode = 3;  // most CS-less 240x240 ST7789 modules want mode 3
      cfg.freq_write = 40000000;
      cfg.pin_sclk = PIN_TFT_SCK;
      cfg.pin_mosi = PIN_TFT_MOSI;
      cfg.pin_miso = -1;
      cfg.pin_dc = PIN_TFT_DC;
      bus_.config(cfg);
      panel_.setBus(&bus_);
    }
    {
      auto cfg = panel_.config();
      cfg.pin_cs = PIN_TFT_CS;
      cfg.pin_rst = PIN_TFT_RST;
      cfg.panel_width = 240;
      cfg.panel_height = 240;
      cfg.offset_x = 0;
      cfg.offset_y = 0;
      cfg.invert = true;  // ST7789 240x240 modules are inverted
      panel_.config(cfg);
    }
    setPanel(&panel_);
  }
};

ProjectionPanel lcd;

constexpr uint16_t BLACK = 0x0000;

const char* kBuiltinIcons[] = {"sun", "moon", "star", "smiley", "heart"};

String currentSymbol = "off";
int lastClockMinute = -1;

// ---------------------------------------------------------------------------
// Lamp
// ---------------------------------------------------------------------------

void lampSet(uint8_t percent) {
#if HAS_LAMP
  // Gamma ~2 so the parent-facing percentage feels linear to the eye.
  const uint32_t maxDuty = (1u << LAMP_PWM_BITS) - 1;
  uint32_t duty = (uint32_t)percent * percent * maxDuty / 10000u;
  ledcWrite(LAMP_PWM_CHANNEL, duty);
#endif
}

void lampForSymbol(const String& symbol) {
  lampSet(symbol == "off" ? 0 : settings.lampBrightness);
}

// ---------------------------------------------------------------------------
// Built-in icons (procedural, always on pure black)
// ---------------------------------------------------------------------------

void drawSun() {
  const int cx = 120, cy = 120;
  uint16_t yellow = lcd.color565(255, 210, 40);
  for (int i = 0; i < 12; i++) {
    float a = i * PI / 6;
    lcd.fillTriangle(cx + cosf(a - 0.09f) * 78, cy + sinf(a - 0.09f) * 78,
                     cx + cosf(a + 0.09f) * 78, cy + sinf(a + 0.09f) * 78,
                     cx + cosf(a) * 108, cy + sinf(a) * 108, yellow);
  }
  lcd.fillCircle(cx, cy, 62, yellow);
  // simple face
  lcd.fillCircle(cx - 22, cy - 12, 7, BLACK);
  lcd.fillCircle(cx + 22, cy - 12, 7, BLACK);
  lcd.fillArc(cx, cy + 8, 30, 24, 25, 155, BLACK);
}

void drawMoon() {
  uint16_t pale = lcd.color565(210, 215, 255);
  lcd.fillCircle(120, 120, 80, pale);
  lcd.fillCircle(155, 95, 72, BLACK);  // bite that makes the crescent
  // sleepy stars
  uint16_t dim = lcd.color565(120, 125, 170);
  lcd.fillCircle(70, 60, 4, dim);
  lcd.fillCircle(55, 150, 3, dim);
  lcd.fillCircle(95, 195, 3, dim);
}

void drawStarShape(int cx, int cy, int rOuter, int rInner, uint16_t color) {
  int32_t px[10], py[10];
  for (int i = 0; i < 10; i++) {
    float a = -PI / 2 + i * PI / 5;
    int r = (i % 2 == 0) ? rOuter : rInner;
    px[i] = cx + cosf(a) * r;
    py[i] = cy + sinf(a) * r;
  }
  for (int i = 1; i < 9; i++) {
    lcd.fillTriangle(px[0], py[0], px[i], py[i], px[i + 1], py[i + 1], color);
  }
}

void drawStar() { drawStarShape(120, 120, 100, 42, lcd.color565(255, 220, 60)); }

void drawSmiley() {
  uint16_t yellow = lcd.color565(255, 200, 30);
  lcd.fillCircle(120, 120, 95, yellow);
  lcd.fillCircle(85, 95, 12, BLACK);
  lcd.fillCircle(155, 95, 12, BLACK);
  lcd.fillArc(120, 125, 58, 46, 20, 160, BLACK);
}

void drawHeart() {
  uint16_t red = lcd.color565(255, 60, 80);
  lcd.fillCircle(85, 90, 45, red);
  lcd.fillCircle(155, 90, 45, red);
  lcd.fillTriangle(44, 108, 196, 108, 120, 200, red);
}

void drawClockFace() {
  time_t now = time(nullptr);
  struct tm local;
  localtime_r(&now, &local);

  const int cx = 120, cy = 120, r = 105;
  uint16_t face = lcd.color565(230, 230, 240);
  lcd.drawCircle(cx, cy, r, face);
  lcd.drawCircle(cx, cy, r - 1, face);
  for (int i = 0; i < 12; i++) {
    float a = i * PI / 6;
    int len = (i % 3 == 0) ? 14 : 7;
    lcd.drawLine(cx + cosf(a) * (r - 4 - len), cy + sinf(a) * (r - 4 - len),
                 cx + cosf(a) * (r - 4), cy + sinf(a) * (r - 4), face);
  }
  float ah = ((local.tm_hour % 12) + local.tm_min / 60.0f) * PI / 6 - PI / 2;
  float am = local.tm_min * PI / 30 - PI / 2;
  uint16_t hourCol = lcd.color565(255, 180, 60);
  lcd.drawLine(cx, cy, cx + cosf(ah) * 55, cy + sinf(ah) * 55, hourCol);
  lcd.drawLine(cx, cy - 1, cx + cosf(ah) * 55, cy - 1 + sinf(ah) * 55, hourCol);
  lcd.drawLine(cx, cy, cx + cosf(am) * 85, cy + sinf(am) * 85, face);
  lcd.fillCircle(cx, cy, 4, hourCol);
}

void drawTestPattern() {
  // Checkerboard + frame + center cross: focus and contrast tuning aid.
  const int cell = 24;
  for (int y = 0; y < 240; y += cell) {
    for (int x = 0; x < 240; x += cell) {
      bool white = ((x / cell) + (y / cell)) % 2 == 0;
      lcd.fillRect(x, y, cell, cell, white ? 0xFFFF : BLACK);
    }
  }
  lcd.drawRect(0, 0, 240, 240, lcd.color565(255, 0, 0));
  lcd.drawLine(120, 90, 120, 150, lcd.color565(0, 255, 0));
  lcd.drawLine(90, 120, 150, 120, lcd.color565(0, 255, 0));
}

void drawUnknown(const String& symbol) {
  lcd.setTextColor(lcd.color565(255, 80, 80), BLACK);
  lcd.setTextDatum(lgfx::middle_center);
  lcd.setTextSize(2);
  lcd.drawString("?", 120, 108);
  lcd.setTextSize(1);
  lcd.drawString(symbol.c_str(), 120, 140);
}

void render(const String& symbol) {
  lcd.startWrite();
  lcd.fillScreen(BLACK);

  if (symbol == "off") {
    // black frame, lamp is cut separately
  } else if (symbol == "clock") {
    drawClockFace();
  } else if (symbol == "test") {
    drawTestPattern();
  } else if (symbol == "sun") {
    drawSun();
  } else if (symbol == "moon") {
    drawMoon();
  } else if (symbol == "star") {
    drawStar();
  } else if (symbol == "smiley") {
    drawSmiley();
  } else if (symbol == "heart") {
    drawHeart();
  } else if (symbol.startsWith("custom:")) {
    String path = "/icons/" + symbol.substring(7);
    if (!lcd.drawPngFile(LittleFS, path.c_str(), 0, 0, 240, 240, 0, 0, 1.0f,
                         1.0f, lgfx::middle_center)) {
      drawUnknown(symbol);
    }
  } else {
    drawUnknown(symbol);
  }

  lcd.endWrite();
}

}  // namespace

namespace display {

void begin() {
#if HAS_LAMP
  ledcSetup(LAMP_PWM_CHANNEL, LAMP_PWM_FREQ, LAMP_PWM_BITS);
  ledcAttachPin(PIN_LAMP_PWM, LAMP_PWM_CHANNEL);
  lampSet(0);
#endif
#if HAS_DISPLAY
  lcd.init();
  applySettings();
  render(currentSymbol);
#endif
}

void applySettings() {
#if HAS_DISPLAY
  // Rotations 4-7 are the mirrored variants — the projection lens flips the
  // image, so mirrored rendering makes it read correctly on the ceiling.
  lcd.setRotation(settings.mirror ? 4 : 0);
  render(currentSymbol);
#endif
  lampForSymbol(currentSymbol);
}

void showSymbol(const String& symbol) {
  currentSymbol = symbol;
  lastClockMinute = -1;
#if HAS_DISPLAY
  render(symbol);
#endif
  lampForSymbol(symbol);
}

void loop() {
#if HAS_DISPLAY
  if (currentSymbol == "clock") {
    time_t now = time(nullptr);
    struct tm local;
    localtime_r(&now, &local);
    if (local.tm_min != lastClockMinute) {
      lastClockMinute = local.tm_min;
      render(currentSymbol);
    }
  }
#endif
}

const char* const* builtinIcons(size_t* count) {
  *count = sizeof(kBuiltinIcons) / sizeof(kBuiltinIcons[0]);
  return kBuiltinIcons;
}

}  // namespace display
