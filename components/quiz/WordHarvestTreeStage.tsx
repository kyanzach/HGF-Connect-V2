"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

interface WordHarvestTreeStageProps {
  question: {
    questionId: number;
    dayNumber: number;
    questionText: string;
    hint?: string;
    wordChunks?: string[];
  };
  dayLabel: string;
  submitting: boolean;
  showHint: boolean;
  setShowHint: (v: boolean) => void;
  onSubmit: (answer: string) => void;
  onClose: () => void;
}

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

function playPluckNote(stepIndex: number, isReturn = false) {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const freq = isReturn ? 349.23 : PENTATONIC[stepIndex % PENTATONIC.length];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isReturn ? "sine" : "triangle";
    osc.frequency.setValueAtTime(freq, now);
    if (!isReturn) {
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, now + 0.16);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.075, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch {
    // Audio optional
  }
}

function createSoftHaloTexture(inner: string, mid: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.4, mid);
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export default function WordHarvestTreeStage({
  question,
  dayLabel,
  submitting,
  showHint,
  setShowHint,
  onSubmit,
  onClose,
}: WordHarvestTreeStageProps) {
  const treeHostRef = useRef<HTMLDivElement | null>(null);
  const chunks = useMemo(
    () => (question.wordChunks && question.wordChunks.length >= 3 ? question.wordChunks : []),
    [question.wordChunks]
  );

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [manualMode, setManualMode] = useState(chunks.length === 0);
  const [manualText, setManualText] = useState("");
  const [hoveredChunk, setHoveredChunk] = useState<number | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);

  const selectedIndicesRef = useRef<number[]>([]);
  const hoveredChunkRef = useRef<number | null>(null);
  const burstOrbRef = useRef<((idx: number) => void) | null>(null);

  useEffect(() => {
    selectedIndicesRef.current = selectedIndices;
  }, [selectedIndices]);

  useEffect(() => {
    hoveredChunkRef.current = hoveredChunk;
  }, [hoveredChunk]);

  const pluckWord = useCallback(
    (idx: number) => {
      if (submitting) return;
      setSelectedIndices((prev) => {
        if (prev.includes(idx)) return prev;
        playPluckNote(prev.length, false);
        burstOrbRef.current?.(idx);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(12);
          } catch {
            // ignore
          }
        }
        return [...prev, idx];
      });
    },
    [submitting]
  );

  const returnWord = useCallback((posInTray: number) => {
    playPluckNote(0, true);
    setSelectedIndices((prev) => prev.filter((_, i) => i !== posInTray));
  }, []);

  // Real Three.js 3D Interactive Blooming Tree of Life
  useEffect(() => {
    const host = treeHostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setWebglFallback(true);
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    host.innerHTML = "";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    camera.position.set(0, 1.85, 7.2);
    camera.lookAt(0, 0.85, 0);

    // Rich sanctuary lighting
    const hemi = new THREE.HemisphereLight(0xa7f3d0, 0x042f2e, 0.9);
    scene.add(hemi);
    const sunKey = new THREE.DirectionalLight(0xfef08a, 1.15);
    sunKey.position.set(5, 9, 6);
    scene.add(sunKey);
    const rimTeal = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimTeal.position.set(-6, 4, -4);
    scene.add(rimTeal);
    const canopyGlowLight = new THREE.PointLight(0x34d399, 1.8, 9);
    canopyGlowLight.position.set(0, 1.6, 1.2);
    scene.add(canopyGlowLight);

    const treeRoot = new THREE.Group();
    treeRoot.position.y = -1.25;
    scene.add(treeRoot);

    const goldHaloTex = createSoftHaloTexture(
      "rgba(255,251,235,0.95)",
      "rgba(251,191,36,0.45)",
      "rgba(245,158,11,0)"
    );
    const emeraldHaloTex = createSoftHaloTexture(
      "rgba(209,250,229,0.85)",
      "rgba(16,185,129,0.35)",
      "rgba(6,78,59,0)"
    );

    // 1. Floating Sanctuary Moss Mound & Golden Water Ring
    const moundGeo = new THREE.CylinderGeometry(1.55, 1.2, 0.36, 24);
    const moundMat = new THREE.MeshStandardMaterial({
      color: 0x064e3b,
      roughness: 0.78,
      metalness: 0.08,
    });
    const mound = new THREE.Mesh(moundGeo, moundMat);
    mound.position.y = -0.18;
    treeRoot.add(mound);

    const ringGeo = new THREE.TorusGeometry(1.62, 0.03, 10, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.7,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    treeRoot.add(ring);

    // 2. Sculpted 3D Bark Trunk & Forked Branches
    const barkMat = new THREE.MeshStandardMaterial({
      color: 0x7c4a26,
      roughness: 0.88,
      metalness: 0.04,
    });
    const disposableGeos: THREE.BufferGeometry[] = [moundGeo, ringGeo];
    const disposableMats: THREE.Material[] = [moundMat, ringMat, barkMat];

    const addBranch = (
      from: THREE.Vector3,
      to: THREE.Vector3,
      rBottom: number,
      rTop: number
    ) => {
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      const geo = new THREE.CylinderGeometry(rTop, rBottom, len, 10);
      disposableGeos.push(geo);
      const mesh = new THREE.Mesh(geo, barkMat);
      mesh.position.copy(from).addScaledVector(dir, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      treeRoot.add(mesh);
    };

    // Main curved trunk
    const t0 = new THREE.Vector3(0, 0, 0);
    const t1 = new THREE.Vector3(0.06, 0.85, 0.04);
    const t2 = new THREE.Vector3(-0.04, 1.62, -0.02);
    addBranch(t0, t1, 0.28, 0.2);
    addBranch(t1, t2, 0.2, 0.14);

    // Flared roots
    for (let r = 0; r < 5; r++) {
      const a = (r / 5) * Math.PI * 2 + 0.3;
      addBranch(
        new THREE.Vector3(Math.cos(a) * 0.12, 0.22, Math.sin(a) * 0.12),
        new THREE.Vector3(Math.cos(a) * 0.68, -0.02, Math.sin(a) * 0.68),
        0.1,
        0.04
      );
    }

    // 5 Primary boughs + sub-twigs
    const boughTips: THREE.Vector3[] = [];
    for (let b = 0; b < 5; b++) {
      const a = (b / 5) * Math.PI * 2 + 0.2;
      const mid = new THREE.Vector3(Math.cos(a) * 0.82, 2.15 + (b % 2) * 0.22, Math.sin(a) * 0.78);
      addBranch(t2, mid, 0.11, 0.065);
      boughTips.push(mid);

      const tip1 = new THREE.Vector3(
        mid.x + Math.cos(a - 0.45) * 0.65,
        mid.y + 0.42,
        mid.z + Math.sin(a - 0.45) * 0.62
      );
      const tip2 = new THREE.Vector3(
        mid.x + Math.cos(a + 0.45) * 0.62,
        mid.y + 0.34,
        mid.z + Math.sin(a + 0.45) * 0.62
      );
      addBranch(mid, tip1, 0.06, 0.03);
      addBranch(mid, tip2, 0.06, 0.03);
      boughTips.push(tip1, tip2);
    }
    // Crown center bough
    const crownTop = new THREE.Vector3(0, 2.85, 0);
    addBranch(t2, crownTop, 0.09, 0.04);
    boughTips.push(crownTop);

    // 3. Lush 3D Faceted Emerald-Gold Canopy Foliage Clusters (56 sculpted clusters)
    const leafGeo = new THREE.IcosahedronGeometry(0.32, 1);
    disposableGeos.push(leafGeo);
    const leafMeshes: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; baseColor: THREE.Color; phase: number }[] = [];
    const palette = [0x10b981, 0x059669, 0x34d399, 0x0d9488, 0x14b8a6];

    let seed = 4219;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 56; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 56);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const rad = 1.05 + rand() * 0.68;
      const baseColor = new THREE.Color(palette[i % palette.length]);
      const mat = new THREE.MeshStandardMaterial({
        color: baseColor.clone(),
        emissive: baseColor.clone().multiplyScalar(0.28),
        emissiveIntensity: 0.55,
        roughness: 0.45,
        metalness: 0.06,
        flatShading: true,
      });
      disposableMats.push(mat);
      const m = new THREE.Mesh(leafGeo, mat);
      m.position.set(
        rad * Math.sin(phi) * Math.cos(theta) * 1.12,
        2.35 + rad * Math.cos(phi) * 0.72,
        rad * Math.sin(phi) * Math.sin(theta) * 1.05
      );
      const s = 0.72 + rand() * 0.68;
      m.scale.set(s, s * 0.85, s);
      m.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      treeRoot.add(m);
      leafMeshes.push({ mesh: m, mat, baseColor, phase: rand() * Math.PI * 2 });
    }

    // 4. Interactive 3D Hanging Golden Word-Fruit Orbs (one per wordChunk — tappable directly on the 3D tree!)
    const orbGeo = new THREE.SphereGeometry(0.19, 16, 16);
    const hitOrbGeo = new THREE.SphereGeometry(0.45, 10, 10);
    const hitOrbMat = new THREE.MeshBasicMaterial({ visible: false });
    disposableGeos.push(orbGeo, hitOrbGeo);
    disposableMats.push(hitOrbMat);

    const fruitOrbs: {
      idx: number;
      group: THREE.Group;
      mesh: THREE.Mesh;
      mat: THREE.MeshStandardMaterial;
      halo: THREE.Sprite;
      basePos: THREE.Vector3;
    }[] = [];
    const hitOrbs: THREE.Mesh[] = [];

    const chunkCount = Math.max(1, chunks.length);
    chunks.forEach((_, idx) => {
      const a = (idx / chunkCount) * Math.PI * 2 - Math.PI * 0.35;
      const r = 1.48;
      const pos = new THREE.Vector3(
        Math.cos(a) * r,
        2.05 + (idx % 2 === 0 ? 0.32 : -0.18),
        Math.sin(a) * r * 0.92 + 0.28
      );

      const g = new THREE.Group();
      g.position.copy(pos);

      const mat = new THREE.MeshStandardMaterial({
        color: 0xfde047,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.95,
        roughness: 0.22,
        metalness: 0.25,
      });
      disposableMats.push(mat);

      const mesh = new THREE.Mesh(orbGeo, mat);
      g.add(mesh);

      const haloMat = new THREE.SpriteMaterial({
        map: goldHaloTex,
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      disposableMats.push(haloMat);
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(1.15, 1.15, 1);
      g.add(halo);

      const hit = new THREE.Mesh(hitOrbGeo, hitOrbMat);
      hit.userData = { chunkIdx: idx };
      g.add(hit);
      hitOrbs.push(hit);

      treeRoot.add(g);
      fruitOrbs.push({ idx, group: g, mesh, mat, halo, basePos: pos });
    });

    // 5. Orbiting Sanctuary Fireflies
    const fireflyCount = 44;
    const ffPos = new Float32Array(fireflyCount * 3);
    const ffSeeds = Array.from({ length: fireflyCount }, () => ({
      a: rand() * Math.PI * 2,
      r: 1.4 + rand() * 1.9,
      y: 0.2 + rand() * 3.4,
      spd: 0.22 + rand() * 0.45,
    }));
    const ffGeo = new THREE.BufferGeometry();
    ffGeo.setAttribute("position", new THREE.BufferAttribute(ffPos, 3));
    const ffMat = new THREE.PointsMaterial({
      size: 0.26,
      map: goldHaloTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposableGeos.push(ffGeo);
    disposableMats.push(ffMat);
    const fireflies = new THREE.Points(ffGeo, ffMat);
    treeRoot.add(fireflies);

    // Background canopy aura sprite
    const auraMat = new THREE.SpriteMaterial({
      map: emeraldHaloTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposableMats.push(auraMat);
    const auraSprite = new THREE.Sprite(auraMat);
    auraSprite.position.set(0, 2.25, -0.6);
    auraSprite.scale.set(6.2, 5.4, 1);
    treeRoot.add(auraSprite);

    // Burst sparks when plucking a word
    const sparkGeo = new THREE.SphereGeometry(0.045, 6, 6);
    disposableGeos.push(sparkGeo);
    const sparks: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }[] = [];

    const spawnBurst = (idx: number) => {
      const orb = fruitOrbs[idx];
      const origin = orb ? orb.group.position : new THREE.Vector3(0, 2.2, 0.5);
      for (let i = 0; i < 18; i++) {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xfef08a }));
        m.position.copy(origin);
        const a = Math.random() * Math.PI * 2;
        const sp = 0.025 + Math.random() * 0.06;
        treeRoot.add(m);
        sparks.push({
          mesh: m,
          vel: new THREE.Vector3(Math.cos(a) * sp, 0.02 + Math.random() * 0.06, Math.sin(a) * sp),
          life: 0,
          maxLife: 32 + Math.random() * 20,
        });
      }
    };
    burstOrbRef.current = spawnBurst;

    // Responsive sizing
    const fitStage = () => {
      const w = Math.max(220, host.clientWidth || 360);
      const h = Math.max(180, host.clientHeight || 220);
      const aspect = w / h;
      camera.aspect = aspect;
      const dist = aspect < 1.2 ? 7.9 : 6.7;
      camera.position.set(0, 1.75, dist);
      camera.lookAt(0, 0.9, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    fitStage();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fitStage) : null;
    ro?.observe(host);
    window.addEventListener("resize", fitStage);

    // Drag-to-spin 3D tree + raycast orb plucking
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragging = false;
    let lastX = 0;
    let dragMoved = 0;
    let spinVel = 0.0045;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      dragMoved = 0;
      renderer.domElement.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      dragMoved += Math.abs(dx);
      treeRoot.rotation.y += dx * 0.01;
      spinVel = dx * 0.0025;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      renderer.domElement.style.cursor = "grab";
      if (dragMoved < 10 && hitOrbs.length > 0) {
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        ndc.y = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(hitOrbs, false);
        if (hits.length > 0 && typeof hits[0].object.userData?.chunkIdx === "number") {
          pluckWord(hits[0].object.userData.chunkIdx);
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.style.cursor = "grab";
    domEl.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    const goldTarget = new THREE.Color(0xfbbf24);
    const clock = new THREE.Clock();
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (document.hidden) return;

      const t = clock.getElapsedTime();
      const sel = selectedIndicesRef.current;
      const hov = hoveredChunkRef.current;
      const bloom = chunks.length > 0 ? sel.length / chunks.length : 0;

      if (!dragging) {
        spinVel += (0.0042 - spinVel) * 0.03;
        treeRoot.rotation.y += spinVel;
      }

      // Canopy blooms progressively from emerald toward sunlit gold!
      canopyGlowLight.intensity = 1.6 + bloom * 2.2;
      canopyGlowLight.color.setHex(bloom >= 0.99 ? 0xfde047 : 0x34d399);
      auraMat.opacity = 0.45 + bloom * 0.35;

      for (let i = 0; i < leafMeshes.length; i++) {
        const lm = leafMeshes[i];
        const goldMix = Math.min(0.72, bloom * 0.72 * ((i % 3) * 0.35 + 0.35));
        lm.mat.color.copy(lm.baseColor).lerp(goldTarget, goldMix);
        lm.mat.emissive.copy(lm.mat.color).multiplyScalar(0.28 + bloom * 0.32);
        const breath = 1 + Math.sin(t * 1.6 + lm.phase) * 0.035 + bloom * 0.08;
        lm.mesh.scale.setScalar(breath * 0.92);
      }

      // Update hanging 3D word orbs
      for (const orb of fruitOrbs) {
        const plucked = sel.includes(orb.idx);
        const isHov = hov === orb.idx && !plucked;
        const goalScale = plucked ? 0.001 : isHov ? 1.48 : 1.0 + Math.sin(t * 2.6 + orb.idx) * 0.08;
        orb.group.scale.lerp(new THREE.Vector3(goalScale, goalScale, goalScale), 0.16);
        orb.group.position.y = orb.basePos.y + Math.sin(t * 1.8 + orb.idx * 1.3) * 0.07;
        orb.mat.emissiveIntensity = isHov ? 1.8 : 0.95;
      }

      // Orbit fireflies
      const posArr = ffGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < fireflyCount; i++) {
        const s = ffSeeds[i];
        const ang = s.a + t * s.spd;
        posArr.setXYZ(i, Math.cos(ang) * s.r, s.y + Math.sin(t * 1.4 + i) * 0.22, Math.sin(ang) * s.r);
      }
      posArr.needsUpdate = true;

      // Update pluck spark bursts
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.life++;
        sp.mesh.position.add(sp.vel);
        sp.vel.multiplyScalar(0.95);
        sp.mesh.scale.setScalar(Math.max(0.01, 1 - sp.life / sp.maxLife));
        if (sp.life >= sp.maxLife) {
          treeRoot.remove(sp.mesh);
          (sp.mesh.material as THREE.Material).dispose();
          sparks.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener("resize", fitStage);
      domEl.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      burstOrbRef.current = null;

      sparks.forEach((sp) => (sp.mesh.material as THREE.Material).dispose());
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
      goldHaloTex.dispose();
      emeraldHaloTex.dispose();
      renderer.dispose();
    };
  }, [chunks, pluckWord]);

  const assembledSentence = selectedIndices.map((idx) => chunks[idx]).join(" ");
  const isComplete = chunks.length > 0 && selectedIndices.length === chunks.length;
  const canSubmit = manualMode ? manualText.trim().length > 0 : isComplete;
  const bloomPct = chunks.length > 0 ? Math.round((selectedIndices.length / chunks.length) * 100) : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "radial-gradient(ellipse at 50% 18%, #0d3a3a 0%, #061d21 55%, #041115 100%)",
        color: "#f8fafc",
        overflowY: "auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px calc(env(safe-area-inset-bottom, 0px) + 28px)",
      }}
    >
      <style>{`
        @keyframes leafPopIn {
          0% { transform: scale(0.86) translateY(6px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .wh-leaf-chip {
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, opacity 0.22s ease;
        }
        .wh-leaf-chip:hover:not(:disabled) {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 10px 24px rgba(16, 185, 129, 0.28), 0 0 16px rgba(251, 191, 36, 0.22);
          border-color: #fde047 !important;
        }
        .wh-leaf-chip:active:not(:disabled) {
          transform: scale(0.96);
        }
      `}</style>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                background: "rgba(16, 185, 129, 0.18)",
                border: "1px solid rgba(52, 211, 153, 0.45)",
                color: "#a7f3d0",
                padding: "5px 13px",
                borderRadius: "999px",
                fontSize: "0.76rem",
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              {dayLabel}
            </span>
            {!webglFallback && (
              <span
                style={{
                  background: "rgba(251, 191, 36, 0.14)",
                  border: "1px solid rgba(251, 191, 36, 0.3)",
                  color: "#fde68a",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Drag to spin 3D tree
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: "rgba(255,255,255,0.08)",
              color: "#e2e8f0",
              fontSize: "1.05rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Real Three.js 3D Interactive Blooming Tree Stage */}
        {!webglFallback && (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "clamp(200px, 31vh, 275px)",
              marginBottom: "8px",
              borderRadius: "20px",
              background: "radial-gradient(ellipse at 50% 60%, rgba(16,185,129,0.14) 0%, rgba(4,17,21,0.2) 72%)",
              border: "1px solid rgba(52, 211, 153, 0.18)",
              overflow: "hidden",
            }}
          >
            <div ref={treeHostRef} style={{ width: "100%", height: "100%", touchAction: "none" }} />
            {!manualMode && chunks.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  bottom: "8px",
                  right: "10px",
                  pointerEvents: "none",
                  background: "rgba(4, 17, 21, 0.72)",
                  border: isComplete
                    ? "1px solid rgba(253, 224, 71, 0.55)"
                    : "1px solid rgba(52, 211, 153, 0.35)",
                  color: isComplete ? "#fde047" : "#a7f3d0",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  backdropFilter: "blur(6px)",
                }}
              >
                {isComplete ? "Full Bloom · 100%" : `Bloom ${bloomPct}% · ${selectedIndices.length}/${chunks.length}`}
              </div>
            )}
          </div>
        )}

        {/* Question Prompt & Controls */}
        <div style={{ textAlign: "center", marginBottom: "14px" }}>
          <h2
            style={{
              fontSize: "clamp(1rem, 2.8vw, 1.18rem)",
              fontWeight: 800,
              lineHeight: 1.4,
              margin: "0 0 8px",
              color: "#ffffff",
            }}
          >
            {question.questionText}
          </h2>
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {question.hint && (
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                style={{
                  background: "rgba(253, 224, 71, 0.14)",
                  border: "1px solid rgba(253, 224, 71, 0.35)",
                  color: "#fde68a",
                  borderRadius: "999px",
                  padding: "4px 12px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {showHint ? "Hide Hint" : "Need a Hint?"}
              </button>
            )}
            {chunks.length > 0 && (
              <button
                type="button"
                onClick={() => setManualMode(!manualMode)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#cbd5e1",
                  borderRadius: "999px",
                  padding: "4px 12px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {manualMode ? "Use Leaf Harvest" : "Type Own Words"}
              </button>
            )}
          </div>
          {showHint && question.hint && (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "0.82rem",
                color: "#fde68a",
                background: "rgba(6, 29, 33, 0.85)",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                lineHeight: 1.4,
              }}
            >
              {question.hint}
            </p>
          )}
        </div>

        {!manualMode ? (
          <>
            {/* Illuminated Harvest Verse Ribbon */}
            <div
              style={{
                minHeight: "74px",
                background: isComplete
                  ? "linear-gradient(155deg, rgba(6, 78, 59, 0.72), rgba(120, 53, 15, 0.42))"
                  : "rgba(6, 24, 30, 0.78)",
                border: isComplete
                  ? "1.5px solid #fbbf24"
                  : "1.5px solid rgba(78, 177, 203, 0.35)",
                borderRadius: "18px",
                padding: "12px 14px",
                marginBottom: "16px",
                boxShadow: isComplete
                  ? "0 0 28px rgba(251, 191, 36, 0.25), inset 0 1px 0 rgba(255,255,255,0.12)"
                  : "inset 0 2px 10px rgba(0, 0, 0, 0.35)",
                transition: "all 0.25s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: selectedIndices.length > 0 ? "8px" : "0px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    color: isComplete ? "#fde047" : "#67e8f9",
                    letterSpacing: "0.04em",
                  }}
                >
                  {selectedIndices.length === 0
                    ? "Pluck the glowing leaves in order — or tap orbs on the 3D tree"
                    : isComplete
                    ? "Truth Harvested — Tap any leaf to reorder"
                    : `Harvested ${selectedIndices.length} of ${chunks.length} leaves`}
                </span>
                {selectedIndices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      playPluckNote(0, true);
                      setSelectedIndices([]);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "2px 6px",
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {selectedIndices.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", alignItems: "center" }}>
                  {selectedIndices.map((chunkIdx, pos) => (
                    <button
                      key={`${chunkIdx}-${pos}`}
                      type="button"
                      onClick={() => returnWord(pos)}
                      style={{
                        animation: "leafPopIn 0.2s ease both",
                        background: "linear-gradient(135deg, #0d9488 0%, #0284c7 100%)",
                        color: "#ffffff",
                        border: "1px solid rgba(186, 230, 253, 0.7)",
                        borderRadius: "14px 4px 14px 4px",
                        padding: "7px 11px",
                        fontSize: "0.84rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 4px 12px rgba(2, 132, 199, 0.28)",
                      }}
                    >
                      <span
                        style={{
                          width: "17px",
                          height: "17px",
                          borderRadius: "999px",
                          background: "rgba(255,255,255,0.22)",
                          fontSize: "0.68rem",
                          fontWeight: 900,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {pos + 1}
                      </span>
                      <span>{chunks[chunkIdx]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Organic Botanical Leaf Chips to Pluck */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                justifyContent: "center",
                marginBottom: "18px",
              }}
            >
              {chunks.map((chunk, idx) => {
                const used = selectedIndices.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    className="wh-leaf-chip"
                    disabled={used || submitting}
                    onClick={() => pluckWord(idx)}
                    onMouseEnter={() => setHoveredChunk(idx)}
                    onMouseLeave={() => setHoveredChunk(null)}
                    style={{
                      background: used
                        ? "rgba(255,255,255,0.03)"
                        : "linear-gradient(145deg, rgba(16, 185, 129, 0.34) 0%, rgba(13, 148, 136, 0.26) 55%, rgba(217, 119, 6, 0.24) 100%)",
                      border: used
                        ? "1px dashed rgba(255,255,255,0.1)"
                        : "1.5px solid rgba(110, 231, 183, 0.58)",
                      color: used ? "#475569" : "#f0fdf4",
                      borderRadius: "20px 5px 20px 5px",
                      padding: "10px 15px",
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      cursor: used ? "default" : "pointer",
                      opacity: used ? 0.28 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: used ? "none" : "0 6px 16px rgba(0, 0, 0, 0.28)",
                    }}
                  >
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "999px",
                        background: used ? "#334155" : "#fde047",
                        boxShadow: used ? "none" : "0 0 10px #fde047",
                        flexShrink: 0,
                      }}
                    />
                    <span>{chunk}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Write your answer in English, Bisaya, or Tagalog..."
            rows={4}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 14px",
              borderRadius: "14px",
              border: "1.5px solid rgba(52, 211, 153, 0.45)",
              background: "rgba(6, 24, 30, 0.8)",
              color: "#ffffff",
              fontSize: "0.92rem",
              fontFamily: "inherit",
              marginBottom: "16px",
            }}
          />
        )}

        {/* Submit Action */}
        <button
          type="button"
          disabled={!canSubmit || submitting}
          onClick={() => onSubmit(manualMode ? manualText.trim() : assembledSentence)}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: "14px",
            border: canSubmit ? "1px solid #fde047" : "1px solid rgba(255,255,255,0.12)",
            background: canSubmit
              ? "linear-gradient(135deg, #10b981 0%, #0d9488 55%, #f59e0b 100%)"
              : "rgba(255,255,255,0.08)",
            color: canSubmit ? "#ffffff" : "#64748b",
            fontSize: "0.95rem",
            fontWeight: 900,
            cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
            boxShadow: canSubmit ? "0 8px 24px rgba(16, 185, 129, 0.34)" : "none",
            transition: "all 0.2s ease",
          }}
        >
          {submitting ? "Harvesting..." : "Submit Harvested Truth"}
        </button>
      </div>
    </div>
  );
}
