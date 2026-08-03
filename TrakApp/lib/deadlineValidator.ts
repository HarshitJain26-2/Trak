export interface DeadlineValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export function validateDeadlineDate(dateString: string, timeString = '23:59'): DeadlineValidationResult {
  if (!dateString || !dateString.trim()) {
    return { isValid: false, error: 'Deadline date is required.' };
  }

  // Parse YYYY-MM-DD or standard date strings
  const parts = dateString.trim().split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return { isValid: false, error: 'Invalid date format.' };
    }

    if (month < 1 || month > 12) {
      return { isValid: false, error: 'Month must be between 1 and 12.' };
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      return { isValid: false, error: `Invalid day for month. ${year}-${month} has ${daysInMonth} days.` };
    }

    const timeParts = timeString.split(':');
    const hours = parseInt(timeParts[0] || '23', 10);
    const minutes = parseInt(timeParts[1] || '59', 10);

    const deadlineDate = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();

    if (deadlineDate.getTime() < now.getTime()) {
      return { isValid: false, error: 'Deadline cannot be in the past.' };
    }

    return { isValid: true };
  }

  // Fallback date parsing
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) {
    return { isValid: false, error: 'Invalid deadline date format.' };
  }

  if (parsed.getTime() < Date.now()) {
    return { isValid: false, error: 'Deadline cannot be in the past.' };
  }

  return { isValid: true };
}

export function checkDuplicateDeadline(newDate: string, existingDeadlines: string[]): boolean {
  return existingDeadlines.some((d) => d.toLowerCase().trim() === newDate.toLowerCase().trim());
}

export function calculateTimeRemaining(targetTimestamp: number): {
  expired: boolean;
  text: string;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const diff = targetTimestamp - Date.now();
  if (diff <= 0) {
    return { expired: true, text: 'Deadline Expired', days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return {
    expired: false,
    text: `${parts.join(' ')} remaining`,
    days,
    hours,
    minutes,
    seconds,
  };
}
