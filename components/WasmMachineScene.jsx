"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const MAX_LINES = 360;
const WASM_URL = "/machine_core.wasm";
const BACKGROUND_URL = "/background-360.jpg";
const COLUMNS = 4;

const BOOT_STEPS = [
  "DREAM-WEB BIOS 2.0 // SOFT GLITCH POST",
  "COPYRIGHT SAFE_BROWSER_SANDBOX // NO PRIVATE MEMORY ACCESS",
  "INITIALIZE 360 IMAGE BACKDROP ................... OK",
  "INITIALIZE THREE.JS WEBGL PIPE .................. OK",
  "INITIALIZE RUBIK GLITCH POP GLYPH ROM ........... OK",
  "MOUNT /public/machine_core.wasm ................. PENDING",
  "ENABLE MAXIMUM TEXT FLOOD ....................... OK",
  "ENABLE FAKE HEX DUMP MODE ....................... OK",
  "ENABLE CRT/VHS RASTER JITTER .................... OK",
  "BOOT SEQUENCE COMPLETE // ENTERING IMAGE ORBIT",
];

const GLITCH_TOKENS = [
  "##",
  "@@",
  "%%",
  "$$",
  "**",
  "++",
  "==",
  "!!",
  "??",
  "::",
  "//",
  "<<",
  ">>",
  "~~",
  "<>",
  "~#",
  "#~",
  "NULL*",
  "SAFE!",
  "VOID",
  "BIOS",
];

const OPCODES = [
  "MOV",
  "MOVZX",
  "LEA",
  "XOR",
  "AND",
  "OR",
  "NOT",
  "SHL",
  "SHR",
  "ROL",
  "ROR",
  "SUB",
  "ADD",
  "ADC",
  "MUL",
  "IMUL",
  "F32.MUL",
  "F32.ADD",
  "F32.SIN",
  "F32.COS",
  "I32.LOAD",
  "I32.STORE",
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
  "WASM.PAGE",
  "BR_IF",
  "CALL",
  "RET",
  "JMP",
  "NOP",
  "HALT?",
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
  "VEC2",
  "VEC3",
  "BUS0",
  "BUS1",
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
  "PASTEL_RAM",
  "CRT_BEAM",
  "DREAM_BUS",
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
  "$dreamcast_not_real",
  "$webgl_orbit",
  "$crt_flicker",
  "$memory_theater",
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
  const chars = "01ABCDEF<>[]{}/*-_=+|~^:;#$%@!?";
  let block = "";

  for (let i = 0; i < size; i += 1) {
    block += chars[Math.floor(Math.random() * chars.length)];
  }

  return block;
}

function makeHexDump(frame, lines = 6) {
  const result = [`[HEX-DUMP // SIMULATED] PAGE=${randomHex(2)} FRAME=${String(frame).padStart(5, "0")}`];

  for (let i = 0; i < lines; i += 1) {
    const bytes = Array.from({ length: 16 }, () => randomHex(2)).join(" ");
    const ascii = Array.from({ length: 16 }, () => choose([".", "#", "@", "~", "*", "+", "%", "$", "!"])).join("");
    result.push(`0x${randomHex(8)}  ${bytes}  |${ascii}|`);
  }

  return result;
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
    ...BOOT_STEPS.slice(0, 3),
    `[DEVICE] THREAD_HINT=${device.cpuThreads}  MEM_HINT=${device.memory}`,
    `[DEVICE] PLATFORM=${device.platform}  LANG=${device.language}`,
    `[DEVICE] GPU_HINT=${gpu}`,
    `[DEVICE] UA=${String(device.userAgent).slice(0, 72)}...`,
    ...BOOT_STEPS.slice(3),
    `[SAFETY] Browser sandbox remains locked // this is visual telemetry theater`,
  ];
}

function makeWasmSummary(exports, exportsList, imports, pages) {
  return [
    "[WASM] machine_core.wasm loaded",
    `[WASM] imports=${imports.length || "none"}`,
    `[WASM] exports=${formatExportList(exportsList)}`,
    `[WASM] memory_pages=${pages}  memory_total=${pages === "hidden" ? "hidden" : `${pages * 64}KB`}`,
    `[WASM] magic=0x${exports.getMagic?.().toString(16).toUpperCase() || "hidden"}`,
    "[MODE] GLYPH STORM ONLINE // MULTI-COLUMN BUS ENABLED",
  ];
}

