"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Play, RotateCcw, Zap, Target, ArrowDown, Scissors } from "lucide-react";

interface TrackingResult {
  speed: number;
  shotType: string;
  bouncePoint: string;
  hitStumps: boolean;
  confidence: number;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${sec.toString().padStart(2, "0")}.${ms}`;
}

export default function BallTrackingPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Trim state
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimming, setTrimming] = useState(false);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError("");
    setTrimming(false);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  }

  function onVideoLoaded() {
    const vid = videoRef.current;
    if (!vid) return;
    const dur = vid.duration;
    setDuration(dur);
    setTrimStart(0);
    setTrimEnd(dur);
  }

  // Seek video when trim handles move
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !trimming) return;
    vid.currentTime = trimStart;
  }, [trimStart, trimming]);

  // Constrain playback within trim range
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !trimming) return;
    function onTimeUpdate() {
      if (vid && vid.currentTime > trimEnd) {
        vid.pause();
        vid.currentTime = trimEnd;
      }
    }
    vid.addEventListener("timeupdate", onTimeUpdate);
    return () => vid.removeEventListener("timeupdate", onTimeUpdate);
  }, [trimEnd, trimming]);

  const handleTrackInteraction = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || !dragging) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const time = ratio * duration;
      if (dragging === "start") {
        setTrimStart(Math.min(time, trimEnd - 0.1));
      } else {
        setTrimEnd(Math.max(time, trimStart + 0.1));
      }
    },
    [dragging, duration, trimStart, trimEnd]
  );

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      handleTrackInteraction(e.clientX);
    }
    function onUp() {
      setDragging(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, handleTrackInteraction]);

  // Touch support
  useEffect(() => {
    if (!dragging) return;
    function onMove(e: TouchEvent) {
      handleTrackInteraction(e.touches[0].clientX);
    }
    function onUp() {
      setDragging(null);
    }
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, handleTrackInteraction]);

  function previewTrim() {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = trimStart;
    vid.play();
  }

  async function analyzeVideo() {
    if (!videoUrl) return;
    setAnalyzing(true);
    setError("");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 90));
    }, 300);

    try {
      const fileInput = fileInputRef.current;
      const file = fileInput?.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append("video", file);
        if (trimming) {
          formData.append("trim_start", trimStart.toFixed(2));
          formData.append("trim_end", trimEnd.toFixed(2));
        }
        try {
          const res = await fetch("http://localhost:8000/analyze", { method: "POST", body: formData, signal: AbortSignal.timeout(60000) });
          if (res.ok) {
            const data = await res.json();
            clearInterval(interval);
            setProgress(100);
            setResult({ speed: data.speed_kmh || 0, shotType: data.shot_type || "Unknown", bouncePoint: data.bounce_point || "Not detected", hitStumps: data.hit_stumps || false, confidence: data.confidence || 0 });
            setAnalyzing(false);
            return;
          }
        } catch { /* ML service not running */ }
      }

      clearInterval(interval);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 500));
      setResult({ speed: 128.5, shotType: "Good Length", bouncePoint: "4th stump line, 6m from stumps", hitStumps: false, confidence: 85 });
      setError("Note: ML service not running. Showing demo results. Start the Python service for real analysis: cd ml-service && python server.py");
    } catch {
      setError("Analysis failed. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  function reset() {
    setVideoUrl(null);
    setResult(null);
    setError("");
    setProgress(0);
    setTrimming(false);
    setTrimStart(0);
    setTrimEnd(0);
    setDuration(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    top: -6,
    width: 16,
    height: 28,
    background: "var(--cs-accent)",
    borderRadius: 4,
    cursor: "ew-resize",
    zIndex: 2,
    border: "2px solid #fff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
      <div style={{ gridColumn: 'span 12', padding: '20px 0' }}>
        <div className="label-bracket" style={{ marginBottom: 12 }}>ball_tracking_module</div>
        <h1 style={{ fontSize: 48, background: 'linear-gradient(180deg, #ffffff 0%, #909ab0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em' }}>
          BALL TRACKING
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 8 }}>
          Upload cricket video for ball trajectory, speed, and bounce analysis
        </p>
      </div>

      {!videoUrl ? (
        <div className="panel" style={{ gridColumn: 'span 12', padding: 64, cursor: 'pointer', textAlign: 'center', borderStyle: 'dashed' }} onClick={() => fileInputRef.current?.click()}>
          <Upload style={{ width: 64, height: 64, color: 'var(--cs-accent)', margin: '0 auto 20px' }} />
          <h3 style={{ fontSize: 24, marginBottom: 8 }}>UPLOAD CRICKET VIDEO</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>MP4, MOV, or AVI - max 50MB</p>
        </div>
      ) : (
        <>
          <div className="panel" style={{ gridColumn: 'span 8', padding: 24 }}>
            <div className="panel-header">
              <span className="label-bracket">video_feed</span>
              <h2 className="panel-title">PREVIEW</h2>
            </div>
            <video ref={videoRef} src={videoUrl} controls onLoadedMetadata={onVideoLoaded} style={{ width: '100%', maxHeight: 400, borderRadius: 12, objectFit: 'contain', background: '#000' }} />

            {/* Trim Controls */}
            {duration > 0 && (
              <div style={{ marginTop: 16 }}>
                {!trimming ? (
                  <button
                    onClick={() => setTrimming(true)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 16px', fontSize: 12 }}
                  >
                    <Scissors style={{ width: 14, height: 14, marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
                    Trim Video
                  </button>
                ) : (
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 16, border: '1px solid var(--cs-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div className="label-bracket">
                        <Scissors style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        trim_editor
                      </div>
                      <button
                        onClick={() => { setTrimming(false); setTrimStart(0); setTrimEnd(duration); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
                      >
                        CANCEL
                      </button>
                    </div>

                    {/* Timeline track */}
                    <div
                      ref={trackRef}
                      style={{ position: 'relative', height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 8, cursor: 'pointer', userSelect: 'none' }}
                    >
                      {/* Selected range */}
                      <div style={{
                        position: 'absolute', top: 0, height: '100%', borderRadius: 8,
                        left: `${(trimStart / duration) * 100}%`,
                        width: `${((trimEnd - trimStart) / duration) * 100}%`,
                        background: 'rgba(0,212,255,0.25)',
                        border: '1px solid rgba(0,212,255,0.4)',
                      }} />
                      {/* Start handle */}
                      <div
                        style={{ ...handleStyle, left: `calc(${(trimStart / duration) * 100}% - 8px)` }}
                        onMouseDown={(e) => { e.preventDefault(); setDragging("start"); }}
                        onTouchStart={(e) => { e.preventDefault(); setDragging("start"); }}
                      />
                      {/* End handle */}
                      <div
                        style={{ ...handleStyle, left: `calc(${(trimEnd / duration) * 100}% - 8px)` }}
                        onMouseDown={(e) => { e.preventDefault(); setDragging("end"); }}
                        onTouchStart={(e) => { e.preventDefault(); setDragging("end"); }}
                      />
                    </div>

                    {/* Time labels and preview button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>START </span>
                          <span style={{ fontSize: 13, color: 'var(--cs-accent)', fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic' }}>{formatTime(trimStart)}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>END </span>
                          <span style={{ fontSize: 13, color: 'var(--cs-accent)', fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic' }}>{formatTime(trimEnd)}</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>DURATION </span>
                          <span style={{ fontSize: 13, color: 'var(--text-main)', fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic' }}>{formatTime(trimEnd - trimStart)}</span>
                        </div>
                      </div>
                      <button
                        onClick={previewTrim}
                        className="btn btn-secondary"
                        style={{ padding: '4px 12px', fontSize: 11 }}
                      >
                        <Play style={{ width: 10, height: 10, marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />
                        Preview
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              {!result && !analyzing && (
                <button onClick={analyzeVideo} className="btn btn-primary" style={{ padding: '8px 8px 8px 24px', fontSize: 14, flex: 1 }}>
                  {trimming ? "Analyze Trimmed Clip" : "Analyze Ball"}
                  <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                    <Play style={{ width: 12, height: 12 }} />
                  </div>
                </button>
              )}
              <button className="btn btn-secondary" style={{ padding: '8px 24px', fontSize: 14 }} onClick={reset}>
                <RotateCcw style={{ width: 14, height: 14, marginRight: 8, display: 'inline' }} />Reset
              </button>
            </div>
            {analyzing && (
              <div style={{ marginTop: 16 }}>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--cs-accent)', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                  Processing frames{trimming ? ` (${formatTime(trimStart)} - ${formatTime(trimEnd)})` : ""}... {progress}%
                </p>
              </div>
            )}
            {error && (
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--cs-accent)', background: 'rgba(0,212,255,0.08)', padding: 12, borderRadius: 12 }}>{error}</div>
            )}
          </div>

          {result && (
            <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="panel">
                <div className="panel-header">
                  <span className="label-bracket"><Zap style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />speed</span>
                  <h2 className="panel-title">KPH</h2>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="stat-val" style={{ fontSize: 64, color: 'var(--cs-accent)' }}>{result.speed.toFixed(1)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    {result.speed > 140 ? "Express pace!" : result.speed > 130 ? "Good pace bowling" : result.speed > 120 ? "Medium-fast" : "Medium pace"}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <span className="label-bracket"><Target style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />classification</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Shot Type</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', fontSize: 14, color: 'var(--cs-accent)' }}>{result.shotType.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Bounce Point</span>
                    <span style={{ fontSize: 13, color: 'var(--text-main)' }}>{result.bouncePoint}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Hitting Stumps?</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', fontSize: 14, color: result.hitStumps ? 'var(--cs-danger)' : '#22c55e' }}>
                      {result.hitStumps ? "YES" : "NO"}
                    </span>
                  </div>
                  {trimming && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Analyzed Clip</span>
                      <span style={{ fontSize: 13, color: 'var(--text-main)' }}>{formatTime(trimStart)} - {formatTime(trimEnd)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <span className="label-bracket"><ArrowDown style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />length_guide</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { type: "Yorker", range: "At the crease" },
                    { type: "Full Length", range: "2-4m from crease" },
                    { type: "Good Length", range: "4-7m from crease" },
                    { type: "Short Ball", range: "7m+ from crease" },
                  ].map((l) => (
                    <div key={l.type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 12, background: result.shotType === l.type ? 'rgba(0,212,255,0.08)' : 'transparent', border: result.shotType === l.type ? '1px solid rgba(0,212,255,0.2)' : '1px solid transparent' }}>
                      <span style={{ fontSize: 12, color: result.shotType === l.type ? 'var(--cs-accent)' : 'var(--text-muted)', fontWeight: result.shotType === l.type ? 600 : 400 }}>{l.type}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <input ref={fileInputRef} type="file" accept="video/mp4,video/mov,video/avi,video/*" style={{ display: 'none' }} onChange={handleUpload} />
    </div>
  );
}
