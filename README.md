# Wasm Diagnostic Fast Version

This is the optimized version of the Next.js + Three.js + WebAssembly diagnostic screen.

## What changed for speed

- Reduced React text updates from about every 7 frames to about every 30 frames
- Reduced maximum terminal lines from 360 to 150
- Reduced generated assembly burst size
- Reduced hex dump frequency
- Reduced columns from 4 to 3 on desktop
- Uses 1 column on very small mobile screens
- Capped renderer pixel ratio at 1 for mobile speed
- Disabled WebGL antialiasing
- Added `powerPreference: "high-performance"`
- Reduced 360 background sphere geometry from 64x32 to 24x12
- Reduced core geometry detail
- Reduced ring segments
- Reduced particles from 220 to 70
- Removed expensive constant text skew animation
- Simplified text shadows and overlays
- Increased background rotation speed so it feels less slow

## Run

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Project structure

```txt
app/page.jsx
app/layout.jsx
app/globals.css
components/WasmMachineScene.jsx
public/background-360.jpg
public/machine_core.wasm
wasm-src/machine_core.c
```

## Still browser-safe

This project does not bypass browser security. It shows browser-safe hints, real Wasm module info, and stylized fake assembly text.
