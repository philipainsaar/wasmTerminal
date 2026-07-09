"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const MAX_LINES = 140;
const WASM_URL = "/machine_core.wasm";
const GLITCH_TOKENS = [
  "▓",
  "▒",
  "░",
  "█",
  "∆",
  "¤",
  "※",
  "⚡",
  "::",
  "//",
  "<<",
  ">>",
  "~~",
  "<>",
  "µ",
  "~#",
];
const OPCODES = [
  "MOV",
  "XOR",
  "AND",
  "OR",
  "NOT",
  "SHL",
  "SHR",
  "SUB",
  "ADD",
  "ADC",
  "MUL",
  "F32.MUL",
  "F32.ADD",
  "I32.NOISE",
  "PULSE",
  "STACK.PUSH",
  "STACK.POP",
  "DMA.COPY",
  "VRAM.MAP",
  "GLYPH.DECODE",
  "GLITCH.MIX",
  "SCAN.RASTER",
  "TEXTURE.BIND",
  "WASM.CALL",
  "BR_IF",
  "JMP",
  "NOP",
];
const TARGETS = [
  "R0",
  "R1",
  "R2",
  "R3",
  "R4",
  "R5",
  "R6",
  "R7",
  "AX",
  "BX",
  "CX",
  "DX",
  "VEC0",
  "VEC1",
  "BUS0",
  "STACK",
  "GPU_PIPE",
  "SCAN_BUFFER",
  "NOISE_BANK",
  "FRAME_LATCH",
  "SIGNAL_CORE",
  "THREE_PORT",
  "WASM_PAGE",
  "WAVE_TABLE",
  "GHOST_CACHE",
];
const CALLS = [
  "$scanTick",
  "$pulse",
  "$noise2",
  "$phase_core",
  "$render_loop",
  "$glyph_shift",
  "$vector_gate",
  "$safe_mode",
  "$echo_bus",
  "$page_swap",
];

