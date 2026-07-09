# Wasm Machine Core V3

A safe **Next.js + Three.js + WebAssembly** diagnostic-style website.

## Version 3 changes

- Removed the lightning glyph and other non-ASCII glitch symbols from the generated terminal output
- Uses ASCII-only glitch text such as `##`, `@@`, `%%`, `!!`, `??`, `//`, `<<`, and `>>`
- Adds a real image file background: `public/background-360.jpg`
- Uses the image as a 360-degree rotating Three.js sphere behind the machine core
- Keeps the multi-column assembly text flood from V2
- Keeps the no-window and no-button layout

## Run

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Replace the background image

Replace this file with your own 2:1 panorama-style image:

```txt
public/background-360.jpg
```

A 2:1 image such as `2048x1024`, `4096x2048`, or similar works best for the rotating inside-sphere background.

## Safety note

This project does not bypass browser security. The text is stylized visual telemetry, while the Wasm module and browser hints are loaded through normal safe browser APIs.
