"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface TreeOfWisdomStageProps {
  question: {
    questionId: number;
    dayNumber: number;
    type: string;
    questionText: string;
    options?: string[];
    hint?: string;
  };
  dayLabel: string;
  submitting: boolean;
  showHint: boolean;
  setShowHint: (v: boolean) => void;
  onSubmit: (answer: string) => void;
  onClose: () => void;
}

function createWisdomGlowTex(inner: string, mid: string, outer: string): THREE.CanvasTexture {
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

export default function TreeOfWisdomStage({
  question,
  dayLabel,
  submitting,
  showHint,
  setShowHint,
  onSubmit,
  onClose,
}: TreeOfWisdomStageProps) {
  const treeHostRef = useRef<HTMLDivElement | null>(null);
  const podsGridRef = useRef<HTMLDivElement | null>(null);
  const [lockedIdx, setLockedIdx] = useState<number | null>(null);
  const [stagePhase, setStagePhase] = useState<"idle" | "locking">("idle");
  const [hoveredPod, setHoveredPod] = useState<number | null>(null);
  const [webglFallback, setWebglFallback] = useState(false);

  const lockingRef = useRef(false);
  const hoveredPodRef = useRef<number | null>(null);
  const burstRef = useRef<(() => void) | null>(null);

  const options = Array.isArray(question.options) ? question.options : [];
  const LETTERS = ["A", "B", "C", "D"];

  useEffect(() => {
    lockingRef.current = stagePhase === "locking" || submitting;
  }, [stagePhase, submitting]);

  useEffect(() => {
    hoveredPodRef.current = hoveredPod;
  }, [hoveredPod]);

  // Progressive fallback for CSS sibling-index() stagger
  useEffect(() => {
    if (typeof window === "undefined" || !podsGridRef.current) return;
    if (
      typeof CSS !== "undefined" &&
      !CSS.supports("animation-delay: calc(sibling-index() * 0.1s)")
    ) {
      Array.from(podsGridRef.current.children).forEach((el, index) => {
        (el as HTMLElement).style.setProperty("--sibling-index", String(index + 1));
      });
    }
  }, [options.length]);

  // Real Three.js 3D Golden-Sapphire Tree of Wisdom
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
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    host.innerHTML = "";
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);

    // Sanctuary sapphire & warm gold lighting
    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x082f49, 0.95);
    scene.add(hemi);
    const goldKey = new THREE.DirectionalLight(0xfef08a, 1.25);
    goldKey.position.set(5, 9, 6);
    scene.add(goldKey);
    const sapphireRim = new THREE.DirectionalLight(0x38bdf8, 0.75);
    sapphireRim.position.set(-6, 5, -5);
    scene.add(sapphireRim);
    const coreLight = new THREE.PointLight(0x4eb1cb, 2.2, 10);
    coreLight.position.set(0, 1.5, 1.4);
    scene.add(coreLight);

    const treeRoot = new THREE.Group();
    treeRoot.position.y = -1.25;
    scene.add(treeRoot);

    const goldGlowTex = createWisdomGlowTex(
      "rgba(255,251,235,0.95)",
      "rgba(251,191,36,0.48)",
      "rgba(245,158,11,0)"
    );
    const cyanGlowTex = createWisdomGlowTex(
      "rgba(224,242,254,0.9)",
      "rgba(78,177,203,0.42)",
      "rgba(14,116,144,0)"
    );

    const disposableGeos: THREE.BufferGeometry[] = [];
    const disposableMats: THREE.Material[] = [];

    // 1. Carved Sanctuary Pedestal Dais + Double Concentric Wisdom Rings
    const daisGeo = new THREE.CylinderGeometry(1.45, 1.72, 0.28, 32);
    const daisMat = new THREE.MeshStandardMaterial({
      color: 0x082638,
      roughness: 0.42,
      metalness: 0.55,
      emissive: 0x0c4a6e,
      emissiveIntensity: 0.35,
    });
    disposableGeos.push(daisGeo);
    disposableMats.push(daisMat);
    const dais = new THREE.Mesh(daisGeo, daisMat);
    dais.position.y = -0.14;
    treeRoot.add(dais);

    const innerRingGeo = new THREE.TorusGeometry(1.52, 0.032, 10, 48);
    const outerRingGeo = new THREE.TorusGeometry(2.05, 0.022, 10, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.72,
      roughness: 0.28,
      metalness: 0.8,
    });
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.7,
    });
    disposableGeos.push(innerRingGeo, outerRingGeo);
    disposableMats.push(ringMat, outerRingMat);

    const innerRing = new THREE.Mesh(innerRingGeo, ringMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.02;
    treeRoot.add(innerRing);

    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = -0.04;
    treeRoot.add(outerRing);

    // 2. Sculpted Golden-Bronze Living Trunk, Roots & Graceful Arching Boughs
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0xb47b38,
      emissive: 0x5c3610,
      emissiveIntensity: 0.32,
      roughness: 0.42,
      metalness: 0.52,
    });
    disposableMats.push(trunkMat);

    const addLimb = (from: THREE.Vector3, to: THREE.Vector3, rBot: number, rTop: number) => {
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      const geo = new THREE.CylinderGeometry(rTop, rBot, len, 12);
      disposableGeos.push(geo);
      const m = new THREE.Mesh(geo, trunkMat);
      m.position.copy(from).addScaledVector(dir, 0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      treeRoot.add(m);
    };

    const t0 = new THREE.Vector3(0, 0, 0);
    const t1 = new THREE.Vector3(-0.07, 0.82, 0.05);
    const t2 = new THREE.Vector3(0.05, 1.58, -0.03);
    addLimb(t0, t1, 0.27, 0.19);
    addLimb(t1, t2, 0.19, 0.13);

    // Graceful spreading roots gripping the dais
    for (let r = 0; r < 6; r++) {
      const a = (r / 6) * Math.PI * 2 + 0.25;
      addLimb(
        new THREE.Vector3(Math.cos(a) * 0.14, 0.25, Math.sin(a) * 0.14),
        new THREE.Vector3(Math.cos(a) * 0.85, 0.0, Math.sin(a) * 0.85),
        0.095,
        0.035
      );
    }

    // 6 Primary arching boughs + forked sub-branches
    for (let b = 0; b < 6; b++) {
      const a = (b / 6) * Math.PI * 2;
      const mid = new THREE.Vector3(Math.cos(a) * 0.88, 2.08 + (b % 2) * 0.22, Math.sin(a) * 0.85);
      addLimb(t2, mid, 0.1, 0.06);
      const tipA = new THREE.Vector3(
        mid.x + Math.cos(a - 0.42) * 0.72,
        mid.y + 0.48,
        mid.z + Math.sin(a - 0.42) * 0.68
      );
      const tipB = new THREE.Vector3(
        mid.x + Math.cos(a + 0.42) * 0.68,
        mid.y + 0.36,
        mid.z + Math.sin(a + 0.42) * 0.68
      );
      addLimb(mid, tipA, 0.055, 0.025);
      addLimb(mid, tipB, 0.055, 0.025);
    }
    addLimb(t2, new THREE.Vector3(0, 2.9, 0), 0.085, 0.035);

    // 3. Crystalline Sapphire-Cyan & Sunlit-Gold Faceted Canopy (64 sculptural facets)
    const crystalGeo = new THREE.OctahedronGeometry(0.28, 1);
    disposableGeos.push(crystalGeo);
    const leafNodes: {
      mesh: THREE.Mesh;
      mat: THREE.MeshStandardMaterial;
      baseColor: THREE.Color;
      phase: number;
    }[] = [];

    const canopyPalette = [0x0ea5e9, 0x38bdf8, 0x4eb1cb, 0x0284c7, 0xfbbf24];
    let seed = 7771;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 64; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 64);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const rad = 1.05 + rand() * 0.72;
      const baseColor = new THREE.Color(canopyPalette[i % canopyPalette.length]);
      const mat = new THREE.MeshStandardMaterial({
        color: baseColor.clone(),
        emissive: baseColor.clone().multiplyScalar(0.35),
        emissiveIntensity: 0.65,
        roughness: 0.26,
        metalness: 0.25,
        flatShading: true,
      });
      disposableMats.push(mat);

      const m = new THREE.Mesh(crystalGeo, mat);
      m.position.set(
        rad * Math.sin(phi) * Math.cos(theta) * 1.18,
        2.35 + rad * Math.cos(phi) * 0.7,
        rad * Math.sin(phi) * Math.sin(theta) * 1.12
      );
      const s = 0.62 + rand() * 0.65;
      m.scale.set(s, s * 0.82, s);
      m.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      treeRoot.add(m);
      leafNodes.push({ mesh: m, mat, baseColor, phase: rand() * Math.PI * 2 });
    }

    // 4. 7 Glowing Golden Wisdom Orbs (representing the 7 sermon days/truths)
    const orbGeo = new THREE.SphereGeometry(0.12, 14, 14);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    disposableGeos.push(orbGeo);
    disposableMats.push(orbMat);
    const wisdomOrbs: { group: THREE.Group; baseAngle: number; rad: number; y: number }[] = [];

    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const rad = 1.68 + (k % 2) * 0.24;
      const y = 1.85 + (k % 3) * 0.42;
      const g = new THREE.Group();
      g.add(new THREE.Mesh(orbGeo, orbMat));
      const spMat = new THREE.SpriteMaterial({
        map: goldGlowTex,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      disposableMats.push(spMat);
      const sp = new THREE.Sprite(spMat);
      sp.scale.set(0.85, 0.85, 1);
      g.add(sp);
      treeRoot.add(g);
      wisdomOrbs.push({ group: g, baseAngle: a, rad, y });
    }

    // 5. Rising Sanctuary Light Motes
    const moteCount = 46;
    const motePos = new Float32Array(moteCount * 3);
    const moteSeeds = Array.from({ length: moteCount }, () => ({
      a: rand() * Math.PI * 2,
      r: 0.9 + rand() * 2.1,
      y: rand() * 3.8,
      spd: 0.25 + rand() * 0.45,
      rise: 0.008 + rand() * 0.012,
    }));
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
    const moteMat = new THREE.PointsMaterial({
      size: 0.24,
      map: cyanGlowTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposableGeos.push(moteGeo);
    disposableMats.push(moteMat);
    treeRoot.add(new THREE.Points(moteGeo, moteMat));

    // Crown ambient glow halo
    const crownHaloMat = new THREE.SpriteMaterial({
      map: cyanGlowTex,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    disposableMats.push(crownHaloMat);
    const crownHalo = new THREE.Sprite(crownHaloMat);
    crownHalo.position.set(0, 2.3, -0.5);
    crownHalo.scale.set(6.4, 5.2, 1);
    treeRoot.add(crownHalo);

    // 6. Lock-in Golden Spark Burst Pool
    const sparkGeo = new THREE.SphereGeometry(0.05, 6, 6);
    disposableGeos.push(sparkGeo);
    const sparks: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; maxLife: number }[] = [];

    burstRef.current = () => {
      for (let i = 0; i < 32; i++) {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xfef08a }));
        m.position.set((Math.random() - 0.5) * 1.4, 2.0 + (Math.random() - 0.5) * 1.0, (Math.random() - 0.5) * 1.4);
        const a = Math.random() * Math.PI * 2;
        const spd = 0.04 + Math.random() * 0.085;
        treeRoot.add(m);
        sparks.push({
          mesh: m,
          vel: new THREE.Vector3(Math.cos(a) * spd, 0.03 + Math.random() * 0.08, Math.sin(a) * spd),
          life: 0,
          maxLife: 38 + Math.random() * 24,
        });
      }
    };

    // Responsive camera fit
    const fitStage = () => {
      const w = Math.max(220, host.clientWidth || 360);
      const h = Math.max(180, host.clientHeight || 220);
      const aspect = w / h;
      camera.aspect = aspect;
      const dist = aspect < 1.25 ? 8.1 : 6.9;
      camera.position.set(0, 1.85, dist);
      camera.lookAt(0, 0.9, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    fitStage();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fitStage) : null;
    ro?.observe(host);
    window.addEventListener("resize", fitStage);

    // Drag-to-spin 3D interaction
    let dragging = false;
    let lastX = 0;
    let spinVel = 0.0055;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      renderer.domElement.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      treeRoot.rotation.y += dx * 0.011;
      spinVel = dx * 0.003;
    };
    const onUp = () => {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
    };

    const domEl = renderer.domElement;
    domEl.style.cursor = "grab";
    domEl.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    const goldColor = new THREE.Color(0xfbbf24);
    const clock = new THREE.Clock();
    let rafId = 0;
    let surgeMix = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (document.hidden) return;

      const t = clock.getElapsedTime();
      const isLocking = lockingRef.current;
      const hasHover = hoveredPodRef.current !== null;

      surgeMix += ((isLocking ? 1 : hasHover ? 0.32 : 0) - surgeMix) * 0.08;

      if (!dragging) {
        const targetSpin = isLocking ? 0.026 : 0.0055;
        spinVel += (targetSpin - spinVel) * 0.04;
        treeRoot.rotation.y += spinVel;
      }

      // Pulse pedestal rings & canopy illumination
      innerRing.rotation.z = t * 0.35;
      outerRing.rotation.z = -t * 0.22;
      coreLight.intensity = 2.0 + surgeMix * 2.8;
      coreLight.color.setHex(surgeMix > 0.45 ? 0xfde047 : 0x4eb1cb);
      crownHaloMat.map = surgeMix > 0.5 ? goldGlowTex : cyanGlowTex;
      crownHaloMat.opacity = 0.48 + surgeMix * 0.36;

      for (let i = 0; i < leafNodes.length; i++) {
        const ln = leafNodes[i];
        ln.mat.color.copy(ln.baseColor).lerp(goldColor, surgeMix * 0.85);
        ln.mat.emissive.copy(ln.mat.color).multiplyScalar(0.35 + surgeMix * 0.45);
        const pulse = 1 + Math.sin(t * 2.0 + ln.phase) * 0.04 + surgeMix * 0.1;
        ln.mesh.scale.setScalar(pulse * 0.88);
      }

      for (const orb of wisdomOrbs) {
        const a = orb.baseAngle + t * (isLocking ? 1.15 : 0.32);
        orb.group.position.set(
          Math.cos(a) * orb.rad,
          orb.y + Math.sin(t * 1.9 + orb.baseAngle) * 0.16,
          Math.sin(a) * orb.rad
        );
      }

      const mPos = moteGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < moteCount; i++) {
        const s = moteSeeds[i];
        s.y += isLocking ? s.rise * 2.8 : s.rise;
        if (s.y > 4.0) s.y = 0.05;
        const a = s.a + t * s.spd;
        mPos.setXYZ(i, Math.cos(a) * s.r, s.y, Math.sin(a) * s.r);
      }
      mPos.needsUpdate = true;

      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.life++;
        sp.mesh.position.add(sp.vel);
        sp.vel.multiplyScalar(0.96);
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
      burstRef.current = null;

      sparks.forEach((sp) => (sp.mesh.material as THREE.Material).dispose());
      disposableGeos.forEach((g) => g.dispose());
      disposableMats.forEach((m) => m.dispose());
      goldGlowTex.dispose();
      cyanGlowTex.dispose();
      renderer.dispose();
    };
  }, []);

  const handleSelectPod = (opt: string, idx: number) => {
    if (submitting || stagePhase === "locking") return;
    setLockedIdx(idx);
    setStagePhase("locking");
    burstRef.current?.();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(14);
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      onSubmit(opt);
    }, 760);
  };

  return (
    <div className="hgf-wisdom-stage-overlay">
      {/* Converging Sanctuary Spotlight Cones */}
      <div className="hgf-spotlight-beam hgf-spotlight-left" aria-hidden="true" />
      <div className="hgf-spotlight-beam hgf-spotlight-right" aria-hidden="true" />

      {/* Top Stage Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px 8px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              background: "rgba(78, 177, 203, 0.22)",
              color: "#7dd3fc",
              fontSize: "0.8rem",
              fontWeight: 800,
              padding: "5px 14px",
              borderRadius: "999px",
              border: "1px solid rgba(78, 177, 203, 0.45)",
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
          onClick={onClose}
          disabled={submitting || stagePhase === "locking"}
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            fontSize: "1rem",
            padding: "7px 14px",
            borderRadius: "10px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ✕
        </button>
      </div>

      {/* Main Stage Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 16px 90px",
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "680px",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        {/* Real Three.js 3D Golden-Sapphire Tree of Wisdom */}
        {!webglFallback && (
          <div
            style={{
              width: "100%",
              height: "clamp(205px, 31vh, 275px)",
              marginBottom: "6px",
              borderRadius: "20px",
              background: "radial-gradient(ellipse at 50% 62%, rgba(78,177,203,0.16) 0%, rgba(3,14,22,0.12) 72%)",
              border: "1px solid rgba(78, 177, 203, 0.2)",
              overflow: "hidden",
            }}
          >
            <div
              ref={treeHostRef}
              style={{ width: "100%", height: "100%", touchAction: "none" }}
              aria-label="3D Tree of Wisdom Sanctuary Stage"
            />
          </div>
        )}

        {/* Iconic Hexagonal Beveled Question Chamber with Flanking Stage Rails */}
        <div className="hgf-stage-rail-row" style={{ marginTop: "8px", marginBottom: "14px" }}>
          <div className="hgf-stage-rail" />
          <div className="hgf-hex-question-chamber">
            <div className="hgf-hex-question-inner">
              <p
                style={{
                  color: "#f8fafc",
                  fontSize: "1.06rem",
                  fontWeight: 700,
                  lineHeight: 1.48,
                  margin: 0,
                  textAlign: "center",
                }}
              >
                {question.questionText}
              </p>
            </div>
          </div>
          <div className="hgf-stage-rail" />
        </div>

        {/* Optional Hint Toggle */}
        {question.hint && (
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              style={{
                background: "rgba(251, 191, 36, 0.12)",
                border: "1px solid rgba(251, 191, 36, 0.38)",
                borderRadius: "999px",
                padding: "5px 14px",
                color: "#fde68a",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {showHint ? "Hide Hint" : "Show Scripture Hint"}
            </button>
            {showHint && (
              <div
                style={{
                  marginTop: "8px",
                  background: "rgba(251, 191, 36, 0.1)",
                  border: "1px solid rgba(251, 191, 36, 0.32)",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  color: "#fef3c7",
                  fontSize: "0.84rem",
                  maxWidth: "520px",
                }}
              >
                {question.hint}
              </div>
            )}
          </div>
        )}

        {/* 4 Hexagonal Spotlight Answer Pods (A / B / C / D) */}
        <div ref={podsGridRef} className="hgf-hex-pods-grid">
          {options.map((opt: string, idx: number) => {
            const isLocked = lockedIdx === idx;
            const isDimmed = lockedIdx !== null && lockedIdx !== idx;
            return (
              <div key={idx} className="hgf-pod-stagger-item">
                <div className="hgf-stage-rail hgf-pod-rail" />
                <button
                  type="button"
                  disabled={submitting || stagePhase === "locking"}
                  onClick={() => handleSelectPod(opt, idx)}
                  onMouseEnter={() => setHoveredPod(idx)}
                  onMouseLeave={() => setHoveredPod(null)}
                  className={`hgf-hex-pod-btn ${isLocked ? "is-locked" : ""} ${
                    isDimmed ? "is-dimmed" : ""
                  }`}
                >
                  <span className="hgf-hex-pod-inner">
                    <span className="hgf-pod-diamond">◆</span>
                    <span className="hgf-pod-letter">{LETTERS[idx] || idx + 1}:</span>
                    <span className="hgf-pod-text">{opt}</span>
                  </span>
                </button>
                <div className="hgf-stage-rail hgf-pod-rail" />
              </div>
            );
          })}
        </div>

        {(stagePhase === "locking" || submitting) && (
          <p
            style={{
              color: "#fde68a",
              marginTop: "18px",
              fontSize: "0.88rem",
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            Illuminating the Tree of Wisdom...
          </p>
        )}
      </div>

      <style>{`
        .hgf-wisdom-stage-overlay {
          position: fixed;
          inset: 0;
          background: radial-gradient(circle at 50% 24%, #0f3850 0%, #071d2b 52%, #030e16 100%);
          z-index: 11000;
          display: flex;
          flex-direction: column;
          padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));
          overflow-y: auto;
          overflow-x: hidden;
        }

        .hgf-spotlight-beam {
          position: fixed;
          top: -10%;
          width: 46vw;
          height: 75vh;
          pointer-events: none;
          z-index: 1;
          opacity: 0.24;
          filter: blur(24px);
          transition: opacity 0.4s ease;
        }

        .hgf-spotlight-left {
          left: -8%;
          background: linear-gradient(155deg, rgba(78, 177, 203, 0.52) 0%, rgba(78, 177, 203, 0) 72%);
          transform: rotate(-12deg);
        }

        .hgf-spotlight-right {
          right: -8%;
          background: linear-gradient(205deg, rgba(251, 191, 36, 0.36) 0%, rgba(251, 191, 36, 0) 72%);
          transform: rotate(12deg);
        }

        .hgf-stage-rail-row {
          display: flex;
          align-items: center;
          width: 100%;
        }

        .hgf-stage-rail {
          height: 2px;
          flex: 1;
          min-width: 12px;
          background: linear-gradient(90deg, rgba(78, 177, 203, 0.15), rgba(78, 177, 203, 0.85), rgba(78, 177, 203, 0.15));
          box-shadow: 0 0 8px rgba(78, 177, 203, 0.45);
        }

        .hgf-hex-question-chamber {
          width: 100%;
          max-width: 580px;
          padding: 2px;
          background: linear-gradient(135deg, #4EB1CB 0%, #fbbf24 50%, #0284c7 100%);
          clip-path: polygon(18px 0%, calc(100% - 18px) 0%, 100% 50%, calc(100% - 18px) 100%, 18px 100%, 0% 50%);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
        }

        .hgf-hex-question-inner {
          background: linear-gradient(180deg, #092536 0%, #051622 100%);
          clip-path: polygon(17px 0%, calc(100% - 17px) 0%, 100% 50%, calc(100% - 17px) 100%, 17px 100%, 0% 50%);
          padding: 18px 28px;
        }

        .hgf-hex-pods-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 10px;
          width: 100%;
          margin-top: 4px;
        }

        @media (max-width: 560px) {
          .hgf-hex-pods-grid {
            grid-template-columns: 1fr;
          }
        }

        .hgf-pod-stagger-item {
          --stagger-time: 0.08s;
          display: flex;
          align-items: center;
          width: 100%;
          animation: hgfPodEnter 0.36s cubic-bezier(0.2, 0, 0, 1) backwards;
          animation-delay: calc(var(--sibling-index, 1) * var(--stagger-time));
          animation-delay: calc(sibling-index() * var(--stagger-time));
        }

        @media (prefers-reduced-motion: reduce) {
          .hgf-pod-stagger-item {
            animation: none;
          }
        }

        @keyframes hgfPodEnter {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .hgf-pod-rail {
          max-width: 14px;
          flex: 0 0 10px;
        }

        .hgf-hex-pod-btn {
          flex: 1;
          border: none;
          padding: 2px;
          cursor: pointer;
          background: linear-gradient(90deg, #38bdf8 0%, #4EB1CB 50%, #0284c7 100%);
          clip-path: polygon(14px 0%, calc(100% - 14px) 0%, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0% 50%);
          transition: transform 0.16s cubic-bezier(0.2, 0, 0, 1), opacity 0.2s ease;
          text-align: left;
        }

        .hgf-hex-pod-btn:hover:not(:disabled) {
          transform: scale(1.02);
          background: linear-gradient(90deg, #fbbf24 0%, #4EB1CB 50%, #fbbf24 100%);
        }

        .hgf-hex-pod-btn:active:not(:disabled) {
          transform: scale(0.985);
        }

        .hgf-hex-pod-inner {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 54px;
          padding: 12px 20px;
          background: linear-gradient(180deg, #0b2d42 0%, #061a28 100%);
          clip-path: polygon(13px 0%, calc(100% - 13px) 0%, 100% 50%, calc(100% - 13px) 100%, 13px 100%, 0% 50%);
          transition: background 0.2s ease;
        }

        .hgf-pod-diamond {
          color: #fbbf24;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .hgf-pod-letter {
          color: #fbbf24;
          font-weight: 800;
          font-size: 0.92rem;
          flex-shrink: 0;
        }

        .hgf-pod-text {
          color: #f1f5f9;
          font-weight: 600;
          font-size: 0.94rem;
          line-height: 1.35;
        }

        .hgf-hex-pod-btn.is-locked {
          background: linear-gradient(90deg, #fde68a 0%, #f59e0b 50%, #fde68a 100%);
          transform: scale(1.025);
        }

        .hgf-hex-pod-btn.is-locked .hgf-hex-pod-inner {
          background: linear-gradient(180deg, #b45309 0%, #78350f 100%);
        }

        .hgf-hex-pod-btn.is-locked .hgf-pod-diamond,
        .hgf-hex-pod-btn.is-locked .hgf-pod-letter,
        .hgf-hex-pod-btn.is-locked .hgf-pod-text {
          color: #ffffff;
        }

        .hgf-hex-pod-btn.is-dimmed {
          opacity: 0.45;
        }
      `}</style>
    </div>
  );
}
