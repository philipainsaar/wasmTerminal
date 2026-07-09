# Wasm Machine Core V2

A louder **Next.js + Three.js + WebAssembly** starter that renders a browser-safe, multi-column glitch diagnostic overlay on top of a 3D animated background.

## Version 2 additions

- Four-column randomized assembly text flood on desktop
- Two-column mobile fallback
- Fake memory hex dump bursts
- BIOS-style boot / POST text
- CRT scanlines, VHS tear bands, noise veil, chromatic text shadows
- Text jitter reacts to the Three.js/Wasm pulse output
- No windows, no panels, no buttons
- Uses **Rubik Glitch Pop** from Google Fonts

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
public/machine_core.wasm
wasm-src/machine_core.c
```

## Safety note

This project does **not** bypass browser security.
It only shows:

- browser-safe device hints
- real Wasm module load state
- stylized randomized assembly-like glitch text
- simulated memory / hex dump visuals
- a Three.js animated machine-core background
