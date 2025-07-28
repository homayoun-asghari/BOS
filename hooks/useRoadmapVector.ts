import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { roadmapVectorService } from '@/lib/roadmap/roadmap-vector-service';

interface UseRoadmapVectorProps {
  roadmap?: {
    final_goal: string;
    milestones: Array<{
      title: string;
      description: string | null;
      tasks: Array<{
        title: string;
        description: string | null;
      }>;
    }>;
  };
  isSaving?: boolean;
}

export function useRoadmapVector({ roadmap, isSaving }: UseRoadmapVectorProps) {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id || !roadmap || !isSaving) return;

    const updateVector = async () => {
      try {
        await roadmapVectorService.updateRoadmapVector(user.id, {
          goal: roadmap.final_goal,
          milestones: roadmap.milestones.map(m => ({
            title: m.title,
            description: m.description,
            tasks: m.tasks || []
          }))
        });
      } catch (error) {
        console.error('Failed to update roadmap vector:', error);
        // Consider showing a toast notification here
      }
    };

    updateVector();
  }, [user?.id, roadmap, isSaving]);

  return {
    findSimilarUsers: roadmapVectorService.findSimilarUsers.bind(roadmapVectorService)
  };
}
