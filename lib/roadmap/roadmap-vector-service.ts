import { supabase } from '@/lib/supabase/client';

interface RoadmapForEmbedding {
  goal: string;
  milestones: Array<{
    title: string;
    description: string | null;
    tasks: Array<{
      title: string;
      description: string | null;
    }>;
  }>;
}

export class RoadmapVectorService {
  private static instance: RoadmapVectorService;
  
  private constructor() {}
  
  public static getInstance(): RoadmapVectorService {
    if (!RoadmapVectorService.instance) {
      RoadmapVectorService.instance = new RoadmapVectorService();
    }
    return RoadmapVectorService.instance;
  }

  private calculateTfIdfVector(text: string): Record<string, number> {
    // Simple implementation - in production, you'd want to use a proper TF-IDF library
    const words = text.toLowerCase().split(/\s+/);
    const tf: Record<string, number> = {};
    
    // Calculate term frequency (TF)
    words.forEach(word => {
      if (word.length < 2) return; // Skip very short words
      tf[word] = (tf[word] || 0) + 1;
    });
    
    // Normalize TF by document length
    const docLength = words.length;
    Object.keys(tf).forEach(term => {
      tf[term] = tf[term] / docLength;
    });
    
    return tf;
  }

  private prepareRoadmapText(roadmap: RoadmapForEmbedding): string {
    // Weighted text preparation
    const goalText = `GOAL: ${roadmap.goal}`;
    
    const milestonesText = roadmap.milestones
      .map(milestone => 
        `MILESTONE: ${milestone.title}. ${milestone.description || ''}\n` +
        `TASKS: ${milestone.tasks.map(t => t.title + (t.description ? `: ${t.description}` : '')).join(', ')}`
      )
      .join('\n\n');

    return `${goalText}\n\n${milestonesText}`;
  }

  private normalizeVector(weights: number[], size: number = 300): number[] {
    // Pad or truncate the vector to the target size
    const result = new Array(size).fill(0);
    const length = Math.min(weights.length, size);
    
    // Copy weights to the result array
    for (let i = 0; i < length; i++) {
      result[i] = weights[i] || 0;
    }
    
    // Normalize the vector to unit length
    const norm = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0)) || 1;
    return result.map(val => val / norm);
  }

  public async updateRoadmapVector(userId: string, roadmap: RoadmapForEmbedding): Promise<{success: boolean; message?: string}> {
    try {
      const text = this.prepareRoadmapText(roadmap);
      const tfidfVector = this.calculateTfIdfVector(text);
      const weights = Object.values(tfidfVector);
      const normalizedVector = this.normalizeVector(weights);
      
      // Use Supabase's built-in upsert with the vector type
      const { error } = await supabase
        .from('user_roadmap_vectors')
        .upsert(
          {
            user_id: userId,
            combined_vector: `[${normalizedVector.join(',')}]`,
            last_updated: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      
      if (error) throw error;
      
      // After updating the vector, refresh this user's similarity scores
      await this.refreshUserSimilarities(userId);
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating roadmap vector:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error updating vector' 
      };
    }
  }
  
  /**
   * Refreshes similarity scores for a user
   */
  public async refreshUserSimilarities(userId: string): Promise<{success: boolean; message?: string}> {
    try {
      const { error } = await supabase.rpc('refresh_user_similarities', {
        p_user_id: userId,
        p_score_type: 'cosine',
        p_min_similarity: 0.1  // Only keep similarities >= 0.1 (10%)
      });
      
      if (error) throw error;
      return { success: true };
      
    } catch (error) {
      console.error('Error refreshing user similarities:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error refreshing similarities'
      };
    }
  }

  public async findSimilarUsers(
    userId: string, 
    limit: number = 5,
    minSimilarity: number = 0.3
  ): Promise<Array<{
    user_id: string;
    similarity_score: number;
  }>> {
    try {
      const { data, error } = await supabase.rpc('find_similar_users', {
        p_user_id: userId,
        p_limit: limit,
        p_min_similarity: minSimilarity,
        p_score_type: 'cosine'
      });
      
      if (error) throw error;
      
      // Ensure we return an array of the correct shape
      return (data || []).map((item: { user_id: string; similarity_score: number }) => ({
        user_id: item.user_id,
        similarity_score: item.similarity_score
      }));
      
    } catch (error) {
      console.error('Error finding similar users:', error);
      return [];
    }
  }
}

export const roadmapVectorService = RoadmapVectorService.getInstance();