function makeGlitchBurst(frame, wasmValue, pulseValue, noiseValue, mode) {
  const pulseInt = Math.round((pulseValue || 0) * 10000);
  const burstSize = 18 + Math.floor(Math.random() * 18);
  const lines = [];

  lines.push(`[FRAME ${String(frame).padStart(5, "0")}] ${mode} ${randomAsciiBlock(16)} ORBIT=${randomHex(4)}`);

  for (let i = 0; i < burstSize; i += 1) {
    const selector = Math.floor(Math.random() * 11);

    if (selector === 0) {
      lines.push(
        `> ${choose(OPCODES)} ${choose(TARGETS)}, 0x${randomHex(4)}  ${choose(GLITCH_TOKENS)} ${randomAsciiBlock(10)}`
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
      lines.push(`> GLITCH.VECTOR ${randomAsciiBlock(6)} ${randomAsciiBlock(6)} ${randomAsciiBlock(6)}`);
    } else if (selector === 5) {
      lines.push(
        `> TRACE ${choose(TARGETS)} -> ${choose(TARGETS)} -> ${choose(TARGETS)} // ${choose(CALLS)} ${choose(GLITCH_TOKENS)}`
      );
    } else if (selector === 6) {
      lines.push(`> DMA.GLYPH_BANK[0x${randomHex(2)}] -> THREE_BUFFER[${frame % 64}] // ${randomAsciiBlock(18)}`);
    } else if (selector === 7) {
      lines.push(`[VHS-TEAR] y=${randomHex(3)} dx=${choose(["-12", "-8", "4", "9", "13"])} ${randomAsciiBlock(24)}`);
    } else if (selector === 8) {
      lines.push(
        `> ${choose(OPCODES)} ${choose(TARGETS)}, ${choose(TARGETS)} ; FLAG=${choose([
          "ZERO",
          "CARRY",
          "SAFE",
          "GLITCH",
          "WAVE",
          "LATCH",
        ])} ; ${choose(GLITCH_TOKENS)} ${randomHex(6)}`
      );
    } else if (selector === 9) {
      lines.push(`[CRT] BEAM=${randomHex(4)} PHOSPHOR=${randomHex(2)} ${choose(GLITCH_TOKENS)} ${randomAsciiBlock(20)}`);
    } else {
      lines.push(`[DREAM-BUS] ${choose(TARGETS)}:${randomHex(4)} ${choose(CALLS)} ${randomAsciiBlock(22)}`);
    }
  }

  if (frame % 60 === 0 || Math.random() > 0.72) {
    lines.push(...makeHexDump(frame, 3 + Math.floor(Math.random() * 4)));
  }

  return lines;
}

function buildColumnLines(lines) {
  const buckets = Array.from({ length: COLUMNS }, () => []);
  lines.forEach((line, index) => {
    buckets[index % COLUMNS].push(line);
  });
  return buckets;
}

export default function WasmMachineScene() {
  const mountRef = useRef(null);
  const overlayRef = useRef(null);
  const wasmRef = useRef(null);
  const frameRef = useRef(0);
  const modeRef = useRef("BOOTING");
  const [terminalLines, setTerminalLines] = useState(["[BOOT] STARTING BIOS GLYPH STORM..."]);

  const columnLines = useMemo(() => buildColumnLines(terminalLines), [terminalLines]);

  useEffect(() => {
    let disposed = false;
    let renderer;
    let scene;
    let camera;
    let backgroundSphere;
    let backgroundTexture;
    let core;
    let ringA;
    let ringB;
    let ringC;
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
      camera.position.set(0, 0.12, 7);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);

      backgroundTexture = new THREE.TextureLoader().load(BACKGROUND_URL);
      backgroundTexture.colorSpace = THREE.SRGBColorSpace;
      backgroundTexture.wrapS = THREE.RepeatWrapping;
      backgroundTexture.wrapT = THREE.ClampToEdgeWrapping;
      backgroundTexture.repeat.set(1, 1);

      const backgroundGeometry = new THREE.SphereGeometry(42, 64, 32);
      const backgroundMaterial = new THREE.MeshBasicMaterial({
        map: backgroundTexture,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      });
      backgroundSphere = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
      backgroundSphere.rotation.y = Math.PI;
      scene.add(backgroundSphere);
      created.push(backgroundGeometry, backgroundMaterial, backgroundTexture);

      const coreGeometry = new THREE.IcosahedronGeometry(1.32, 2);
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
      const ringMaterialA = new THREE.MeshBasicMaterial({ color: 0xffa8df, transparent: true, opacity: 0.9 });
      const ringMaterialB = new THREE.MeshBasicMaterial({ color: 0xb9a6ff, transparent: true, opacity: 0.8 });
      const ringMaterialC = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.56 });
      ringA = new THREE.Mesh(ringGeometry, ringMaterialA);
      ringB = new THREE.Mesh(ringGeometry, ringMaterialB);
      ringC = new THREE.Mesh(ringGeometry, ringMaterialC);
      ringA.rotation.x = Math.PI / 2.35;
      ringB.rotation.y = Math.PI / 2.5;
      ringC.rotation.z = Math.PI / 2.2;
      scene.add(ringA, ringB, ringC);
      created.push(ringGeometry, ringMaterialA, ringMaterialB, ringMaterialC);

      const particleGeometry = new THREE.BufferGeometry();
      const particleCount = 220;
      const positions = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i += 1) {
        const radius = 2.2 + Math.random() * 3.2;
        const angle = Math.random() * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 5.6;
        positions[i * 3 + 2] = Math.sin(angle) * radius - Math.random() * 3.6;
      }

      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.032,
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

        if (backgroundSphere) {
          backgroundSphere.rotation.y += 0.0018;
          backgroundSphere.rotation.x = Math.sin(frame * 0.0015) * 0.035;
        }

        const pulseScale = 1 + pulseValue * 0.16;
        core.scale.setScalar(pulseScale);
        core.rotation.x += 0.006 + wasmValue * 0.0000009;
        core.rotation.y += 0.011;
        core.rotation.z += 0.003;

        ringA.rotation.z += 0.009;
        ringB.rotation.x += 0.008;
        ringC.rotation.y -= 0.007;
        particles.rotation.y -= 0.0022;
        particles.rotation.x += 0.0011;

        const huePulse = 0.54 + pulseValue * 0.1;
        core.material.color.setHSL(huePulse, 0.9, 0.76);

        if (overlayRef.current) {
          const jitterX = Math.sin(frame * 0.21) * pulseValue * 10;
          const jitterY = Math.cos(frame * 0.17) * pulseValue * 4;
          overlayRef.current.style.setProperty("--jitter-x", `${jitterX.toFixed(2)}px`);
          overlayRef.current.style.setProperty("--jitter-y", `${jitterY.toFixed(2)}px`);
          overlayRef.current.style.setProperty("--pulse", String(0.65 + pulseValue * 0.35));
        }

        if (frame % 7 === 0) {
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

    const bootTimer = setInterval(() => {
      appendLines([choose(BOOT_STEPS), `[POST] ${randomAsciiBlock(24)} ${choose(GLITCH_TOKENS)} ${randomHex(8)}`]);
    }, 280);

    const removeResize = setupThree();
    loadWasm();

    const stopBootTimer = setTimeout(() => clearInterval(bootTimer), 2100);

    return () => {
      disposed = true;
      clearInterval(bootTimer);
      clearTimeout(stopBootTimer);
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
      <div className="vhsWash" />
      <div ref={mountRef} className="threeLayer" />
      <div className="noiseVeil" />
      <div className="scanlines" />
      <div className="vhsTear" />

      <section ref={overlayRef} className="textOverlay" aria-label="WebAssembly diagnostic text overlay">
        <div className="overlayHead">
          <div className="overlayKicker">SAFE WEB DIAGNOSTIC // BIOS V3 // ROTATING IMAGE BACKDROP</div>
          <h1 className="overlayTitle">WASM MACHINE CORE V3</h1>
        </div>

        <div className="columnGrid">
          {columnLines.map((column, columnIndex) => (
            <div className="terminalColumn" key={`column-${columnIndex}`}>
              {column.map((line, index) => (
                <div key={`${line}-${index}`} className={line === "" ? "terminalSpacer" : "terminalLine"}>
                  {line}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
