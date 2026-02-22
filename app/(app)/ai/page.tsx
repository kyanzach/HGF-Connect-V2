"use client";

import { useState, useRef, useEffect } from "react";

const PRIMARY = "#4EB1CB";

interface Message {
  role: "user" | "ai";
  content: string;
}

// Marquee chip rows — duplicated for seamless loop
const CHIP_ROWS = [
  [
    "📅 What are upcoming events?",
    "🙏 How do I join a cell group?",
    "📖 What ministries can I join?",
    "⛪ Sunday service schedule",
    "🤝 How to become a member?",
  ],
  [
    "💒 How do I get baptized?",
    "🎵 Tell me about the Worship Team",
    "📞 How to contact the church?",
    "🌟 What is HGF Connect?",
    "✝️ Give me an encouraging verse",
  ],
];

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "12px 14px" }}>
      {[0, 150, 300].map((delay) => (
        <div
          key={delay}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#94a3b8",
            animation: "bounce 1s ease-in-out infinite",
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: "Hi there! 👋 I'm your HGF Connect assistant. I can help you with church events, cell groups, ministries, schedules, and more. What would you like to know? 🙏",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages and loading state change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMessage = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "I'm having trouble connecting. Please try again! 🙏" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 56px - 64px)", // header 56px, dock 64px
        background: "#f8fafc",
        overflow: "hidden",
      }}
    >
      {/* Page Header */}
      <div
        style={{
          background: PRIMARY,
          padding: "0.875rem 1rem",
          color: "white",
          textAlign: "center",
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>✝️ HGF AI Assistant</h2>
        <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.85 }}>
          Ask me about church events, cell groups, and more
        </p>
      </div>

      {/* Animated Suggestion Chips */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #f1f5f9",
          padding: "0.625rem 0",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {CHIP_ROWS.map((row, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              display: "flex",
              gap: "0.5rem",
              animation: `chipScroll${rowIdx === 0 ? "Left" : "Right"} 25s linear infinite`,
              marginBottom: rowIdx === 0 ? "0.375rem" : 0,
              width: "max-content",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
            onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
            onTouchStart={(e) => (e.currentTarget.style.animationPlayState = "paused")}
            onTouchEnd={(e) => (e.currentTarget.style.animationPlayState = "running")}
          >
            {/* Duplicate for seamless loop */}
            {[...row, ...row].map((chip, i) => (
              <button
                key={i}
                onClick={() => sendMessage(chip)}
                style={{
                  background: "#f0f9ff",
                  border: `1px solid #bae6fd`,
                  borderRadius: "999px",
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.75rem",
                  color: "#0369a1",
                  cursor: "pointer",
                  flexShrink: 0,
                  fontWeight: 500,
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Message List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          scrollbarWidth: "none",
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              alignItems: "flex-end",
              gap: "0.5rem",
            }}
          >
            {msg.role === "ai" && (
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: PRIMARY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.875rem",
                  flexShrink: 0,
                }}
              >
                ✝️
              </div>
            )}
            <div
              style={{
                maxWidth: "78%",
                background: msg.role === "user" ? PRIMARY : "white",
                color: msg.role === "user" ? "white" : "#1e293b",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "0.625rem 0.875rem",
                fontSize: "0.9rem",
                lineHeight: 1.6,
                boxShadow: msg.role === "ai" ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                whiteSpace: "pre-line",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: PRIMARY,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.875rem",
              }}
            >
              ✝️
            </div>
            <div
              style={{
                background: "white",
                borderRadius: "18px 18px 18px 4px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div
        style={{
          padding: "0.75rem 1rem",
          background: "white",
          borderTop: "1px solid #f1f5f9",
          display: "flex",
          gap: "0.625rem",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Ask about church or request prayer..."
          style={{
            flex: 1,
            border: "1.5px solid #e2e8f0",
            borderRadius: "999px",
            padding: "0.625rem 1rem",
            fontSize: "0.9rem",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: loading || !input.trim() ? "#e2e8f0" : PRIMARY,
            border: "none",
            color: "white",
            fontSize: "1.125rem",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
            flexShrink: 0,
          }}
        >
          →
        </button>
      </div>

      <style>{`
        @keyframes chipScrollLeft  { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes chipScrollRight { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
