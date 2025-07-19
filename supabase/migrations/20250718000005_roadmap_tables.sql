-- Create roadmaps table
CREATE TABLE public.roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  final_goal text,
  start_date date,
  end_date date,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Set up RLS for roadmaps
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

-- RLS Policy for roadmaps
CREATE POLICY "Users can manage their own roadmaps" 
  ON public.roadmaps FOR ALL 
  USING (auth.uid() = user_id);

-- Create milestones table
CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id uuid NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date,
  end_date date,
  status text DEFAULT 'pending',
  order_index int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Set up RLS for milestones
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policy for milestones
CREATE POLICY "Users can manage milestones for their roadmaps" 
  ON public.milestones FOR ALL 
  USING ((SELECT user_id FROM roadmaps WHERE id = roadmap_id) = auth.uid());

-- Create tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text DEFAULT 'todo',
  priority text DEFAULT 'medium',
  order_index int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Set up RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy for tasks
CREATE POLICY "Users can manage tasks for their milestones" 
  ON public.tasks FOR ALL 
  USING ((SELECT user_id FROM milestones m JOIN roadmaps r ON m.roadmap_id = r.id WHERE m.id = milestone_id) = auth.uid());
