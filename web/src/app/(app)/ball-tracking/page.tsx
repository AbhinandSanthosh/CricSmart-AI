"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Play, RotateCcw, Zap, Target, ArrowDown } from "lucide-react";

interface TrackingResult {
  speed: number;
  shotType: string;
  bouncePoint: string;
  hitStumps: boolean;
  confidence: number;
}

export default function BallTrackingPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError("");
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  }

  async function analyzeVideo() {
    if (!videoUrl) return;
    setAnalyzing(true);
    setError("");
    setProgress(0);

    // Simulate progress since the Python ML service may not be running
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 90));
    }, 300);

    try {
      // Try to call the Python FastAPI service
      const fileInput = fileInputRef.current;
      const file = fileInput?.files?.[0];

      if (file) {
        const formData = new FormData();
        formData.append("video", file);

        try {
          const res = await fetch("http://localhost:8000/analyze", {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(60000),
          });

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
            });
            setAnalyzing(false);
            return;
          }
        } catch {
          // ML service not running, use demo
        }
      }

      // Demo result when ML service unavailable
      clearInterval(interval);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 500));

      setResult({
        speed: 128.5,
        shotType: "Good Length",
        bouncePoint: "4th stump line, 6m from stumps",
        hitStumps: false,
        confidence: 85,
      });
      setError(
        "Note: ML service not running. Showing demo results. Start the Python service for real analysis: cd ml-service && python server.py"
      );
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ball Tracking Lab</h1>
        <p className="text-muted-foreground mt-1">
          Upload cricket video for ball trajectory, speed, and bounce analysis
        </p>
      </div>

      {!videoUrl ? (
        <Card
          className="bg-card border-border border-dashed hover:border-amber/40 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="p-12 flex flex-col items-center gap-4">
            <Upload className="w-16 h-16 text-amber" />
            <div className="text-center">
              <div className="font-semibold text-lg">Upload Cricket Video</div>
              <div className="text-sm text-muted-foreground mt-1">
                MP4, MOV, or AVI - max 50MB
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Video Preview */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Video Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <video
                src={videoUrl}
                controls
                className="w-full rounded-lg"
              />
              <div className="flex gap-3">
                {!result && !analyzing && (
                  <Button
                    onClick={analyzeVideo}
                    className="bg-amber hover:bg-amber-dark text-black flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" /> Analyze Ball
                  </Button>
                )}
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Reset
                </Button>
              </div>
              {analyzing && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Processing frames... {progress}%
                  </p>
                </div>
              )}
              {error && (
                <div className="text-xs text-amber bg-amber/10 p-3 rounded-lg">
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber" />
                    Ball Speed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-amber">
                      {result.speed.toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      km/h
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      {result.speed > 140
                        ? "Express pace!"
                        : result.speed > 130
                        ? "Good pace bowling"
                        : result.speed > 120
                        ? "Medium-fast"
                        : "Medium pace"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    Shot Classification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm">Shot Type</span>
                    <Badge className="bg-amber/20 text-amber border-amber/30">
                      {result.shotType}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm">Bounce Point</span>
                    <span className="text-sm text-muted-foreground">
                      {result.bouncePoint}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm">Hitting Stumps?</span>
                    <Badge
                      variant="outline"
                      className={
                        result.hitStumps
                          ? "border-red-400/50 text-red-400"
                          : "border-green-400/50 text-green-400"
                      }
                    >
                      {result.hitStumps ? "Yes" : "No"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowDown className="w-4 h-4 text-green-400" />
                    Length Guide
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    {[
                      { type: "Yorker", range: "At the crease", color: "text-red-400" },
                      { type: "Full Length", range: "2-4m from crease", color: "text-orange-400" },
                      { type: "Good Length", range: "4-7m from crease", color: "text-amber" },
                      { type: "Short Ball", range: "7m+ from crease", color: "text-blue-400" },
                    ].map((l) => (
                      <div
                        key={l.type}
                        className={`flex items-center justify-between p-2 rounded ${
                          result.shotType === l.type
                            ? "bg-amber/10 border border-amber/30"
                            : ""
                        }`}
                      >
                        <span className={result.shotType === l.type ? "text-amber font-medium" : "text-muted-foreground"}>
                          {l.type}
                        </span>
                        <span className="text-muted-foreground">{l.range}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/mov,video/avi,video/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
