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
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 py-5">
        <p className="label-bracket mb-3">Ball Tracking</p>
        <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">
          Ball Tracking
        </h1>
        <p className="text-[var(--text-muted)] text-base mt-2">
          Upload or record cricket video — track ball trajectory, speed, bounce point &amp; shot analysis
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

            <video ref={videoRef} src={videoUrl} controls onLoadedMetadata={onVideoLoaded} className="w-full rounded-xl object-contain bg-black" style={{ maxHeight: 400, display: result?.outputVideoUrl ? 'none' : 'block' }} />

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

          {/* Results */}
          {result && (
            <>
              {/* DRS-Style Ball Tracking Video */}
              {result.outputVideoUrl && (
                <div className="panel col-span-12 p-0 overflow-hidden">
                  <div className="px-6 pt-5 pb-3">
                    <div className="panel-header">
                      <span className="label-bracket text-[#22c55e]">drs_ball_tracking</span>
                      <h2 className="panel-title">Ball Trajectory</h2>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-3">
                      DRS-style replay showing ball path, bounce point, predicted trajectory & stump verdict
                    </p>
                  </div>
                  <video
                    src={result.outputVideoUrl}
                    controls
                    autoPlay
                    className="w-full block object-contain bg-black"
                    style={{ maxHeight: 500 }}
                  />
                </div>
              )}

              {/* Ball Trajectory Visualization — canvas overlay on first frame */}
              {result.trajectory && result.trajectory.length >= 2 && (
                <div className="panel col-span-12 p-6">
                  <div className="panel-header">
                    <span className="label-bracket text-[#00d4ff]">ball_trajectory</span>
                    <h2 className="panel-title">Trajectory Map</h2>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mb-4">
                    Traced ball path from release to impact — {result.trajectory.length} tracking points
                  </p>
                  <div className="relative rounded-xl overflow-hidden bg-black">
                    <canvas
                      ref={trajectoryCanvasRef}
                      className="w-full h-auto block object-contain"
                      style={{ maxHeight: 600 }}
                    />
                  </div>
                  {/* Legend */}
                  <div className="flex gap-4 mt-3.5 flex-wrap text-[11px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-[3px] bg-[#00d4ff] rounded-sm" />
                      Pre-bounce path
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-[3px] rounded-sm" style={{ background: result.hitStumps ? '#ff2a4b' : '#facc15' }} />
                      Post-bounce path
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00d4ff]" />
                      Release
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ffa500]" />
                      Pitch (bounce)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: result.hitStumps ? '#ff2a4b' : '#22c55e' }} />
                      Impact
                    </div>
                  </div>
                </div>
              )}

              {/* Speed + Shot Type Summary */}
              <div className="panel col-span-12">
                <div className="panel-header">
                  <span className="label-bracket"><Zap className="w-3 h-3 inline align-middle mr-1" />analysis_result</span>
                  <h2 className="panel-title">Ball Analysis</h2>
                </div>

                {/* Top stats row */}
                <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-6">
                  <div className="text-center p-5 bg-[var(--cs-accent-light)] rounded-[14px] border border-[var(--cs-accent)]/15">
                    <div className="stat-val text-5xl text-[var(--cs-accent)]">{result.speed.toFixed(1)}</div>
                    <div className="text-[11px] text-[var(--text-muted)] font-semibold tracking-wider mt-1">KM/H</div>
                    <div className="text-xs text-[var(--cs-accent)] mt-1 font-semibold">
                      {result.speed > 140 ? "Express Pace" : result.speed > 130 ? "Good Pace" : result.speed > 120 ? "Medium-Fast" : "Medium Pace"}
                    </div>
                  </div>
                  <div className="text-center p-5 bg-[rgba(139,92,246,0.05)] rounded-[14px] border border-[rgba(139,92,246,0.15)]">
                    <div className="font-black text-2xl text-[#8b5cf6] mt-2">{result.shotType}</div>
                    <div className="text-[11px] text-[var(--text-muted)] font-semibold tracking-wider mt-2">Delivery Type</div>
                  </div>
                  <div className="text-center p-5 rounded-[14px] border" style={{ background: result.hitStumps ? 'rgba(255,42,75,0.05)' : 'rgba(34,197,94,0.05)', borderColor: result.hitStumps ? 'rgba(255,42,75,0.15)' : 'rgba(34,197,94,0.15)' }}>
                    <div className="font-black text-[28px] mt-1" style={{ color: result.hitStumps ? 'var(--cs-danger)' : '#22c55e' }}>
                      {result.hitStumps ? "YES" : "NO"}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-semibold tracking-wider mt-2">Hitting Stumps</div>
                  </div>
                </div>

                {/* Shot advice */}
                <div className="p-5 bg-[var(--bg-surface)] rounded-[14px] border border-[var(--cs-border)] mb-4">
                  <div className="label-bracket mb-2.5">
                    <Target className="w-3 h-3 inline align-middle mr-1" />
                    shot_analysis
                  </div>
                  <p className="text-sm text-[var(--text-main)] leading-7">
                    {getShotAdvice(result.shotType, result.speed, result.hitStumps)}
                  </p>
                </div>

                {/* Key Points: Release, Pitch, Impact */}
                <div className="p-5 bg-[var(--bg-surface)] rounded-[14px] border border-[var(--cs-border)] mb-4">
                  <div className="label-bracket mb-3.5">key_points</div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-[rgba(0,255,255,0.05)] rounded-[10px] border border-[rgba(0,255,255,0.15)]">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-[#00ffff] mx-auto mb-2" />
                      <div className="text-xs font-bold text-[#00ffff] tracking-wider">Release</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1">Bowler&apos;s hand</div>
                    </div>
                    <div className="text-center p-3 bg-[rgba(255,165,0,0.05)] rounded-[10px] border border-[rgba(255,165,0,0.15)]">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ffa500] mx-auto mb-2" />
                      <div className="text-xs font-bold text-[#ffa500] tracking-wider">Pitch</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1">{result.bouncePoint}</div>
                    </div>
                    <div className="text-center p-3 rounded-[10px] border" style={{ background: result.hitStumps ? 'rgba(255,42,75,0.05)' : 'rgba(34,197,94,0.05)', borderColor: result.hitStumps ? 'rgba(255,42,75,0.15)' : 'rgba(34,197,94,0.15)' }}>
                      <div className="w-2.5 h-2.5 rounded-full mx-auto mb-2" style={{ background: result.hitStumps ? '#ff2a4b' : '#22c55e' }} />
                      <div className="text-xs font-bold tracking-wider" style={{ color: result.hitStumps ? '#ff2a4b' : '#22c55e' }}>Impact</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1">Batter&apos;s end</div>
                    </div>
                  </div>
                </div>

                {/* Detection details */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                  {result.stumpsDetected !== undefined && (
                    <div className="flex justify-between p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--cs-border)]">
                      <span className="text-[13px] text-[var(--text-muted)]">Stumps Detected</span>
                      <span className="text-[13px] font-semibold" style={{ color: result.stumpsDetected ? '#22c55e' : '#f59e0b' }}>{result.stumpsDetected ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {result.deliveryPoints ? (
                    <div className="flex justify-between p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--cs-border)]">
                      <span className="text-[13px] text-[var(--text-muted)]">Tracking Points</span>
                      <span className="text-[13px] text-[var(--text-main)] font-semibold">{result.deliveryPoints} frames</span>
                    </div>
                  ) : null}
                  {trimming && (
                    <div className="flex justify-between p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--cs-border)]">
                      <span className="text-[13px] text-[var(--text-muted)]">Analyzed Clip</span>
                      <span className="text-[13px] text-[var(--text-main)]">{formatTime(trimStart)} - {formatTime(trimEnd)}</span>
                    </div>
                  )}
                  <div className="flex justify-between p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--cs-border)]">
                    <span className="text-[13px] text-[var(--text-muted)]">Confidence</span>
                    <span className="text-[13px] font-semibold" style={{ color: result.confidence > 70 ? '#22c55e' : '#f59e0b' }}>{result.confidence}%</span>
                  </div>
                </div>
              </div>

              {/* Length Guide */}
              <div className="panel col-span-12">
                <div className="panel-header">
                  <span className="label-bracket"><ArrowDown className="w-3 h-3 inline align-middle mr-1" />length_guide</span>
                  <h2 className="panel-title">Pitch Map</h2>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                  {[
                    { type: "Yorker", range: "At the crease", advice: "Block or flick" },
                    { type: "Full Length", range: "2-4m from crease", advice: "Drive through the line" },
                    { type: "Good Length", range: "4-7m from crease", advice: "Defend or leave" },
                    { type: "Short Ball", range: "7m+ from crease", advice: "Pull, cut, or duck" },
                  ].map((l) => (
                    <div key={l.type} className="px-4 py-3 rounded-xl border" style={{ background: result.shotType === l.type ? 'var(--cs-accent-light)' : 'var(--bg-surface)', borderColor: result.shotType === l.type ? 'var(--cs-accent)' : 'var(--cs-border)' }}>
                      <div className="text-sm font-bold mb-1" style={{ color: result.shotType === l.type ? 'var(--cs-accent)' : 'var(--text-main)' }}>{l.type}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{l.range}</div>
                      <div className="text-[11px] mt-1 font-semibold" style={{ color: result.shotType === l.type ? 'var(--cs-accent)' : 'var(--text-muted)' }}>{l.advice}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      <input ref={fileInputRef} type="file" accept="video/mp4,video/mov,video/avi,video/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}
