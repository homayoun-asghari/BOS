-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum for similarity score type
CREATE TYPE similarity_score_type AS ENUM ('cosine', 'euclidean', 'inner_product');

-- Single table for roadmap vectors
CREATE TABLE user_roadmap_vectors (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  combined_vector VECTOR(300) NOT NULL,  -- Using pgvector's VECTOR type, 300 dimensions
  metadata JSONB DEFAULT '{}'::jsonb,    -- For future extensibility
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For fast similarity search
CREATE INDEX idx_user_roadmap_vectors_combined 
  ON user_roadmap_vectors 
  USING ivfflat (combined_vector vector_cosine_ops)
  WITH (lists = 100);  -- Good default for up to 1M vectors

-- Cache for similarity scores
CREATE TABLE user_similarities (
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL,
  score_type similarity_score_type NOT NULL DEFAULT 'cosine',
  metadata JSONB DEFAULT '{}'::jsonb,    -- For future extensibility
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_a, user_b, score_type),
  CONSTRAINT different_users CHECK (user_a <> user_b)
);

-- Index for faster lookups
CREATE INDEX idx_user_similarities_user_a ON user_similarities(user_a, score_type, last_updated);
CREATE INDEX idx_user_similarities_user_b ON user_similarities(user_b, score_type, last_updated);

-- Function to update vectors when roadmaps change
CREATE OR REPLACE FUNCTION update_roadmap_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- This will be called from our application code
  -- The actual vector update will happen in the application
  -- We're just ensuring the trigger exists for future use
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for roadmap changes
CREATE TRIGGER roadmap_changes
AFTER INSERT OR UPDATE OR DELETE ON public.roadmaps
FOR EACH ROW EXECUTE FUNCTION update_roadmap_vector();

-- Helper function to find similar users
CREATE OR REPLACE FUNCTION find_similar_users(
  p_user_id UUID,
  p_limit INT DEFAULT 10,
  p_min_similarity FLOAT DEFAULT 0.5,
  p_score_type similarity_score_type DEFAULT 'cosine'
)
RETURNS TABLE (
  user_id UUID,
  similarity_score FLOAT,
  score_type similarity_score_type
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN us.user_a = p_user_id THEN us.user_b
      ELSE us.user_a
    END AS user_id,
    us.similarity_score,
    us.score_type
  FROM user_similarities us
  WHERE (us.user_a = p_user_id OR us.user_b = p_user_id)
    AND us.score_type = p_score_type
    AND us.similarity_score >= p_min_similarity
  ORDER BY us.similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add RLS policies for security
ALTER TABLE user_roadmap_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_similarities ENABLE ROW LEVEL SECURITY;

-- Users can only see their own vectors and similarities
-- Users can view their own vectors
CREATE POLICY "Users can view their own roadmap vectors"
  ON user_roadmap_vectors
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert/update their own vectors
CREATE POLICY "Users can update their own roadmap vectors"
  ON user_roadmap_vectors
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own similarity scores"
  ON user_similarities
  FOR SELECT
  USING (auth.uid() IN (user_a, user_b));

-- Service role can manage all data (for background jobs)
CREATE POLICY "Service role full access"
  ON user_roadmap_vectors
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access"
  ON user_similarities
  USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE user_roadmap_vectors IS 'Stores vector embeddings of user roadmaps for similarity matching';
COMMENT ON TABLE user_similarities IS 'Cached similarity scores between user roadmaps';
COMMENT ON FUNCTION find_similar_users IS 'Finds users with similar roadmaps based on vector similarity';

-- Function to calculate and update similarity between two users
CREATE OR REPLACE FUNCTION calculate_user_similarity(
  p_user_a UUID,
  p_user_b UUID,
  p_score_type similarity_score_type DEFAULT 'cosine'
) RETURNS FLOAT AS $$
DECLARE
  v_similarity FLOAT;
  v_vector_a VECTOR(300);
  v_vector_b VECTOR(300);
BEGIN
  -- Get the vectors for both users
  SELECT combined_vector INTO v_vector_a 
  FROM user_roadmap_vectors 
  WHERE user_id = p_user_a;
  
  SELECT combined_vector INTO v_vector_b 
  FROM user_roadmap_vectors 
  WHERE user_id = p_user_b;
  
  -- Calculate similarity based on the requested type
  IF p_score_type = 'cosine' THEN
    v_similarity := v_vector_a <=> v_vector_b;  -- Cosine distance (1 - cosine similarity)
    v_similarity := 1.0 - v_similarity;         -- Convert to similarity (0 to 1)
  ELSIF p_score_type = 'euclidean' THEN
    v_similarity := v_vector_a <-> v_vector_b;  -- Euclidean distance
    v_similarity := 1.0 / (1.0 + v_similarity); -- Convert to similarity (0 to 1)
  ELSE  -- inner_product
    v_similarity := v_vector_a <#> v_vector_b;  -- Negative inner product
    v_similarity := (v_similarity + 1.0) / 2.0; -- Convert to 0-1 range
  END IF;
  
  -- Ensure similarity is between 0 and 1
  v_similarity := GREATEST(0.0, LEAST(1.0, v_similarity));
  
  -- Update the similarities table (handles both insert and update)
  INSERT INTO user_similarities (user_a, user_b, similarity_score, score_type)
  VALUES (
    LEAST(p_user_a, p_user_b),
    GREATEST(p_user_a, p_user_b),
    v_similarity,
    p_score_type
  )
  ON CONFLICT (user_a, user_b, score_type) 
  DO UPDATE SET 
    similarity_score = EXCLUDED.similarity_score,
    last_updated = NOW();
  
  RETURN v_similarity;
END;
$$ LANGUAGE plpgsql;

-- Function to update all similarity scores for a user
CREATE OR REPLACE FUNCTION refresh_user_similarities(
  p_user_id UUID,
  p_score_type similarity_score_type DEFAULT 'cosine',
  p_min_similarity FLOAT DEFAULT 0.0
) RETURNS VOID AS $$
BEGIN
  -- Update similarities with all other users who have vectors
  PERFORM calculate_user_similarity(p_user_id, user_id, p_score_type)
  FROM user_roadmap_vectors
  WHERE user_id != p_user_id;
  
  -- Delete any similarities below the threshold
  DELETE FROM user_similarities
  WHERE (user_a = p_user_id OR user_b = p_user_id)
    AND score_type = p_score_type
    AND similarity_score < p_min_similarity;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all similarity scores (for background jobs)
CREATE OR REPLACE FUNCTION refresh_all_similarities(
  p_score_type similarity_score_type DEFAULT 'cosine',
  p_min_similarity FLOAT DEFAULT 0.0
) RETURNS VOID AS $$
BEGIN
  -- For each user with a vector, update their similarities with all other users
  PERFORM refresh_user_similarities(user_id, p_score_type, p_min_similarity)
  FROM user_roadmap_vectors;
END;
$$ LANGUAGE plpgsql; SECURITY DEFINER;
