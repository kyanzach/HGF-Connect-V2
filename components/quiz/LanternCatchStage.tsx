"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface LanternCatchStageProps {
  question: {
    questionId: number;
    dayNumber: number;
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

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function playLanternChime(freq = 523.25) {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(freq, now);
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 1.5, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.6);
    osc2.stop(now + 0.6);
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 700);
  } catch {
    // Audio optional
  }
}

function createRadialGlowTexture(innerHex: string, midHex: string, outerRgba: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, innerHex);
  grad.addColorStop(0.35, midHex);
  grad.addColorStop(1, outerRgba);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createLanternPaperTexture(letter: string, active: boolean): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;

  // Warm illuminated rice-paper gradient (brightest near candle at bottom)
  const bg = ctx.createLinearGradient(0, 256, 0, 0);
  if (active) {
    bg.addColorStop(0, "#fffbeb");
    bg.addColorStop(0.28, "#fde047");
    bg.addColorStop(0.68, "#f59e0b");
    bg.addColorStop(1, "#b45309");
  } else {
    bg.addColorStop(0, "#fef3c7");
    bg.addColorStop(0.3, "#7dd3fc");
    bg.addColorStop(0.68, "#0284c7");
    bg.addColorStop(1, "#0c4a6e");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 256);

  // Subtle horizontal & vertical bamboo ribs
  ctx.strokeStyle = active ? "rgba(120, 53, 15, 0.24)" : "rgba(7, 36, 54, 0.28)";
  ctx.lineWidth = 2;
  for (let x = 0; x < 512; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 48; y < 240; y += 52) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Paint crisp option letter crest on front and back faces
  const drawCrest = (cx: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, 122, 34, 0, Math.PI * 2);
    ctx.fillStyle = active ? "rgba(120, 53, 15, 0.42)" : "rgba(6, 27, 38, 0.52)";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = active ? "#fef08a" : "#bae6fd";
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 38px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, cx, 124);
    ctx.restore();
  };

  drawCrest(128);
  drawCrest(384);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

