import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  Polygon,
  RadialGradient as SvgRadialGradient,
  Stop,
} from 'react-native-svg';

interface NativeTreeOfWisdomProps {
  dayNumber: number;
  questionText: string;
  options: string[];
  hint?: string | null;
  submitting: boolean;
  onSubmit: (answer: string) => void;
}

interface Branch3D {
  x1: number;
  y1: number;
  z1: number;
  x2: number;
  y2: number;
  z2: number;
  thickness: number;
}

interface LeafNode3D {
  x: number;
  y: number;
  z: number;
  radius: number;
  tier: number;
}

interface Mote3D {
  angle: number;
  radius: number;
  y: number;
  speed: number;
  size: number;
}

// Same deterministic geometry as the web canvas (components/quiz/TreeOfWisdomStage.tsx)
function buildTree3D(): { branches: Branch3D[]; leaves: LeafNode3D[]; motes: Mote3D[] } {
  const branches: Branch3D[] = [];
  const leaves: LeafNode3D[] = [];

  let seed = 777;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  function grow(
    x: number,
    y: number,
    z: number,
    len: number,
    pitch: number,
    yaw: number,
    depth: number,
    maxDepth: number
  ) {
    const nx = x + Math.sin(pitch) * Math.cos(yaw) * len;
    const ny = y - Math.cos(pitch) * len;
    const nz = z + Math.sin(pitch) * Math.sin(yaw) * len;

    branches.push({
      x1: x,
      y1: y,
      z1: z,
      x2: nx,
      y2: ny,
      z2: nz,
      thickness: Math.max(1.2, (maxDepth - depth + 1) * 1.45),
    });

    if (depth >= maxDepth) {
      leaves.push({
        x: nx,
        y: ny,
        z: nz,
        radius: 3.2 + rand() * 2.6,
        tier: (leaves.length % 7) + 1,
      });
      return;
    }

    const childCount = depth === 0 ? 4 : 3;
    for (let i = 0; i < childCount; i++) {
      const baseYaw = yaw + (i * Math.PI * 2) / childCount + (rand() - 0.5) * 0.45;
      const nextPitch = 0.36 + depth * 0.11 + rand() * 0.16;
      const nextLen = len * (0.68 + rand() * 0.08);
      grow(nx, ny, nz, nextLen, nextPitch, baseYaw, depth + 1, maxDepth);
    }
  }

  grow(0, 68, 0, 44, 0.02, 0, 0, 3);

  for (let r = 0; r < 6; r++) {
    const a = (r * Math.PI * 2) / 6;
    branches.push({
      x1: 0,
      y1: 68,
      z1: 0,
      x2: Math.cos(a) * 28,
      y2: 76,
      z2: Math.sin(a) * 28,
      thickness: 2.2,
    });
  }

  const motes: Mote3D[] = Array.from({ length: 22 }, (_, i) => ({
    angle: (i * Math.PI * 2) / 22,
    radius: 26 + (i % 5) * 14,
    y: 65 - ((i * 6.5) % 135),
    speed: 0.008 + (i % 4) * 0.003,
    size: 1.4 + (i % 3) * 0.7,
  }));

  return { branches, leaves, motes };
}

