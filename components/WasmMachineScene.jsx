"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const WASM_URL = "/machine_core.wasm";
const BACKGROUND_URL = "/background-360.jpg";
const COLUMN_COUNT = 2;
const MAX_LINES_PER_COLUMN = 54;
const TEXT_UPDATE_MS = 650;
const RENDER_FPS = 30;

const BOOT_LINES = [
  "WEB BIOS // THREE PANORAMA FAST MODE",
  "SAFE_BROWSER_SANDBOX LOCKED",
  "LOAD THREE IMAGE CYLINDER .............. OK",
  "LOAD LOW POLY MACHINE CORE ............. OK",
  "LOAD WASM MODULE ....................... PENDING",
  "TEXT STREAM MODE ....................... DOM DIRECT",
  "REACT TEXT RERENDER LOOP ............... DISABLED",
  "HEAVY PANORAMA SPHERE .................. REMOVED",
  "PARTICLE FIELD .......................... REMOVED",
  "BOOT COMPLETE // FAST THREE PATH ACTIVE",
];

const OPS = [
  "MOV", "XOR", "AND", "OR", "ADD", "SUB", "SHL", "SHR", "ROL", "ROR",
  "I32.LOAD", "I32.STORE", "F32.ADD", "F32.MUL", "DMA.COPY", "WASM.CALL", "BR_IF", "JMP", "NOP"
];

const REGS = [
  "R0", "R1", "R2", "R3", "AX", "BX", "CX", "DX", "VEC0", "VEC1", "BUS0", "STACK", "GPU_PIPE", "WASM_PAGE", "SCAN_BUF", "FRAME"
];

const CALLS = ["$scanTick", "$pulse", "$noise2", "$safe_mode", "$render_core", "$panorama_tick", "$glyph_tick"];
const TOKENS = ["##", "@@", "%%", "$$", "++", "==", "!!", "??", "::", "//", "<<", ">>", "~~", "NULL", "SAFE", "VOID"];

