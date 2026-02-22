"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const PRIMARY = "#4EB1CB";
const DAILY_LIMIT = 20;

interface Message {
  role: "user" | "ai";
  content: string;
}

interface ConvSummary {
  id: number;
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  firstQuestion: string;
}

interface ConvDetail {
  id: number;
  startedAt: string;
  messageCount: number;
  messages: { id: number; role: string; content: string; createdAt: string }[];
}

// ── 3-row scrolling suggestion chips (guide §1.7) ─────────────────────────────
const SUGGESTION_CHIPS = [
  { emoji: "🙏", text: "What are the prayer schedules?" },
  { emoji: "📖", text: "Tell me about cell groups" },
  { emoji: "🎵", text: "When is praise and worship?" },
  { emoji: "📅", text: "What events are coming up?" },
  { emoji: "💒", text: "Sunday service times?" },
  { emoji: "🌱", text: "How do I join a cell group?" },
  { emoji: "🤝", text: "How do I volunteer?" },
  { emoji: "📍", text: "Where is the church located?" },
  { emoji: "💬", text: "I need prayer support" },
  { emoji: "📢", text: "Latest church announcements" },
  { emoji: "✝️", text: "Give me an encouraging verse" },
  { emoji: "🎤", text: "Tell me about the worship team" },
];

const CHIP_ROWS = [
  SUGGESTION_CHIPS.slice(0, 4),
  SUGGESTION_CHIPS.slice(3, 8),
  SUGGESTION_CHIPS.slice(7, 12),
];

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "12px 14px" }}>
      {[0, 150, 300].map((delay) => (
        <div key={delay} style={{ width: 8, height: 8, borderRadius: "50%", background: "#94a3b8", animation: "bounce 1s ease-in-out infinite", animationDelay: `${delay}ms` }} />
      ))}
    </div>
  );
}

