"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Camera, RotateCcw, CheckCircle, AlertTriangle, XCircle, Zap } from "lucide-react";
import { analyzeStance, selectBatsman, CONNECTION_GROUPS, KEY_JOINTS, type AnalysisResult, type Landmark } from "@/lib/pose-analysis";

type Mode = "upload" | "camera";

function drawColoredSkeleton(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  w: number,
  h: number,
  result: AnalysisResult | null
) {
  for (const group of CONNECTION_GROUPS) {
    for (const [i, j] of group.connections) {
      const a = lm[i];
      const b = lm[j];
      if (a.visibility > 0.4 && b.visibility > 0.4) {
        ctx.beginPath();
        ctx.setLineDash([8, 4]);
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.strokeStyle = group.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = group.color;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.setLineDash([]);
      }
    }
  }

  for (const joint of KEY_JOINTS) {
    const l = lm[joint.index];
    if (l.visibility > 0.4) {
      const x = l.x * w;
      const y = l.y * h;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.strokeStyle = joint.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = joint.color;
      ctx.fill();
      ctx.font = "bold 9px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 2.5;
      ctx.strokeText(joint.label, x + 10, y - 4);
      ctx.fillText(joint.label, x + 10, y - 4);
    }
  }

  const leftEye = lm[2];
  const rightEye = lm[5];
  if (leftEye.visibility > 0.4 && rightEye.visibility > 0.4) {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    const dx = (rightEye.x - leftEye.x) * w;
    const dy = (rightEye.y - leftEye.y) * h;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len;
    const ny = dy / len;
    ctx.moveTo(leftEye.x * w - nx * 30, leftEye.y * h - ny * 30);
    ctx.lineTo(rightEye.x * w + nx * 30, rightEye.y * h + ny * 30);
    const eyeMetric = result?.metrics.find(m => m.name === "Head & Eyes Level");
    ctx.strokeStyle = eyeMetric?.status === "good" ? "#22c55e" : eyeMetric?.status === "warning" ? "#f59e0b" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    const midX = (leftEye.x + rightEye.x) / 2 * w;
    const midY = (leftEye.y + rightEye.y) / 2 * h;
    ctx.font = "bold 10px Inter, system-ui, sans-serif";
    ctx.fillStyle = eyeMetric?.status === "good" ? "#22c55e" : eyeMetric?.status === "warning" ? "#f59e0b" : "#ef4444";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 2.5;
    ctx.strokeText("EYES", midX - 15, midY - 14);
    ctx.fillText("EYES", midX - 15, midY - 14);
  }

  const nose = lm[0];
  const midFootX = (lm[27].x + lm[28].x) / 2;
  const midFootY = (lm[27].y + lm[28].y) / 2;
  if (nose.visibility > 0.4 && lm[27].visibility > 0.4) {
    ctx.beginPath();
    ctx.setLineDash([3, 6]);
    ctx.moveTo(nose.x * w, nose.y * h);
    ctx.lineTo(midFootX * w, midFootY * h);
    const balanceMetric = result?.metrics.find(m => m.name === "Balance");
    ctx.strokeStyle = balanceMetric?.status === "good" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export default function BiometricPage() {
  const [mode, setMode] = useState<Mode>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  useEffect(() => {
    if (!landmarks || !result || !imageUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      drawColoredSkeleton(ctx, landmarks, img.width, img.height, result);
    };
    img.src = imageUrl;
  }, [landmarks, result, imageUrl]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError("");
    setLandmarks(null);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }, []);

  const startCamera = useCallback(async (facing?: "user" | "environment") => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    const useFacing = facing || facingMode;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: useFacing, width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      setStream(s);
      setFacingMode(useFacing);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, [stream, facingMode]);

  const flipCamera = useCallback(() => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    startCamera(newFacing);
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const url = canvas.toDataURL("image/png");
    setImageUrl(url);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  const runAnalysis = useCallback(async () => {
    if (!imageUrl) return;
    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/latest/pose_landmarker_heavy.task",
          delegate: "GPU",
        },
        runningMode: "IMAGE",
        numPoses: 5,
      });

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
      });

      const poseResult = poseLandmarker.detect(img);
      console.log(`[StanceLab] MediaPipe detected ${poseResult.landmarks?.length || 0} pose(s)`);
      if (!poseResult.landmarks || poseResult.landmarks.length === 0) {
        setError("No person detected. Please upload a clear full-body batting stance photo with good lighting.");
        setAnalyzing(false);
        return;
      }

      const selection = selectBatsman(poseResult.landmarks);
      console.log("[StanceLab] Batsman selection:", {
        picked: selection.index,
        score: selection.score,
        reason: selection.reason,
        rejected: selection.rejected,
      });
      if (!selection.landmarks) {
        setError(`Couldn't find a batter in this photo — ${selection.reason}. Try a photo where the batter is clearly in their stance.`);
        setAnalyzing(false);
        poseLandmarker.close();
        return;
      }

      const lm = selection.landmarks;
      setLandmarks(lm);
      const analysis = analyzeStance(lm);
      setResult(analysis);
      poseLandmarker.close();
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Make sure the image shows a full-body batting stance with good lighting.");
    } finally {
      setAnalyzing(false);
    }
  }, [imageUrl]);

  const reset = useCallback(() => {
    setImageUrl(null);
    setResult(null);
    setError("");
    setLandmarks(null);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  const statusIcon = (status: string) => {
    if (status === "good") return <CheckCircle className="w-[18px] h-[18px] text-green-500" />;
    if (status === "warning") return <AlertTriangle className="w-[18px] h-[18px] text-amber-500" />;
    return <XCircle className="w-[18px] h-[18px] text-[var(--cs-danger)]" />;
  };

  const statusColor = (status: string) => {
    if (status === "good") return '#22c55e';
    if (status === "warning") return '#f59e0b';
    return 'var(--cs-danger)';
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Hero */}
      <div className="col-span-12 py-4">
        <p className="label-bracket mb-3">Pose Detection</p>
        <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">Stance Lab</h1>
        <p className="text-[var(--text-muted)] text-base mt-2">
          AI-powered batting stance analysis — compared against Sachin, Dravid &amp; Kohli
        </p>
      </div>

      {/* Upload / Camera selection */}
      {!imageUrl && !stream && (
        <>
          <div
            className="panel col-span-12 p-10 cursor-pointer text-center hover:border-[var(--cs-accent)] transition-colors"
            onClick={() => { setMode("upload"); fileInputRef.current?.click(); }}
          >
            <Upload className="w-12 h-12 text-[var(--cs-accent)] mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Upload Photo</h3>
            <p className="text-sm text-[var(--text-muted)]">JPG or PNG — full-body batting stance, good lighting</p>
          </div>
          <div
            className="panel col-span-12 p-10 cursor-pointer text-center hover:border-[var(--cs-accent)] transition-colors"
            onClick={() => { setMode("camera"); startCamera("environment"); }}
          >
            <Camera className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Live Capture</h3>
            <p className="text-sm text-[var(--text-muted)]">Use your camera to take a stance photo — rear camera recommended</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </>
      )}

      {/* Camera View */}
      {stream && !imageUrl && (
        <div className="panel col-span-12 p-6">
          <div className="panel-header">
            <span className="label-bracket">Live Camera</span>
            <h2 className="panel-title">Position Your Stance</h2>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Stand in your batting stance. Make sure your full body is visible from head to feet.
          </p>
          <div className="relative rounded-xl overflow-hidden bg-black">
            <video ref={videoRef} className="w-full max-h-[500px] block object-contain" autoPlay playsInline muted />
            <div className="absolute inset-0 border-2 border-dashed border-[var(--cs-accent)]/30 rounded-xl pointer-events-none">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] text-[var(--cs-accent)] font-bold tracking-widest bg-black/60 px-3 py-1 rounded-full">
                FULL BODY IN FRAME
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-center mt-5 flex-wrap">
            <button onClick={capturePhoto} className="btn btn-primary">
              Capture &amp; Analyze
              <Camera className="w-4 h-4" />
            </button>
            <button className="btn btn-secondary" onClick={flipCamera}>Flip Camera</button>
            <button className="btn btn-secondary" onClick={reset}>Cancel</button>
          </div>
        </div>
      )}

      {/* Image + Analysis */}
      {imageUrl && (
        <>
          <div className="panel col-span-12 p-6">
            <div className="panel-header">
              <span className="label-bracket">{landmarks ? 'Pose Detected' : 'Image Loaded'}</span>
              <h2 className="panel-title">{landmarks ? 'Pose Detection' : 'Your Photo'}</h2>
            </div>
            {landmarks ? (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
                <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Original Stance" className="max-w-full max-h-[500px] block rounded-xl object-contain" />
                  <div className="absolute top-2.5 left-2.5 bg-black/70 px-2.5 py-1 rounded-md text-[10px] text-[var(--text-muted)] font-bold tracking-wider">ORIGINAL</div>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <canvas ref={canvasRef} className="max-w-full max-h-[500px] block rounded-xl object-contain" />
                  {result && (
                    <div className="absolute top-4 left-4 bg-black/75 backdrop-blur-sm rounded-xl p-3.5 border-2" style={{ borderColor: result.score >= 70 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : 'var(--cs-danger)' }}>
                      <div className="stat-val text-3xl" style={{ color: result.score >= 70 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : 'var(--cs-danger)' }}>
                        {result.score}<span className="text-sm text-white/50">%</span>
                      </div>
                      <div className="text-[10px] text-white/60 font-semibold tracking-wider">STANCE SCORE</div>
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5 bg-black/70 px-2.5 py-1 rounded-md text-[10px] text-[var(--cs-accent)] font-bold tracking-wider">POSE DETECTED</div>
                  <div className="absolute bottom-3 right-3 bg-black/70 rounded-lg px-3 py-2 flex gap-3 text-[9px] font-semibold">
                    <span className="text-cyan-400">&#9679; Torso</span>
                    <span className="text-purple-400">&#9679; Arms</span>
                    <span className="text-green-400">&#9679; Legs</span>
                    <span className="text-amber-400">&#9679; Eyes</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Stance" className="max-w-full max-h-[500px] block rounded-xl object-contain" />
              </div>
            )}
            <div className="flex gap-3 mt-5 flex-wrap">
              {!result && !analyzing && (
                <button onClick={runAnalysis} className="btn btn-primary flex-1 min-w-[200px]">
                  Analyze Stance
                  <Zap className="w-4 h-4" />
                </button>
              )}
              <button className="btn btn-secondary" onClick={reset}>
                <RotateCcw className="w-4 h-4" />
                New Photo
              </button>
            </div>
            {analyzing && (
              <div className="mt-4 text-center">
                <div className="w-full h-1 bg-[var(--cs-border)] rounded overflow-hidden mb-3">
                  <div className="w-3/5 h-full bg-[var(--cs-accent)] rounded animate-pulse" />
                </div>
                <span className="text-[var(--cs-accent)] text-sm font-semibold tracking-wider">
                  Detecting pose landmarks...
                </span>
                <p className="text-[var(--text-muted)] text-xs mt-1.5">Using heavy model for best accuracy</p>
              </div>
            )}
            {error && (
              <div className="mt-4 text-sm text-[var(--cs-danger)] bg-red-50 dark:bg-red-500/10 p-3 rounded-xl">
                {error}
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <>
              <div className="panel col-span-12">
                <div className="panel-header">
                  <span className="label-bracket">Verdict</span>
                  <h2 className="panel-title">Analysis</h2>
                </div>
                <div className="flex gap-6 items-center flex-wrap">
                  <div className="text-center min-w-[120px]">
                    <div className="stat-val text-5xl" style={{ color: result.score >= 70 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : 'var(--cs-danger)' }}>
                      {result.score}<span className="text-xl text-[var(--text-muted)]">%</span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] font-semibold tracking-wider mt-1">
                      {result.score >= 85 ? "EXCELLENT" : result.score >= 70 ? "GOOD" : result.score >= 50 ? "DECENT" : "NEEDS WORK"}
                    </div>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-[var(--text-main)] text-[15px] leading-relaxed mb-3">{result.summary}</p>
                    <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-lg border border-purple-200 dark:border-purple-500/20">
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold tracking-wider block mb-1">PRO COMPARISON</span>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{result.proComparison}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel col-span-12">
                <div className="panel-header">
                  <span className="label-bracket">Metrics</span>
                  <h2 className="panel-title">Detailed Feedback</h2>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
                  {result.metrics.map((m, i) => (
                    <div key={i} className="p-4 rounded-xl bg-[var(--bg-surface)] border" style={{ borderColor: m.status === 'good' ? 'rgba(34,197,94,0.3)' : m.status === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          {statusIcon(m.status)}
                          <span className="text-sm font-bold text-[var(--text-main)]">{m.name}</span>
                        </div>
                        <span className="stat-val text-sm" style={{ color: statusColor(m.status), fontSize: 14 }}>
                          {m.value}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">{m.feedback}</p>
                      {m.tip && m.status !== "good" && (
                        <div className="text-xs text-[var(--cs-accent)] bg-[var(--cs-accent-light)] p-2 rounded-lg leading-relaxed">
                          {m.tip}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
