"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const PRIMARY = "#4EB1CB";
const PRIMARY_DARK = "#0284c7";
const MAX_MESSAGE_LENGTH = 500;
const MAX_RECORDING_SECONDS = 60;

interface PrayCommitModalProps {
  open: boolean;
  onClose: () => void;
  onPrayed: () => void;
  requestId: number;
  authorName: string;
  requestText: string;
}

function detectSupportedAudioMime(): { mimeType?: string; ext: string } {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return { ext: "webm" };
  }
  const candidates: Array<{ mime: string; ext: string }> = [
    { mime: "audio/mp4;codecs=mp4a.40.2", ext: "m4a" },
    { mime: "audio/mp4", ext: "m4a" },
    { mime: "audio/webm;codecs=opus", ext: "webm" },
    { mime: "audio/webm", ext: "webm" },
    { mime: "audio/ogg;codecs=opus", ext: "ogg" },
    { mime: "audio/ogg", ext: "ogg" },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.mime)) {
      return { mimeType: c.mime, ext: c.ext };
    }
  }
  return { ext: "m4a" };
}

function extFromMime(mime?: string): string {
  const clean = (mime || "").toLowerCase().split(";")[0].trim();
  if (clean.includes("mp4") || clean.includes("m4a") || clean.includes("aac")) return "m4a";
  if (clean.includes("ogg")) return "ogg";
  if (clean.includes("wav")) return "wav";
  if (clean.includes("mpeg") || clean.includes("mp3")) return "mp3";
  return "webm";
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
  const [audioExt, setAudioExt] = useState<string>("webm");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recSeconds, setRecSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const cleanupMedia = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.onstop = null;
          mediaRecorderRef.current.stop();
        }
      } catch {
        // ignore stop errors on teardown
      }
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setRecording(false);
  }, []);

  const removeAudio = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecSeconds(0);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.classList.add("hgf-modal-open");
      setError(null);
    } else {
      document.body.classList.remove("hgf-modal-open");
      cleanupMedia();
    }
    return () => {
      document.body.classList.remove("hgf-modal-open");
      cleanupMedia();
    };
  }, [open, cleanupMedia]);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const { mimeType, ext } = detectSupportedAudioMime();
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const actualMime = mr.mimeType || mimeType || "audio/webm";
      const actualExt = extFromMime(actualMime) || ext;

      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onerror = () => {
        cleanupMedia();
        setError("Recording stopped unexpectedly. Please try again.");
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (chunksRef.current.length === 0) {
          setError("No audio was captured. Please try again.");
          return;
        }
        const blob = new Blob(chunksRef.current, { type: actualMime });
        if (blob.size === 0) {
          setError("Recorded audio was empty. Please try again.");
          return;
        }
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioBlob(blob);
        setAudioExt(actualExt);
        setAudioUrl(url);
      };

      mr.start(250);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => {
        setRecSeconds((s) => {
          if (s >= MAX_RECORDING_SECONDS - 1) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch (err: any) {
      cleanupMedia();
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setError("Microphone permission was denied. Allow microphone access in browser settings to record.");
      } else if (err?.name === "NotFoundError") {
        setError("No microphone was found on this device.");
      } else {
        setError("Could not start voice recording. Please try again.");
      }
    }
  }, [cleanupMedia, stopRecording]);

  const handleClose = () => {
    if (submitting) return;
    cleanupMedia();
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (recording) {
      setError("Please stop your voice recording before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let uploadedAudioUrl: string | null = null;

      if (audioBlob) {
        const formData = new FormData();
        formData.append("audio", audioBlob, `prayer_${Date.now()}.${audioExt}`);
        const uploadRes = await fetch("/api/prayer/upload-audio", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadData?.url) {
          setError(uploadData?.error || "Could not upload voice prayer. Please try again.");
          return;
        }
        uploadedAudioUrl = uploadData.url;
      }

      const prayRes = await fetch(`/api/prayer/${requestId}/pray`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim() || "🙏 Prayed",
          audioUrl: uploadedAudioUrl,
        }),
      });
      const prayData = await prayRes.json().catch(() => ({}));
      if (!prayRes.ok) {
        setError(prayData?.error || "Could not submit your prayer. Please try again.");
        return;
      }

      onPrayed();
      setMessage("");
      removeAudio();
      onClose();
    } catch {
      setError("Network error while submitting. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pray-commit-title"
        style={{
          background: "#ffffff",
          borderRadius: 20,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "1.5rem 1.25rem 1.35rem",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.22)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <h3
            id="pray-commit-title"
            style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0f172a", margin: "0 0 0.35rem" }}
          >
            Lift Up in Prayer
          </h3>
          <p style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.5, margin: 0 }}>
            <strong>{authorName}</strong> needs your prayer. Even a silent one counts.
          </p>
        </div>

        {/* Full Prayer Request (scrollable if long — never truncated) */}
        <div
          style={{
            background: "#f0f9ff",
            borderRadius: 12,
            padding: "0.875rem",
            marginBottom: "1rem",
            borderLeft: `3px solid ${PRIMARY}`,
            maxHeight: "30vh",
            overflowY: "auto",
          }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              color: "#1e293b",
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: "pre-line",
              wordBreak: "break-word",
            }}
          >
            &ldquo;{requestText}&rdquo;
          </p>
        </div>

        {/* Inline error banner */}
        {error && (
          <div
            role="alert"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: 10,
              padding: "0.625rem 0.75rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              marginBottom: "0.875rem",
              lineHeight: 1.45,
            }}
          >
            {error}
          </div>
        )}

        {/* Optional encouragement */}
        <div style={{ marginBottom: "0.875rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <label
              htmlFor="pray-encouragement-input"
              style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}
            >
              Word of encouragement (optional)
            </label>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
              {message.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </div>
          <textarea
            id="pray-encouragement-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="Praying for you, may God give you peace..."
            rows={2}
            style={{
              width: "100%",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "0.625rem",
              fontSize: "0.85rem",
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              color: "#0f172a",
            }}
          />
        </div>

        {/* Voice recording */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", marginBottom: 6, display: "block" }}>
            Voice prayer (optional, max 60s)
          </label>
          {!audioUrl ? (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "0.55rem 1rem",
                borderRadius: 999,
                border: recording ? "1.5px solid #ef4444" : "1px solid #cbd5e1",
                background: recording ? "#fef2f2" : "#f8fafc",
                color: recording ? "#dc2626" : "#334155",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {recording ? (
                <>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: "#ef4444",
                      animation: "hgfPulse 1s infinite",
                    }}
                  />
                  Stop ({recSeconds}s / {MAX_RECORDING_SECONDS}s)
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  Tap to Record
                </>
              )}
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <audio src={audioUrl} controls style={{ flex: 1, height: 36 }} />
              <button
                type="button"
                onClick={removeAudio}
                style={{
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderRadius: 999,
                  padding: "0.4rem 0.75rem",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.625rem" }}>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#475569",
              cursor: submitting ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || recording}
            style={{
              flex: 2,
              padding: "0.75rem",
              borderRadius: 12,
              border: "none",
              background:
                submitting || recording
                  ? "#94a3b8"
                  : `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`,
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#ffffff",
              cursor: submitting || recording ? "default" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {submitting ? "Submitting..." : "I Prayed"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes hgfPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
      `}</style>
    </div>
  );
}
