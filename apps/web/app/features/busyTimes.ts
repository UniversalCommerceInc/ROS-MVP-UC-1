import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function groupEventsByDate(
  events: { start: string; end: string }[],
  timeZone: string,
): { date: string; times: { start: string; end: string }[] }[] {
  const grouped: { [date: string]: { start: string; end: string }[] } = {};
  events.forEach((event) => {
    const startZoned = toZonedTime(new Date(event.start), timeZone);
    const endZoned = toZonedTime(new Date(event.end), timeZone);
    const date = format(startZoned, 'yyyy-MM-dd');
    const startTime = format(startZoned, 'HH:mm');
    const endTime = format(endZoned, 'HH:mm');
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push({ start: startTime, end: endTime });
  });
  return Object.entries(grouped).map(([date, times]) => ({ date, times }));
}
