"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Play, RotateCcw, Scissors, Video, Camera } from "lucide-react";

interface TrackingResult {
  speed: number;
  hitStumps: boolean;
  verdict: string;          // "Wicket hitting" | "Wicket missing"
  lengthLabel: string;      // "Yorker" | "Full Length" | "Good Length" | "Short Ball" | ""
  lengthDesc: string;       // small subtitle, e.g. "4-7m from stumps"
  shotAdvice: string;       // "Block or flick" | "Drive" | "Defend or leave" | "Pull or duck" | ""
  shotDesc: string;         // small subtitle, e.g. "Soft hands, straight bat"
  errorNote?: string;
}

// Client-side fallbacks so users get useful copy even if the ML service is
// running an older response shape. Mirrors LENGTH_DESC / SHOT_ADVICE / SHOT_DESC
// on the server.
const LENGTH_DESC: Record<string, string> = {
  Yorker: "At the crease",
  "Full Length": "2-4m from stumps",
  "Good Length": "4-7m from stumps",
  "Short Ball": "7m+ from stumps",
};
const SHOT_ADVICE: Record<string, string> = {
  Yorker: "Block or flick",
  "Full Length": "Drive",
  "Good Length": "Defend or leave",
  "Short Ball": "Pull or duck",
};
const SHOT_DESC: Record<string, string> = {
  Yorker: "Jam down quickly, soft hands",
  "Full Length": "Front foot, swing through line",
  "Good Length": "Soft hands, straight bat",
  "Short Ball": "Watch ball, decide early",
};

