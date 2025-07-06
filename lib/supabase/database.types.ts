export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      attachments: {
        Row: {
          id: string;
          note_id: string;
          user_id: string;
          file_name: string;
          file_type: string | null;
          file_size_bytes: number | null;
          storage_path: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          user_id: string;
          file_name: string;
          file_type?: string | null;
          file_size_bytes?: number | null;
          storage_path: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          note_id?: string;
          user_id?: string;
          file_name?: string;
          file_type?: string | null;
          file_size_bytes?: number | null;
          storage_path?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string | null
          created_at: string
          updated_at: string
          content_search?: unknown // This is a generated column in the database
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
