"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY = "#4EB1CB";

interface DockItem {
  href: string;
  icon: string;
  label: string;
  isFab?: boolean;
}

const DOCK_ITEMS: DockItem[] = [
  { href: "/feed", icon: "🏠", label: "Home" },
  { href: "/prayer", icon: "🙏", label: "Prayer" },
  { href: "/feed/create", icon: "✍️", label: "Write", isFab: true },
  { href: "/stewardshop", icon: "🤝", label: "StewardShop" },
  { href: "/me", icon: "👤", label: "Me" },
];

export default function BottomDock() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/feed") return pathname === "/feed";
    return pathname?.startsWith(href);
  };

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: "white",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        height: "calc(64px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
      }}
    >
      {DOCK_ITEMS.map((item) => {
        if (item.isFab) {
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                position: "relative",
              }}
              aria-label={item.label}
            >
              {/* Raised FAB circle */}
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  background: PRIMARY,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.375rem",
                  boxShadow: "0 4px 14px rgba(78,177,203,0.45)",
                  position: "absolute",
                  top: "-22px",
                  border: "3px solid white",
                }}
              >
                {item.icon}
              </div>
              <span
                style={{
                  fontSize: "0.625rem",
                  color: PRIMARY,
                  fontWeight: 600,
                  marginTop: "2px",
                  marginBottom: "0",
                  position: "absolute",
                  bottom: "4px",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        }

        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              gap: "2px",
            }}
          >
            <span style={{ fontSize: "1.375rem", lineHeight: 1 }}>{item.icon}</span>
            <span
              style={{
                fontSize: "0.625rem",
                fontWeight: active ? 700 : 500,
                color: active ? PRIMARY : "#94a3b8",
                letterSpacing: "0.01em",
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
