import { parse, differenceInSeconds, isPast, isFuture, format } from 'date-fns';

const DATE_FORMATS = [
  'dd/MM/yyyy HH:mm:ss',
  'dd/MM/yyyy HH:mm',
  'dd/MM/yyyy',
  'yyyy-MM-dd HH:mm:ss',
  'yyyy-MM-dd HH:mm',
  'yyyy-MM-dd',
  'd/M/yyyy HH:mm:ss',
  'd/M/yyyy HH:mm',
  'd/M/yyyy',
];

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const cleanStr = String(dateStr).trim();
  if (!cleanStr) return null;

  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(cleanStr, fmt, new Date());
      if (!isNaN(parsed.getTime())) return parsed;
    } catch {
      // try next
    }
  }

  // Fallback to native Date
  try {
    const fallback = new Date(cleanStr);
    if (!isNaN(fallback.getTime())) return fallback;
  } catch {
    // ignore
  }

  return null;
}

const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy HH:mm';

export function getCurrentDateStr(): string {
  return format(new Date(), DEFAULT_DATE_FORMAT);
}

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  totalSeconds: number;
}

export function calculateTimeRemaining(targetDate: Date | null, referenceDate: Date = new Date()): TimeRemaining | null {
  if (!targetDate) return null;
  
  const totalSeconds = differenceInSeconds(targetDate, referenceDate);
  const isOverdue = totalSeconds < 0;
  
  const absSeconds = Math.abs(totalSeconds);
  const days = Math.floor(absSeconds / (3600 * 24));
  const hours = Math.floor((absSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;
  
  return { days, hours, minutes, seconds, isOverdue, totalSeconds };
}

export function formatTimeRemaining(tr: TimeRemaining): string {
  if (tr.isOverdue) {
    return `Quá hạn ${tr.days} ngày ${tr.hours} giờ ${tr.minutes} phút ${tr.seconds} giây`;
  }
  return `Còn ${tr.days} ngày ${tr.hours} giờ ${tr.minutes} phút ${tr.seconds} giây`;
}

export function getWarningStatus(tr: TimeRemaining | null): 'overdue' | 'warning-1' | 'warning-2' | 'warning-3' | 'safe' | 'none' {
  if (!tr) return 'none';
  if (tr.isOverdue) return 'overdue';
  
  // Under 24 hours (1 day)
  if (tr.totalSeconds <= 24 * 3600) return 'warning-1';
  // Under 48 hours (2 days)
  if (tr.totalSeconds <= 48 * 3600) return 'warning-2';
  // Under 72 hours (3 days)
  if (tr.totalSeconds <= 72 * 3600) return 'warning-3';
  
  return 'safe';
}
