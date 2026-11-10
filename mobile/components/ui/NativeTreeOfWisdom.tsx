import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  Line,
  LinearGradient as SvgLinearGradient,
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

function buildTree3D(): { branches: Branch3D[]; leaves: LeafNode3D[] } {
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
      thickness: Math.max(1.3, (maxDepth - depth + 1) * 1.4),
    });

    if (depth >= maxDepth) {
      leaves.push({
        x: nx,
        y: ny,
        z: nz,
        radius: 3.4 + rand() * 2.2,
        tier: (leaves.length % 7) + 1,
      });
      return;
    }

    const childCount = depth === 0 ? 4 : 3;
    for (let i = 0; i < childCount; i++) {
      const baseYaw = yaw + (i * Math.PI * 2) / childCount + (rand() - 0.5) * 0.42;
      const nextPitch = 0.36 + depth * 0.11 + rand() * 0.15;
      const nextLen = len * (0.68 + rand() * 0.08);
      grow(nx, ny, nz, nextLen, nextPitch, baseYaw, depth + 1, maxDepth);
    }
  }

  grow(0, 62, 0, 40, 0.02, 0, 0, 3);

  for (let r = 0; r < 6; r++) {
    const a = (r * Math.PI * 2) / 6;
    branches.push({
      x1: 0,
      y1: 62,
      z1: 0,
      x2: Math.cos(a) * 26,
      y2: 70,
      z2: Math.sin(a) * 26,
      thickness: 2.1,
    });
  }

  return { branches, leaves };
}

