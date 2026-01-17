import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera as CameraIcon, SwitchCamera, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNativeCamera } from '@/hooks/useNativeCamera';

interface CameraProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function Camera({ onCapture, onClose }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
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
      
      // Stop existing stream
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

  useEffect(() => {
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (stream) {
      startCamera();
    }
  }, [facingMode]);

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    
    onCapture(imageData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-foreground/80 to-transparent absolute top-0 left-0 right-0 z-10">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-background hover:bg-background/20">
          <X className="h-6 w-6" />
        </Button>
        <span className="text-background font-medium">Position pills in frame</span>
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
              ) : (
                <CameraIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
              )}
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
            
            {/* Viewfinder overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner markers */}
              <div className="absolute top-1/4 left-1/4 w-12 h-12 border-l-4 border-t-4 border-primary rounded-tl-2xl" />
              <div className="absolute top-1/4 right-1/4 w-12 h-12 border-r-4 border-t-4 border-primary rounded-tr-2xl" />
              <div className="absolute bottom-1/4 left-1/4 w-12 h-12 border-l-4 border-b-4 border-primary rounded-bl-2xl" />
              <div className="absolute bottom-1/4 right-1/4 w-12 h-12 border-r-4 border-b-4 border-primary rounded-br-2xl" />
              
              {/* Scanning line */}
              <div className="absolute top-1/4 left-1/4 right-1/4 h-0.5 bg-primary/50 animate-scan" />
            </div>
          </>
        )}
      </div>

      {/* Capture Button */}
      <div className="p-8 flex justify-center bg-gradient-to-t from-foreground/80 to-transparent absolute bottom-0 left-0 right-0">
        <button
          onClick={captureImage}
          disabled={!isReady}
          className="relative w-20 h-20 rounded-full bg-background disabled:opacity-50 transition-transform hover:scale-105 active:scale-95"
        >
          <span className="absolute inset-2 rounded-full gradient-primary" />
          <span className="absolute inset-0 rounded-full border-4 border-background" />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
