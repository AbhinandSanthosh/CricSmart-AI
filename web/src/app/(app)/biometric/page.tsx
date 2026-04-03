"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Camera, RotateCcw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { analyzeStance, POSE_CONNECTIONS, type AnalysisResult, type Landmark } from "@/lib/pose-analysis";

type Mode = "upload" | "camera";

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

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError("");
    setLandmarks(null);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch {
      setError("Camera access denied");
    }
  }, []);

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
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
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
        setError("No person detected in the image. Please upload a clear full-body photo.");
        setAnalyzing(false);
        return;
      }

      const lm = poseResult.landmarks[0];
      setLandmarks(lm);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        // Bones — white, 3px
        for (const [i, j] of POSE_CONNECTIONS) {
          const a = lm[i];
          const b = lm[j];
          if (a.visibility > 0.5 && b.visibility > 0.5) {
            ctx.beginPath();
            ctx.moveTo(a.x * img.width, a.y * img.height);
            ctx.lineTo(b.x * img.width, b.y * img.height);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }

        // Joints — white dots
        for (const l of lm) {
          if (l.visibility > 0.5) {
            ctx.beginPath();
            ctx.arc(l.x * img.width, l.y * img.height, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
          }
        }
      }

      const analysis = analyzeStance(lm);
      setResult(analysis);
      poseLandmarker.close();
    } catch (err) {
      console.error(err);
      setError("Analysis failed. Make sure the image shows a full-body batting stance.");
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
    if (status === "good") return <CheckCircle style={{ width: 16, height: 16, color: '#22c55e' }} />;
    if (status === "warning") return <AlertTriangle style={{ width: 16, height: 16, color: '#f59e0b' }} />;
    return <XCircle style={{ width: 16, height: 16, color: 'var(--cs-danger)' }} />;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 24 }}>
      {/* Hero */}
      <div style={{ gridColumn: 'span 12', padding: '20px 0' }}>
        <div className="label-bracket" style={{ marginBottom: 12 }}>pose_detection_active</div>
        <h1 style={{ fontSize: 48, background: 'linear-gradient(180deg, #ffffff 0%, #909ab0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.03em' }}>
          STANCE LAB
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 8 }}>
          AI-powered batting stance analysis using pose detection
        </p>
      </div>

      {/* Upload / Camera selection */}
      {!imageUrl && !stream && (
        <>
          <div className="panel" style={{ gridColumn: 'span 6', padding: 48, cursor: 'pointer', textAlign: 'center' }}
            onClick={() => { setMode("upload"); fileInputRef.current?.click(); }}>
            <Upload style={{ width: 48, height: 48, color: 'var(--cs-accent)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>UPLOAD PHOTO</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>JPG or PNG, full-body batting stance</p>
          </div>
          <div className="panel" style={{ gridColumn: 'span 6', padding: 48, cursor: 'pointer', textAlign: 'center' }}
            onClick={() => { setMode("camera"); startCamera(); }}>
            <Camera style={{ width: 48, height: 48, color: '#8b5cf6', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 20, marginBottom: 8 }}>USE CAMERA</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Take a photo using your device camera</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
        </>
      )}

      {/* Camera View */}
      {stream && !imageUrl && (
        <div className="panel" style={{ gridColumn: 'span 12', padding: 24 }}>
          <video ref={videoRef} style={{ width: '100%', maxWidth: 640, margin: '0 auto', borderRadius: 12, display: 'block' }} autoPlay playsInline muted />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
            <button onClick={capturePhoto} className="btn btn-primary" style={{ padding: '8px 8px 8px 24px', fontSize: 14 }}>
              Capture
              <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                <Camera style={{ width: 14, height: 14 }} />
              </div>
            </button>
            <button className="btn btn-secondary" style={{ padding: '8px 24px', fontSize: 14 }} onClick={reset}>Cancel</button>
          </div>
        </div>
      )}

      {/* Image + Analysis */}
      {imageUrl && (
        <>
          <div className="panel" style={{ gridColumn: 'span 8', padding: 24 }}>
            <div className="panel-header">
              <span className="label-bracket">{landmarks ? 'pose_detected' : 'image_loaded'}</span>
              <h2 className="panel-title">{landmarks ? 'POSE DETECTION' : 'YOUR PHOTO'}</h2>
            </div>
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', maxHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {landmarks ? (
                <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: 400, display: 'block', borderRadius: 12, objectFit: 'contain' }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Stance" style={{ maxWidth: '100%', maxHeight: 400, display: 'block', borderRadius: 12, objectFit: 'contain' }} />
              )}
              {result && (
                <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', borderRadius: 12, padding: '12px 16px', border: '1px solid var(--cs-border)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 28, color: result.score >= 70 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : 'var(--cs-danger)' }}>
                    {result.score}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>%</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', fontWeight: 600 }}>STANCE SCORE</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              {!result && !analyzing && (
                <button onClick={runAnalysis} className="btn btn-primary" style={{ padding: '8px 8px 8px 24px', fontSize: 14, flex: 1 }}>
                  Analyze Stance
                  <div className="btn-icon-circle" style={{ width: 28, height: 28 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </div>
                </button>
              )}
              <button className="btn btn-secondary" style={{ padding: '8px 24px', fontSize: 14 }} onClick={reset}>
                <RotateCcw style={{ width: 14, height: 14, marginRight: 8, display: 'inline' }} />
                Reset
              </button>
            </div>
            {analyzing && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <span style={{ color: 'var(--cs-accent)', fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', letterSpacing: '0.1em', animation: 'pulse 2s infinite' }}>
                  RUNNING POSE DETECTION...
                </span>
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
            <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="panel">
                <div className="panel-header">
                  <span className="label-bracket">score</span>
                  <h2 className="panel-title">RESULT</h2>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div className="stat-val" style={{ fontSize: 64, color: result.score >= 70 ? '#22c55e' : result.score >= 50 ? '#f59e0b' : 'var(--cs-danger)' }}>
                    {result.score}<span style={{ fontSize: 24, color: 'var(--text-muted)' }}>%</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>{result.summary}</p>
                </div>
              </div>

              <div className="panel" style={{ flex: 1 }}>
                <div className="panel-header">
                  <span className="label-bracket">metrics</span>
                  <h2 className="panel-title">ANALYSIS</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.metrics.map((m, i) => (
                    <div key={i} style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--cs-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {statusIcon(m.status)}
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{m.name}</span>
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 800, fontStyle: 'italic', color: m.status === 'good' ? '#22c55e' : m.status === 'warning' ? '#f59e0b' : 'var(--cs-danger)' }}>
                          {m.value}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