// Teal at the base blending to gold at the tips, like the web gradient strokes
function branchColor(y2: number, alpha: number, locking: boolean) {
  if (locking) return `rgba(251, 191, 36, ${alpha.toFixed(2)})`;
  const t = Math.max(0, Math.min(1, (68 - y2) / 130));
  const r = Math.round(56 + (251 - 56) * t);
  const g = Math.round(189 + (191 - 189) * t);
  const b = Math.round(248 + (36 - 248) * t);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

// Chamfered hexagon box (same silhouette as the web clip-path chambers/pods)
function HexBox({
  children,
  borderColor,
  fillColor,
  chamfer = 14,
  padding,
}: {
  children: React.ReactNode;
  borderColor: string;
  fillColor: string;
  chamfer?: number;
  padding: { v: number; h: number };
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 0.5 || Math.abs(height - size.h) > 0.5) {
      setSize({ w: width, h: height });
    }
  };
  const { w, h } = size;
  const c = Math.min(chamfer, h / 2);
  const points =
    w > 0
      ? `${c + 1},1 ${w - c - 1},1 ${w - 1},${h / 2} ${w - c - 1},${h - 1} ${c + 1},${h - 1} 1,${h / 2}`
      : '';
  return (
    <View onLayout={onLayout} style={{ width: '100%' }}>
      {w > 0 && (
        <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Polygon
            points={points}
            fill={fillColor}
            stroke={borderColor}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </Svg>
      )}
      <View
        style={{
          paddingVertical: padding.v,
          paddingHorizontal: padding.h + c * 0.6,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * Native iOS & Android 3D Tree of Wisdom — mirrors the web canvas stage:
 * rotating 3D tree, glowing canopy, orbiting light motes, hexagonal chamber and pods.
 */
export function NativeTreeOfWisdom({
  dayNumber,
  questionText,
  options,
  hint,
  submitting,
  onSubmit,
}: NativeTreeOfWisdomProps) {
  const [rotAngle, setRotAngle] = useState(0.35);
  const [lockedIdx, setLockedIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<'idle' | 'locking'>('idle');
  const [showHint, setShowHint] = useState(false);
  const [, setTick] = useState(0);

  const { branches, leaves, motes: initialMotes } = useMemo(() => buildTree3D(), []);
  const motesRef = useRef<Mote3D[]>(initialMotes.map((m) => ({ ...m })));
  const isLocking = phase === 'locking' || submitting;
  const LETTERS = ['A', 'B', 'C', 'D'];

  useEffect(() => {
    const interval = setInterval(() => {
      setRotAngle((prev) => prev + (isLocking ? 0.028 : 0.0075) * 2);
      for (const m of motesRef.current) {
        m.angle += (isLocking ? m.speed * 2.6 : m.speed) * 2;
        m.y -= isLocking ? 1.1 : 0.4;
        if (m.y < -62) m.y = 68;
      }
      setTick((t) => (t + 1) % 1000000);
    }, 40);
    return () => clearInterval(interval);
  }, [isLocking]);

  const W = 320;
  const H = 200;
  const cosA = Math.cos(rotAngle);
  const sinA = Math.sin(rotAngle);

  const project = (x: number, y: number, z: number) => {
    const rx = x * cosA - z * sinA;
    const rz = x * sinA + z * cosA;
    const fov = 260;
    const scale = fov / (fov + rz + 120);
    return {
      sx: W / 2 + rx * scale,
      sy: H / 2 + 12 + y * scale,
      rz,
      scale,
    };
  };

  const projectedBranches = branches
    .map((b, idx) => {
      const p1 = project(b.x1, b.y1, b.z1);
      const p2 = project(b.x2, b.y2, b.z2);
      return { idx, b, p1, p2, avgZ: (p1.rz + p2.rz) * 0.5 };
    })
    .sort((a, b) => b.avgZ - a.avgZ);

  const projectedLeaves = leaves
    .map((lf, idx) => ({ idx, lf, p: project(lf.x, lf.y, lf.z) }))
    .sort((a, b) => b.p.rz - a.p.rz);

  const handleSelect = (opt: string, idx: number) => {
    if (submitting || phase === 'locking') return;
    setLockedIdx(idx);
    setPhase('locking');
    setTimeout(() => {
      onSubmit(opt);
    }, 780);
  };

  const accent = isLocking ? '#fbbf24' : '#4EB1CB';

  return (
    <View style={styles.container}>
      <View style={styles.treeStageWrap}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <SvgRadialGradient id="floorGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={accent} stopOpacity="0.42" />
              <Stop offset="55%" stopColor={isLocking ? '#f59e0b' : '#0ea5e9'} stopOpacity="0.12" />
              <Stop offset="100%" stopColor="#05131d" stopOpacity="0" />
            </SvgRadialGradient>
            <SvgRadialGradient id="leafCool" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95" />
              <Stop offset="50%" stopColor="#4EB1CB" stopOpacity="0.55" />
              <Stop offset="100%" stopColor="#4EB1CB" stopOpacity="0" />
            </SvgRadialGradient>
            <SvgRadialGradient id="leafWarm" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
              <Stop offset="45%" stopColor="#fbbf24" stopOpacity="0.65" />
              <Stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </SvgRadialGradient>
          </Defs>

          {/* Sanctuary floor halo + rings (no spotlight cones) */}
          <Ellipse cx={W / 2} cy={H - 22} rx={92} ry={22} fill="url(#floorGlow)" />
          <Ellipse
            cx={W / 2}
            cy={H - 22}
            rx={56}
            ry={13.4}
            fill="none"
            stroke={isLocking ? 'rgba(251,191,36,0.24)' : 'rgba(78,177,203,0.2)'}
            strokeWidth={1.2}
          />
          <Ellipse
            cx={W / 2}
            cy={H - 22}
            rx={34}
            ry={8.2}
            fill="none"
            stroke={isLocking ? 'rgba(251,191,36,0.5)' : 'rgba(78,177,203,0.45)'}
            strokeWidth={1.2}
          />

          {/* Branches, back to front, teal base to gold tips */}
          {projectedBranches.map(({ idx, b, p1, p2, avgZ }) => {
            const alpha = Math.max(0.28, Math.min(0.95, 0.78 - avgZ / 220));
            return (
              <Line
                key={`b-${idx}`}
                x1={p1.sx}
                y1={p1.sy}
                x2={p2.sx}
                y2={p2.sy}
                stroke={branchColor(b.y2, alpha, isLocking)}
                strokeWidth={b.thickness * ((p1.scale + p2.scale) * 0.5)}
                strokeLinecap="round"
              />
            );
          })}

          {/* Glowing canopy blossoms */}
          {projectedLeaves.map(({ idx, lf, p }) => {
            const isCurrent = lf.tier === dayNumber;
            const r = lf.radius * p.scale * (isCurrent ? 1.35 : 1);
            const warm = isLocking || isCurrent;
            return (
              <Circle
                key={`l-${idx}`}
                cx={p.sx}
                cy={p.sy}
                r={r * 2.4}
                fill={warm ? 'url(#leafWarm)' : 'url(#leafCool)'}
              />
            );
          })}

          {/* Orbiting, rising light motes */}
          {motesRef.current.map((m, idx) => {
            const mx = Math.cos(m.angle) * m.radius;
            const mz = Math.sin(m.angle) * m.radius;
            const mp = project(mx, m.y, mz);
            return (
              <Circle
                key={`m-${idx}`}
                cx={mp.sx}
                cy={mp.sy}
                r={Math.max(0.6, m.size * mp.scale)}
                fill={isLocking ? 'rgba(253,224,71,0.78)' : 'rgba(125,211,252,0.65)'}
              />
            );
          })}
        </Svg>
      </View>

      {/* Hexagonal question chamber with stage rails */}
      <View style={styles.railRow}>
        <View style={styles.stageRail} />
        <View style={{ flex: 1 }}>
          <HexBox
            borderColor={isLocking ? '#fbbf24' : '#4EB1CB'}
            fillColor="#071f2e"
            chamfer={20}
            padding={{ v: 18, h: 18 }}
          >
            <Text style={styles.questionText}>{questionText}</Text>
          </HexBox>
        </View>
        <View style={styles.stageRail} />
      </View>

      {hint ? (
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setShowHint((v) => !v)} style={styles.hintToggleBtn}>
            <Text style={styles.hintToggleText} numberOfLines={1}>
              {showHint ? 'Hide Hint' : 'Show Scripture Hint'}
            </Text>
          </TouchableOpacity>
          {showHint ? (
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>{hint}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Hexagonal answer pods A / B / C / D */}
      <View style={{ gap: 10, width: '100%' }}>
        {(options || []).map((opt, idx) => {
          const isSelected = lockedIdx === idx;
          const isDimmed = lockedIdx !== null && lockedIdx !== idx;
          return (
            <View key={idx} style={[styles.podRow, isDimmed && { opacity: 0.45 }]}>
              <View style={styles.podSideRail} />
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={submitting || phase === 'locking'}
                onPress={() => handleSelect(opt, idx)}
                style={{ flex: 1 }}
              >
                <HexBox
                  borderColor={isSelected ? '#fde68a' : '#38bdf8'}
                  fillColor={isSelected ? '#b45309' : '#092538'}
                  chamfer={14}
                  padding={{ v: 13, h: 14 }}
                >
                  <View style={styles.podContent}>
                    <Text style={[styles.podDiamond, isSelected && { color: '#ffffff' }]}>
                      ◆ {LETTERS[idx] || idx + 1}:
                    </Text>
                    <Text
                      style={[
                        styles.podOptionText,
                        isSelected && { color: '#ffffff', fontWeight: '800' },
                      ]}
                    >
                      {opt}
                    </Text>
                  </View>
                </HexBox>
              </TouchableOpacity>
              <View style={styles.podSideRail} />
            </View>
          );
        })}
      </View>

      {isLocking ? (
        <Text style={styles.lockingCaption}>Illuminating the Tree of Wisdom...</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  treeStageWrap: {
    alignItems: 'center',
    marginBottom: 6,
  },
  railRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
    marginBottom: 14,
  },
  stageRail: {
    width: 12,
    height: 2,
    backgroundColor: '#4EB1CB',
    opacity: 0.75,
  },
  questionText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
  },
  hintToggleBtn: {
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  hintToggleText: {
    color: '#fde68a',
    fontSize: 12.5,
    fontWeight: '700',
  },
  hintBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    width: '100%',
  },
  hintText: {
    color: '#fef3c7',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  podRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  podSideRail: {
    width: 10,
    height: 2,
    backgroundColor: '#38bdf8',
    opacity: 0.65,
  },
  podContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  podDiamond: {
    color: '#fbbf24',
    fontSize: 13.5,
    fontWeight: '800',
  },
  podOptionText: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 20,
  },
  lockingCaption: {
    color: '#fde68a',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
  },
});
