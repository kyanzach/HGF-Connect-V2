// components/SubmitButton.tsx
// Reusable submit button with loading spinner + shake on validation error
// Usage:
//   <SubmitButton loading={submitting} shakeKey={shakeKey} color="#4EB1CB">
//     📖 Share Devotional
//   </SubmitButton>
// When you want to trigger a shake: setShakeKey(k => k + 1)

"use client";

import { useEffect, useRef } from "react";

interface Props {
  loading: boolean;
  /** Increment this to trigger a shake animation (used when validation fails) */
  shakeKey?: number;
  color?: string;
  disabledColor?: string;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function SubmitButton({
  loading,
  shakeKey = 0,
  color = "#4EB1CB",
  disabledColor = "#94a3b8",
  disabled,
  type = "submit",
  onClick,
  style,
  children,
}: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const prevShakeKey = useRef(shakeKey);

  // Trigger shake animation when shakeKey increments
  useEffect(() => {
    if (shakeKey > 0 && shakeKey !== prevShakeKey.current) {
      prevShakeKey.current = shakeKey;
      const el = btnRef.current;
      if (!el) return;
      el.classList.remove("hgf-shake");
      // Force reflow so animation restarts
      void el.offsetWidth;
      el.classList.add("hgf-shake");
      const timer = setTimeout(() => el.classList.remove("hgf-shake"), 500);
      return () => clearTimeout(timer);
    }
  }, [shakeKey]);

  const isDisabled = disabled || loading;

  return (
    <button
      ref={btnRef}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className="hgf-btn"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        width: "100%",
        padding: "0.9rem",
        background: isDisabled ? disabledColor : color,
        color: "white",
        border: "none",
        borderRadius: "14px",
        fontSize: "1rem",
        fontWeight: 700,
        fontFamily: "inherit",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      {loading && <span className="hgf-spinner" />}
      {children}
    </button>
  );
}
