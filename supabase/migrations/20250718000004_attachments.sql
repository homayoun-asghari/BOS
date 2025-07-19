-- Create attachments table
CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text,
  file_size_bytes bigint,
  storage_path text UNIQUE NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- Set up RLS for attachments
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attachments
CREATE POLICY "Users can create attachments for their notes" 
  ON public.attachments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view attachments for their notes" 
  ON public.attachments FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete attachments for their notes" 
  ON public.attachments FOR DELETE 
  USING (auth.uid() = user_id);

-- Storage policies for notes-attachments bucket
CREATE POLICY "Allow authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notes-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow authenticated view"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notes-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Allow authenticated delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notes-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