// If the ML service is on the older shape (no length_label, only bounce_text),
// recover the length from the bounce sentence so users still see something.
function lengthFromBounceText(s: unknown): string {
  if (typeof s !== "string") return "";
  const t = s.toLowerCase();
  if (t.includes("yorker")) return "Yorker";
  if (t.includes("full length")) return "Full Length";
  if (t.includes("good length")) return "Good Length";
  if (t.includes("short")) return "Short Ball";
  return "";
}

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

  // Trim state
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimming, setTrimming] = useState(false);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Anchor the result section so we can scroll into it on mobile after analyze
  const resultAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result || !resultAnchorRef.current) return;
    const id = window.setTimeout(() => {
      resultAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(id);
  }, [result]);

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

  function pickRecorderMimeType(): string {
    // Try MP4 first (iOS Safari only supports MP4), then WebM variants.
    const candidates = [
      "video/mp4;codecs=h264",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    if (typeof MediaRecorder === "undefined") return "";
    for (const t of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(t)) return t;
      } catch {
        /* some browsers throw on unknown types */
      }
    }
    return "";
  }

  function startRecording() {
    if (!liveStream) return;
    chunksRef.current = [];
    const mimeType = pickRecorderMimeType();
    let mr: MediaRecorder;
    try {
      mr = mimeType
        ? new MediaRecorder(liveStream, { mimeType })
        : new MediaRecorder(liveStream);
    } catch (e) {
      setError("Recording isn't supported on this device. Try uploading a video instead.");
      return;
    }
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blobType = mr.mimeType || mimeType || "video/mp4";
      const blob = new Blob(chunksRef.current, { type: blobType });
      videoBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
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
      const fileFromInput = fileInputRef.current?.files?.[0];
      const videoData: Blob | File | null = fileFromInput || videoBlobRef.current;

      if (videoData) {
        const formData = new FormData();
        const isMp4 = (videoData as Blob).type?.includes("mp4");
        const filename = fileFromInput?.name || (isMp4 ? "recording.mp4" : "recording.webm");
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
            // Resolve length: prefer the new field, otherwise parse the legacy
            // bounce_text (older Modal deploys still emit that field).
            const lenLabel: string =
              data.length_label || lengthFromBounceText(data.bounce_text);
            const shotAdvice: string =
              data.shot_advice || SHOT_ADVICE[lenLabel] || "";
            const lengthDesc: string =
              data.length_desc || LENGTH_DESC[lenLabel] || "";
            const shotDesc: string =
              data.shot_desc || SHOT_DESC[lenLabel] || "";
            setResult({
              speed: data.speed_kmh || 0,
              hitStumps: !!data.hit_stumps,
              verdict: data.verdict || (data.hit_stumps ? "Wicket hitting" : "Wicket missing"),
              lengthLabel: lenLabel,
              lengthDesc,
              shotAdvice,
              shotDesc,
              errorNote: data.error || undefined,
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
        verdict: "Wicket missing",
        lengthLabel: "Good Length",
        lengthDesc: "4-7m from stumps",
        shotAdvice: "Defend or leave",
        shotDesc: "Soft hands, straight bat",
      });
      setError("ML service not available - showing demo results.");
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
          Upload or record a cricket video - see ball speed, where it pitched, and whether it would hit the stumps
        </p>
      </div>

      {/* Upload / Live Capture Options */}
      {!videoUrl && !liveStream ? (
        <>
          <div className="panel col-span-12 p-12 cursor-pointer text-center border-dashed" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-14 h-14 text-[var(--cs-accent)] mx-auto mb-4" />
            <h3 className="text-[22px] mb-2">Upload Video</h3>
            <p className="text-[var(--text-muted)] text-sm">MP4, MOV, or AVI - max 50MB</p>
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

            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              muted
              preload="metadata"
              onLoadedMetadata={onVideoLoaded}
              onError={() => setError("This video file can't be previewed in the browser, but you can still tap Analyze.")}
              className="w-full rounded-xl object-contain bg-black"
              style={{ maxHeight: 400 }}
            />

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

          {/* Results - four terse cards: Speed | Wicket | Length | Shot */}
          {result && (
            <>
              <div ref={resultAnchorRef} className="col-span-12" aria-hidden />
              <div className="panel col-span-12 p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Speed */}
                  <div className="text-center p-6 bg-[var(--cs-accent-light)] rounded-2xl border border-[var(--cs-accent)]/20">
                    <div className="text-4xl md:text-5xl font-black text-[var(--cs-accent)]">{Math.round(result.speed)}</div>
                    <div className="text-xs text-[var(--text-muted)] font-semibold mt-1 tracking-wider">km/h</div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-2 uppercase tracking-wider">Speed</div>
                  </div>
                  {/* Wicket hit/miss */}
                  <div
                    className="text-center p-6 rounded-2xl border flex flex-col items-center justify-center"
                    style={{
                      background: result.hitStumps ? 'rgba(255,42,75,0.08)' : 'rgba(34,197,94,0.08)',
                      borderColor: result.hitStumps ? 'rgba(255,42,75,0.25)' : 'rgba(34,197,94,0.25)',
                    }}
                  >
                    <div className="text-xl md:text-2xl font-extrabold" style={{ color: result.hitStumps ? 'var(--cs-danger)' : '#22c55e' }}>
                      {result.hitStumps ? "Hitting" : "Missing"}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-2 uppercase tracking-wider">Wicket</div>
                  </div>
                  {/* Length */}
                  <div className="text-center p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--cs-border)] flex flex-col items-center justify-center">
                    <div className="text-xl md:text-2xl font-extrabold text-[var(--text-main)]">
                      {result.lengthLabel || "-"}
                    </div>
                    {result.lengthDesc && (
                      <div className="text-[11px] text-[var(--text-muted)] mt-1.5">
                        {result.lengthDesc}
                      </div>
                    )}
                    <div className="text-[11px] text-[var(--text-muted)] mt-2 uppercase tracking-wider">Length</div>
                  </div>
                  {/* Shot suggestion */}
                  <div className="text-center p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--cs-border)] flex flex-col items-center justify-center">
                    <div className="text-base md:text-xl font-extrabold text-[#8b5cf6]">
                      {result.shotAdvice || "-"}
                    </div>
                    {result.shotDesc && (
                      <div className="text-[11px] text-[var(--text-muted)] mt-1.5 px-2">
                        {result.shotDesc}
                      </div>
                    )}
                    <div className="text-[11px] text-[var(--text-muted)] mt-2 uppercase tracking-wider">Shot</div>
                  </div>
                </div>
                {result.errorNote && (
                  <p className="text-xs text-[var(--text-muted)] mt-4 text-center">{result.errorNote}</p>
                )}
              </div>
            </>
          )}
        </>
      )}

      <input ref={fileInputRef} type="file" accept="video/mp4,video/mov,video/avi,video/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}
