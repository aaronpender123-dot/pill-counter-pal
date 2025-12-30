import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, ImagePlus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  pillCount: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
}

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkUploadDialog({ open, onOpenChange }: BulkUploadDialogProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: UploadItem[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      pillCount: '',
      status: 'pending',
    }));
    setItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateItemCount = (id: string, count: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, pillCount: count } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleUploadAll = async () => {
    const validItems = items.filter((item) => item.pillCount && item.status === 'pending');
    if (validItems.length === 0) {
      toast({
        title: 'No images ready',
        description: 'Please add pill counts to your images before uploading.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    for (const item of validItems) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' } : i))
      );

      try {
        const filename = `bulk-${Date.now()}-${item.id}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('pill-training-images')
          .upload(filename, item.file, {
            contentType: item.file.type,
          });

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('pill_training_data')
          .insert({
            image_path: uploadData.path,
            ai_count: parseInt(item.pillCount),
            corrected_count: parseInt(item.pillCount),
            ai_confidence: 'manual',
            notes: 'Bulk upload - manual count',
          });

        if (dbError) throw dbError;

        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'done' } : i))
        );
      } catch (err) {
        console.error('Error uploading:', err);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'error' } : i))
        );
      }
    }

    setIsUploading(false);

    const doneCount = items.filter((i) => i.status === 'done').length + validItems.length;
    toast({
      title: 'Upload complete',
      description: `Successfully uploaded ${doneCount} images.`,
    });
  };

  const handleClose = () => {
    items.forEach((item) => URL.revokeObjectURL(item.preview));
    setItems([]);
    onOpenChange(false);
  };

  const pendingCount = items.filter((i) => i.status === 'pending' && i.pillCount).length;
  const doneCount = items.filter((i) => i.status === 'done').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Upload Training Images
          </DialogTitle>
          <DialogDescription>
            Upload multiple pill images from your gallery. Enter the actual pill count for each image.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full mb-4"
            disabled={isUploading}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            Add Images
          </Button>

          {items.length > 0 && (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <img
                      src={item.preview}
                      alt="Pill"
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-muted-foreground">
                        {item.file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Label htmlFor={`count-${item.id}`} className="text-xs">
                          Pills:
                        </Label>
                        <Input
                          id={`count-${item.id}`}
                          type="number"
                          min="0"
                          value={item.pillCount}
                          onChange={(e) => updateItemCount(item.id, e.target.value)}
                          className="w-20 h-8 text-sm"
                          disabled={item.status !== 'pending'}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.status === 'uploading' && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {item.status === 'done' && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                      {item.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {items.length === 0 && (
            <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
              <p className="text-sm">No images added yet</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row mt-4">
          <div className="text-sm text-muted-foreground mr-auto">
            {doneCount > 0 && <span className="text-green-500">{doneCount} uploaded</span>}
            {doneCount > 0 && pendingCount > 0 && ' • '}
            {pendingCount > 0 && <span>{pendingCount} ready</span>}
          </div>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Close
          </Button>
          <Button onClick={handleUploadAll} disabled={isUploading || pendingCount === 0}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {pendingCount} Image{pendingCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
