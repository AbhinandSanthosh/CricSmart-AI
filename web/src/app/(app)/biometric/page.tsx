"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Camera, RotateCcw, CheckCircle, AlertTriangle, XCircle, Zap } from "lucide-react";
import { analyzeStance, CONNECTION_GROUPS, KEY_JOINTS, type AnalysisResult, type Landmark } from "@/lib/pose-analysis";

type Mode = "upload" | "camera";

function drawColoredSkeleton(
  ctx: CanvasRenderingContext2D,
  lm: Landmark[],
  w: number,
  h: number,
  result: AnalysisResult | null
) {
  // Draw connections grouped by color with dashed lines
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

  // Draw joints with labels
  for (const joint of KEY_JOINTS) {
    const l = lm[joint.index];
    if (l.visibility > 0.4) {
      const x = l.x * w;
      const y = l.y * h;

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.strokeStyle = joint.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner filled dot
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = joint.color;
      ctx.fill();

      // Label
      ctx.font = "bold 9px Inter, system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.strokeStyle = "rgba(0,0,0,0.7)";
      ctx.lineWidth = 2.5;
      ctx.strokeText(joint.label, x + 10, y - 4);
      ctx.fillText(joint.label, x + 10, y - 4);
    }
  }

  // Draw eye-level line if result shows issues
  const leftEye = lm[2];
  const rightEye = lm[5];
  if (leftEye.visibility > 0.4 && rightEye.visibility > 0.4) {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    // Extend the eye line beyond the eyes
    const dx = (rightEye.x - leftEye.x) * w;
    const dy = (rightEye.y - leftEye.y) * h;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len;
    const ny = dy / len;
    ctx.moveTo(leftEye.x * w - nx * 30, leftEye.y * h - ny * 30);
    ctx.lineTo(rightEye.x * w + nx * 30, rightEye.y * h + ny * 30);
    const eyeMetric = result?.metrics.find(m => m.name === "Head & Eyes Level");
    ctx.strokeStyle = eyeMetric?.status === "good" ? "#22c55e" : eyeMetric?.status === "warning" ? "#f59e0b" : "#ff2a4b";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw "EYES" label
    const midX = (leftEye.x + rightEye.x) / 2 * w;
    const midY = (leftEye.y + rightEye.y) / 2 * h;
    ctx.font = "bold 10px Inter, system-ui, sans-serif";
    ctx.fillStyle = eyeMetric?.status === "good" ? "#22c55e" : eyeMetric?.status === "warning" ? "#f59e0b" : "#ff2a4b";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 2.5;
    ctx.strokeText("EYES", midX - 15, midY - 14);
    ctx.fillText("EYES", midX - 15, midY - 14);
  }

  // Draw vertical balance line (head to feet center)
  const nose = lm[0];
  const midFootX = (lm[27].x + lm[28].x) / 2;
  const midFootY = (lm[27].y + lm[28].y) / 2;
  if (nose.visibility > 0.4 && lm[27].visibility > 0.4) {
    ctx.beginPath();
    ctx.setLineDash([3, 6]);
    ctx.moveTo(nose.x * w, nose.y * h);
    ctx.lineTo(midFootX * w, midFootY * h);
    const balanceMetric = result?.metrics.find(m => m.name === "Balance");
    ctx.strokeStyle = balanceMetric?.status === "good" ? "rgba(34,197,94,0.4)" : "rgba(255,42,75,0.4)";
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

  // Draw skeleton on canvas after landmarks are set (canvas only exists in DOM after re-render)
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
    // Stop existing stream
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
        numPoses: 1,
      });

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
      });

      const poseResult = poseLandmarker.detect(img);
      if (!poseResult.landmarks || poseResult.landmarks.length === 0) {
        setError("No person detected. Please upload a clear full-body batting stance photo with good lighting.");
        setAnalyzing(false);
        return;
      }

      const lm = poseResult.landmarks[0];
      setLandmarks(lm);

      const analysis = analyzeStance(lm);
      setResult(analysis);
      // Canvas drawing happens in useEffect after re-render

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
    if (status === "good") return <CheckCircle style={{ width: 18, height: 18, color: '#22c55e' }} />;
    if (status === "warning") return <AlertTriangle style={{ width: 18, height: 18, color: '#f59e0b' }} />;
    return <XCircle style={{ width: 18, height: 18, color: 'var(--cs-danger)' }} />;
  };

  const statusColor = (status: string) => {
    if (status === "good") return '#22c55e';
    if (status === "warning") return '#f59e0b';
    return 'var(--cs-danger)';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
      {/* Hero */}
      <div style={{ gridColumn: 'span 12', padding: '20px 0' }}>
        <div className="label-bracket" style={{ marginBottom: 12 }}>pose_detection_active</div>
        <h1 className="hero-title" style={{ fontSize: 48 }}>
          STANCE LAB
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 8 }}>
          AI-powered batting stance analysis — compared against Sachin, Dravid &amp; Kohli
        </p>
      </div>

      {/* Upload / Camera selection */}
      {!imageUrl && !stream && (
        <>
          <div className="panel" style={{ gridColumn: 'span 12', padding: 40, cursor: 'pointer', textAlign: 'center' }}
            onClick={() => { setMode("upload"); fileInputRef.current?.click(); }}>
            <Upload style={{ width: 48, height: 48, color: 'var(--cs-accent)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>UPLOAD PHOTO</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>JPG or PNG — full-body batting stance, good lighting</p>
          </div>
          <div className="panel" style={{ gridColumn: 'span 12', padding: 40, cursor: 'pointer', textAlign: 'center' }}
            onClick={() => { setMode("camera"); startCamera("environment"); }}>
            <Camera style={{ width: 48, height: 48, color: '#8b5cf6', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>LIVE CAPTURE</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Use your camera to take a stance photo — rear camera recommended</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
        </>
      )}

      {/* Camera View */}
      {stream && !imageUrl && (
        <div className="panel" style={{ gridColumn: 'span 12', padding: 24 }}>
          <div className="panel-header">
            <span className="label-bracket">live_camera</span>
            <h2 className="panel-title">POSITION YOUR STANCE</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Stand in your batting stance. Make sure your full body is visible from head to feet. Good lighting helps accuracy.
          </p>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
            <video ref={videoRef} style={{ width: '100%', maxHeight: 500, display: 'block', objectFit: 'contain' }} autoPlay playsInline muted />
            {/* Guide overlay */}
            <div style={{ position: 'absolute', inset: 0, border: '2px dashed rgba(0,212,255,0.3)', borderRadius: 12, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: 'var(--cs-accent)', fontWeight: 700, letterSpacing: '0.1em', background: 'rgba(0,0,0,0.6)', padding: '4px 12px', borderRadius: 20 }}>
                FULL BODY IN FRAME
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
            <button onClick={capturePhoto} className="btn btn-primary" style={{ padding: '8px 8px 8px 24px', fontSize: 14 }}>
              Capture &amp; Analyze
              <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                <Camera style={{ width: 14, height: 14 }} />
              </div>
            </button>
            <button className="btn btn-secondary" style={{ padding: '8px 24px', fontSize: 14 }} onClick={flipCamera}>
              Flip Camera
            </button>
            <button className="btn btn-secondary" style={{ padding: '8px 24px', fontSize: 14 }} onClick={reset}>Cancel</button>
          </div>
        </div>
      )}

      {/* Image + Analysis */}
      {imageUrl && (
        <>
          <div className="panel" style={{ gridColumn: 'span 12', padding: 24 }}>
            <div className="panel-header">
              <span className="label-bracket">{landmarks ? 'pose_detected' : 'image_loaded'}</span>
              <h2 className="panel-title">{landmarks ? 'POSE DETECTION' : 'YOUR PHOTO'}</h2>
            </div>
            {landmarks ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {/* Original uploaded photo */}
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Original Stance" style={{ maxWidth: '100%', maxHeight: 500, display: 'block', borderRadius: 12, objectFit: 'contain' }} />
                  <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: 6, fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>ORIGINAL</div>
                </div>
                {/* Annotated skeleton overlay */}
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: 500, display: 'block', borderRadius: 12, objectFit: 'contain' }} />
                  {result && (
                    <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', borderRadius: 12, padding: '14px 18px', border: `2px solid ${result.score >= 70 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : 'var(--cs-danger)'}` }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 32, color: result.score >= 70 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : 'var(--cs-danger)' }}>
                        {result.score}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>%</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>STANCE SCORE</div>
                    </div>
                  )}
                  <div style={{ position: 'absolute', background: 'rgba(0,0,0,0.7)', padding: '4px 10px', borderRadius: 6, fontSize: 10, color: 'var(--cs-accent)', fontWeight: 700, letterSpacing: '0.08em', ...(result ? { top: 10, right: 10, left: 'auto' } : { top: 10, left: 10 }) }}>POSE DETECTED</div>
                  {/* Legend */}
                  <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '8px 12px', display: 'flex', gap: 12, fontSize: 9, fontWeight: 600 }}>
                    <span style={{ color: '#00d4ff' }}>&#9679; Torso</span>
                    <span style={{ color: '#8b5cf6' }}>&#9679; Arms</span>
                    <span style={{ color: '#22c55e' }}>&#9679; Legs</span>
                    <span style={{ color: '#f59e0b' }}>&#9679; Eyes</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Stance" style={{ maxWidth: '100%', maxHeight: 500, display: 'block', borderRadius: 12, objectFit: 'contain' }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
              {!result && !analyzing && (
                <button onClick={runAnalysis} className="btn btn-primary" style={{ padding: '8px 8px 8px 24px', fontSize: 14, flex: 1, minWidth: 200 }}>
                  Analyze Stance
                  <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                    <Zap style={{ width: 14, height: 14 }} />
                  </div>
                </button>
              )}
              <button className="btn btn-secondary" style={{ padding: '8px 24px', fontSize: 14 }} onClick={reset}>
                <RotateCcw style={{ width: 14, height: 14, marginRight: 8, display: 'inline' }} />
                New Photo
              </button>
            </div>
            {analyzing && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ width: '60%', height: '100%', background: 'var(--cs-accent)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                </div>
                <span style={{ color: 'var(--cs-accent)', fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.1em' }}>
                  DETECTING POSE LANDMARKS...
                </span>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>Using heavy model for best accuracy</p>
              </div>
            )}
            {error && (
              <div style={{ marginTop: 16, color: 'var(--cs-danger)', fontSize: 13, background: 'rgba(255,42,75,0.1)', padding: 12, borderRadius: 12 }}>
                {error}
              </div>
            )}
          </div>

          {/* Results */}
          {result && (
            <>
              {/* Summary + Pro Comparison */}
              <div className="panel" style={{ gridColumn: 'span 12' }}>
                <div className="panel-header">
                  <span className="label-bracket">verdict</span>
                  <h2 className="panel-title">ANALYSIS</h2>
                </div>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center', minWidth: 120 }}>
                    <div className="stat-val" style={{ fontSize: 56, color: result.score >= 70 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : 'var(--cs-danger)' }}>
                      {result.score}<span style={{ fontSize: 20, color: 'var(--text-muted)' }}>%</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', marginTop: 4 }}>
                      {result.score >= 85 ? "EXCELLENT" : result.score >= 70 ? "GOOD" : result.score >= 50 ? "DECENT" : "NEEDS WORK"}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <p style={{ color: 'var(--text-main)', fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}>{result.summary}</p>
                    <div style={{ padding: '10px 14px', background: 'rgba(139, 92, 246, 0.08)', borderRadius: 10, border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                      <span style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 700, letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>PRO COMPARISON</span>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{result.proComparison}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Metrics */}
              <div className="panel" style={{ gridColumn: 'span 12' }}>
                <div className="panel-header">
                  <span className="label-bracket">metrics_breakdown</span>
                  <h2 className="panel-title">DETAILED FEEDBACK</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {result.metrics.map((m, i) => (
                    <div key={i} style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: `1px solid ${m.status === 'good' ? 'rgba(34,197,94,0.2)' : m.status === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(255,42,75,0.2)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {statusIcon(m.status)}
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{m.name}</span>
                        </div>
                        <span style={{ fontSize: 14, fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', color: statusColor(m.status) }}>
                          {m.value}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 8 }}>{m.feedback}</p>
                      {m.tip && m.status !== "good" && (
                        <div style={{ fontSize: 12, color: 'var(--cs-accent)', background: 'rgba(0,212,255,0.05)', padding: '8px 10px', borderRadius: 8, lineHeight: 1.5 }}>
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
