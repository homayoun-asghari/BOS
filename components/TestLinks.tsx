'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export function TestLinks() {
  const params = useParams();
  const noteId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLinks() {
      if (!noteId) return;
      
      setLoading(true);
      console.log('Fetching links for note:', noteId);
      
      try {
        const { data, error } = await supabase
          .from('note_links')
          .select('*')
          .eq('note_id', noteId);
          
        if (error) throw error;
        
        console.log('Fetched links:', data);
        setLinks(data || []);
      } catch (error) {
        console.error('Error fetching links:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLinks();
  }, [noteId]);

  if (loading) return <div>Loading links...</div>;

  return (
    <div className="p-4 border rounded-lg bg-muted">
      <h3 className="font-bold mb-2">Links for Note: {noteId}</h3>
      <pre className="text-xs overflow-auto p-2 bg-background rounded">
        {JSON.stringify(links, null, 2)}
      </pre>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-2 text-xs text-blue-500 hover:underline"
      >
        Refresh Links
      </button>
    </div>
  );
}
