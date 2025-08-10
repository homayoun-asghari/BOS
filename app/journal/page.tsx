'use client';

import { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { JournalDatePicker } from '@/components/journal/JournalDatePicker';
import { supabase } from '@/lib/supabase/client';
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
  updated_at?: string; // Matches Supabase timestamp field
}

export default function JournalPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  // Used to track when editor is ready to receive content

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
    console.log('fetchJournalEntry called with date:', date);
    try {
      setIsLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log('User auth data:', { userData, userError });
      
      const userId = userData?.user?.id;
      if (!userId) {
        console.error('No user ID found');
        return;
      }

      // Ensure we have a valid date
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.log('Invalid date provided, falling back to current date');
        date = new Date();
      }
      
      console.log('Using date for query:', date);

      // Format date as YYYY-MM-DD in user's local timezone
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // getMonth() is zero-based
      const day = date.getDate();
      const formattedDate = `${year}-${pad(month)}-${pad(day)}`;
      
      // Check if the selected date is today
      const today = new Date();
      const isToday = date.getDate() === today.getDate() && 
                     date.getMonth() === today.getMonth() && 
                     date.getFullYear() === today.getFullYear();
      
      console.log('Fetching journal for date:', {
        originalDate: date,
        year,
        month,
        day,
        formattedDate,
        isToday,
        dateString: date.toDateString(),
        todayString: today.toDateString(),
        timezoneOffset: date.getTimezoneOffset()
      });

      // Get the journal entry using the database function
      console.log('Calling get_journal_by_date with params:', {
        p_user_id: userId,
        p_date: formattedDate
      });
      
      const { data, error } = await supabase
        .rpc('get_journal_by_date', {
          p_user_id: userId,
          p_date: formattedDate
        })
        .single();
        
      console.log('Database response:', { data, error });

      if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows returned'
        console.error('Error fetching journal:', error);
        throw error;
      }

      const dateHeader = formatDateHeader(date);
      
      if (data) {
        console.log('Found existing journal entry:', data);
        const entryData = data as JournalEntry;
        
        // Use existing content for today's date
        if (isToday) {
          console.log('Using existing content for today');
          setJournal(entryData);
        } else {
          // For past dates, use the existing content but ensure it has the correct date header
          const content: JournalContent = entryData.content || { type: 'doc', content: [] };
          const contentArray = Array.isArray(content.content) ? content.content : [];
          
          // Check if the content already has the correct date header
          const hasDateHeader = contentArray.length > 0 && 
                              contentArray[0]?.type === 'heading' && 
                              contentArray[0]?.content?.[0]?.text === dateHeader;
          
          if (hasDateHeader) {
            setJournal(entryData);
          } else {
            // If the header is missing or incorrect, create a new content with the correct header
            const newContent = createInitialContent(date);
            
            // If there's existing content, append it after the header
            if (contentArray.length > 0) {
              // Skip the first element if it was a different header
              const contentToAppend = contentArray[0]?.type === 'heading'
                ? contentArray.slice(1)
                : contentArray;
                
              newContent.content = [
                ...(newContent.content || []),
                ...contentToAppend
              ];
            }
            
            const updatedJournal: JournalEntry = {
              ...entryData,
              content: newContent
            };
            
            console.log('Updated journal entry with correct date header:', updatedJournal);
            setJournal(updatedJournal);
          }
        }
      } else {
        console.log('No existing journal entry, creating new one');
        // Create a new entry with the date header
        const newContent = createInitialContent(date);
        
        const newJournal = {
          id: '',
          title: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
          content: newContent,
          day_index: getDayOfYear(date)
        };
        
        console.log('New journal entry created:', newJournal);
        setJournal(newJournal);
      }
    } catch (error) {
      console.error('Error fetching journal entry:', error);
    } finally {
      setIsLoading(false);
    }
  }, [createInitialContent, formatDateHeader]);  // Only include function dependencies, not supabase

  // Note: Previous saveJournalEntry function removed as it's replaced by saveJournalDebounced
  
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
  
  // Create a debounced save function - DEFINED FIRST to avoid circular reference
  const saveJournalDebounced = useCallback(
    // Using an inline function to satisfy the linter
    function debouncedSave(updatedJournal: JournalEntry) {
      const saveFunction = debounce(async (journalToSave: JournalEntry) => {
        console.log('Auto-saving journal entry...');
        try {
          const userId = (await supabase.auth.getUser()).data.user?.id;
          if (!userId) return;
  
          if (journalToSave.id) {
            // Update existing entry
            const { error } = await supabase
              .from('journals')
              .update({ 
                content: journalToSave.content,
                updated_at: journalToSave.updated_at
              })
              .eq('id', journalToSave.id);
  
            if (error) throw error;
            console.log('Journal entry updated successfully');
          } else {
            // Create new entry
            const { data: newJournal, error } = await supabase
              .from('journals')
              .insert({
                user_id: userId,
                title: selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
                content: journalToSave.content,
                day_index: getDayOfYear(selectedDate),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
  
            if (error) throw error;
            setJournal(newJournal as JournalEntry);
            console.log('New journal entry created successfully');
          }
        } catch (error) {
          console.error('Error saving journal entry:', error);
        }
      }, 1000);
      
      saveFunction(updatedJournal);
      return saveFunction.cancel;
    },
    // Only including selectedDate as dependency since supabase is imported and won't change
    [selectedDate]
  );

  // Handle editor changes
  const handleEditorChange = useCallback((content: string) => {
    if (!journal) return;
    
    try {
      // Parse the content string back to JSON
      const parsedContent = JSON.parse(content) as JournalContent;
      
      // Check if we need to add the current year's date header
      const dateHeader = formatDateHeader(selectedDate);
      let contentToSave = parsedContent;
      
      // Check if the content has a header for the current year
      const contentArray = Array.isArray(parsedContent.content) ? parsedContent.content : [];
      const currentYear = selectedDate.getFullYear().toString();
      
      // Look for a heading that contains the current year (e.g., "2025 Wednesday")
      const hasCurrentYearHeader = contentArray.some(node => 
        node?.type === 'heading' && 
        node?.content?.[0]?.text?.includes(currentYear)
      );
      
      // If there's no header for the current year, add it at the beginning
      if (!hasCurrentYearHeader) {
        console.log('Adding new year header:', dateHeader);
        
        // Create a new header node for this year
        const headerNode = {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: dateHeader }]
        };
        
        // Always add the new year heading at the beginning
        // This preserves all previous years' headings and content
        contentArray.unshift(headerNode);
        
        // Update the content with the new header
        contentToSave = {
          ...parsedContent,
          content: contentArray
        };
      } else {
        // Current year header already exists, no changes needed
        contentToSave = parsedContent;
      }
      
      // Update the local state with the new content
      const updatedJournal = {
        ...journal,
        content: contentToSave,
        updated_at: new Date().toISOString()
      };
      
      setJournal(updatedJournal);
      
      // Set up auto-save with a persistent reference
      saveJournalDebounced(updatedJournal);
    } catch (error) {
      console.error('Error parsing editor content:', error);
    }
  }, [journal, selectedDate, formatDateHeader, saveJournalDebounced]);
  
  // Set up date header when journal loads
  useEffect(() => {
    if (!journal) return;
    
    // Check if the journal content has a header for the current year
    const dateHeader = formatDateHeader(selectedDate);
    const currentContent = journal.content || { type: 'doc', content: [] };
    const contentArray = Array.isArray(currentContent.content) ? currentContent.content : [];
    const currentYear = selectedDate.getFullYear().toString();
    
    // Look for a heading that contains the current year (e.g., "2025 Wednesday")
    const hasCurrentYearHeader = contentArray.some(node => 
      node?.type === 'heading' && 
      node?.content?.[0]?.text?.includes(currentYear)
    );
    
    // If there's no header for the current year, add it now
    if (!hasCurrentYearHeader && !isLoading) {
      console.log('Adding new year header on mount:', dateHeader);
      
      // Create a new header node for this year
      const headerNode = {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: dateHeader }]
      };
      
      // Always insert at the beginning to preserve existing content
      const updatedContentArray = [headerNode, ...contentArray];
      
      const updatedContent = {
        ...currentContent,
        content: updatedContentArray
      };
      
      // Update the journal with the new content
      const updatedJournal = {
        ...journal,
        content: updatedContent
      };
      
      setJournal(updatedJournal);
      
      // Save the updated journal with the header
      saveJournalDebounced(updatedJournal);
    }
    
    // No longer need to track isEditorReady state
  }, [journal, selectedDate, formatDateHeader, isLoading, saveJournalDebounced]);



  // Set up and fetch entry when selected date changes
  useEffect(() => {
    console.log('useEffect triggered with selectedDate:', selectedDate);
    
    // Reset and fetch when date changes
    console.log('Date changed, fetching new journal entry');
    
    // Fetch the journal entry for the selected date
    console.log('Calling fetchJournalEntry with date:', selectedDate);
    fetchJournalEntry(selectedDate);
  }, [selectedDate, fetchJournalEntry]);

  // Handle date change
  const handleDateChange = (date: Date) => {
    console.log('Date changed to:', date);
    console.log('Current selectedDate before update:', selectedDate);
    console.log('New date to set:', date);
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
      <div className="flex flex-col h-full w-full">
        {/* Fixed header */}
        <div className="px-6 pt-6 w-full">
          <div className="flex justify-center w-full">
            <JournalDatePicker 
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 p-0 sm:p-4">
          {journal ? (
            <MinimalEditorWrapper
              key={`${journal.id}-${selectedDate.toISOString().split('T')[0]}`}
              value={JSON.stringify(journal.content)}
              onChange={handleEditorChange}
              className="h-full w-full"
              showTagInput={false}
              placeholder="I am future YOU, talk to me ..."
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-background/50">
              <div className="animate-pulse">Loading editor...</div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
