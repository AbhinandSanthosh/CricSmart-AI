"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

  // Cleanup camera on unmount
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

      // Load image
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

      // Draw skeleton on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);

        // Draw connections
        for (const [i, j] of POSE_CONNECTIONS) {
          const a = lm[i];
          const b = lm[j];
          if (a.visibility > 0.5 && b.visibility > 0.5) {
            ctx.beginPath();
            ctx.moveTo(a.x * img.width, a.y * img.height);
            ctx.lineTo(b.x * img.width, b.y * img.height);
            ctx.strokeStyle = "#F59E0B";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }

        // Draw landmarks
        for (const l of lm) {
          if (l.visibility > 0.5) {
            ctx.beginPath();
            ctx.arc(l.x * img.width, l.y * img.height, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "#F59E0B";
            ctx.fill();
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.stroke();
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
    if (status === "good") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Biometric Lab</h1>
        <p className="text-muted-foreground mt-1">
          AI-powered batting stance analysis using pose detection
        </p>
      </div>

      {/* Mode Selection */}
      {!imageUrl && !stream && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card
            className="bg-card border-border hover:border-amber/40 transition-colors cursor-pointer"
            onClick={() => { setMode("upload"); fileInputRef.current?.click(); }}
          >
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <Upload className="w-12 h-12 text-amber" />
              <div className="text-center">
                <div className="font-semibold">Upload Photo</div>
                <div className="text-sm text-muted-foreground mt-1">
                  JPG or PNG, full-body batting stance
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className="bg-card border-border hover:border-amber/40 transition-colors cursor-pointer"
            onClick={() => { setMode("camera"); startCamera(); }}
          >
            <CardContent className="p-8 flex flex-col items-center gap-4">
              <Camera className="w-12 h-12 text-blue-400" />
              <div className="text-center">
                <div className="font-semibold">Use Camera</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Take a photo using your device camera
                </div>
              </div>
            </CardContent>
          </Card>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}

      {/* Camera View */}
      {stream && !imageUrl && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-4">
            <video ref={videoRef} className="w-full max-w-lg mx-auto rounded-lg" autoPlay playsInline muted />
            <div className="flex gap-3 justify-center">
              <Button onClick={capturePhoto} className="bg-amber hover:bg-amber-dark text-black">
                <Camera className="w-4 h-4 mr-2" /> Capture
              </Button>
              <Button variant="outline" onClick={reset}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image + Analysis */}
      {imageUrl && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image / Canvas */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {landmarks ? "Pose Detection" : "Your Photo"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {landmarks ? (
                <canvas ref={canvasRef} className="w-full rounded-lg" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="Stance" className="w-full rounded-lg" />
              )}
              <div className="flex gap-3 mt-4">
                {!result && !analyzing && (
                  <Button
                    onClick={runAnalysis}
                    className="bg-amber hover:bg-amber-dark text-black flex-1"
                  >
                    Analyze Stance
                  </Button>
                )}
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset
                </Button>
              </div>
              {analyzing && (
                <div className="mt-4 text-center">
                  <div className="animate-pulse text-amber text-sm">
                    Running pose detection...
                  </div>
                </div>
              )}
              {error && (
                <div className="mt-4 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Technical Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <div className={`text-5xl font-bold ${result.score >= 70 ? "text-green-400" : result.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                      {result.score}%
                    </div>
                    <Progress
                      value={result.score}
                      className="mt-3 h-2"
                    />
                    <p className="text-sm text-muted-foreground mt-3">{result.summary}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Detailed Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.metrics.map((m, i) => (
                    <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {statusIcon(m.status)}
                          <span className="text-sm font-medium">{m.name}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            m.status === "good"
                              ? "border-green-400/50 text-green-400"
                              : m.status === "warning"
                              ? "border-yellow-400/50 text-yellow-400"
                              : "border-red-400/50 text-red-400"
                          }
                        >
                          {m.value}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{m.feedback}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