interface LanternNode {
  idx: number;
  optionText: string;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  bodyMat: THREE.MeshStandardMaterial;
  flameMesh: THREE.Mesh;
  glowSprite: THREE.Sprite;
  innerLight: THREE.PointLight;
  tasselGroup: THREE.Group;
  hitMesh: THREE.Mesh;
  texIdle: THREE.CanvasTexture;
  texActive: THREE.CanvasTexture;
  basePos: THREE.Vector3;
  curPos: THREE.Vector3;
  curScale: number;
  bobPhase: number;
  bobSpeed: number;
  rotSpeed: number;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export default function LanternCatchStage({
  question,
  dayLabel,
  submitting,
  showHint,
  setShowHint,
  onSubmit,
  onClose,
}: LanternCatchStageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [launching, setLaunching] = useState(false);
  const [webglFallback, setWebglFallback] = useState(false);

  const selectedIdxRef = useRef<number | null>(null);
  const hoveredIdxRef = useRef<number | null>(null);
  const launchingRef = useRef(false);
  const spawnBurstRef = useRef<((idx: number) => void) | null>(null);

  const options = question.options || [];
  const selectedOption = selectedIdx !== null ? options[selectedIdx] ?? null : null;

  useEffect(() => {
    selectedIdxRef.current = selectedIdx;
  }, [selectedIdx]);

  useEffect(() => {
    hoveredIdxRef.current = hoveredIdx;
  }, [hoveredIdx]);

  useEffect(() => {
    launchingRef.current = launching;
  }, [launching]);

  const handleSelectLantern = useCallback(
    (idx: number) => {
      if (submitting || launchingRef.current) return;
      setSelectedIdx(idx);
      const notes = [440, 493.88, 587.33, 659.25];
      playLanternChime(notes[idx % notes.length]);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(14);
        } catch {
          // ignore
        }
      }
      spawnBurstRef.current?.(idx);
    },
    [submitting]
  );

  const handleCatchSubmit = useCallback(() => {
    if (selectedIdx === null || !selectedOption || submitting || launching) return;
    setLaunching(true);
    playLanternChime(783.99);
    spawnBurstRef.current?.(selectedIdx);
    setTimeout(() => {
      onSubmit(selectedOption);
    }, 520);
  }, [selectedIdx, selectedOption, submitting, launching, onSubmit]);

  // Real Three.js 3D Interactive Sky-Lantern Festival Scene
  useEffect(() => {
    const container = stageRef.current;
    if (!container || options.length === 0) return;

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
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x061b26, 0.022);

    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 140);
    const lookTarget = new THREE.Vector3(0, 0.05, 0);

    // Ambient & moonlit sanctuary lighting
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x082f49, 0.72);
    scene.add(hemiLight);
    const moonDir = new THREE.DirectionalLight(0xe0f2fe, 0.55);
    moonDir.position.set(8, 12, 6);
    scene.add(moonDir);

    // Shared glow sprites
    const goldGlowTex = createRadialGlowTexture(
      "rgba(255,251,235,0.95)",
      "rgba(251,191,36,0.45)",
      "rgba(245,158,11,0)"
    );
    const cyanGlowTex = createRadialGlowTexture(
      "rgba(236,254,255,0.85)",
      "rgba(78,177,203,0.38)",
      "rgba(14,116,144,0)"
    );
    const starTex = createRadialGlowTexture(
      "rgba(255,255,255,1)",
      "rgba(186,230,253,0.5)",
      "rgba(186,230,253,0)"
    );

    // 1. Twinkling 3D Starfield
    const starCount = 280;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 24 + Math.random() * 34;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.62;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = 2 + r * Math.cos(phi) * 0.7;
      starPos[i * 3 + 2] = -12 - Math.abs(r * Math.sin(phi) * Math.sin(theta));
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.42,
      map: starTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 2. Soft Crescent / Full Moon Halo in Distance
    const moonGroup = new THREE.Group();
    moonGroup.position.set(7.5, 6.8, -22);
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.15, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3 })
    );
    moonGroup.add(moonMesh);
    const moonHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: goldGlowTex,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    moonHalo.scale.set(8.5, 8.5, 1);
    moonGroup.add(moonHalo);
    scene.add(moonGroup);

    // 3. Calm Night Water Plane Reflecting Warm Glow
    const waterGeo = new THREE.PlaneGeometry(80, 60);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x04151f,
      roughness: 0.22,
      metalness: 0.72,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -4.2;
    scene.add(water);

    // 4. Sculpted Sky-Lantern LatheGeometry (authentic rounded Kongming silhouette)
    const lathePts = [
      new THREE.Vector2(0.32, -0.78),
      new THREE.Vector2(0.46, -0.52),
      new THREE.Vector2(0.64, -0.14),
      new THREE.Vector2(0.72, 0.28),
      new THREE.Vector2(0.66, 0.66),
      new THREE.Vector2(0.46, 0.9),
      new THREE.Vector2(0.18, 0.99),
      new THREE.Vector2(0.0, 1.01),
    ];
    const lanternBodyGeo = new THREE.LatheGeometry(lathePts, 28);
    const rimBottomGeo = new THREE.TorusGeometry(0.33, 0.032, 10, 28);
    const rimTopGeo = new THREE.TorusGeometry(0.19, 0.025, 10, 24);
    const flameGeo = new THREE.SphereGeometry(0.14, 14, 14);
    const hitSphereGeo = new THREE.SphereGeometry(1.22, 14, 14);
    const tasselCordGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.44, 6);
    const tasselTipGeo = new THREE.ConeGeometry(0.055, 0.2, 8);

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.35,
      metalness: 0.75,
      emissive: 0x78350f,
      emissiveIntensity: 0.35,
    });
    const tasselMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.45,
      metalness: 0.3,
      emissive: 0x92400e,
      emissiveIntensity: 0.3,
    });
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });

    // 5. Distant Background Rising Festival Lanterns (36 tiny 3D lanterns)
    const bgLanternGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.32, 10);
    const bgLanterns: { mesh: THREE.Mesh; speed: number; sway: number; phase: number; baseX: number }[] = [];
    for (let i = 0; i < 36; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xfde047 : i % 3 === 1 ? 0xfb923c : 0x7dd3fc,
        transparent: true,
        opacity: 0.55 + Math.random() * 0.35,
      });
      const m = new THREE.Mesh(bgLanternGeo, mat);
      const bx = (Math.random() - 0.5) * 32;
      const by = -3.6 + Math.random() * 14;
      const bz = -6 - Math.random() * 20;
      m.position.set(bx, by, bz);
      const s = 0.55 + Math.random() * 0.75;
      m.scale.set(s, s, s);
      scene.add(m);
      bgLanterns.push({
        mesh: m,
        speed: 0.004 + Math.random() * 0.007,
        sway: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        baseX: bx,
      });
    }

    // 6. Build the 4 Real Interactive 3D Answer Lanterns
    const lanterns: LanternNode[] = [];
    const hitMeshes: THREE.Mesh[] = [];

    options.forEach((opt, idx) => {
      const group = new THREE.Group();
      const letter = LETTERS[idx] || String(idx + 1);
      const texIdle = createLanternPaperTexture(letter, false);
      const texActive = createLanternPaperTexture(letter, true);

      const bodyMat = new THREE.MeshStandardMaterial({
        map: texIdle,
        emissiveMap: texIdle,
        emissive: new THREE.Color(0x38bdf8),
        emissiveIntensity: 0.62,
        roughness: 0.52,
        metalness: 0.05,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
      });

      const bodyMesh = new THREE.Mesh(lanternBodyGeo, bodyMat);
      group.add(bodyMesh);

      const bottomRim = new THREE.Mesh(rimBottomGeo, brassMat);
      bottomRim.rotation.x = Math.PI / 2;
      bottomRim.position.y = -0.78;
      group.add(bottomRim);

      const topRim = new THREE.Mesh(rimTopGeo, brassMat);
      topRim.rotation.x = Math.PI / 2;
      topRim.position.y = 0.99;
      group.add(topRim);

      // Inner flickering candle flame
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
      const flameMesh = new THREE.Mesh(flameGeo, flameMat);
      flameMesh.position.y = -0.52;
      flameMesh.scale.set(0.85, 1.45, 0.85);
      group.add(flameMesh);

      // Soft radial aura around lantern
      const glowSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: cyanGlowTex,
          transparent: true,
          opacity: 0.55,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      glowSprite.scale.set(3.2, 3.6, 1);
      glowSprite.position.y = 0.05;
      group.add(glowSprite);

      // Real inner warm PointLight
      const innerLight = new THREE.PointLight(0x67e8f9, 1.6, 7.5);
      innerLight.position.set(0, -0.25, 0.35);
      group.add(innerLight);

      // Swaying silk tassel underneath
      const tasselGroup = new THREE.Group();
      tasselGroup.position.y = -0.8;
      const cord = new THREE.Mesh(tasselCordGeo, tasselMat);
      cord.position.y = -0.22;
      tasselGroup.add(cord);
      const tip = new THREE.Mesh(tasselTipGeo, tasselMat);
      tip.position.y = -0.46;
      tasselGroup.add(tip);
      group.add(tasselGroup);

      // Generous invisible raycast hit sphere for easy tapping
      const hitMesh = new THREE.Mesh(hitSphereGeo, hitMat);
      hitMesh.userData = { lanternIdx: idx };
      group.add(hitMesh);
      hitMeshes.push(hitMesh);

      scene.add(group);
      lanterns.push({
        idx,
        optionText: opt,
        group,
        bodyMesh,
        bodyMat,
        flameMesh,
        glowSprite,
        innerLight,
        tasselGroup,
        hitMesh,
        texIdle,
        texActive,
        basePos: new THREE.Vector3(),
        curPos: new THREE.Vector3(),
        curScale: 0.01,
        bobPhase: idx * 1.65,
        bobSpeed: 1.15 + idx * 0.14,
        rotSpeed: 0.22 + idx * 0.03,
      });
    });

    // 7. 3D Spark Burst Pool (golden fireflies when catching a lantern)
    const sparks: SparkParticle[] = [];
    const sparkGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const spawnBurst = (idx: number) => {
      const ln = lanterns[idx];
      if (!ln) return;
      for (let i = 0; i < 24; i++) {
        const m = new THREE.Mesh(sparkGeo, sparkMat.clone());
        m.position.copy(ln.group.position);
        m.position.x += (Math.random() - 0.5) * 0.6;
        m.position.y += (Math.random() - 0.5) * 0.6;
        m.position.z += (Math.random() - 0.5) * 0.6;
        const angle = Math.random() * Math.PI * 2;
        const spd = 0.03 + Math.random() * 0.075;
        const vel = new THREE.Vector3(
          Math.cos(angle) * spd,
          0.035 + Math.random() * 0.085,
          Math.sin(angle) * spd
        );
        scene.add(m);
        sparks.push({ mesh: m, vel, life: 0, maxLife: 40 + Math.random() * 28 });
      }
    };
    spawnBurstRef.current = spawnBurst;

    // 8. Liquid Responsive Layout & Camera Frustum Auto-Fit
    let baseCamZ = 10.6;
    let baseCamY = 0.65;
    let stageW = container.clientWidth || window.innerWidth;
    let stageH = container.clientHeight || window.innerHeight;

    const layoutLanternsAndCamera = (w: number, h: number) => {
      stageW = Math.max(240, w);
      stageH = Math.max(320, h);
      const aspect = stageW / stageH;
      const isPortrait = stageW < 680 || aspect < 0.95;

      const count = lanterns.length;
      if (isPortrait) {
        // 2x2 staggered 3D diamond formation for mobile / narrow screens
        const colX = 1.65;
        const rowYTop = 1.15;
        const rowYBot = -1.25;
        lanterns.forEach((ln, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = count === 2 ? (i === 0 ? -1.55 : 1.55) : col === 0 ? -colX : colX;
          const y = count === 2 ? 0.1 : row === 0 ? rowYTop : rowYBot;
          const z = row === 0 ? 0.35 : -0.35;
          ln.basePos.set(x, y, z);
          if (ln.curScale < 0.05) ln.curPos.set(x, y - 2.2, z);
        });
        const tanHalfV = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
        const reqHalfW = 3.25;
        const reqDistW = reqHalfW / (tanHalfV * Math.max(0.45, aspect));
        baseCamZ = Math.min(16.5, Math.max(9.2, reqDistW));
        baseCamY = 0.25;
      } else {
        // Sweeping 3D festival arc across the night sky for desktop / landscape
        const spread = count <= 2 ? 3.1 : 2.65;
        const halfSpan = ((count - 1) * spread) / 2;
        lanterns.forEach((ln, i) => {
          const x = -halfSpan + i * spread;
          const norm = count > 1 ? (i / (count - 1)) * 2 - 1 : 0; // -1..+1
          const y = (i % 2 === 0 ? 0.35 : -0.18) - Math.abs(norm) * 0.18;
          const z = (1 - norm * norm) * 0.95 - 0.35; // gentle 3D curve toward viewer in center
          ln.basePos.set(x, y, z);
          if (ln.curScale < 0.05) ln.curPos.set(x, y - 2.4, z);
        });
        const tanHalfV = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
        const reqHalfW = halfSpan + 1.85;
        const reqDistW = reqHalfW / (tanHalfV * Math.max(0.65, aspect));
        baseCamZ = Math.min(15.5, Math.max(8.8, reqDistW));
        baseCamY = 0.55;
      }

      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(stageW, stageH, false);
    };

    layoutLanternsAndCamera(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (!container) return;
            layoutLanternsAndCamera(container.clientWidth, container.clientHeight);
          })
        : null;
    resizeObserver?.observe(container);
    const onWindowResize = () => layoutLanternsAndCamera(container.clientWidth, container.clientHeight);
    window.addEventListener("resize", onWindowResize);

    // 9. Interactive Drag-to-Orbit + Direct 3D Raycast Tap / Hover
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(-99, -99);

    let orbitYaw = 0;
    let orbitPitch = 0;
    let targetYaw = 0;
    let targetPitch = 0;
    let isPointerDown = false;
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;
    let draggedDist = 0;

    const getHitLanternIdx = (clientX: number, clientY: number): number => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return -1;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(hitMeshes, false);
      if (hits.length > 0 && typeof hits[0].object.userData?.lanternIdx === "number") {
        return hits[0].object.userData.lanternIdx;
      }
      return -1;
    };

    const onPointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      downX = e.clientX;
      downY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      draggedDist = 0;
      renderer.domElement.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isPointerDown) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        draggedDist += Math.hypot(dx, dy);
        targetYaw = Math.max(-0.55, Math.min(0.55, targetYaw - dx * 0.0045));
        targetPitch = Math.max(-0.24, Math.min(0.28, targetPitch + dy * 0.0032));
        return;
      }
      // Subtle desktop hover parallax + raycast highlight
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
      targetYaw = nx * 0.14;
      targetPitch = ny * 0.07;

      const hitIdx = getHitLanternIdx(e.clientX, e.clientY);
      if (hitIdx !== hoveredIdxRef.current) {
        setHoveredIdx(hitIdx >= 0 ? hitIdx : null);
      }
      renderer.domElement.style.cursor = hitIdx >= 0 ? "pointer" : "grab";
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isPointerDown) return;
      isPointerDown = false;
      renderer.domElement.style.cursor = "grab";
      // Distinguish genuine tap/click from drag-to-orbit
      if (draggedDist < 12) {
        const hitIdx = getHitLanternIdx(e.clientX, e.clientY);
        if (hitIdx >= 0) {
          handleSelectLantern(hitIdx);
        }
      }
    };

    const onPointerLeave = () => {
      isPointerDown = false;
      targetYaw = 0;
      targetPitch = 0;
      setHoveredIdx(null);
      renderer.domElement.style.cursor = "grab";
    };

    const domEl = renderer.domElement;
    domEl.style.cursor = "grab";
    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    domEl.addEventListener("pointerleave", onPointerLeave);

    // 10. Main 60fps Three.js Animation Loop + Live 3D→2D Projected Label Tracking
    let rafId = 0;
    const clock = new THREE.Clock();
    const projVec = new THREE.Vector3();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (document.hidden) return;

      const elapsed = clock.getElapsedTime();

      // Smooth damped 3D orbit camera
      orbitYaw += (targetYaw - orbitYaw) * 0.08;
      orbitPitch += (targetPitch - orbitPitch) * 0.08;
      const camX = Math.sin(orbitYaw) * baseCamZ;
      const camZ = Math.cos(orbitYaw) * baseCamZ;
      const camY = baseCamY + orbitPitch * 4.2;
      camera.position.set(camX, camY, camZ);
      camera.lookAt(lookTarget);

      // Gentle star drift
      stars.rotation.y = elapsed * 0.012;

      // Distant background rising lanterns
      for (const bg of bgLanterns) {
        bg.mesh.position.y += bg.speed;
        bg.mesh.position.x = bg.baseX + Math.sin(elapsed * 0.6 + bg.phase) * bg.sway;
        if (bg.mesh.position.y > 10.5) {
          bg.mesh.position.y = -3.8;
        }
      }

      // Animate the 4 interactive 3D answer lanterns
      const sel = selectedIdxRef.current;
      const hov = hoveredIdxRef.current;
      const isLaunch = launchingRef.current;

      for (const ln of lanterns) {
        const isSelected = sel === ln.idx;
        const isHovered = hov === ln.idx;

        const bobY = Math.sin(elapsed * ln.bobSpeed + ln.bobPhase) * 0.14;
        const swayX = Math.cos(elapsed * 0.75 + ln.bobPhase) * 0.08;

        let goalX = ln.basePos.x + swayX;
        let goalY = ln.basePos.y + bobY;
        let goalZ = ln.basePos.z;
        let goalScale = 1.0;

        if (isSelected) {
          goalZ += isLaunch ? 1.8 : 1.55;
          goalY += isLaunch ? 4.8 : 0.24;
          goalScale = isLaunch ? 1.28 : 1.18;
        } else if (sel !== null) {
          goalZ -= 0.55;
          goalScale = 0.92;
        } else if (isHovered) {
          goalZ += 0.55;
          goalY += 0.14;
          goalScale = 1.09;
        }

        const lerpSpd = isLaunch && isSelected ? 0.065 : 0.1;
        ln.curPos.x += (goalX - ln.curPos.x) * lerpSpd;
        ln.curPos.y += (goalY - ln.curPos.y) * lerpSpd;
        ln.curPos.z += (goalZ - ln.curPos.z) * lerpSpd;
        ln.curScale += (goalScale - ln.curScale) * 0.12;

        ln.group.position.copy(ln.curPos);
        ln.group.scale.setScalar(ln.curScale);

        // Gentle lantern rotation + wind tilt
        ln.bodyMesh.rotation.y = Math.sin(elapsed * ln.rotSpeed + ln.bobPhase) * 0.35;
        ln.group.rotation.z = Math.sin(elapsed * 0.9 + ln.bobPhase) * 0.055;
        ln.tasselGroup.rotation.z = Math.sin(elapsed * 2.1 + ln.bobPhase) * 0.16;

        // Swap idle vs radiant golden paper texture + light color
        const wantTex = isSelected ? ln.texActive : ln.texIdle;
        if (ln.bodyMat.map !== wantTex) {
          ln.bodyMat.map = wantTex;
          ln.bodyMat.emissiveMap = wantTex;
          ln.bodyMat.needsUpdate = true;
        }
        ln.bodyMat.emissive.setHex(isSelected ? 0xf59e0b : isHovered ? 0x7dd3fc : 0x38bdf8);
        const flicker = 0.92 + Math.sin(elapsed * 9.5 + ln.bobPhase * 3) * 0.08;
        ln.bodyMat.emissiveIntensity = (isSelected ? 1.05 : isHovered ? 0.8 : 0.55) * flicker;

        ln.innerLight.color.setHex(isSelected ? 0xfde047 : 0x67e8f9);
        ln.innerLight.intensity = (isSelected ? 3.2 : isHovered ? 2.1 : 1.35) * flicker;

        const glowMat = ln.glowSprite.material as THREE.SpriteMaterial;
        const wantGlow = isSelected ? goldGlowTex : cyanGlowTex;
        if (glowMat.map !== wantGlow) {
          glowMat.map = wantGlow;
          glowMat.needsUpdate = true;
        }
        glowMat.opacity = (isSelected ? 0.88 : isHovered ? 0.65 : 0.42) * flicker;
        ln.glowSprite.scale.setScalar(isSelected ? 3.9 : isHovered ? 3.3 : 2.8);

        ln.flameMesh.scale.set(0.85 * flicker, 1.45 * flicker, 0.85 * flicker);

        // Project 3D anchor beneath lantern to exact 2D screen coords for its floating answer tag
        const labelEl = labelRefs.current[ln.idx];
        if (labelEl) {
          projVec.set(ln.curPos.x, ln.curPos.y - 1.28 * ln.curScale, ln.curPos.z);
          projVec.project(camera);
          const sx = (projVec.x * 0.5 + 0.5) * stageW;
          const sy = (-projVec.y * 0.5 + 0.5) * stageH;
          const halfW = Math.min(stageW * 0.46, (labelEl.offsetWidth || 156) / 2);
          const clampedX = Math.max(halfW + 8, Math.min(stageW - halfW - 8, sx));
          const clampedY = Math.max(150, Math.min(stageH - 108, sy));
          labelEl.style.transform = `translate3d(${clampedX.toFixed(1)}px, ${clampedY.toFixed(1)}px, 0) translate(-50%, 0)`;
          labelEl.style.opacity = isLaunch && !isSelected ? "0.25" : "1";
          labelEl.style.zIndex = isSelected ? "18" : isHovered ? "15" : "12";
        }
      }

      // Update 3D spark particles
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.life++;
        sp.mesh.position.add(sp.vel);
        sp.vel.y += 0.0012; // gentle thermal rise
        sp.vel.multiplyScalar(0.97);
        const progress = sp.life / sp.maxLife;
        const s = Math.max(0.01, 1 - progress);
        sp.mesh.scale.setScalar(s);
        if (sp.life >= sp.maxLife) {
          scene.remove(sp.mesh);
          (sp.mesh.material as THREE.Material).dispose();
          sparks.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onWindowResize);
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      domEl.removeEventListener("pointerleave", onPointerLeave);
      spawnBurstRef.current = null;

      // Full GPU memory cleanup
      lanterns.forEach((ln) => {
        ln.texIdle.dispose();
        ln.texActive.dispose();
        ln.bodyMat.dispose();
        (ln.flameMesh.material as THREE.Material).dispose();
        (ln.glowSprite.material as THREE.Material).dispose();
      });
      sparks.forEach((sp) => (sp.mesh.material as THREE.Material).dispose());
      bgLanterns.forEach((bg) => (bg.mesh.material as THREE.Material).dispose());
      lanternBodyGeo.dispose();
      rimBottomGeo.dispose();
      rimTopGeo.dispose();
      flameGeo.dispose();
      hitSphereGeo.dispose();
      tasselCordGeo.dispose();
      tasselTipGeo.dispose();
      bgLanternGeo.dispose();
      sparkGeo.dispose();
      starGeo.dispose();
      starMat.dispose();
      waterGeo.dispose();
      waterMat.dispose();
      brassMat.dispose();
      tasselMat.dispose();
      hitMat.dispose();
      goldGlowTex.dispose();
      cyanGlowTex.dispose();
      starTex.dispose();
      renderer.dispose();
    };
  }, [options, handleSelectLantern]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "radial-gradient(ellipse at 50% 22%, #0d364a 0%, #071e2b 55%, #04111a 100%)",
        color: "#f8fafc",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Full-Screen Interactive Three.js 3D WebGL Stage */}
      {!webglFallback && (
        <div
          ref={stageRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            touchAction: "none",
            zIndex: 1,
          }}
        />
      )}

      {/* Top HUD: Badge, Close, Question & Hint (pointer-events: none on wrapper so 3D drag still works around it) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 25,
          pointerEvents: "none",
          padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 10px",
          background: "linear-gradient(180deg, rgba(4,17,26,0.92) 0%, rgba(4,17,26,0.68) 72%, rgba(4,17,26,0) 100%)",
        }}
      >
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", pointerEvents: "auto" }}>
              <span
                style={{
                  background: "rgba(78, 177, 203, 0.18)",
                  border: "1px solid rgba(103, 232, 249, 0.42)",
                  color: "#cffafe",
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
                    border: "1px solid rgba(251, 191, 36, 0.32)",
                    color: "#fde68a",
                    padding: "4px 10px",
                    borderRadius: "999px",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  Drag sky · Tap a 3D lantern
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                pointerEvents: "auto",
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(15, 23, 42, 0.65)",
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

          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontSize: "clamp(1rem, 2.8vw, 1.24rem)",
                fontWeight: 800,
                lineHeight: 1.38,
                margin: "0 0 8px",
                color: "#ffffff",
                textShadow: "0 2px 12px rgba(0,0,0,0.65)",
              }}
            >
              {question.questionText}
            </h2>
            {question.hint && (
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                style={{
                  pointerEvents: "auto",
                  background: "rgba(253, 224, 71, 0.15)",
                  border: "1px solid rgba(253, 224, 71, 0.38)",
                  color: "#fef08a",
                  borderRadius: "999px",
                  padding: "4px 13px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {showHint ? "Hide Hint" : "Need a Hint?"}
              </button>
            )}
            {showHint && question.hint && (
              <p
                style={{
                  pointerEvents: "auto",
                  marginTop: "8px",
                  marginBottom: 0,
                  fontSize: "0.82rem",
                  color: "#fde68a",
                  background: "rgba(6, 27, 38, 0.88)",
                  padding: "8px 14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(251, 191, 36, 0.35)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {question.hint}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Live 3D-Projected Floating Answer Tags Tethered Under Each 3D Lantern */}
      {!webglFallback ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 12, pointerEvents: "none" }}>
          {options.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const isHovered = hoveredIdx === idx;
            const letter = LETTERS[idx] || String(idx + 1);
            return (
              <button
                key={idx}
                ref={(el) => {
                  labelRefs.current[idx] = el;
                }}
                type="button"
                disabled={submitting || launching}
                onClick={() => handleSelectLantern(idx)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  pointerEvents: "auto",
                  maxWidth: "min(44vw, 220px)",
                  minWidth: "126px",
                  padding: "8px 11px",
                  borderRadius: "14px",
                  border: isSelected
                    ? "2px solid #fbbf24"
                    : isHovered
                    ? "1.5px solid #67e8f9"
                    : "1px solid rgba(125, 211, 252, 0.32)",
                  background: isSelected
                    ? "linear-gradient(155deg, rgba(180, 83, 9, 0.86), rgba(120, 53, 15, 0.9))"
                    : "rgba(6, 27, 38, 0.8)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  color: "#ffffff",
                  boxShadow: isSelected
                    ? "0 0 24px rgba(251, 191, 36, 0.45), 0 8px 20px rgba(0,0,0,0.45)"
                    : "0 6px 18px rgba(0, 0, 0, 0.42)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "7px",
                  textAlign: "left",
                  transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s, opacity 0.25s",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: "21px",
                    height: "21px",
                    borderRadius: "999px",
                    background: isSelected ? "#fde047" : "rgba(78, 177, 203, 0.25)",
                    color: isSelected ? "#451a03" : "#bae6fd",
                    fontSize: "0.72rem",
                    fontWeight: 900,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "1px",
                  }}
                >
                  {letter}
                </span>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, lineHeight: 1.32 }}>{opt}</span>
              </button>
            );
          })}
        </div>
      ) : (
        /* Graceful fallback only if WebGL is unavailable */
        <div
          style={{
            position: "relative",
            zIndex: 12,
            maxWidth: "520px",
            margin: "160px auto 96px",
            padding: "0 16px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            return (
              <button
                key={idx}
                type="button"
                disabled={submitting}
                onClick={() => handleSelectLantern(idx)}
                style={{
                  padding: "16px 12px",
                  borderRadius: "16px",
                  border: isSelected ? "2px solid #fbbf24" : "1.5px solid rgba(103,232,249,0.35)",
                  background: isSelected ? "rgba(180,83,9,0.55)" : "rgba(14,116,144,0.35)",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.86rem",
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Action Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 25,
          pointerEvents: "none",
          padding: "14px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)",
          background: "linear-gradient(0deg, rgba(4,17,26,0.95) 0%, rgba(4,17,26,0.72) 65%, rgba(4,17,26,0) 100%)",
        }}
      >
        <div style={{ maxWidth: "520px", margin: "0 auto", pointerEvents: "auto" }}>
          <button
            type="button"
            disabled={selectedIdx === null || submitting || launching}
            onClick={handleCatchSubmit}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: "14px",
              border: selectedIdx !== null ? "1px solid #fde047" : "1px solid rgba(255,255,255,0.14)",
              background:
                selectedIdx !== null
                  ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"
                  : "rgba(15, 23, 42, 0.7)",
              color: selectedIdx !== null ? "#1c1917" : "#94a3b8",
              fontSize: "0.95rem",
              fontWeight: 900,
              cursor: selectedIdx !== null && !submitting && !launching ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
              boxShadow: selectedIdx !== null ? "0 8px 24px rgba(245, 158, 11, 0.38)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            {submitting || launching
              ? "Releasing Lantern..."
              : selectedIdx !== null
              ? `Catch Lantern ${LETTERS[selectedIdx] || selectedIdx + 1}`
              : "Tap a Glowing 3D Lantern"}
          </button>
        </div>
      </div>
    </div>
  );
}
