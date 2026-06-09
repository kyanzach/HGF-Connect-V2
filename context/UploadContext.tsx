"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import axios from "axios";

export interface ProcessedPresentation {
  presentationFile: string;
  presentationOriginalName: string;
  presentationSlides: string[];
}

interface UploadJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  error?: string;
  result?: ProcessedPresentation;
}

interface UploadContextType {
  uploading: boolean;
  progress: number;
  message: string;
  error: string | null;
  result: ProcessedPresentation | null;
  startUpload: (file: File) => Promise<string>;
  clearUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
};

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedPresentation | null>(null);
  const [deviceType, setDeviceType] = useState("device");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detect device type on mount
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/ipad|tablet|playbook|silk/i.test(ua)) {
      setDeviceType("tablet");
    } else if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) {
      setDeviceType("mobile phone");
    } else {
      setDeviceType("laptop/desktop");
    }
  }, []);

  const clearUpload = () => {
    setUploading(false);
    setJobId(null);
    setProgress(0);
    setMessage("");
    setError(null);
    setResult(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startUpload = async (file: File): Promise<string> => {
    clearUpload();
    setUploading(true);
    setProgress(5);
    setMessage("Uploading file...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post("/api/events/presentation/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { jobId: newJobId } = response.data;
      setJobId(newJobId);
      return newJobId;
    } catch (err: any) {
      setUploading(false);
      const errMsg = err.response?.data?.error || err.message || "Upload failed";
      setError(errMsg);
      setMessage("Upload failed");
      throw new Error(errMsg);
    }
  };

  // Poll background job status
  useEffect(() => {
    if (!jobId) return;

    const pollJob = async () => {
      try {
        const response = await axios.get(`/api/events/presentation/upload?jobId=${jobId}`);
        const job: UploadJob = response.data;

        setProgress(job.progress);
        setMessage(job.message);

        if (job.status === "completed") {
          setUploading(false);
          setResult(job.result || null);
          setJobId(null);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        } else if (job.status === "failed") {
          setUploading(false);
          setError(job.error || "Failed to process presentation");
          setJobId(null);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch (err: any) {
        console.error("Error polling upload job:", err);
        // Do not fail immediately on a network blip, just log it and keep polling
      }
    };

    pollIntervalRef.current = setInterval(pollJob, 1500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [jobId]);

  return (
    <UploadContext.Provider
      value={{
        uploading,
        progress,
        message,
        error,
        result,
        startUpload,
        clearUpload,
      }}
    >
      {children}

      {/* Floating Toast Notification */}
      {uploading && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            width: "360px",
            background: "rgba(15, 23, 42, 0.9)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "white",
            padding: "1.25rem",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            gap: "0.875rem",
            fontFamily: "Inter, sans-serif",
            animation: "slideIn 0.3s ease-out",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.25rem" }}>📽️</span>
              <span style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>
                Presentation Optimizer
              </span>
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#4eb1cb",
                background: "rgba(78, 177, 203, 0.15)",
                padding: "0.25rem 0.5rem",
                borderRadius: "6px",
              }}
            >
              {progress}%
            </div>
          </div>

          {/* Loader and Progress Bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <div
              style={{
                width: "100%",
                height: "6px",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #4eb1cb, #3b82f6)",
                  borderRadius: "3px",
                  transition: "width 0.3s ease-out",
                }}
              />
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#e2e8f0", fontWeight: 500 }}>
              {message}
            </div>
          </div>

          {/* Warning Message */}
          <div
            style={{
              fontSize: "0.75rem",
              lineHeight: "1.25",
              color: "#94a3b8",
              background: "rgba(255, 255, 255, 0.05)",
              padding: "0.625rem 0.75rem",
              borderRadius: "8px",
              borderLeft: "3px solid #f59e0b",
            }}
          >
            ⚠️ Optimizing slides in the background. Please do not turn off your{" "}
            <strong style={{ color: "#f59e0b" }}>{deviceType}</strong> or close this page.
          </div>
        </div>
      )}

      {/* Styled animation keyframes */}
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </UploadContext.Provider>
  );
};
