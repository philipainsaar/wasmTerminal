# Next.js + Three.js + WebAssembly Diagnostic Terminal

This is a safe browser-based diagnostic-style interface.

It shows:

- safe browser device hints
- WebGL renderer hints when available
- real WebAssembly module exports
- real WebAssembly memory size
- Three.js visuals driven by WebAssembly functions
- stylized assembly-like terminal output

It does **not** bypass browser security, read private RAM, inspect native CPU instructions, or access internal hardware.

## Run

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Files

```txt
app/page.jsx
app/layout.jsx
app/globals.css
components/WasmMachineScene.jsx
public/machine_core.wasm
wasm-src/machine_core.c
```

## Rebuild the Wasm file manually

If you have clang with a wasm target:

```bash
clang --target=wasm32 -Oz -nostdlib \
  -Wl,--no-entry \
  -Wl,--export-all \
  -Wl,--export-memory \
  -o public/machine_core.wasm \
  wasm-src/machine_core.c
```