function choose(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function hex(length) {
  const chars = "0123456789ABCDEF";
  let result = "";
  for (let i = 0; i < length; i += 1) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function ascii(size = 8) {
  const chars = "01ABCDEF[]{}/*-_=+|~^:;#$%@!?<>";
  let result = "";
  for (let i = 0; i < size; i += 1) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function deviceLines() {
  const nav = typeof navigator === "undefined" ? {} : navigator;
  return [
    `[DEVICE] THREAD_HINT=${nav.hardwareConcurrency || "hidden"}`,
    `[DEVICE] MEM_HINT=${nav.deviceMemory ? `~${nav.deviceMemory}GB` : "hidden"}`,
    `[DEVICE] PLATFORM=${nav.userAgentData?.platform || nav.platform || "hidden"}`,
    `[MODE] FAST DOM TEXT // THREE PANORAMA CYLINDER`,
  ];
}

function makeLine(frame, wasmValue, pulseValue, noiseValue, mode) {
  const selector = Math.floor(Math.random() * 8);
  if (selector === 0) return `> ${choose(OPS)} ${choose(REGS)}, 0x${hex(4)} ${choose(TOKENS)} ${ascii(8)}`;
  if (selector === 1) return `> ${choose(OPS)} ${choose(REGS)} <- ${choose(CALLS)}(${frame % 256}, ${noiseValue % 97})`;
  if (selector === 2) return `> BUS[${hex(4)}:${hex(4)}] => 0x${hex(2)} 0x${hex(2)} 0x${hex(2)} ${choose(TOKENS)}`;
  if (selector === 3) return `> PULSE=${Math.round(pulseValue * 9999).toString().padStart(4, "0")} SCAN=0x${Number(wasmValue).toString(16).toUpperCase()} NOISE=0x${Number(noiseValue).toString(16).toUpperCase()}`;
  if (selector === 4) return `> TRACE ${choose(REGS)} -> ${choose(REGS)} -> ${choose(REGS)} // ${choose(CALLS)}`;
  if (selector === 5) return `> DMA.TEXT_BANK[0x${hex(2)}] -> DOM_LAYER[${frame % 64}] // ${ascii(12)}`;
  if (selector === 6) return `[FAST] ${mode} FRAME=${String(frame).padStart(5, "0")} PAN=${hex(4)} ${ascii(8)}`;
  return `> ${choose(OPS)} ${choose(REGS)}, ${choose(REGS)} ; FLAG=${choose(["ZERO", "CARRY", "SAFE", "WAVE", "LATCH"])} ; ${hex(6)}`;
}

function pushColumnLine(columns, index, line) {
  const col = columns[index % COLUMN_COUNT];
  col.push(line);
  while (col.length > MAX_LINES_PER_COLUMN) col.shift();
}

function makeInitialFlood() {
  const lines = [];

  for (let i = 0; i < MAX_LINES_PER_COLUMN * COLUMN_COUNT; i += 1) {
    lines.push(makeLine(i, (i * 73) % 4096, Math.abs(Math.sin(i * 0.044)), (i * 31) % 1024, "BOOT FLOOD"));
  }

  return lines;
}

export default function WasmMachineScene() {
  const mountRef = useRef(null);
  const columnRefs = useRef([]);
  const wasmRef = useRef(null);
  const modeRef = useRef("BOOTING");

  useEffect(() => {
    let disposed = false;
    let renderer;
    let scene;
    let camera;
    let core;
    let ringA;
    let ringB;
    let backgroundMesh;
    let backgroundTexture;
    let animationId;
    let frame = 0;
    let lastRender = 0;
    let textTimer;
    const created = [];
    const columns = Array.from({ length: COLUMN_COUNT }, () => []);

    function renderColumns() {
      columnRefs.current.forEach((node, index) => {
        if (node) node.textContent = columns[index].join("\n");
      });
    }

    function addLines(lines) {
      lines.forEach((line, index) => pushColumnLine(columns, frame + index, line));
      renderColumns();
    }

    async function loadWasm() {
      try {
        const response = await fetch(WASM_URL);
        const bytes = await response.arrayBuffer();
        const module = await WebAssembly.compile(bytes);
        const imports = WebAssembly.Module.imports(module);
        const exportsList = WebAssembly.Module.exports(module);
        const instance = await WebAssembly.instantiate(module, {});
        const exports = instance.exports;
        const pages = exports.memory ? Math.round(exports.memory.buffer.byteLength / 65536) : "hidden";

        wasmRef.current = exports;
        modeRef.current = "WASM ONLINE";

        addLines([
          "[WASM] machine_core.wasm loaded",
          `[WASM] imports=${imports.length || "none"}`,
          `[WASM] exports=${exportsList.map((item) => `${item.name}:${item.kind}`).join("  ")}`,
          `[WASM] pages=${pages} total=${pages === "hidden" ? "hidden" : `${pages * 64}KB`}`,
          `[WASM] magic=0x${exports.getMagic?.().toString(16).toUpperCase() || "hidden"}`,
        ]);
      } catch (error) {
        modeRef.current = "VISUAL FALLBACK";
        addLines(["[WASM] load failed", `[WASM] ${error?.message || "unknown error"}`]);
      }
    }

    function setupThree() {
      const mount = mountRef.current;
      if (!mount) return;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 120);
      camera.position.set(0, 0, 7);

      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      });
      renderer.setPixelRatio(1);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const textureLoader = new THREE.TextureLoader();
      backgroundTexture = textureLoader.load(BACKGROUND_URL);
      backgroundTexture.colorSpace = THREE.SRGBColorSpace;
      backgroundTexture.wrapS = THREE.RepeatWrapping;
      backgroundTexture.wrapT = THREE.ClampToEdgeWrapping;
      backgroundTexture.minFilter = THREE.LinearFilter;
      backgroundTexture.magFilter = THREE.LinearFilter;
      backgroundTexture.generateMipmaps = false;

      const backgroundGeometry = new THREE.CylinderGeometry(34, 34, 96, 32, 1, true);
      const backgroundMaterial = new THREE.MeshBasicMaterial({
        map: backgroundTexture,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
      });
      backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
      backgroundMesh.rotation.y = Math.PI;
      backgroundMesh.renderOrder = -10;
      scene.add(backgroundMesh);
      created.push(backgroundGeometry, backgroundMaterial);

      const coreGeometry = new THREE.IcosahedronGeometry(1.2, 0);
      const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x8fdcff, wireframe: true, transparent: true, opacity: 0.82 });
      core = new THREE.Mesh(coreGeometry, coreMaterial);
      scene.add(core);
      created.push(coreGeometry, coreMaterial);

      const ringGeometry = new THREE.TorusGeometry(1.78, 0.01, 4, 28);
      const ringMaterialA = new THREE.MeshBasicMaterial({ color: 0xffa8df, transparent: true, opacity: 0.68 });
      const ringMaterialB = new THREE.MeshBasicMaterial({ color: 0xb9a6ff, transparent: true, opacity: 0.58 });
      ringA = new THREE.Mesh(ringGeometry, ringMaterialA);
      ringB = new THREE.Mesh(ringGeometry, ringMaterialB);
      ringA.rotation.x = Math.PI / 2.35;
      ringB.rotation.y = Math.PI / 2.5;
      scene.add(ringA, ringB);
      created.push(ringGeometry, ringMaterialA, ringMaterialB);

      function handleResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight, false);
      }
      window.addEventListener("resize", handleResize);

      function animate(now) {
        if (disposed) return;
        animationId = requestAnimationFrame(animate);
        if (now - lastRender < 1000 / RENDER_FPS) return;
        lastRender = now;

        frame += 1;
        const wasm = wasmRef.current;
        const wasmValue = wasm?.scanTick ? wasm.scanTick(frame) : (frame * 73) % 4096;
        const pulseValue = wasm?.pulse ? wasm.pulse(frame * 0.022) : Math.abs(Math.sin(frame * 0.044));

        backgroundMesh.rotation.y += 0.018;
        core.rotation.x += 0.04 + wasmValue * 0.0000006;
        core.rotation.y += 0.055;
        core.scale.setScalar(1 + pulseValue * 0.07);
        ringA.rotation.z += 0.05;
        ringB.rotation.x += 0.043;

        renderer.render(scene, camera);
      }
      animationId = requestAnimationFrame(animate);

      return () => window.removeEventListener("resize", handleResize);
    }

    addLines([...BOOT_LINES, ...deviceLines(), ...makeInitialFlood()]);
    loadWasm();
    const removeResize = setupThree();

    textTimer = setInterval(() => {
      const wasm = wasmRef.current;
      const wasmValue = wasm?.scanTick ? wasm.scanTick(frame) : (frame * 73) % 4096;
      const pulseValue = wasm?.pulse ? wasm.pulse(frame * 0.022) : Math.abs(Math.sin(frame * 0.044));
      const noiseValue = wasm?.noise2 ? wasm.noise2(frame, Math.round(pulseValue * 1000)) : (frame * 31) % 1024;
      addLines([
        makeLine(frame, wasmValue, pulseValue, noiseValue, modeRef.current),
        makeLine(frame + 1, wasmValue, pulseValue, noiseValue, modeRef.current),
        makeLine(frame + 2, wasmValue, pulseValue, noiseValue, modeRef.current),
      ]);
    }, TEXT_UPDATE_MS);

    return () => {
      disposed = true;
      clearInterval(textTimer);
      cancelAnimationFrame(animationId);
      removeResize?.();
      if (backgroundTexture) backgroundTexture.dispose();
      if (renderer) renderer.dispose();
      created.forEach((item) => item.dispose?.());
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, []);

  return (
    <main className="machineScreen">
      <div ref={mountRef} className="threeLayer" />
      <div className="softTint" />
      <div className="scanlines" />

      <section className="textOverlay" aria-label="WebAssembly diagnostic text overlay">
        <div className="overlayHead">
          <div className="overlayKicker">SAFE WEB DIAGNOSTIC // FAST THREE PANORAMA // BYTESIZED</div>
          <h1 className="overlayTitle">WASM CORE</h1>
        </div>

        <div className="columnGrid">
          {Array.from({ length: COLUMN_COUNT }, (_, index) => (
            <pre
              className="terminalColumn"
              key={`column-${index}`}
              ref={(node) => {
                columnRefs.current[index] = node;
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
