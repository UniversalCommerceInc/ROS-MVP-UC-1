/**
 * Utility functions for timezone-aware date handling
 */

/**
 * Get user's timezone from their settings
 */
export async function getUserTimezone(): Promise<string> {
  try {
    const response = await fetch('/api/user/timezone');
    if (response.ok) {
      const data = await response.json();
      return data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }
  } catch (error) {
    console.error('Error fetching user timezone:', error);
  }
  
  // Fallback to browser timezone
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Create a timezone-aware date for meeting scheduling
 * @param date - The date (YYYY-MM-DD format or Date object)
 * @param time - The time (HH:MM format)
 * @param timezone - The user's timezone (IANA timezone identifier)
 * @returns ISO string in the user's timezone
 */
export function createTimezoneAwareDate(
  date: string | Date,
  time: string,
  timezone: string
): string {
  const timeParts = time.split(':');
  const hours = parseInt(timeParts[0] || '0', 10) || 0;
  const minutes = parseInt(timeParts[1] || '0', 10) || 0;
  
  // Create date in the specified timezone
  const dateObj = new Date(date);
  dateObj.setHours(hours, minutes, 0, 0);
  
  // Convert to ISO string
  return dateObj.toISOString();
}

/**
 * Format a date in the user's timezone
 * @param date - Date string or Date object
 * @param timezone - The user's timezone
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  date: string | Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    ...options,
  }).format(dateObj);
}

/**
 * Get current time in user's timezone
 * @param timezone - The user's timezone
 * @returns Current date in the specified timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
} 