/**
 * Native iOS & Android 3D Tree of Wisdom Spotlight Stage
 * - 3D-projected rotating fractal Tree of Wisdom via react-native-svg
 * - Hexagonal chamfered spotlight question chamber & A/B/C/D answer pods
 * - Zero money / millionaire / lifeline wording; zero purple (Rule #4)
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

  const { branches, leaves } = useMemo(() => buildTree3D(), []);
  const isLocking = phase === 'locking' || submitting;
  const LETTERS = ['A', 'B', 'C', 'D'];

  useEffect(() => {
    const interval = setInterval(() => {
      setRotAngle((prev) => prev + (isLocking ? 0.095 : 0.03));
    }, 40);
    return () => clearInterval(interval);
  }, [isLocking]);

  const W = 300;
  const H = 180;
  const cosA = Math.cos(rotAngle);
  const sinA = Math.sin(rotAngle);

  const project = (x: number, y: number, z: number) => {
    const rx = x * cosA - z * sinA;
    const rz = x * sinA + z * cosA;
    const fov = 250;
    const scale = fov / (fov + rz + 120);
    return {
      sx: W / 2 + rx * scale,
      sy: H / 2 + 10 + y * scale,
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
    }, 760);
  };

  return (
    <View style={styles.container}>
      {/* 3D Rotating Tree of Wisdom SVG Stage */}
      <View style={styles.treeStageWrap}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <SvgLinearGradient id="spotlightLeft" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#4EB1CB" stopOpacity="0.24" />
              <Stop offset="1" stopColor="#4EB1CB" stopOpacity="0" />
            </SvgLinearGradient>
            <SvgLinearGradient id="spotlightRight" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#fbbf24" stopOpacity="0.22" />
              <Stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
            </SvgLinearGradient>
            <SvgRadialGradient id="floorGlow" cx="50%" cy="50%" r="50%">
              <Stop
                offset="0%"
                stopColor={isLocking ? '#fbbf24' : '#4EB1CB'}
                stopOpacity="0.45"
              />
              <Stop offset="100%" stopColor="#05131d" stopOpacity="0" />
            </SvgRadialGradient>
          </Defs>

          {/* Converging Sanctuary Spotlight Beams */}
          <Polygon points={`10,0 95,0 ${W / 2 + 24},${H - 16} ${W / 2 - 58},${H - 16}`} fill="url(#spotlightLeft)" />
          <Polygon points={`${W - 95},0 ${W - 10},0 ${W / 2 + 58},${H - 16} ${W / 2 - 24},${H - 16}`} fill="url(#spotlightRight)" />

          {/* Sanctuary Base Halo & 3D Rings */}
          <Ellipse cx={W / 2} cy={H - 18} rx={88} ry={18} fill="url(#floorGlow)" />
          <Ellipse
            cx={W / 2}
            cy={H - 18}
            rx={52}
            ry={11}
            fill="none"
            stroke={isLocking ? 'rgba(251,191,36,0.4)' : 'rgba(78,177,203,0.35)'}
            strokeWidth={1.1}
          />
          <Ellipse
            cx={W / 2}
            cy={H - 18}
            rx={30}
            ry={6.5}
            fill="none"
            stroke={isLocking ? 'rgba(251,191,36,0.65)' : 'rgba(78,177,203,0.55)'}
            strokeWidth={1.2}
          />

          {/* 3D Depth-Sorted Branches */}
          {projectedBranches.map(({ idx, b, p1, p2, avgZ }) => {
            const alpha = Math.max(0.3, Math.min(0.95, 0.78 - avgZ / 210));
            const strokeColor = isLocking
              ? `rgba(251, 191, 36, ${alpha.toFixed(2)})`
              : `rgba(78, 177, 203, ${alpha.toFixed(2)})`;
            return (
              <Line
                key={`b-${idx}`}
                x1={p1.sx}
                y1={p1.sy}
                x2={p2.sx}
                y2={p2.sy}
                stroke={strokeColor}
                strokeWidth={b.thickness * ((p1.scale + p2.scale) * 0.5)}
                strokeLinecap="round"
              />
            );
          })}

          {/* 3D Luminous Canopy Blossoms */}
          {projectedLeaves.map(({ idx, lf, p }) => {
            const isCurrentBranch = lf.tier === dayNumber;
            const r = lf.radius * p.scale * (isCurrentBranch ? 1.35 : 1);
            return (
              <React.Fragment key={`l-${idx}`}>
                <Circle
                  cx={p.sx}
                  cy={p.sy}
                  r={r * 1.9}
                  fill={
                    isLocking || isCurrentBranch
                      ? 'rgba(251, 191, 36, 0.32)'
                      : 'rgba(78, 177, 203, 0.28)'
                  }
                />
                <Circle
                  cx={p.sx}
                  cy={p.sy}
                  r={r * 0.85}
                  fill={isLocking || isCurrentBranch ? '#fef3c7' : '#e0f2fe'}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        {/* 7-Branch Wisdom Ascent Pill */}
        <View style={styles.ascentPill}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => {
            const isCur = d === dayNumber;
            const isPast = d < dayNumber;
            return (
              <View
                key={d}
                style={[
                  styles.ascentDot,
                  isCur && styles.ascentDotCurrent,
                  isPast && styles.ascentDotPast,
                ]}
              />
            );
          })}
          <Text style={styles.ascentLabel} numberOfLines={1}>
            Branch {dayNumber} of 7
          </Text>
        </View>
      </View>

      {/* Beveled Spotlight Question Chamber with Stage Rails */}
      <View style={styles.railRow}>
        <View style={styles.stageRail} />
        <View
          style={[
            styles.questionOuter,
            isLocking && { borderColor: '#fbbf24' },
          ]}
        >
          <Text style={styles.questionText}>{questionText}</Text>
        </View>
        <View style={styles.stageRail} />
      </View>

      {/* Optional Scripture Hint */}
      {hint ? (
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setShowHint((v) => !v)}
            style={styles.hintToggleBtn}
          >
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

      {/* 4 Hexagonal-Styled Diamond Answer Pods (A / B / C / D) */}
      <View style={{ gap: 10, width: '100%' }}>
        {(options || []).map((opt, idx) => {
          const isSelected = lockedIdx === idx;
          const isDimmed = lockedIdx !== null && lockedIdx !== idx;
          return (
            <View
              key={idx}
              style={[styles.podRow, isDimmed && { opacity: 0.45 }]}
            >
              <View style={styles.podSideRail} />
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={submitting || phase === 'locking'}
                onPress={() => handleSelect(opt, idx)}
                style={[
                  styles.podButton,
                  isSelected && styles.podButtonLocked,
                ]}
              >
                <Text
                  style={[
                    styles.podDiamond,
                    isSelected && { color: '#ffffff' },
                  ]}
                >
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
              </TouchableOpacity>
              <View style={styles.podSideRail} />
            </View>
          );
        })}
      </View>

      {isLocking ? (
        <Text style={styles.lockingCaption}>
          Illuminating the Tree of Wisdom...
        </Text>
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
    marginBottom: 8,
  },
  ascentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(6, 24, 38, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(78, 177, 203, 0.35)',
    marginTop: -4,
  },
  ascentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
  },
  ascentDotPast: {
    backgroundColor: '#4EB1CB',
  },
  ascentDotCurrent: {
    width: 20,
    backgroundColor: '#fbbf24',
  },
  ascentLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#bae6fd',
    marginLeft: 4,
  },
  railRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 6,
    marginBottom: 14,
  },
  stageRail: {
    width: 12,
    height: 2,
    backgroundColor: '#4EB1CB',
    opacity: 0.75,
  },
  questionOuter: {
    flex: 1,
    backgroundColor: '#071f2e',
    borderWidth: 1.8,
    borderColor: '#4EB1CB',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
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
  podButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#092538',
    borderWidth: 1.6,
    borderColor: '#38bdf8',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  podButtonLocked: {
    backgroundColor: '#b45309',
    borderColor: '#fde68a',
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
