"use client";

/**
 * SkeletonPulse — Reusable skeleton building blocks for loading states.
 *
 * All primitives use the global `hgf-skeleton` CSS class from globals.css
 * for the Facebook-style shimmer animation.
 *
 * Usage:
 *   <SkeletonBox width="100%" height={12} />
 *   <SkeletonCircle size={40} />
 *   <SkeletonCard />
 */

import type { CSSProperties } from "react";

// ── Rectangular placeholder ──────────────────────────────────────────────────
export function SkeletonBox({
  width = "100%",
  height = 12,
  radius,
  style,
}: {
  width?: string | number;
  height?: number;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="hgf-skeleton"
      style={{
        width,
        height,
        borderRadius: radius ?? 6,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

// ── Circular placeholder (avatars) ──────────────────────────────────────────
export function SkeletonCircle({
  size = 40,
  style,
}: {
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="hgf-skeleton"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

// ── Text line placeholder ───────────────────────────────────────────────────
export function SkeletonText({
  lines = 2,
  lastWidth = "60%",
  gap = 8,
  height = 10,
}: {
  lines?: number;
  lastWidth?: string;
  gap?: number;
  height?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="hgf-skeleton"
          style={{
            height,
            width: i === lines - 1 ? lastWidth : "100%",
            borderRadius: 6,
          }}
        />
      ))}
    </div>
  );
}

// ── Post card skeleton (feed-style) ─────────────────────────────────────────
export function SkeletonPostCard() {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        padding: "1rem",
        marginBottom: "0.75rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Author row */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <SkeletonCircle size={38} />
        <div style={{ flex: 1 }}>
          <SkeletonBox height={12} width="40%" style={{ marginBottom: 6 }} />
          <SkeletonBox height={10} width="25%" />
        </div>
      </div>
      {/* Content */}
      <SkeletonBox height={10} style={{ marginBottom: 6 }} />
      <SkeletonBox height={10} width="75%" style={{ marginBottom: 10 }} />
      {/* Actions */}
      <div style={{ display: "flex", gap: "1rem", marginTop: 8 }}>
        <SkeletonBox height={10} width={60} />
        <SkeletonBox height={10} width={70} />
        <SkeletonBox height={10} width={50} />
      </div>
    </div>
  );
}

// ── Generic card skeleton ───────────────────────────────────────────────────
export function SkeletonCard({
  height = 80,
  hasAvatar = false,
}: {
  height?: number;
  hasAvatar?: boolean;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        padding: "1rem",
        marginBottom: "0.75rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-start",
      }}
    >
      {hasAvatar && <SkeletonCircle size={36} />}
      <div style={{ flex: 1 }}>
        <SkeletonBox height={12} width="50%" style={{ marginBottom: 8 }} />
        <SkeletonBox height={10} style={{ marginBottom: 6 }} />
        <SkeletonBox height={10} width="65%" />
      </div>
    </div>
  );
}

// ── Product card skeleton (StewardShop-style) ───────────────────────────────
export function SkeletonProductCard() {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
      }}
    >
      {/* Image placeholder */}
      <SkeletonBox height={140} radius={0} />
      {/* Details */}
      <div style={{ padding: "0.75rem" }}>
        <SkeletonBox height={12} width="70%" style={{ marginBottom: 8 }} />
        <SkeletonBox height={14} width="40%" style={{ marginBottom: 6 }} />
        <SkeletonBox height={10} width="55%" />
      </div>
    </div>
  );
}
