import { User, Session } from '@supabase/supabase-js';

export declare function getCurrentUser(): Promise<User | null>;
export declare function getSession(): Promise<Session | null>;
export declare function signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null; }>;
export declare function signOut(): Promise<boolean>;
