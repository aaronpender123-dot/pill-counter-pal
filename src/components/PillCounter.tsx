import { useState } from 'react';
import { Camera, RotateCcw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Camera as CameraComponent } from '@/components/Camera';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { HealthDisclaimer } from '@/components/HealthDisclaimer';
import { CapsuleLogo } from '@/components/CapsuleLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

interface CountResult {
  count: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}

export function PillCounter() {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CountResult | null>(null);
  const { toast } = useToast();

  const handleCapture = async (imageData: string) => {
    setShowCamera(false);
    setCapturedImage(imageData);
    setIsProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('count-pills', {
        body: { image: imageData },
      });

      if (error) {
        throw new Error(error.message || 'Failed to analyze image');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
      toast({
        title: 'Count Complete',
        description: `Found ${data.count} pill${data.count !== 1 ? 's' : ''} with ${data.confidence} confidence.`,
      });
    } catch (err) {
      console.error('Error counting pills:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to count pills. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCapturedImage(null);
    setResult(null);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-accent';
      case 'medium':
        return 'text-primary';
      case 'low':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5" />;
      case 'low':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen gradient-surface">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {showCamera && (
        <CameraComponent
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="container max-w-lg mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="text-center space-y-2 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-soft mb-4">
            <CapsuleLogo size="lg" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">PillCount</h1>
          <p className="text-muted-foreground">AI-powered pill counting for accuracy you can trust</p>
        </header>

        {/* Main Content */}
        <main className="space-y-6">
          {!capturedImage ? (
            /* Initial State - Capture Button */
            <div className="bg-card rounded-3xl shadow-card p-8 text-center space-y-6 animate-scale-in">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Ready to Count</h2>
                <p className="text-muted-foreground text-sm">
                  Place your pills on a flat, well-lit surface for best results
                </p>
              </div>
              
              <Button
                onClick={() => setShowCamera(true)}
                variant="capture"
                size="xl"
                className="w-full"
              >
                <Camera className="h-6 w-6" />
                Open Camera
              </Button>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">1</div>
                  <div className="text-xs text-muted-foreground">Position pills</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">2</div>
                  <div className="text-xs text-muted-foreground">Capture photo</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">3</div>
                  <div className="text-xs text-muted-foreground">Get count</div>
                </div>
              </div>
            </div>
          ) : (
            /* Image Captured - Show Results */
            <div className="space-y-6">
              {/* Captured Image */}
              <div className="relative rounded-3xl overflow-hidden shadow-card animate-scale-in">
                <img
                  src={capturedImage}
                  alt="Captured pills"
                  className="w-full aspect-[4/3] object-cover"
                />
                
                {isProcessing && (
                  <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
                      <p className="text-background font-medium">Analyzing image...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Result Card */}
              {result && (
                <div className="bg-card rounded-3xl shadow-card p-8 text-center space-y-4 animate-scale-in">
                  <div className="animate-count-reveal">
                    <div className="text-7xl font-bold text-foreground">{result.count}</div>
                    <div className="text-xl text-muted-foreground">
                      pill{result.count !== 1 ? 's' : ''} detected
                    </div>
                  </div>
                  
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary ${getConfidenceColor(result.confidence)}`}>
                    {getConfidenceIcon(result.confidence)}
                    <span className="font-medium capitalize">{result.confidence} confidence</span>
                  </div>

                  {result.notes && (
                    <p className="text-sm text-muted-foreground italic">
                      "{result.notes}"
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={reset}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  <RotateCcw className="h-5 w-5" />
                  New Count
                </Button>
                <Button
                  onClick={() => setShowCamera(true)}
                  variant="capture"
                  size="lg"
                  className="flex-1"
                  disabled={isProcessing}
                >
                  <Camera className="h-5 w-5" />
                  Retake
                </Button>
              </div>
            </div>
          )}
        </main>

        {/* Tips */}
        <footer className="text-center text-sm text-muted-foreground space-y-4 animate-fade-in">
          <div className="space-y-2">
            <p className="font-medium">Tips for accurate counting:</p>
            <ul className="space-y-1">
              <li>• Use good lighting (natural light works best)</li>
              <li>• Spread pills apart to avoid overlap</li>
              <li>• Use a contrasting background</li>
            </ul>
          </div>
          
          {/* Health Disclaimer */}
          <HealthDisclaimer />
        </footer>
      </div>
    </div>
  );
}
