-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create custom types
CREATE TYPE link_type AS ENUM ('internal', 'external');
