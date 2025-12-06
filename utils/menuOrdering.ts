export interface ReorderableCategory {
  id: string;
  name: string;
  sort_order: number;
}

export function reorderCategoryList<T extends ReorderableCategory>(
  categories: T[],
  index: number,
  direction: 'up' | 'down'
): T[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= categories.length) return categories;
  const next = [...categories];
  const tmp = next[index];
  next[index] = next[targetIndex];
  next[targetIndex] = tmp;
  return next.map((c, idx) => ({ ...c, sort_order: idx }));
}

export function ensureOwnership(restaurantId: string | null, itemRestaurantId: string | null): boolean {
  if (!restaurantId || !itemRestaurantId) return false;
  return restaurantId === itemRestaurantId;
}

export type AvailabilityBadgeType = 'available' | 'unavailable' | 'scheduled';

export function deriveAvailabilityBadge(
  opts: { isAvailable: boolean; isScheduled?: boolean; availabilityLabel?: string }
): { type: AvailabilityBadgeType; label: string } {
  if (!opts.isAvailable) {
    return { type: 'unavailable', label: 'Unavailable' };
  }
  if (opts.isScheduled) {
    return { type: 'scheduled', label: opts.availabilityLabel || 'Scheduled' };
  }
  return { type: 'available', label: 'Available' };
}

export function shouldRefetchOnFocus(userId?: string | null, restaurantId?: string | null): boolean {
  return Boolean(userId && restaurantId);
}
