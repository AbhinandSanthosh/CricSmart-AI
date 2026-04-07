"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Play, RotateCcw, Zap, Target, ArrowDown, Scissors, Video, Camera } from "lucide-react";

interface TrackingResult {
  speed: number;
  shotType: string;
  bouncePoint: string;
  hitStumps: boolean;
  confidence: number;
  outputVideoUrl?: string;
  stumpsDetected?: boolean;
  ballDetections?: number;
  stumpDetections?: number;
  deliveryPoints?: number;
  releasePoint?: [number, number];
  pitchPoint?: [number, number];
  impactPoint?: [number, number];
  bounceIndex?: number;
  trajectory?: [number, number][];
  videoWidth?: number;
  videoHeight?: number;
  stumpCenterX?: number;
  groundY?: number;
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${sec.toString().padStart(2, "0")}.${ms}`;
}

function getShotAdvice(shotType: string, speed: number, hitStumps: boolean): string {
  const paceLabel = speed > 140 ? "express pace" : speed > 130 ? "good pace" : speed > 120 ? "medium-fast" : "medium pace";

  if (shotType === "Yorker") {
    return `This is a ${paceLabel} yorker — a delivery aimed at the batter's feet right at the crease. ${hitStumps ? "It was on target and would have hit the stumps!" : "It missed the stumps."} Against a yorker, the best response is a firm defensive block with the bat angled down, or a well-timed flick through mid-wicket. Keep your bat face closed and jam down quickly.`;
  }
  if (shotType === "Full Length") {
    return `A ${paceLabel} full-length delivery — pitched up in the driving zone, 2-4 meters from the crease. ${hitStumps ? "This one was heading for the stumps." : "It was angled away from the stumps."} This is a scoring opportunity — you can play a front-foot drive through the covers or straight down the ground. Get your front foot to the pitch of the ball and swing through the line.`;
  }
  if (shotType === "Good Length") {
    return `A ${paceLabel} delivery on a good length — the hardest to score off. Pitched 4-7 meters from the crease, it makes the batter unsure whether to play front foot or back foot. ${hitStumps ? "It was on the stumps — you need to play at this." : "It was outside the stumps — you could leave this one."} Best approach: play with a straight bat, soft hands, and let the ball come to you.`;
  }
  if (shotType === "Short Ball") {
    return `A ${paceLabel} short ball — bounced 7+ meters from the crease, giving it time to rise towards your upper body. ${hitStumps ? "Despite being short, it was angled into the stumps." : "It was rising over the stumps."} You can play a pull shot to the leg side, a cut shot if wide, or duck under it if aimed at your head. Watch the ball all the way and decide early.`;
  }
  return `Detected a ${paceLabel} delivery at ${speed.toFixed(1)} km/h. ${hitStumps ? "The ball was on target for the stumps." : "The ball missed the stumps."}`;
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

  // Draw ball trajectory on a canvas with the video's first frame as background
  useEffect(() => {
    if (!result?.trajectory || result.trajectory.length < 2 || !videoUrl) return;
    const canvas = trajectoryCanvasRef.current;
    if (!canvas) return;

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = videoUrl;

    const drawFrame = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;

      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw the first frame as background
      ctx.drawImage(video, 0, 0, vw, vh);

      const trail = result.trajectory!;
      const bounceIdx = result.bounceIndex ?? Math.floor(trail.length / 2);

      // Dim the background slightly to make the trajectory pop
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, vw, vh);
      ctx.drawImage(video, 0, 0, vw, vh);
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(0, 0, vw, vh);

      // Draw pitch reference line (ground)
      if (result.groundY) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, result.groundY);
        ctx.lineTo(vw, result.groundY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw trajectory — two segments:
      // 1) Release to bounce (cyan, pre-pitch)
      // 2) Bounce to impact (yellow/red, post-pitch)
      const scale = Math.max(vw, vh) / 800;

      // Pre-bounce segment (cyan)
      if (bounceIdx > 0) {
        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 5 * scale;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "rgba(0, 212, 255, 0.8)";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(trail[0][0], trail[0][1]);
        for (let i = 1; i <= bounceIdx; i++) {
          ctx.lineTo(trail[i][0], trail[i][1]);
        }
        ctx.stroke();
      }

      // Post-bounce segment (red/yellow)
      if (bounceIdx < trail.length - 1) {
        ctx.strokeStyle = result.hitStumps ? "#ff2a4b" : "#facc15";
        ctx.lineWidth = 5 * scale;
        ctx.shadowColor = result.hitStumps ? "rgba(255, 42, 75, 0.8)" : "rgba(250, 204, 21, 0.8)";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(trail[bounceIdx][0], trail[bounceIdx][1]);
        for (let i = bounceIdx + 1; i < trail.length; i++) {
          ctx.lineTo(trail[i][0], trail[i][1]);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Draw ball positions as small dots along the path
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      for (const [x, y] of trail) {
        ctx.beginPath();
        ctx.arc(x, y, 3 * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // Helper to draw a labeled key point
      const labelPoint = (x: number, y: number, label: string, color: string) => {
        // Outer glow ring
        ctx.strokeStyle = color;
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.arc(x, y, 14 * scale, 0, Math.PI * 2);
        ctx.stroke();
        // Solid center
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
        // Label background
        ctx.font = `bold ${14 * scale}px sans-serif`;
        const textW = ctx.measureText(label).width;
        const padding = 6 * scale;
        const labelX = x + 18 * scale;
        const labelY = y - 10 * scale;
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(labelX, labelY - 14 * scale, textW + padding * 2, 20 * scale);
        // Label text
        ctx.fillStyle = color;
        ctx.fillText(label, labelX + padding, labelY);
      };

      // Release point (start)
      labelPoint(trail[0][0], trail[0][1], "RELEASE", "#00d4ff");
      // Pitch point (bounce)
      labelPoint(trail[bounceIdx][0], trail[bounceIdx][1], "PITCH", "#ffa500");
      // Impact point (end)
      labelPoint(
        trail[trail.length - 1][0],
        trail[trail.length - 1][1],
        "IMPACT",
        result.hitStumps ? "#ff2a4b" : "#22c55e"
      );

      // Stump indicator line if detected
      if (result.stumpCenterX && result.groundY) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 2 * scale;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(result.stumpCenterX, result.groundY - 60 * scale);
        ctx.lineTo(result.stumpCenterX, result.groundY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    const onLoaded = () => {
      // Seek to first frame
      video.currentTime = 0.01;
    };
    const onSeeked = () => {
      drawFrame();
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("seeked", onSeeked);
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("seeked", onSeeked);
    };
  }, [result, videoUrl]);

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
    setAnalyzing(true);
    setError("");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 90));
    }, 300);

    try {
      // Get video data from either file input or live capture blob
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
        try {
          const res = await fetch(ML_SERVICE_URL, { method: "POST", body: formData, signal: AbortSignal.timeout(120000) });
          if (res.ok) {
            const data = await res.json();
            clearInterval(interval);
            setProgress(100);
            setResult({
              speed: data.speed_kmh || 0,
              shotType: data.shot_type || "Unknown",
              bouncePoint: data.bounce_point || "Not detected",
              hitStumps: data.hit_stumps || false,
              confidence: data.confidence || 0,
              outputVideoUrl: data.output_video_url || undefined,
              stumpsDetected: data.stumps_detected || false,
              ballDetections: data.ball_detections || 0,
              stumpDetections: data.stump_detections || 0,
              deliveryPoints: data.delivery_points || 0,
              releasePoint: data.release_point || undefined,
              pitchPoint: data.pitch_point || undefined,
              impactPoint: data.impact_point || undefined,
              bounceIndex: data.bounce_index,
              trajectory: data.trajectory || undefined,
              videoWidth: data.video_width || undefined,
              videoHeight: data.video_height || undefined,
              stumpCenterX: data.stump_center_x || undefined,
              groundY: data.ground_y || undefined,
            });
            setAnalyzing(false);
            return;
          }
        } catch { /* ML service not running */ }
      }

      clearInterval(interval);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 500));
      setResult({ speed: 128.5, shotType: "Good Length", bouncePoint: "4th stump line, 6m from stumps", hitStumps: false, confidence: 85 });
      setError("ML service not available — showing demo results. Deploy the ML service or set NEXT_PUBLIC_ML_SERVICE_URL for real analysis.");
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
        <h1 className="hero-title" style={{ fontSize: 48 }}>
          BALL TRACKING
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 8 }}>
          Upload or record cricket video — track ball trajectory, speed, bounce point &amp; shot analysis
        </p>
      </div>

      {/* Upload / Live Capture Options */}
      {!videoUrl && !liveStream ? (
        <>
          <div className="panel" style={{ gridColumn: 'span 12', padding: 48, cursor: 'pointer', textAlign: 'center', borderStyle: 'dashed' }} onClick={() => fileInputRef.current?.click()}>
            <Upload style={{ width: 56, height: 56, color: 'var(--cs-accent)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 22, marginBottom: 8 }}>UPLOAD VIDEO</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>MP4, MOV, or AVI — max 50MB</p>
          </div>
          <div className="panel" style={{ gridColumn: 'span 12', padding: 48, cursor: 'pointer', textAlign: 'center' }} onClick={startLiveCapture}>
            <Video style={{ width: 56, height: 56, color: '#8b5cf6', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 22, marginBottom: 8 }}>LIVE CAPTURE</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Record a bowling delivery using your camera</p>
          </div>
        </>
      ) : null}

      {/* Live Camera View */}
      {liveStream && !videoUrl && (
        <div className="panel" style={{ gridColumn: 'span 12', padding: 24 }}>
          <div className="panel-header">
            <span className="label-bracket">
              {recording && <span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--cs-danger)', borderRadius: '50%', marginRight: 6, animation: 'pulse 1.5s infinite' }} />}
              {recording ? 'recording' : 'live_camera'}
            </span>
            <h2 className="panel-title">{recording ? 'RECORDING...' : 'POSITION CAMERA'}</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            {recording
              ? "Recording the delivery. Press Stop when the ball reaches the batter."
              : "Position your camera side-on to the pitch, capturing the full bowling and batting crease. Press Record when the bowler is ready."}
          </p>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
            <video ref={liveVideoRef} style={{ width: '100%', maxHeight: 400, display: 'block', objectFit: 'contain' }} autoPlay playsInline muted />
            {recording && (
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,42,75,0.8)', padding: '4px 12px', borderRadius: 20 }}>
                <span style={{ width: 8, height: 8, background: '#fff', borderRadius: '50%', animation: 'pulse 1s infinite' }} />
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700, letterSpacing: '0.1em' }}>REC</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
            {!recording ? (
              <button onClick={startRecording} className="btn btn-primary" style={{ padding: '8px 8px 8px 24px', fontSize: 14 }}>
                Record
                <div className="btn-icon-circle" style={{ width: 28, height: 28, background: 'var(--cs-danger)' }}>
                  <Camera style={{ width: 14, height: 14 }} />
                </div>
              </button>
            ) : (
              <button onClick={stopRecording} className="btn btn-primary" style={{ padding: '8px 24px', fontSize: 14, background: 'var(--cs-danger)', color: '#fff' }}>
                Stop Recording
              </button>
            )}
            <button className="btn btn-secondary" style={{ padding: '8px 24px', fontSize: 14 }} onClick={cancelLive}>Cancel</button>
          </div>
        </div>
      )}

      {/* Video Preview + Trim + Analyze */}
      {videoUrl && (
        <>
          <div className="panel" style={{ gridColumn: 'span 12', padding: 24 }}>
            <div className="panel-header">
              <span className="label-bracket">video_feed</span>
              <h2 className="panel-title">PREVIEW</h2>
            </div>

            <video ref={videoRef} src={videoUrl} controls onLoadedMetadata={onVideoLoaded} style={{ width: '100%', maxHeight: 400, borderRadius: 12, objectFit: 'contain', background: '#000', display: result?.outputVideoUrl ? 'none' : 'block' }} />

            {/* Trim Controls */}
            {duration > 0 && !result && (
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

                    <div
                      ref={trackRef}
                      style={{ position: 'relative', height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 8, cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{
                        position: 'absolute', top: 0, height: '100%', borderRadius: 8,
                        left: `${(trimStart / duration) * 100}%`,
                        width: `${((trimEnd - trimStart) / duration) * 100}%`,
                        background: 'rgba(0,212,255,0.25)',
                        border: '1px solid rgba(0,212,255,0.4)',
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
                      <button onClick={previewTrim} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 11 }}>
                        <Play style={{ width: 10, height: 10, marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />
                        Preview
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              {!result && !analyzing && (
                <button onClick={analyzeVideo} className="btn btn-primary" style={{ padding: '8px 8px 8px 24px', fontSize: 14, flex: 1, minWidth: 200 }}>
                  {trimming ? "Analyze Trimmed Clip" : "Analyze Ball"}
                  <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                    <Play style={{ width: 12, height: 12 }} />
                  </div>
                </button>
              )}
              <button className="btn btn-secondary" style={{ padding: '8px 24px', fontSize: 14 }} onClick={reset}>
                <RotateCcw style={{ width: 14, height: 14, marginRight: 8, display: 'inline' }} />New Video
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

          {/* Results */}
          {result && (
            <>
              {/* DRS-Style Ball Tracking Video */}
              {result.outputVideoUrl && (
                <div className="panel" style={{ gridColumn: 'span 12', padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px 12px' }}>
                    <div className="panel-header">
                      <span className="label-bracket" style={{ color: '#22c55e' }}>drs_ball_tracking</span>
                      <h2 className="panel-title">BALL TRAJECTORY</h2>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                      DRS-style replay showing ball path, bounce point, predicted trajectory & stump verdict
                    </p>
                  </div>
                  <video
                    src={result.outputVideoUrl}
                    controls
                    autoPlay
                    style={{ width: '100%', maxHeight: 500, objectFit: 'contain', background: '#000', display: 'block' }}
                  />
                </div>
              )}

              {/* Ball Trajectory Visualization — canvas overlay on first frame */}
              {result.trajectory && result.trajectory.length >= 2 && (
                <div className="panel" style={{ gridColumn: 'span 12', padding: 24 }}>
                  <div className="panel-header">
                    <span className="label-bracket" style={{ color: '#00d4ff' }}>ball_trajectory</span>
                    <h2 className="panel-title">TRAJECTORY MAP</h2>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Traced ball path from release to impact — {result.trajectory.length} tracking points
                  </p>
                  <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                    <canvas
                      ref={trajectoryCanvasRef}
                      style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 600, objectFit: 'contain' }}
                    />
                  </div>
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 20, height: 3, background: '#00d4ff', borderRadius: 2 }} />
                      Pre-bounce path
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 20, height: 3, background: result.hitStumps ? '#ff2a4b' : '#facc15', borderRadius: 2 }} />
                      Post-bounce path
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#00d4ff' }} />
                      Release
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffa500' }} />
                      Pitch (bounce)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: result.hitStumps ? '#ff2a4b' : '#22c55e' }} />
                      Impact
                    </div>
                  </div>
                </div>
              )}

              {/* Speed + Shot Type Summary */}
              <div className="panel" style={{ gridColumn: 'span 12' }}>
                <div className="panel-header">
                  <span className="label-bracket"><Zap style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />analysis_result</span>
                  <h2 className="panel-title">BALL ANALYSIS</h2>
                </div>

                {/* Top stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 24 }}>
                  <div style={{ textAlign: 'center', padding: 20, background: 'rgba(0,212,255,0.05)', borderRadius: 14, border: '1px solid rgba(0,212,255,0.15)' }}>
                    <div className="stat-val" style={{ fontSize: 48, color: 'var(--cs-accent)' }}>{result.speed.toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', marginTop: 4 }}>KM/H</div>
                    <div style={{ fontSize: 12, color: 'var(--cs-accent)', marginTop: 4, fontWeight: 600 }}>
                      {result.speed > 140 ? "Express Pace" : result.speed > 130 ? "Good Pace" : result.speed > 120 ? "Medium-Fast" : "Medium Pace"}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 20, background: 'rgba(139,92,246,0.05)', borderRadius: 14, border: '1px solid rgba(139,92,246,0.15)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 24, color: '#8b5cf6', marginTop: 8 }}>{result.shotType.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', marginTop: 8 }}>DELIVERY TYPE</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: 20, background: result.hitStumps ? 'rgba(255,42,75,0.05)' : 'rgba(34,197,94,0.05)', borderRadius: 14, border: `1px solid ${result.hitStumps ? 'rgba(255,42,75,0.15)' : 'rgba(34,197,94,0.15)'}` }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 28, color: result.hitStumps ? 'var(--cs-danger)' : '#22c55e', marginTop: 4 }}>
                      {result.hitStumps ? "YES" : "NO"}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', marginTop: 8 }}>HITTING STUMPS</div>
                  </div>
                </div>

                {/* Shot advice */}
                <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid var(--cs-border)', marginBottom: 16 }}>
                  <div className="label-bracket" style={{ marginBottom: 10 }}>
                    <Target style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    shot_analysis
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.7 }}>
                    {getShotAdvice(result.shotType, result.speed, result.hitStumps)}
                  </p>
                </div>

                {/* Key Points: Release, Pitch, Impact */}
                <div style={{ padding: 20, background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid var(--cs-border)', marginBottom: 16 }}>
                  <div className="label-bracket" style={{ marginBottom: 14 }}>key_points</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div style={{ textAlign: 'center', padding: 12, background: 'rgba(0,255,255,0.05)', borderRadius: 10, border: '1px solid rgba(0,255,255,0.15)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid #00ffff', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#00ffff', letterSpacing: '0.08em' }}>RELEASE</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Bowler&apos;s hand</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, background: 'rgba(255,165,0,0.05)', borderRadius: 10, border: '1px solid rgba(255,165,0,0.15)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffa500', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#ffa500', letterSpacing: '0.08em' }}>PITCH</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{result.bouncePoint}</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 12, background: result.hitStumps ? 'rgba(255,42,75,0.05)' : 'rgba(34,197,94,0.05)', borderRadius: 10, border: `1px solid ${result.hitStumps ? 'rgba(255,42,75,0.15)' : 'rgba(34,197,94,0.15)'}` }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: result.hitStumps ? '#ff2a4b' : '#22c55e', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: result.hitStumps ? '#ff2a4b' : '#22c55e', letterSpacing: '0.08em' }}>IMPACT</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Batter&apos;s end</div>
                    </div>
                  </div>
                </div>

                {/* Detection details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {result.stumpsDetected !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cs-border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Stumps Detected</span>
                      <span style={{ fontSize: 13, color: result.stumpsDetected ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>{result.stumpsDetected ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {result.deliveryPoints ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cs-border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tracking Points</span>
                      <span style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 600 }}>{result.deliveryPoints} frames</span>
                    </div>
                  ) : null}
                  {trimming && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cs-border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Analyzed Clip</span>
                      <span style={{ fontSize: 13, color: 'var(--text-main)' }}>{formatTime(trimStart)} - {formatTime(trimEnd)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cs-border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Confidence</span>
                    <span style={{ fontSize: 13, color: result.confidence > 70 ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>{result.confidence}%</span>
                  </div>
                </div>
              </div>

              {/* Length Guide */}
              <div className="panel" style={{ gridColumn: 'span 12' }}>
                <div className="panel-header">
                  <span className="label-bracket"><ArrowDown style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />length_guide</span>
                  <h2 className="panel-title">PITCH MAP</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                  {[
                    { type: "Yorker", range: "At the crease", advice: "Block or flick" },
                    { type: "Full Length", range: "2-4m from crease", advice: "Drive through the line" },
                    { type: "Good Length", range: "4-7m from crease", advice: "Defend or leave" },
                    { type: "Short Ball", range: "7m+ from crease", advice: "Pull, cut, or duck" },
                  ].map((l) => (
                    <div key={l.type} style={{ padding: '12px 16px', borderRadius: 12, background: result.shotType === l.type ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.02)', border: result.shotType === l.type ? '1px solid rgba(0,212,255,0.25)' : '1px solid var(--cs-border)' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: result.shotType === l.type ? 'var(--cs-accent)' : 'var(--text-main)', marginBottom: 4 }}>{l.type}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.range}</div>
                      <div style={{ fontSize: 11, color: result.shotType === l.type ? 'var(--cs-accent)' : 'var(--text-muted)', marginTop: 4, fontWeight: 600 }}>{l.advice}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <input ref={fileInputRef} type="file" accept="video/mp4,video/mov,video/avi,video/*" style={{ display: 'none' }} onChange={handleUpload} />
    </div>
  );
}
