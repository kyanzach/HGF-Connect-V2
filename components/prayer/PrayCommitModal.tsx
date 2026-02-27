"use client";

import { useState, useRef, useCallback } from "react";

interface PrayCommitModalProps {
  open: boolean;
  onClose: () => void;
  onPrayed: () => void;
  requestId: number;
  authorName: string;
  requestText: string;
}

export default function PrayCommitModal({
  open,
  onClose,
  onPrayed,
  requestId,
  authorName,
  requestText,
}: PrayCommitModalProps) {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);

  const truncated = requestText.length > 150 ? requestText.slice(0, 150) + "…" : requestText;

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => {
        setRecSeconds((s) => {
          if (s >= 59) { stopRecording(); return 60; }
          return s + 1;
        });
      }, 1000);
    } catch {
      alert("Microphone access is needed to record a voice prayer.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const removeAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecSeconds(0);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let uploadedAudioUrl: string | null = null;

      // Upload audio if recorded
      if (audioBlob) {
        const formData = new FormData();
        formData.append("audio", audioBlob, `prayer_${Date.now()}.webm`);
        const uploadRes = await fetch("/api/prayer/upload-audio", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          uploadedAudioUrl = data.url;
        }
      }

      // Submit prayer response
      await fetch(`/api/prayer/${requestId}/pray`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message || "🙏 Prayed", audioUrl: uploadedAudioUrl }),
      });

      onPrayed();
      onClose();
      setMessage("");
      removeAudio();
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "white", borderRadius: "20px 20px 0 0",
          width: "100%", maxWidth: 480, maxHeight: "85vh",
          overflowY: "auto", padding: "1.5rem 1.25rem 2rem",
          animation: "slideUp 0.3s ease",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🙏</div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#1e293b", margin: "0 0 0.5rem" }}>
            Lift Up in Prayer
          </h3>
          <p style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.6, margin: 0 }}>
            <strong>{authorName}</strong> needs your prayer. Have you taken a moment
            to lift this up to the Lord? Your prayer matters — even a silent one counts.
          </p>
        </div>

        {/* Prayer text */}
        <div
          style={{
            background: "#f8f4ff", borderRadius: 12, padding: "0.875rem",
            marginBottom: "1rem", borderLeft: "3px solid #7c3aed",
          }}
        >
          <p style={{ fontSize: "0.85rem", color: "#334155", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
            &ldquo;{truncated}&rdquo;
          </p>
        </div>

        {/* Optional message */}
        <div style={{ marginBottom: "0.875rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 4, display: "block" }}>
            Leave a word of encouragement (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Praying for you, may God give you peace…"
            rows={2}
            style={{
              width: "100%", border: "1px solid #e2e8f0", borderRadius: 10,
              padding: "0.625rem", fontSize: "0.85rem", resize: "none",
              outline: "none", fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Voice recording */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: 6, display: "block" }}>
            🎙️ Record a voice prayer (optional, max 60s)
          </label>
          {!audioUrl ? (
            <button
              onClick={recording ? stopRecording : startRecording}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "0.5rem 1rem", borderRadius: 999,
                border: recording ? "2px solid #ef4444" : "1px solid #e2e8f0",
                background: recording ? "#fef2f2" : "#f8fafc",
                color: recording ? "#ef4444" : "#475569",
                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              {recording ? (
                <>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
                  Recording {recSeconds}s — Tap to stop
                </>
              ) : (
                <>🎙️ Hold to Record</>
              )}
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <audio src={audioUrl} controls style={{ flex: 1, height: 36 }} />
              <button
                onClick={removeAudio}
                style={{ border: "none", background: "#fee2e2", color: "#dc2626", borderRadius: 999, padding: "0.35rem 0.75rem", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
              >
                ✕ Remove
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.625rem" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "0.75rem", borderRadius: 12,
              border: "1px solid #e2e8f0", background: "white",
              fontSize: "0.875rem", fontWeight: 600, color: "#64748b", cursor: "pointer",
            }}
          >
            Later
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 2, padding: "0.75rem", borderRadius: 12, border: "none",
              background: submitting ? "#a78bfa" : "linear-gradient(135deg, #7c3aed, #a855f7)",
              fontSize: "0.875rem", fontWeight: 700, color: "white", cursor: submitting ? "default" : "pointer",
            }}
          >
            {submitting ? "Submitting…" : "✅ I Prayed"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
