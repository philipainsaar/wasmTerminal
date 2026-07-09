#include <stdint.h>

/*
  This is intentionally safe: it only runs inside the browser WebAssembly sandbox.
  It does not read real CPU instructions, RAM contents, sensors, drivers, or internal hardware.
*/

static uint32_t seed = 0xC0FFEE11u;

__attribute__((export_name("scanTick")))
int scanTick(int frame) {
  seed = seed * 1664525u + 1013904223u + (uint32_t)frame;
  return (int)((seed >> 16) & 4095u);
}

__attribute__((export_name("noise2")))
int noise2(int x, int y) {
  uint32_t n = (uint32_t)x * 374761393u + (uint32_t)y * 668265263u + seed;
  n = (n ^ (n >> 13u)) * 1274126177u;
  n ^= n >> 16u;
  return (int)(n & 1023u);
}

__attribute__((export_name("pulse")))
float pulse(float t) {
  int whole = (int)t;
  float x = t - (float)whole;
  if (x < 0.0f) x = -x;
  return x < 0.5f ? x * 2.0f : (1.0f - x) * 2.0f;
}

__attribute__((export_name("getMagic")))
int getMagic(void) {
  return 0xDC2026;
}
