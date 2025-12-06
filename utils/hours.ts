import { Restaurant } from '@/types/database';

export function isRestaurantOpenNow(hours?: Restaurant['restaurant_hours'], now: Date = new Date()): boolean {
  if (!hours || hours.length === 0) return true;
  const day = now.getDay(); // 0 Sunday
  const today = hours.find((h) => h.day_of_week === day);
  if (!today) return true;
  if (today.is_closed) return false;
  if (!today.open_time || !today.close_time) return true;
  const [openH, openM] = today.open_time.split(':').map(Number);
  const [closeH, closeM] = today.close_time.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
}

export function formatTodayHours(hours?: Restaurant['restaurant_hours']): string | null {
  if (!hours || hours.length === 0) return null;
  const day = new Date().getDay();
  const today = hours.find((h) => h.day_of_week === day);
  if (!today) return null;
  if (today.is_closed) return 'Closed today';
  if (!today.open_time || !today.close_time) return null;
  return `${today.open_time} - ${today.close_time}`;
}
