'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';

type Task = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  priority: string;
  order_index: number | null;
  created_at: string;
  updated_at: string;
  milestone_id: string;
};

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  order_index: number | null;
  created_at: string;
  updated_at: string;
  roadmap_id: string;
  tasks: Task[];
};

type Roadmap = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  final_goal: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  milestones: Milestone[];
};

export function RoadmapVisualization() {
  const { user } = useUser();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoadmapData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) {
        setError('User profile not found');
        setLoading(false);
        return;
      }

      const { data: roadmapData, error: roadmapError } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (roadmapError) {
        if (roadmapError.code === 'PGRST116') {
          setLoading(false);
          return;
        }
        throw roadmapError;
      }

      if (!roadmapData) {
        setLoading(false);
        return;
      }

      const { data: milestones, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('roadmap_id', roadmapData.id)
        .order('order_index', { ascending: true });

      if (milestonesError) throw milestonesError;

      const milestonesWithTasks = await Promise.all(
        (milestones || []).map(async (milestone) => {
          const { data: tasks, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('milestone_id', milestone.id)
            .order('order_index', { ascending: true });

          if (tasksError) throw tasksError;

          return {
            ...milestone,
            tasks: tasks || [],
          };
        })
      );

      setRoadmap({
        ...roadmapData,
        milestones: milestonesWithTasks || [],
      });
    } catch (err) {
      console.error('Error fetching roadmap data:', err);
      setError('Failed to load roadmap data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRoadmapData();
  }, [fetchRoadmapData]);

  if (loading) return <div className="p-4 text-foreground/80">Loading roadmap...</div>;
  if (error) return <div className="p-4 text-destructive">{error}</div>;
  if (!roadmap) {
    return (
      <div className="rounded-lg border border-border bg-background p-4">
        <h3 className="text-lg font-medium">No Roadmap Found</h3>
        <p className="mt-1 text-sm text-muted-foreground">Create one to get started!</p>
      </div>
    );
  }

  const startDate = roadmap.start_date ? new Date(roadmap.start_date) : new Date();
  const endDate = roadmap.end_date ? new Date(roadmap.end_date) : new Date();
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;

  const getMilestonePosition = (milestoneDate: string | null) => {
    if (!milestoneDate) return 0;
    const date = new Date(milestoneDate);
    const daysFromStart = Math.max(0, (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(100, Math.max(0, (daysFromStart / totalDays) * 100));
  };

  const sortedMilestones = [...roadmap.milestones].sort((a, b) => {
    const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
    const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
    return dateA - dateB;
  });

  return (
    <div className="p-4 flex flex-col h-full " >
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4 border-b border-border/50 mb-4 space-y-2">
        <h2 className="text-2xl font-bold text-foreground">{roadmap.title}</h2>
        {roadmap.description && <p className="text-foreground/80">{roadmap.description}</p>}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{startDate.toLocaleDateString()}</span>
          <span>{(endDate.getTime() - Date.now() > 0) ? 'Remaining' : 'Completed'}</span>
          <span>{endDate.toLocaleDateString()}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary/80 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, ((Date.now() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100))}%` }} />
        </div>
      </div>

      <div className="relative flex">
        {/* Timeline with time markers */}
        <div className="relative w-32 shrink-0">
          <div className="absolute left-8 top-0 h-full w-px border-l border-gray-300 dark:border-gray-600" />
          {Array.from({ length: 5 }).map((_, i) => {
            const date = new Date(startDate);
            const increment = (endDate.getTime() - startDate.getTime()) / 4;
            date.setTime(startDate.getTime() + increment * i);
            return (
              <div 
                key={i} 
                className="absolute flex items-center" 
                style={{ 
                  top: `${(i / 4) * 100}%`, 
                  transform: 'translateY(-50%)',
                  left: '2rem' 
                }}
              >
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="ml-3 text-xs text-muted-foreground whitespace-nowrap">
                  {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>

        {/* Milestone list */}
        <div className="flex-1 pl-4">
          {sortedMilestones.map((milestone) => {
            const position = getMilestonePosition(milestone.start_date || milestone.created_at);
            return (
              <div 
                key={milestone.id} 
                className="relative flex items-start mb-8" 
                style={{ marginTop: `${position}%` }}
              >
                <div className="w-full rounded-lg border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-foreground">{milestone.title}</h3>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{milestone.status}</span>
                  </div>
                  {milestone.start_date && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(milestone.start_date).toLocaleDateString()}
                      {milestone.end_date && ` - ${new Date(milestone.end_date).toLocaleDateString()}`}
                    </div>
                  )}
                  {milestone.description && <p className="mt-2 text-sm text-muted-foreground">{milestone.description}</p>}
                  {milestone.tasks && milestone.tasks.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h4 className="text-sm font-medium text-foreground/80">Tasks</h4>
                      <ul className="space-y-2">
                        {milestone.tasks.map((task) => (
                          <li key={task.id} className="flex items-start">
                            <input type="checkbox" checked={task.status === 'completed'} readOnly className="mt-1 size-4 rounded border-border text-primary" />
                            <div className="ml-3">
                              <span className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{task.title}</span>
                              {task.due_date && <span className="ml-2 text-xs text-muted-foreground">Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
