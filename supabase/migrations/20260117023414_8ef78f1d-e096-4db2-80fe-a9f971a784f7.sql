-- Create a secure function to get training data count
-- This bypasses RLS safely since it only returns a count (not actual data)
CREATE OR REPLACE FUNCTION public.get_training_data_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.pill_training_data;
$$;