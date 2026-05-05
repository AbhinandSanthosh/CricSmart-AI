"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Play, RotateCcw, Scissors, Video, Camera } from "lucide-react";

interface TrackingResult {
  speed: number;
  hitStumps: boolean;
  verdict: string;
  bounceText: string;
  trailOverlayPx: [number, number][];
}

type Corner = [number, number];

const CORNER_LABELS = [
  "Bowler end — leg side",
  "Bowler end — off side",
  "Batter end — off side",
  "Batter end — leg side",
];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${sec.toString().padStart(2, "0")}.${ms}`;
}

const ML_SERVICE_URL = "/api/analyze";

export default function BallTrackingPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const trajectoryCanvasRef = useRef<HTMLCanvasElement>(null);

  // Trim state
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimming, setTrimming] = useState(false);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Calibration state — user clicks 4 pitch corners on the first frame
  const [corners, setCorners] = useState<Corner[]>([]);
  const [calibrating, setCalibrating] = useState(false);
  const [firstFrameUrl, setFirstFrameUrl] = useState<string | null>(null);
  const [frameSize, setFrameSize] = useState<{ w: number; h: number } | null>(null);
  const calibCanvasRef = useRef<HTMLCanvasElement>(null);

  // Live capture state
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    return () => {
      if (liveStream) liveStream.getTracks().forEach((t) => t.stop());
    };
  }, [liveStream]);

  // Capture the first frame as soon as a video URL is available
  useEffect(() => {
    if (!videoUrl) {
      setFirstFrameUrl(null);
      setFrameSize(null);
      return;
    }
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.src = videoUrl;

    const onSeeked = () => {
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(v, 0, 0);
      setFirstFrameUrl(c.toDataURL("image/jpeg", 0.85));
      setFrameSize({ w: v.videoWidth, h: v.videoHeight });
    };
    v.addEventListener("loadedmetadata", () => { v.currentTime = 0.05; });
    v.addEventListener("seeked", onSeeked);
    v.load();
    return () => {
      v.removeEventListener("seeked", onSeeked);
    };
  }, [videoUrl]);

  // Draw the calibration overlay (first frame + clicked corners + connecting polygon)
  useEffect(() => {
    if (!calibrating || !firstFrameUrl || !frameSize) return;
    const canvas = calibCanvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = frameSize.w;
      canvas.height = frameSize.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, frameSize.w, frameSize.h);

      const scale = Math.max(frameSize.w, frameSize.h) / 800;
      ctx.lineWidth = 3 * scale;
      ctx.strokeStyle = "rgba(0, 212, 255, 0.9)";
      ctx.fillStyle = "rgba(0, 212, 255, 0.18)";

      if (corners.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(corners[0][0], corners[0][1]);
        for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i][0], corners[i][1]);
        if (corners.length === 4) ctx.closePath();
        ctx.stroke();
        if (corners.length === 4) ctx.fill();
      }

      corners.forEach((pt, i) => {
        ctx.fillStyle = "#00d4ff";
        ctx.beginPath();
        ctx.arc(pt[0], pt[1], 8 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `bold ${14 * scale}px sans-serif`;
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        const lbl = String(i + 1);
        const tw = ctx.measureText(lbl).width;
        ctx.fillRect(pt[0] + 12 * scale, pt[1] - 14 * scale, tw + 8 * scale, 18 * scale);
        ctx.fillStyle = "#00d4ff";
        ctx.fillText(lbl, pt[0] + 16 * scale, pt[1]);
      });
    };
    img.src = firstFrameUrl;
  }, [calibrating, firstFrameUrl, frameSize, corners]);

  // Draw the result trail (single semi-transparent curve over first-frame thumbnail)
  useEffect(() => {
    if (!result?.trailOverlayPx || result.trailOverlayPx.length < 2) return;
    if (!firstFrameUrl || !frameSize) return;
    const canvas = trajectoryCanvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = frameSize.w;
      canvas.height = frameSize.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, frameSize.w, frameSize.h);

      const trail = result.trailOverlayPx;
      const scale = Math.max(frameSize.w, frameSize.h) / 800;
      ctx.strokeStyle = result.hitStumps
        ? "rgba(255, 42, 75, 0.75)"
        : "rgba(34, 197, 94, 0.75)";
      ctx.lineWidth = 4 * scale;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(trail[0][0], trail[0][1]);
      for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i][0], trail[i][1]);
      ctx.stroke();
    };
    img.src = firstFrameUrl;
  }, [result, firstFrameUrl, frameSize]);

  function handleCalibClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!frameSize) return;
    if (corners.length >= 4) return;
    const canvas = calibCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * frameSize.w;
    const y = ((e.clientY - rect.top) / rect.height) * frameSize.h;
    setCorners([...corners, [x, y]]);
  }

  function undoLastCorner() {
    setCorners(corners.slice(0, -1));
  }

  function clearCorners() {
    setCorners([]);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError("");
    setTrimming(false);
    videoBlobRef.current = null;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  }

  async function startLiveCapture() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setLiveStream(s);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = s;
        liveVideoRef.current.play();
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }

  function startRecording() {
    if (!liveStream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(liveStream, { mimeType: "video/webm" });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      videoBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      // Stop camera
      if (liveStream) {
        liveStream.getTracks().forEach((t) => t.stop());
        setLiveStream(null);
      }
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }

  function cancelLive() {
    if (liveStream) {
      liveStream.getTracks().forEach((t) => t.stop());
      setLiveStream(null);
    }
    setRecording(false);
  }

  function onVideoLoaded() {
    const vid = videoRef.current;
    if (!vid) return;
    const dur = vid.duration;
    setDuration(dur);
    setTrimStart(0);
    setTrimEnd(dur);
  }

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !trimming) return;
    vid.currentTime = trimStart;
  }, [trimStart, trimming]);

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
    function onMove(e: MouseEvent) { handleTrackInteraction(e.clientX); }
    function onUp() { setDragging(null); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, handleTrackInteraction]);

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: TouchEvent) { handleTrackInteraction(e.touches[0].clientX); }
    function onUp() { setDragging(null); }
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp); };
  }, [dragging, handleTrackInteraction]);

  function previewTrim() {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = trimStart;
    vid.play();
  }

  async function analyzeVideo() {
    if (!videoUrl) return;
    if (corners.length !== 4) {
      setError("Tap the 4 pitch corners on the first frame before analyzing.");
      setCalibrating(true);
      return;
    }
    setAnalyzing(true);
    setError("");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 90));
    }, 300);

    try {
      const fileFromInput = fileInputRef.current?.files?.[0];
      const videoData: Blob | File | null = fileFromInput || videoBlobRef.current;

      if (videoData) {
        const formData = new FormData();
        const filename = fileFromInput?.name || "recording.webm";
        formData.append("video", videoData, filename);
        if (trimming) {
          formData.append("trim_start", trimStart.toFixed(2));
          formData.append("trim_end", trimEnd.toFixed(2));
        }
        formData.append("pitch_corners", JSON.stringify(corners));
        try {
          const res = await fetch(ML_SERVICE_URL, { method: "POST", body: formData, signal: AbortSignal.timeout(120000) });
          if (res.ok) {
            const data = await res.json();
            clearInterval(interval);
            setProgress(100);
            setResult({
              speed: data.speed_kmh || 0,
              hitStumps: data.hit_stumps || false,
              verdict: data.verdict || "",
              bounceText: data.bounce_text || "",
              trailOverlayPx: data.trail_overlay_px || [],
            });
            setAnalyzing(false);
            return;
          }
        } catch { /* ML service not running */ }
      }

      clearInterval(interval);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 500));
      setResult({
        speed: 128,
        hitStumps: false,
        verdict: "It would have missed the stumps.",
        bounceText: "Pitched on a good length, in line with the stumps.",
        trailOverlayPx: [],
      });
      setError("ML service not available — showing demo results.");
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
    setCorners([]);
    setCalibrating(false);
    setFirstFrameUrl(null);
    setFrameSize(null);
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
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 py-5">
        <p className="label-bracket mb-3">Ball Tracking</p>
        <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">
          Ball Tracking
        </h1>
        <p className="text-[var(--text-muted)] text-base mt-2">
          Upload or record a cricket video — see ball speed, where it pitched, and whether it would hit the stumps
        </p>
      </div>

      {/* Upload / Live Capture Options */}
      {!videoUrl && !liveStream ? (
        <>
          <div className="panel col-span-12 p-12 cursor-pointer text-center border-dashed" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-14 h-14 text-[var(--cs-accent)] mx-auto mb-4" />
            <h3 className="text-[22px] mb-2">Upload Video</h3>
            <p className="text-[var(--text-muted)] text-sm">MP4, MOV, or AVI — max 50MB</p>
          </div>
          <div className="panel col-span-12 p-12 cursor-pointer text-center" onClick={startLiveCapture}>
            <Video className="w-14 h-14 text-[#8b5cf6] mx-auto mb-4" />
            <h3 className="text-[22px] mb-2">Live Capture</h3>
            <p className="text-[var(--text-muted)] text-sm">Record a bowling delivery using your camera</p>
          </div>
        </>
      ) : null}

      {/* Live Camera View */}
      {liveStream && !videoUrl && (
        <div className="panel col-span-12 p-6">
          <div className="panel-header">
            <span className="label-bracket">
              {recording && <span className="inline-block w-2 h-2 bg-[var(--cs-danger)] rounded-full mr-1.5 animate-pulse" />}
              {recording ? 'recording' : 'live_camera'}
            </span>
            <h2 className="panel-title">{recording ? 'Recording...' : 'Position Camera'}</h2>
          </div>
          <p className="text-[var(--text-muted)] text-[13px] mb-4">
            {recording
              ? "Recording the delivery. Press Stop when the ball reaches the batter."
              : "Position your camera side-on to the pitch, capturing the full bowling and batting crease. Press Record when the bowler is ready."}
          </p>
          <div className="relative rounded-xl overflow-hidden bg-black">
            <video ref={liveVideoRef} className="w-full block object-contain" style={{ maxHeight: 400 }} autoPlay playsInline muted />
            {recording && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[var(--cs-danger)]/80 px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-[11px] text-white font-bold tracking-widest">REC</span>
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-center mt-5 flex-wrap">
            {!recording ? (
              <button onClick={startRecording} className="btn btn-primary px-6 py-2 text-sm">
                Record
                <div className="btn-icon-circle w-7 h-7 bg-[var(--cs-danger)]">
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </button>
            ) : (
              <button onClick={stopRecording} className="btn btn-primary px-6 py-2 text-sm bg-[var(--cs-danger)] text-white">
                Stop Recording
              </button>
            )}
            <button className="btn btn-secondary px-6 py-2 text-sm" onClick={cancelLive}>Cancel</button>
          </div>
        </div>
      )}

      {/* Video Preview + Trim + Analyze */}
      {videoUrl && (
        <>
          <div className="panel col-span-12 p-6">
            <div className="panel-header">
              <span className="label-bracket">video_feed</span>
              <h2 className="panel-title">Preview</h2>
            </div>

            <video ref={videoRef} src={videoUrl} controls onLoadedMetadata={onVideoLoaded} className="w-full rounded-xl object-contain bg-black" style={{ maxHeight: 400 }} />

            {/* Trim Controls */}
            {duration > 0 && !result && (
              <div className="mt-4">
                {!trimming ? (
                  <button
                    onClick={() => setTrimming(true)}
                    className="btn btn-secondary px-4 py-1.5 text-xs"
                  >
                    <Scissors className="w-3.5 h-3.5 mr-1.5 inline align-middle" />
                    Trim Video
                  </button>
                ) : (
                  <div className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--cs-border)]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="label-bracket">
                        <Scissors className="w-3 h-3 inline align-middle mr-1" />
                        trim_editor
                      </div>
                      <button
                        onClick={() => { setTrimming(false); setTrimStart(0); setTrimEnd(duration); }}
                        className="bg-transparent border-none text-[var(--text-muted)] text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div
                      ref={trackRef}
                      className="relative h-4 bg-[var(--bg-surface)] rounded-lg cursor-pointer select-none"
                    >
                      <div style={{
                        position: 'absolute', top: 0, height: '100%', borderRadius: 8,
                        left: `${(trimStart / duration) * 100}%`,
                        width: `${((trimEnd - trimStart) / duration) * 100}%`,
                        background: 'var(--cs-accent-light)',
                        border: '1px solid var(--cs-accent)',
                      }} />
                      <div
                        style={{ ...handleStyle, left: `calc(${(trimStart / duration) * 100}% - 8px)` }}
                        onMouseDown={(e) => { e.preventDefault(); setDragging("start"); }}
                        onTouchStart={(e) => { e.preventDefault(); setDragging("start"); }}
                      />
                      <div
                        style={{ ...handleStyle, left: `calc(${(trimEnd / duration) * 100}% - 8px)` }}
                        onMouseDown={(e) => { e.preventDefault(); setDragging("end"); }}
                        onTouchStart={(e) => { e.preventDefault(); setDragging("end"); }}
                      />
                    </div>

                    <div className="flex justify-between items-center mt-2.5 flex-wrap gap-2">
                      <div className="flex gap-3 flex-wrap">
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] tracking-widest font-semibold">START </span>
                          <span className="text-[13px] text-[var(--cs-accent)] font-extrabold">{formatTime(trimStart)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] tracking-widest font-semibold">END </span>
                          <span className="text-[13px] text-[var(--cs-accent)] font-extrabold">{formatTime(trimEnd)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] tracking-widest font-semibold">DURATION </span>
                          <span className="text-[13px] text-[var(--text-main)] font-extrabold">{formatTime(trimEnd - trimStart)}</span>
                        </div>
                      </div>
                      <button onClick={previewTrim} className="btn btn-secondary px-3 py-1 text-[11px]">
                        <Play className="w-2.5 h-2.5 mr-1 inline align-middle" />
                        Preview
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Calibration step */}
            {firstFrameUrl && !result && (
              <div className="mt-5 bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--cs-border)]">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-main)]">
                      {corners.length === 4
                        ? "Pitch corners set."
                        : `Tap the 4 pitch corners (${corners.length}/4)`}
                    </p>
                    {corners.length < 4 && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Next: <span className="text-[var(--cs-accent)] font-semibold">{CORNER_LABELS[corners.length]}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {!calibrating && corners.length === 0 && (
                      <button onClick={() => setCalibrating(true)} className="btn btn-secondary px-4 py-1.5 text-xs">
                        Set pitch corners
                      </button>
                    )}
                    {calibrating && corners.length > 0 && (
                      <button onClick={undoLastCorner} className="btn btn-secondary px-3 py-1 text-[11px]">Undo</button>
                    )}
                    {calibrating && corners.length > 0 && (
                      <button onClick={clearCorners} className="btn btn-secondary px-3 py-1 text-[11px]">Clear</button>
                    )}
                    {calibrating && (
                      <button onClick={() => setCalibrating(false)} className="btn btn-secondary px-3 py-1 text-[11px]">Done</button>
                    )}
                    {!calibrating && corners.length === 4 && (
                      <button onClick={() => setCalibrating(true)} className="btn btn-secondary px-3 py-1 text-[11px]">Edit</button>
                    )}
                  </div>
                </div>
                {calibrating && (
                  <div className="rounded-lg overflow-hidden bg-black">
                    <canvas
                      ref={calibCanvasRef}
                      onClick={handleCalibClick}
                      className="w-full h-auto block object-contain cursor-crosshair"
                      style={{ maxHeight: 420 }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-5 flex-wrap">
              {!result && !analyzing && (
                <button onClick={analyzeVideo} className="btn btn-primary py-2 pl-6 pr-2 text-sm flex-1 min-w-[200px]">
                  {trimming ? "Analyze Trimmed Clip" : "Analyze Ball"}
                  <div className="btn-icon-circle w-7 h-7">
                    <Play className="w-3 h-3" />
                  </div>
                </button>
              )}
              <button className="btn btn-secondary px-6 py-2 text-sm" onClick={reset}>
                <RotateCcw className="w-3.5 h-3.5 mr-2 inline" />New Video
              </button>
            </div>
            {analyzing && (
              <div className="mt-4">
                <div className="w-full h-1 bg-[var(--bg-surface)] rounded overflow-hidden">
                  <div className="h-full bg-[var(--cs-accent)] rounded transition-[width] duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] text-center mt-2">
                  Processing frames{trimming ? ` (${formatTime(trimStart)} - ${formatTime(trimEnd)})` : ""}... {progress}%
                </p>
              </div>
            )}
            {error && (
              <div className="mt-4 text-xs text-[var(--cs-accent)] bg-[var(--cs-accent-light)] p-3 rounded-xl">{error}</div>
            )}
          </div>

          {/* Results — three plain-text cards + simple trail thumbnail */}
          {result && (
            <>
              <div className="panel col-span-12 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-6 bg-[var(--cs-accent-light)] rounded-2xl border border-[var(--cs-accent)]/20">
                    <div className="text-5xl font-black text-[var(--cs-accent)]">{Math.round(result.speed)}</div>
                    <div className="text-sm text-[var(--text-muted)] font-semibold mt-1">km/h</div>
                    <div className="text-xs text-[var(--text-muted)] mt-2">Speed</div>
                  </div>
                  <div
                    className="text-center p-6 rounded-2xl border flex items-center justify-center"
                    style={{
                      background: result.hitStumps ? 'rgba(255,42,75,0.06)' : 'rgba(34,197,94,0.06)',
                      borderColor: result.hitStumps ? 'rgba(255,42,75,0.2)' : 'rgba(34,197,94,0.2)',
                    }}
                  >
                    <p className="text-base font-semibold leading-relaxed" style={{ color: result.hitStumps ? 'var(--cs-danger)' : '#22c55e' }}>
                      {result.verdict}
                    </p>
                  </div>
                  <div className="text-center p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--cs-border)] flex items-center justify-center">
                    <p className="text-base text-[var(--text-main)] leading-relaxed">
                      {result.bounceText}
                    </p>
                  </div>
                </div>
              </div>

              {result.trailOverlayPx && result.trailOverlayPx.length >= 2 && firstFrameUrl && (
                <div className="panel col-span-12 p-6">
                  <p className="text-sm font-semibold text-[var(--text-main)] mb-3">Ball trail</p>
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <canvas
                      ref={trajectoryCanvasRef}
                      className="w-full h-auto block object-contain"
                      style={{ maxHeight: 480 }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <input ref={fileInputRef} type="file" accept="video/mp4,video/mov,video/avi,video/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}
