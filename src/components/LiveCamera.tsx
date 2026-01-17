import { useRef, useState, useCallback, useEffect } from 'react';
import { SwitchCamera, X, Loader2, Pause, Play, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNativeCamera } from '@/hooks/useNativeCamera';

interface PillPosition {
  x: number;
  y: number;
}

interface CountResult {
  count: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
  pills: PillPosition[];
}

interface LiveCameraProps {
  onClose: () => void;
}

export function LiveCamera({ onClose }: LiveCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [result, setResult] = useState<CountResult | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAnalysisRef = useRef<number>(0);

  const { isNative, checkAndRequestPermission } = useNativeCamera();

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setIsReady(false);
      setPermissionDenied(false);
      
      // On native platforms, request permission first using Capacitor
      if (isNative) {
        const hasPermission = await checkAndRequestPermission();
        if (!hasPermission) {
          setPermissionDenied(true);
          setError('Camera access was denied. Please enable camera access in your device Settings to use this feature.');
          return;
        }
      }
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      if ((err as Error).name === 'NotAllowedError') {
        setPermissionDenied(true);
        setError('Camera access was denied. Please enable camera access in your device Settings.');
      } else {
        setError('Unable to access camera. Please ensure you have granted camera permissions.');
      }
    }
  }, [facingMode, stream, isNative, checkAndRequestPermission]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current || !isReady) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.7);
  }, [isReady]);

  const analyzeFrame = useCallback(async () => {
    if (isPaused || isAnalyzing) return;
    
    // Throttle to prevent too many API calls (minimum 1.5 seconds between calls)
    const now = Date.now();
    if (now - lastAnalysisRef.current < 1500) return;
    
    const imageData = captureFrame();
    if (!imageData) return;

    setIsAnalyzing(true);
    lastAnalysisRef.current = now;

    try {
      const { data, error } = await supabase.functions.invoke('count-pills', {
        body: { image: imageData },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult({
        ...data,
        pills: data.pills || []
      });
    } catch (err) {
      console.error('Error analyzing frame:', err);
      // Don't show toast for every failed analysis in live mode
    } finally {
      setIsAnalyzing(false);
    }
  }, [captureFrame, isPaused, isAnalyzing]);

  useEffect(() => {
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (stream) {
      startCamera();
    }
  }, [facingMode]);

  // Start continuous analysis when camera is ready
  useEffect(() => {
    if (isReady && !isPaused) {
      // Analyze immediately when ready
      analyzeFrame();
      
      // Then analyze every 500ms (the actual throttle is in analyzeFrame)
      analysisIntervalRef.current = setInterval(analyzeFrame, 500);
    }

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }
    };
  }, [isReady, isPaused, analyzeFrame]);

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    setResult(null);
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-foreground/80 to-transparent absolute top-0 left-0 right-0 z-10">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-background hover:bg-background/20">
          <X className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-background font-medium">Live Count</span>
          {isAnalyzing && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
        </div>
        <Button variant="ghost" size="icon" onClick={switchCamera} className="text-background hover:bg-background/20">
          <SwitchCamera className="h-6 w-6" />
        </Button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="text-center text-background">
              {permissionDenied ? (
                <Settings className="h-16 w-16 mx-auto mb-4 opacity-50" />
              ) : null}
              <p className="text-lg mb-2">{error}</p>
              {permissionDenied && (
                <p className="text-sm opacity-75 mb-4">
                  Go to Settings → PillCount → Camera and enable access
                </p>
              )}
              <Button onClick={startCamera} variant="outline" className="mt-4 border-background text-background hover:bg-background hover:text-foreground">
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Live pill markers overlay */}
            {result && result.pills && result.pills.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {result.pills.map((pill, index) => (
                  <div
                    key={index}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                    style={{
                      left: `${pill.x}%`,
                      top: `${pill.y}%`,
                    }}
                  >
                    <div className="relative w-6 h-6 rounded-full bg-primary border-2 border-background shadow-lg flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-12 h-12 border-l-4 border-t-4 border-primary rounded-tl-2xl" />
              <div className="absolute top-1/4 right-1/4 w-12 h-12 border-r-4 border-t-4 border-primary rounded-tr-2xl" />
              <div className="absolute bottom-1/4 left-1/4 w-12 h-12 border-l-4 border-b-4 border-primary rounded-bl-2xl" />
              <div className="absolute bottom-1/4 right-1/4 w-12 h-12 border-r-4 border-b-4 border-primary rounded-br-2xl" />
            </div>
          </>
        )}
      </div>

      {/* Live Count Display */}
      <div className="absolute bottom-28 left-0 right-0 flex justify-center">
        <div className="bg-card/90 backdrop-blur-md rounded-2xl px-8 py-4 shadow-lg">
          <div className="text-center">
            <div className="text-5xl font-bold text-foreground">
              {result?.count ?? '-'}
            </div>
            <div className="text-sm text-muted-foreground">
              {result ? `${result.confidence} confidence` : 'Analyzing...'}
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="p-8 flex justify-center gap-4 bg-gradient-to-t from-foreground/80 to-transparent absolute bottom-0 left-0 right-0">
        <Button
          onClick={togglePause}
          variant="outline"
          size="lg"
          className="border-background text-background hover:bg-background hover:text-foreground"
        >
          {isPaused ? (
            <>
              <Play className="h-5 w-5 mr-2" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </>
          )}
        </Button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}