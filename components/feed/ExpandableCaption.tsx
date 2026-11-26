"use client";

import { useState, useRef, useEffect } from "react";

interface ExpandableCaptionProps {
  text: string;
  maxLines?: number;
  boldFirstLine?: boolean;
  style?: React.CSSProperties;
}

export default function ExpandableCaption({
  text,
  maxLines = 3,
  boldFirstLine = false,
  style,
}: ExpandableCaptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const checkOverflow = () => {
      if (!expanded) {
        setIsOverflowing(el.scrollHeight > el.clientHeight + 2);
      }
    };

    checkOverflow();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(checkOverflow);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [text, maxLines, expanded]);

  const trimmed = text.trim();
  const lines = trimmed.split("\n");
  const firstLine = lines[0] ?? "";
  const restText = lines.slice(1).join("\n");

  return (
    <div style={{ padding: "0 1rem 0.625rem", ...style }}>
      <div
        ref={contentRef}
        style={{
          fontSize: "0.9375rem",
          color: "#1e293b",
          lineHeight: 1.5,
          whiteSpace: "pre-line",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          ...(expanded
            ? {}
            : {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical" as const,
                WebkitLineClamp: maxLines,
                overflow: "hidden",
              }),
        }}
      >
        {boldFirstLine && restText ? (
          <>
            <strong style={{ fontWeight: 700, color: "#0f172a" }}>{firstLine}</strong>
            {"\n"}
            {restText}
          </>
        ) : boldFirstLine ? (
          <strong style={{ fontWeight: 700, color: "#0f172a" }}>{trimmed}</strong>
        ) : (
          trimmed
        )}
      </div>

      {(isOverflowing || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((prev) => !prev);
          }}
          style={{
            background: "none",
            border: "none",
            padding: "0.2rem 0 0",
            margin: 0,
            fontSize: "0.875rem",
            fontWeight: 700,
            color: "#64748b",
            cursor: "pointer",
            fontFamily: "inherit",
            lineHeight: 1.4,
            whiteSpace: "nowrap",
          }}
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}
