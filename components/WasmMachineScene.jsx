"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const MAX_LINES = 30;
const WASM_URL = "/machine_core.wasm";

function getDeviceHints() {
  const nav = typeof navigator === "undefined" ? {} : navigator;

  return {
    cpuThreads: nav.hardwareConcurrency || "hidden",
    memory: nav.deviceMemory ? `~${nav.deviceMemory} GB` : "hidden",
    userAgent: nav.userAgent || "hidden",
    platform: nav.userAgentData?.platform || nav.platform || "hidden",
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
    "DREAM-WEB DIAGNOSTIC CORE // SAFE MODE",
    "---------------------------------------",
    `[DEVICE] CPU THREAD HINT: ${device.cpuThreads}`,
    `[DEVICE] RAM HINT: ${device.memory}`,
    `[DEVICE] PLATFORM HINT: ${device.platform}`,
    `[DEVICE] GPU HINT: ${gpu}`,
    "[NOTICE] Browser sandbox is active. No private RAM or native CPU instructions are read.",
    "",
    "[WASM] Fetching machine_core.wasm...",
  ];
}

function makeAssemblyFlavor(frame, wasmValue, pulseValue, noiseValue) {
  const bank = (frame % 256).toString(16).padStart(2, "0").toUpperCase();
  const sig = Number(wasmValue || 0).toString(16).padStart(4, "0").toUpperCase();
  const pulse = Number(Math.round((pulseValue || 0) * 1000)).toString().padStart(4, "0");
  const noise = Number(noiseValue || 0).toString(16).padStart(3, "0").toUpperCase();

  return [
    `> MOV R${frame % 8}, 0x${sig}`,
    `> F32.PULSE ${pulse} ; wasm.pulse(frame)` ,
    `> I32.NOISE  0x${noise} ; wasm.noise2(x,y)`,
    `> DMA.GLYPH_BANK[${bank}] -> THREE_BUFFER`,
    "> JMP RENDER_LOOP",
  ];
}

export default function WasmMachineScene() {
  const mountRef = useRef(null);
  const wasmRef = useRef(null);
  const frameRef = useRef(0);
  const [terminalLines, setTerminalLines] = useState([
    "Starting browser-safe machine layer...",
  ]);
  const [status, setStatus] = useState("BOOTING");

  const watPreview = useMemo(
    () => [
      "(module",
      "  (memory (export \"memory\") 2)",
      "  (func (export \"scanTick\") (param i32) (result i32) ...)",
      "  (func (export \"noise2\") (param i32 i32) (result i32) ...)",
      "  (func (export \"pulse\") (param f32) (result f32) ...)",
      ")",
    ],
    []
  );

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

        const pages = exports.memory
          ? Math.round(exports.memory.buffer.byteLength / 65536)
          : "hidden";

        appendLines([
          "[WASM] machine_core.wasm loaded",
          `[WASM] imports: ${imports.length || "none"}`,
          `[WASM] exports: ${formatExportList(exportsList)}`,
          `[WASM] memory pages: ${pages} page(s) / ${pages === "hidden" ? "hidden" : pages * 64 + " KB"}`,
          `[WASM] magic: 0x${exports.getMagic?.().toString(16).toUpperCase() || "hidden"}`,
          "",
          "[WAT PREVIEW]",
          ...watPreview,
          "",
          "[RENDER] Three.js scene connected to Wasm output",
        ]);

        setStatus("WASM ONLINE");
      } catch (error) {
        appendLines([
          "[WASM] Load failed. Visual fallback is still running.",
          `[WASM] ${error?.message || "unknown error"}`,
        ]);
        setStatus("VISUAL FALLBACK");
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
        opacity: 0.9,
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
      const particleCount = 120;
      const positions = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
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
        const noiseValue = wasm?.noise2 ? wasm.noise2(frame, Math.round(pulseValue * 1000)) : (frame * 31) % 1024;

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

        if (frame % 42 === 0) {
          appendLines(makeAssemblyFlavor(frame, wasmValue, pulseValue, noiseValue));
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
  }, [watPreview]);

  return (
    <main className="machineScreen">
      <div className="glowLayer glowOne" />
      <div className="glowLayer glowTwo" />
      <div ref={mountRef} className="threeLayer" />

      <section className="terminalPanel" aria-label="WebAssembly diagnostic terminal">
        <div className="terminalHeader">
          <div>
            <span className="eyebrow">SAFE WEB DIAGNOSTIC</span>
            <h1>WASM MACHINE CORE</h1>
          </div>
          <div className="statusPill">{status}</div>
        </div>

        <div className="terminalBody">
          {terminalLines.map((line, index) => (
            <div key={`${line}-${index}`} className={line === "" ? "terminalSpacer" : "terminalLine"}>
              {line}
            </div>
          ))}
        </div>
      </section>

      <div className="bottomBadge">
        Browser-safe hints + real Wasm exports + stylized assembly output
      </div>
    </main>
  );
}