function choose(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomHex(length) {
  const chars = "0123456789ABCDEF";
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

function randomAddress() {
  return `${randomHex(4)}:${randomHex(4)}:${randomHex(4)}`;
}

function randomAsciiBlock(size = 8) {
  const chars = "01ABCDEF<>[]{}/*-_=+|~^:;▓▒░█∆¤※⚡";
  let block = "";

  for (let i = 0; i < size; i += 1) {
    block += chars[Math.floor(Math.random() * chars.length)];
  }

  return block;
}

function getDeviceHints() {
  const nav = typeof navigator === "undefined" ? {} : navigator;

  return {
    cpuThreads: nav.hardwareConcurrency || "hidden",
    memory: nav.deviceMemory ? `~${nav.deviceMemory} GB` : "hidden",
    userAgent: nav.userAgent || "hidden",
    platform: nav.userAgentData?.platform || nav.platform || "hidden",
    language: nav.language || "hidden",
  };
}

function getGpuHint() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (!gl) {
      return "WebGL unavailable";
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");

    if (!debugInfo) {
      return gl.getParameter(gl.RENDERER) || "GPU renderer hidden";
    }

    return (
      gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ||
      gl.getParameter(gl.RENDERER) ||
      "GPU renderer hidden"
    );
  } catch {
    return "GPU renderer hidden";
  }
}

function formatExportList(exportsList) {
  return exportsList
    .filter((item) => ["function", "memory"].includes(item.kind))
    .map((item) => `${item.name}:${item.kind}`)
    .join("  ");
}

function makeBootLines({ device, gpu }) {
  return [
    "[SAFE-BOOT] RUBIK GLITCH POP OVERLAY ACTIVE",
    "[NOTICE] Browser sandbox preserved // no private RAM or native CPU instruction access",
    `[DEVICE] THREAD_HINT=${device.cpuThreads}  MEM_HINT=${device.memory}  PLATFORM=${device.platform}`,
    `[DEVICE] GPU_HINT=${gpu}`,
    `[LOCALE] LANG=${device.language}  UA=${String(device.userAgent).slice(0, 54)}...`,
    "[PIPE] NEXT.JS -> THREE.JS -> WASM -> GLITCH TEXT STREAM",
    "[WASM] FETCH /machine_core.wasm",
  ];
}

function makeWasmSummary(exports, exportsList, imports, pages) {
  return [
    "[WASM] machine_core.wasm loaded",
    `[WASM] imports=${imports.length || "none"}`,
    `[WASM] exports=${formatExportList(exportsList)}`,
    `[WASM] memory_pages=${pages}  memory_total=${pages === "hidden" ? "hidden" : `${pages * 64}KB`}`,
    `[WASM] magic=0x${exports.getMagic?.().toString(16).toUpperCase() || "hidden"}`,
    "[MODE] VISUAL CORE ONLINE // CHAOTIC TEXT BURST ENABLED",
  ];
}

function makeGlitchBurst(frame, wasmValue, pulseValue, noiseValue, mode) {
  const pulseInt = Math.round((pulseValue || 0) * 10000);
  const burstSize = 10 + Math.floor(Math.random() * 8);
  const lines = [];

  lines.push(`[FRAME ${String(frame).padStart(5, "0")}] MODE=${mode} ${randomAsciiBlock(10)}`);

  for (let i = 0; i < burstSize; i += 1) {
    const selector = Math.floor(Math.random() * 8);

    if (selector === 0) {
      lines.push(
        `> ${choose(OPCODES)} ${choose(TARGETS)}, 0x${randomHex(4)}  ${choose(GLITCH_TOKENS)} ${randomAsciiBlock(6)}`
      );
    } else if (selector === 1) {
      lines.push(
        `> ${choose(OPCODES)} ${choose(TARGETS)} <- ${choose(CALLS)}(${frame % 256}, ${noiseValue % 97})`
      );
    } else if (selector === 2) {
      lines.push(
        `> BUS[${randomAddress()}] => 0x${randomHex(2)} 0x${randomHex(2)} 0x${randomHex(2)} 0x${randomHex(2)} ${choose(GLITCH_TOKENS)}`
      );
    } else if (selector === 3) {
      lines.push(
        `> F32.PULSE ${String(pulseInt).padStart(5, "0")} | I32.NOISE 0x${Number(noiseValue || 0)
          .toString(16)
          .toUpperCase()} | SCAN=0x${Number(wasmValue || 0).toString(16).toUpperCase()}`
      );
    } else if (selector === 4) {
      lines.push(
        `> GLITCH.VECTOR ${randomAsciiBlock(4)} ${randomAsciiBlock(4)} ${randomAsciiBlock(4)} ${randomAsciiBlock(4)}`
      );
    } else if (selector === 5) {
      lines.push(
        `> TRACE ${choose(TARGETS)} -> ${choose(TARGETS)} -> ${choose(TARGETS)} // ${choose(CALLS)} ${choose(GLITCH_TOKENS)}`
      );
    } else if (selector === 6) {
      lines.push(
        `> DMA.GLYPH_BANK[0x${randomHex(2)}] -> THREE_BUFFER[${frame % 64}] // ${randomAsciiBlock(12)}`
      );
    } else {
      lines.push(
        `> ${choose(OPCODES)} ${choose(TARGETS)}, ${choose(TARGETS)} ; FLAG=${choose(["ZERO", "CARRY", "SAFE", "GLITCH", "WAVE", "LATCH"])} ; ${choose(GLITCH_TOKENS)} ${randomHex(6)}`
      );
    }
  }

  if (Math.random() > 0.4) {
    lines.push(`[GLITCH] ${randomAsciiBlock(18)} ${choose(GLITCH_TOKENS)} ${randomAsciiBlock(18)}`);
  }

  return lines;
}

export default function WasmMachineScene() {
  const mountRef = useRef(null);
  const wasmRef = useRef(null);
  const frameRef = useRef(0);
  const modeRef = useRef("BOOTING");
  const [terminalLines, setTerminalLines] = useState(["[BOOT] STARTING..."]);

  useEffect(() => {
    let disposed = false;
    let renderer;
    let scene;
    let camera;
    let core;
    let ringA;
    let ringB;
    let particles;
    let animationId;
    const created = [];

    function appendLines(lines) {
      setTerminalLines((previous) => [...previous, ...lines].slice(-MAX_LINES));
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

        wasmRef.current = exports;
        modeRef.current = "WASM ONLINE";

        const pages = exports.memory
          ? Math.round(exports.memory.buffer.byteLength / 65536)
          : "hidden";

        appendLines(makeWasmSummary(exports, exportsList, imports, pages));
      } catch (error) {
        modeRef.current = "VISUAL FALLBACK";
        appendLines([
          "[WASM] load failed // visual fallback remains active",
          `[WASM] ${error?.message || "unknown error"}`,
        ]);
      }
    }

    function setupThree() {
      const mount = mountRef.current;
      if (!mount) return;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.set(0, 0.2, 7);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      const coreGeometry = new THREE.IcosahedronGeometry(1.35, 2);
      const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x8fdcff,
        wireframe: true,
        transparent: true,
        opacity: 0.95,
      });
      core = new THREE.Mesh(coreGeometry, coreMaterial);
      scene.add(core);
      created.push(coreGeometry, coreMaterial);

      const ringGeometry = new THREE.TorusGeometry(1.95, 0.012, 8, 96);
      const ringMaterialA = new THREE.MeshBasicMaterial({
        color: 0xffa8df,
        transparent: true,
        opacity: 0.88,
      });
      const ringMaterialB = new THREE.MeshBasicMaterial({
        color: 0xb9a6ff,
        transparent: true,
        opacity: 0.78,
      });
      ringA = new THREE.Mesh(ringGeometry, ringMaterialA);
      ringB = new THREE.Mesh(ringGeometry, ringMaterialB);
      ringA.rotation.x = Math.PI / 2.35;
      ringB.rotation.y = Math.PI / 2.5;
      scene.add(ringA, ringB);
      created.push(ringGeometry, ringMaterialA, ringMaterialB);

      const particleGeometry = new THREE.BufferGeometry();
      const particleCount = 160;
      const positions = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i += 1) {
        const radius = 2.2 + Math.random() * 2.5;
        const angle = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
        positions[i * 3 + 2] = Math.sin(angle) * radius - Math.random() * 3;
      }

      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.035,
        transparent: true,
        opacity: 0.92,
      });
      particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);
      created.push(particleGeometry, particleMaterial);

      function handleResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }

      window.addEventListener("resize", handleResize);

      function animate() {
        if (disposed) return;

        frameRef.current += 1;
        const frame = frameRef.current;
        const wasm = wasmRef.current;

        const wasmValue = wasm?.scanTick ? wasm.scanTick(frame) : (frame * 73) % 4096;
        const pulseValue = wasm?.pulse ? wasm.pulse(frame * 0.011) : Math.abs(Math.sin(frame * 0.025));
        const noiseValue = wasm?.noise2
          ? wasm.noise2(frame, Math.round(pulseValue * 1000))
          : (frame * 31) % 1024;

        const pulseScale = 1 + pulseValue * 0.12;
        core.scale.setScalar(pulseScale);
        core.rotation.x += 0.005 + wasmValue * 0.0000008;
        core.rotation.y += 0.009;

        ringA.rotation.z += 0.007;
        ringB.rotation.x += 0.006;
        particles.rotation.y -= 0.0018;
        particles.rotation.x += 0.0009;

        const huePulse = 0.55 + pulseValue * 0.08;
        core.material.color.setHSL(huePulse, 0.85, 0.75);

        if (frame % 10 === 0) {
          appendLines(makeGlitchBurst(frame, wasmValue, pulseValue, noiseValue, modeRef.current));
        }

        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
      }

      animate();

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const device = getDeviceHints();
    const gpu = getGpuHint();
    setTerminalLines(makeBootLines({ device, gpu }));

    const removeResize = setupThree();
    loadWasm();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      removeResize?.();
      if (renderer) renderer.dispose();
      created.forEach((item) => item.dispose?.());
      if (mountRef.current) mountRef.current.innerHTML = "";
    };
  }, []);

  return (
    <main className="machineScreen">
      <div className="glowLayer glowOne" />
      <div className="glowLayer glowTwo" />
      <div ref={mountRef} className="threeLayer" />
      <div className="noiseVeil" />
      <div className="scanlines" />

      <section className="textOverlay" aria-label="WebAssembly diagnostic text overlay">
        <div className="overlayHead">
          <div className="overlayKicker">SAFE WEB DIAGNOSTIC // GLITCH STREAM // NO WINDOWS // NO BUTTONS</div>
          <h1 className="overlayTitle">WASM MACHINE CORE</h1>
        </div>

        <div className="terminalStream">
          {terminalLines.map((line, index) => (
            <div key={`${line}-${index}`} className={line === "" ? "terminalSpacer" : "terminalLine"}>
              {line}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
