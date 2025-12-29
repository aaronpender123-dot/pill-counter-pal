import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Heart, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageData: string;
  aiCount: number;
  confidence: string;
  notes: string;
}

export function ContributeDialog({
  open,
  onOpenChange,
  imageData,
  aiCount,
  confidence,
  notes,
}: ContributeDialogProps) {
  const [correctedCount, setCorrectedCount] = useState<string>(aiCount.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Convert base64 to blob
      const base64Response = await fetch(imageData);
      const blob = await base64Response.blob();

      // Generate unique filename
      const filename = `pill-image-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      // Upload image to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pill-training-images')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('pill_training_data')
        .insert({
          image_path: uploadData.path,
          ai_count: aiCount,
          corrected_count: parseInt(correctedCount) !== aiCount ? parseInt(correctedCount) : null,
          ai_confidence: confidence,
          notes: notes || null,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Thank you!',
        description: 'Your contribution will help improve pill counting accuracy.',
      });

      onOpenChange(false);
    } catch (err) {
      console.error('Error contributing:', err);
      toast({
        title: 'Error',
        description: 'Failed to save your contribution. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Help Improve PillCount
          </DialogTitle>
          <DialogDescription>
            Contribute this image to help train our AI. Your data helps improve accuracy for everyone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-xl overflow-hidden">
            <img
              src={imageData}
              alt="Captured pills"
              className="w-full aspect-video object-cover"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="count">Actual pill count (correct if needed)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="count"
                type="number"
                min="0"
                value={correctedCount}
                onChange={(e) => setCorrectedCount(e.target.value)}
                className="w-24"
              />
              {parseInt(correctedCount) !== aiCount && (
                <span className="text-sm text-muted-foreground">
                  AI counted: {aiCount}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            No thanks
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !correctedCount}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Contribute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}