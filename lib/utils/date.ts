/**
 * Formats seconds into a time string (MM:SS)
 * @param seconds - The number of seconds to format
 * @returns Formatted time string (e.g., "01:23")
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Formats a date string or Date object into a relative time string (e.g., "2 hours ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);
  
  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;
  
  if (diffInSeconds < minute) return 'just now';
  if (diffInSeconds < hour) return `${Math.floor(diffInSeconds / minute)}m ago`;
  if (diffInSeconds < day) return `${Math.floor(diffInSeconds / hour)}h ago`;
  if (diffInSeconds < week) return `${Math.floor(diffInSeconds / day)}d ago`;
  if (diffInSeconds < month) return `${Math.floor(diffInSeconds / week)}w ago`;
  if (diffInSeconds < year) return `${Math.floor(diffInSeconds / month)}mo ago`;
  return `${Math.floor(diffInSeconds / year)}y ago`;
}

/**
 * Formats a date string or Date object into a readable date string
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "Jan 1, 2023")
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
