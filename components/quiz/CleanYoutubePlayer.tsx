"use client";

import { useEffect, useRef, useState } from "react";

interface CleanYoutubePlayerProps {
  videoId: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export default function CleanYoutubePlayer({ videoId }: CleanYoutubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Load YouTube script once globally
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize player when YT is ready
  useEffect(() => {
    let player: any = null;
    let progressInterval: any = null;

    const init = () => {
      if (!window.YT || !window.YT.Player || !containerRef.current) return;

      player = new window.YT.Player(containerRef.current, {
        height: "100%",
        width: "100%",
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0,
          disablekb: 1,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event: any) => {
            setDuration(event.target.getDuration());
            setIsMuted(event.target.isMuted());
          },
          onStateChange: (event: any) => {
            const state = event.data;
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setHasEnded(false);
              progressInterval = setInterval(() => {
                if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
                  setCurrentTime(playerRef.current.getCurrentTime());
                }
              }, 250);
            } else {
              setIsPlaying(false);
              if (progressInterval) clearInterval(progressInterval);
              if (state === window.YT.PlayerState.ENDED) {
                setHasEnded(true);
                setCurrentTime(duration);
              }
            }
          },
        },
      });
      playerRef.current = player;
    };

    if (window.YT && window.YT.Player) {
      init();
    } else {
      const existingCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (existingCallback) existingCallback();
        init();
      };
    }

    return () => {
      if (player) {
        try {
          player.destroy();
        } catch (e) {
          console.warn("Error destroying player:", e);
        }
      }
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [videoId, duration]);

  const handlePlayToggle = () => {
    const player = playerRef.current;
    if (!player) return;

    if (isPlaying) {
      player.pauseVideo();
    } else {
      if (hasEnded) {
        player.seekTo(0);
        setHasEnded(false);
      }
      player.playVideo();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const player = playerRef.current;
    if (!player) return;
    const time = parseFloat(e.target.value);
    player.seekTo(time);
    setCurrentTime(time);
    if (hasEnded && time < duration) {
      setHasEnded(false);
    }
  };

  const handleMuteToggle = () => {
    const player = playerRef.current;
    if (!player) return;
    if (isMuted) {
      player.unmute();
      setIsMuted(false);
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: "56.25%", // 16:9 Aspect Ratio
        background: "#000",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
      }}
    >
      {/* Target div for YouTube player replacement */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none", // BLOCKS ALL CLICK NAVIGATION!
        }}
      >
        <div ref={containerRef} />
      </div>

      {/* Transparent Click Interceptor & Custom Play State Controls */}
      <div
        onClick={handlePlayToggle}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          cursor: "pointer",
          zIndex: 10,
        }}
      />

      {/* Custom Replay / Play Thumbnail Overlay */}
      {(!isPlaying || hasEnded) && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${thumbnailUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            pointerEvents: "none", // Let clicks pass to the parent play toggle
            transition: "opacity 0.3s ease",
          }}
        >
          {/* Glassmorphic Play/Replay Button */}
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(12px)",
              border: "1.5px solid rgba(255, 255, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              color: "#fff",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              transition: "transform 0.2s ease",
              transform: "scale(1)",
            }}
          >
            {hasEnded ? "🔄" : "▶️"}
          </div>
          <span
            style={{
              color: "#fff",
              marginTop: "12px",
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              textShadow: "0 2px 4px rgba(0,0,0,0.6)",
            }}
          >
            {hasEnded ? "Replay Sermon" : "Play Sermon"}
          </span>
        </div>
      )}

      {/* Custom Bottom Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()} // Stop click propagation to play toggle
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "48px",
          background: "linear-gradient(transparent, rgba(0, 0, 0, 0.85))",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: "12px",
          zIndex: 30,
          opacity: isPlaying ? 1 : 0.8,
          transition: "opacity 0.2s",
        }}
      >
        {/* Play/Pause Button */}
        <button
          onClick={handlePlayToggle}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: "1.2rem",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          {isPlaying ? "⏸️" : "▶️"}
        </button>

        {/* Progress Bar */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          style={{
            flex: 1,
            height: "4px",
            background: "rgba(255,255,255,0.3)",
            borderRadius: "2px",
            outline: "none",
            cursor: "pointer",
            accentColor: "#4EB1CB",
          }}
        />

        {/* Time Display */}
        <span style={{ color: "#fff", fontSize: "0.75rem", fontFamily: "monospace", minWidth: "80px", textAlign: "center" }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Mute Button */}
        <button
          onClick={handleMuteToggle}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: "1.1rem",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>
    </div>
  );
}
