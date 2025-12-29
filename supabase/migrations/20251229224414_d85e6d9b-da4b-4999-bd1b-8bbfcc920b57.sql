-- Create storage bucket for pill training images
INSERT INTO storage.buckets (id, name, public)
VALUES ('pill-training-images', 'pill-training-images', false);

-- Create table to track training data
CREATE TABLE public.pill_training_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_path TEXT NOT NULL,
  ai_count INTEGER NOT NULL,
  corrected_count INTEGER,
  ai_confidence TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pill_training_data ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert training data (anonymous contributions)
CREATE POLICY "Anyone can contribute training data"
ON public.pill_training_data
FOR INSERT
WITH CHECK (true);

-- Only allow reading for admin purposes (you can adjust this later)
CREATE POLICY "Training data is write-only for contributors"
ON public.pill_training_data
FOR SELECT
USING (false);

-- Storage policies for pill-training-images bucket
CREATE POLICY "Anyone can upload pill training images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'pill-training-images');

CREATE POLICY "Training images are private"
ON storage.objects
FOR SELECT
USING (bucket_id = 'pill-training-images' AND false);