'use client';

import { useState, useEffect, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { JournalDatePicker } from '@/components/journal/JournalDatePicker';
import { createClient } from '@/lib/supabase/client';
import { MinimalEditorWrapper } from '@/components/editor/MinimalEditorWrapper';

interface JSONContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: Array<{
    type: string;
    attrs?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  text?: string;
  [key: string]: unknown;
}

type JournalContent = JSONContent;

interface JournalEntry {
  id: string;
  title: string;
  content: JournalContent;
  day_index: number;
}

export default function JournalPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const supabase = createClient();

  // Format date as "YYYY DayOfWeek" (e.g., "2025 Friday")
  const formatDateHeader = useCallback((date: Date): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      date = new Date(); // Fallback to current date if invalid
    }
    const year = date.getFullYear();
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    return `${year} ${dayOfWeek}`;
  }, []);

  // Create initial content with date header
  const createInitialContent = useCallback((date: Date): JournalContent => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      date = new Date(); // Fallback to current date if invalid
    }
    const dateHeader = formatDateHeader(date);
    
    // Create a new content object with the date header
    const newContent: JournalContent = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: dateHeader }]
        },
        { type: 'paragraph' }
      ]
    };
    
    console.log('Created initial content:', JSON.stringify(newContent, null, 2));
    return newContent;
  }, [formatDateHeader]);

  // Fetch journal entry for the selected date using the database function
  const fetchJournalEntry = useCallback(async (date: Date) => {
    try {
      setIsLoading(true);
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      // Ensure we have a valid date
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        date = new Date();
      }

      // Format date as YYYY-MM-DD in user's local timezone
      const formattedDate = date.toISOString().split('T')[0];
      console.log('Fetching journal for date:', formattedDate);

      // Get the journal entry using the database function
      const { data, error } = await supabase
        .rpc('get_journal_by_date', {
          p_user_id: userId,
          p_date: formattedDate
        })
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
        console.error('Error fetching journal:', error);
        throw error;
      }

      if (data) {
        console.log('Found existing journal entry:', data);
        
        // Ensure we have valid content
        const entryData = data as JournalEntry;
        const content: JournalContent = entryData.content || { type: 'doc', content: [] };
        const contentArray = Array.isArray(content.content) ? content.content : [];
        
        // Check if the content already has the date header
        const dateHeader = formatDateHeader(date);
        const hasDateHeader = contentArray.length > 0 && 
                            contentArray[0]?.type === 'heading' && 
                            contentArray[0]?.content?.[0]?.text === dateHeader;
        
        if (hasDateHeader) {
          // If the header is already there, use the content as is
          setJournal(entryData);
        } else {
          // If the header is missing, create a new content with the header
          const newContent = createInitialContent(date);
          
          // If there's existing content, append it after the header
          if (contentArray.length > 0) {
            // Create a new content object with the date header and existing content
            const updatedContent: JournalContent = {
              ...content,
              content: [
                ...(newContent.content || []),
                ...contentArray
              ]
            };
            
            // Update the journal entry with the new content
            const updatedJournal: JournalEntry = {
              ...entryData,
              content: updatedContent
            };
            
            console.log('Updated journal entry with date header:', updatedJournal);
            setJournal(updatedJournal);
          } else {
            // If no existing content, just use the new content with the header
            const updatedJournal: JournalEntry = {
              ...entryData,
              content: newContent
            };
            
            console.log('Updated journal entry with new date header:', updatedJournal);
            setJournal(updatedJournal);
          }
        }
      } else {
        console.log('No existing journal entry, creating new one');
        // If no entry exists, create a new one with the date header
        const newContent = createInitialContent(date);
        console.log('New content created:', newContent);
        
        const newJournal = {
          id: '',
          title: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          content: newContent,
          day_index: getDayOfYear(date)
        };
        console.log('New journal entry to be created:', newJournal);
        setJournal(newJournal);
      }
    } catch (error) {
      console.error('Error fetching journal entry:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, createInitialContent]);

  // Save journal entry
  const saveJournalEntry = useCallback(async () => {
    if (!journal) return;
    
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      // Define default empty content
      const defaultContent: JournalContent = { type: 'doc', content: [] };
      
      // Ensure we have valid content to work with
      const currentContent = journal.content || defaultContent;
      const dateHeader = formatDateHeader(selectedDate);
      
      // Type guard to check if content has the date header
      const hasDateHeader = (
        currentContent.content && 
        currentContent.content.length > 0 &&
        currentContent.content[0]?.type === 'heading' &&
        currentContent.content[0].content?.[0]?.text === dateHeader
      );
      
      // If we don't have a date header, create one
      if (!hasDateHeader) {
        const newContent = createInitialContent(selectedDate);
        
        // If there's existing content, append it after the header
        if (currentContent.content && currentContent.content.length > 0) {
          // Create a safe array to work with
          const safeContent = Array.isArray(currentContent.content) ? currentContent.content : [];
          
          // Skip the first element if it was a different header
          const contentToAppend = safeContent[0]?.type === 'heading'
            ? safeContent.slice(1)
            : safeContent;
            
          // Ensure we have valid arrays to spread
          const newContentArray = Array.isArray(newContent.content) ? newContent.content : [];
          const appendArray = Array.isArray(contentToAppend) ? contentToAppend : [];
          
          newContent.content = [...newContentArray, ...appendArray];
        }
        
        // Update the content with the new header
        const updatedJournal = {
          ...journal,
          content: newContent
        };
        
        setJournal(updatedJournal);
        
        // Use the updated content for saving
        if (journal.id) {
          const { error } = await supabase
            .from('journals')
            .update({ 
              content: newContent,
              updated_at: new Date().toISOString()
            })
            .eq('id', journal.id);

          if (error) throw error;
        } else {
          const { data: newJournal, error } = await supabase
            .from('journals')
            .insert({
              user_id: userId,
              title: selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
              content: newContent,
              day_index: getDayOfYear(selectedDate),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;
          setJournal(newJournal as JournalEntry);
        }
      } else {
        // Save the existing content as is
        if (journal.id) {
          const { error } = await supabase
            .from('journals')
            .update({ 
              content: currentContent,
              updated_at: new Date().toISOString()
            })
            .eq('id', journal.id);

          if (error) throw error;
        } else {
          const { data: newJournal, error } = await supabase
            .from('journals')
            .insert({
              user_id: userId,
              title: selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
              content: currentContent,
              day_index: getDayOfYear(selectedDate),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;
          setJournal(newJournal as JournalEntry);
        }
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
    }
  }, [journal, selectedDate, supabase, formatDateHeader, createInitialContent]);
  
  // Helper function to calculate day of year (1-366)
  const getDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // Adjust for leap years
    const isLeapYear = (year: number) => 
      (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    
    if (!isLeapYear(date.getFullYear()) && dayOfYear > 59) {
      return dayOfYear + 1;
    }
    return dayOfYear;
  };

  // Handle editor changes
  const handleEditorChange = useCallback((content: string) => {
    if (!journal) return;
    
    try {
      // Parse the content string back to JSON
      const parsedContent = JSON.parse(content) as JournalContent;
      
      // Update the local state with the new content
      setJournal(prev => ({
        ...prev!,
        content: parsedContent
      }));
      
      // Auto-save after a delay
      const timer = setTimeout(() => {
        saveJournalEntry();
      }, 1000);
      
      return () => clearTimeout(timer);
    } catch (error) {
      console.error('Error parsing editor content:', error);
    }
  }, [journal, saveJournalEntry]);
  
  // Set up editor ready state
  useEffect(() => {
    if (!journal) return;
    
    // Use a small delay to ensure the editor is mounted
    const timer = setTimeout(() => {
      setIsEditorReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [journal]);



  // Set up non-scrollable page and fetch entry when selected date changes
  useEffect(() => {
    // Prevent page scrolling
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    
    fetchJournalEntry(selectedDate);
    
    // Cleanup function to re-enable scrolling when component unmounts
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [selectedDate, fetchJournalEntry]);

  // Handle date change
  const handleDateChange = (date: Date) => {
    // The content is already saved via auto-save when it changes
    setSelectedDate(date);
  };

  if (isLoading && !journal) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-4/6" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen w-full">
        <div className="px-6 pt-6 w-full flex-shrink-0">
          <div className="flex justify-between items-center w-full">
            <h1 className="text-2xl font-semibold">How was your day?</h1>
            <div>
              <JournalDatePicker 
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col w-full overflow-hidden">
          <div className="w-full px-6 py-4 h-full">
            <div className="w-full h-full">
              <div className="h-full w-full relative">
                <MinimalEditorWrapper
                  value={journal?.content ? JSON.stringify(journal.content) : '{"type":"doc","content":[{"type":"paragraph"}]}'}
                  onChange={handleEditorChange}
                  className="h-full w-full"
                  showTagInput={false}
                  placeholder="I am future YOU, talk to me ..."
                />
                {!isEditorReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                    <div className="animate-pulse">Loading editor...</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