function formatRelativeDate(dateStr: string) {
  const d = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Hi there! 👋 I'm your HGF Connect assistant. I can help you with church events, cell groups, ministries, schedules, and more. What would you like to know? 🙏" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // §5.6 — optimistic quota counter
  const [questionsLeft, setQuestionsLeft] = useState(DAILY_LIMIT);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);

  // §5.7 — history panel state
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ConvSummary[]>([]);
  const [viewingConv, setViewingConv] = useState<ConvDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch today's quota on mount (§5.6)
  useEffect(() => {
    fetch("/api/ai/usage-status")
      .then((r) => r.json())
      .then((d) => {
        const rem = d.questions_remaining ?? DAILY_LIMIT;
        setQuestionsLeft(rem);
        setIsLimitReached(rem <= 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading || isLimitReached) return;
    const userMessage = text.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    // §5.6 — OPTIMISTIC DECREMENT: counter drops instantly before server responds
    setQuestionsLeft((prev) => {
      const next = Math.max(0, prev - 1);
      if (next <= 0) setIsLimitReached(true);
      return next;
    });

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: conversationId, // §5.6 — link turns
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", content: data.reply }]);

      // §5.6 — sync authoritative count from server
      if (typeof data.questions_remaining === "number") {
        setQuestionsLeft(data.questions_remaining);
        setIsLimitReached(data.questions_remaining <= 0);
      }

      // §5.6 — track conversation_id returned by server
      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
      }
    } catch {
      // §5.6 — ROLLBACK optimistic decrement on error
      setQuestionsLeft((prev) => Math.min(DAILY_LIMIT, prev + 1));
      setIsLimitReached(false);
      setMessages((prev) => [...prev, { role: "ai", content: "I'm having trouble connecting. Please try again! 🙏" }]);
    } finally {
      setLoading(false);
    }
  }

  // §5.7 — history panel actions
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const r = await fetch("/api/ai/history");
      const data = await r.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  }, []);

  const openHistory = useCallback(() => {
    setShowHistory(true);
    setViewingConv(null);
    loadHistory();
  }, [loadHistory]);

  const openConversation = useCallback(async (convId: number) => {
    try {
      const r = await fetch(`/api/ai/history/${convId}`);
      const data = await r.json();
      setViewingConv(data);
    } catch { /* silent */ }
  }, []);

  const loadIntoChat = useCallback((conv: ConvDetail) => {
    setMessages(conv.messages.map((m) => ({ role: m.role === "user" ? "user" : "ai" as "user" | "ai", content: m.content })));
    setConversationId(conv.id);
    setShowHistory(false);
    setViewingConv(null);
  }, []);

  // Quota pill color
  const countColor = questionsLeft > 10 ? "white" : questionsLeft > 5 ? "#fde68a" : "#fca5a5";

  return (
    // §5.7 — relative wrapper so history panel can be absolute overlay
    <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "calc(100dvh - 56px - 64px)", background: "#f8fafc", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: PRIMARY, padding: "0.75rem 1rem", color: "white", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>✝️ HGF AI Assistant</h2>
          <p style={{ margin: 0, fontSize: "0.7rem", opacity: 0.85 }}>Ask me about church events, cell groups, and more</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* §5.7 — History button (clock icon) */}
          <button
            onClick={openHistory}
            title="Chat History"
            style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "white", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            🕐
          </button>
          {/* §4.5 — Daily quota pill */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(255,255,255,0.2)", borderRadius: "999px", padding: "0.2rem 0.6rem" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: countColor }}>{questionsLeft}/{DAILY_LIMIT}</span>
            <span style={{ fontSize: "0.65rem", opacity: 0.85 }}>left</span>
          </div>
        </div>
      </div>

      {/* 3-Row Suggestion Chips */}
      <div style={{ background: "white", borderBottom: "1px solid #f1f5f9", padding: "0.5rem 0", overflow: "hidden", flexShrink: 0 }}>
        {CHIP_ROWS.map((row, rowIdx) => (
          <div key={rowIdx} style={{ overflow: "hidden", marginBottom: rowIdx < 2 ? "0.375rem" : 0 }}>
            <div
              style={{ display: "flex", gap: "0.5rem", width: "max-content", animation: `chipScroll${rowIdx % 2 === 0 ? "Left" : "Right"} ${48 + rowIdx * 8}s linear infinite` }}
              onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
              onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
              onTouchStart={(e) => (e.currentTarget.style.animationPlayState = "paused")}
              onTouchEnd={(e) => (e.currentTarget.style.animationPlayState = "running")}
            >
              {[...row, ...row].map((chip, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(`${chip.emoji} ${chip.text}`)}
                  disabled={loading || isLimitReached}
                  style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "999px", padding: "0.275rem 0.75rem", fontSize: "0.75rem", color: "#0369a1", cursor: loading || isLimitReached ? "not-allowed" : "pointer", flexShrink: 0, fontWeight: 500, whiteSpace: "nowrap", opacity: loading || isLimitReached ? 0.5 : 1 }}
                >
                  {chip.emoji} {chip.text}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Daily limit locked banner */}
      {isLimitReached && (
        <div style={{ margin: "0.75rem 1rem 0", padding: "0.875rem 1rem", borderRadius: "12px", background: "#fffbeb", border: "1px solid #fcd34d", textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>🔒</div>
          <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#b45309", margin: "0 0 0.2rem" }}>You&apos;ve used all {DAILY_LIMIT} questions for today.</p>
          <p style={{ fontSize: "0.75rem", color: "#92400e", margin: 0 }}>Limit resets at midnight — see you tomorrow! 🌙</p>
        </div>
      )}

      {/* Loading hint */}
      {loading && (
        <p style={{ fontSize: "0.7rem", textAlign: "center", color: "#d97706", fontWeight: 600, margin: "0.375rem 0 0", flexShrink: 0, animation: "pulse 1.5s ease infinite" }}>
          ⏳ Hold on, I&apos;m thinking… please wait a moment
        </p>
      )}

      {/* Message List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", scrollbarWidth: "none" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "0.5rem" }}>
            {msg.role === "ai" && (
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem", flexShrink: 0 }}>✝️</div>
            )}
            <div style={{ maxWidth: "78%", background: msg.role === "user" ? PRIMARY : "white", color: msg.role === "user" ? "white" : "#1e293b", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "0.625rem 0.875rem", fontSize: "0.9rem", lineHeight: 1.6, boxShadow: msg.role === "ai" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", whiteSpace: "pre-line" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem" }}>✝️</div>
            <div style={{ background: "white", borderRadius: "18px 18px 18px 4px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}><TypingIndicator /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div style={{ padding: "0.75rem 1rem", background: "white", borderTop: "1px solid #f1f5f9", display: "flex", gap: "0.625rem", alignItems: "center", flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder={isLimitReached ? "Daily limit reached — come back tomorrow!" : "Ask about church or request prayer..."}
          disabled={loading || isLimitReached}
          style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: "999px", padding: "0.625rem 1rem", fontSize: "0.9rem", outline: "none", fontFamily: "inherit", background: isLimitReached ? "#f8fafc" : "white", color: isLimitReached ? "#94a3b8" : undefined }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim() || isLimitReached}
          style={{ width: 40, height: 40, borderRadius: "50%", background: loading || !input.trim() || isLimitReached ? "#e2e8f0" : PRIMARY, border: "none", color: "white", fontSize: "1.125rem", cursor: loading || !input.trim() || isLimitReached ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s", flexShrink: 0 }}
        >
          →
        </button>
      </div>

      {/* ── §5.7 History Panel — absolute overlay ──────────────────────────────── */}
      {showHistory && (
        <div style={{ position: "absolute", inset: 0, background: "white", zIndex: 20, display: "flex", flexDirection: "column" }}>
          {/* Panel header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
            <button
              onClick={() => viewingConv ? setViewingConv(null) : setShowHistory(false)}
              style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {viewingConv ? "←" : "✕"}
            </button>
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#0f172a", flex: 1 }}>
              {viewingConv ? formatRelativeDate(viewingConv.startedAt) + " · " + formatTime(viewingConv.startedAt) : "Chat History"}
            </h3>
            {viewingConv && (
              <button
                onClick={() => loadIntoChat(viewingConv)}
                style={{ background: PRIMARY, color: "white", border: "none", borderRadius: "999px", padding: "0.4rem 1rem", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
              >
                Load Chat
              </button>
            )}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
            {/* LIST VIEW */}
            {!viewingConv && (
              historyLoading ? (
                <p style={{ textAlign: "center", color: "#94a3b8", marginTop: "2rem" }}>Loading…</p>
              ) : history.length === 0 ? (
                <div style={{ textAlign: "center", marginTop: "3rem", color: "#94a3b8" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>💬</div>
                  <p style={{ fontSize: "0.875rem" }}>No past conversations yet.</p>
                  <p style={{ fontSize: "0.8rem" }}>Start chatting to see your history here!</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {history.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => openConversation(conv.id)}
                      style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "0.875rem 1rem", textAlign: "left", cursor: "pointer", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f9ff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: PRIMARY }}>{formatRelativeDate(conv.startedAt)}</span>
                        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{conv.messageCount} messages</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.firstQuestion || "Conversation"}
                      </p>
                      <p style={{ margin: "0.125rem 0 0", fontSize: "0.7rem", color: "#94a3b8" }}>{formatTime(conv.startedAt)}</p>
                    </button>
                  ))}
                </div>
              )
            )}

            {/* DETAIL VIEW */}
            {viewingConv && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {viewingConv.messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: "0.5rem" }}>
                    {msg.role === "assistant" && (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", flexShrink: 0 }}>✝️</div>
                    )}
                    <div>
                      <div style={{ maxWidth: "75vw", background: msg.role === "user" ? PRIMARY : "white", color: msg.role === "user" ? "white" : "#1e293b", borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "0.5rem 0.75rem", fontSize: "0.875rem", lineHeight: 1.5, boxShadow: msg.role === "assistant" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", whiteSpace: "pre-line" }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "0.125rem", textAlign: msg.role === "user" ? "right" : "left" }}>{formatTime(msg.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes chipScrollLeft  { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes chipScrollRight { 0% { transform: translateX(-50%); } 100% { transform: translateX(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes pulse  { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
