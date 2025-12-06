import { describe, it, expect } from 'vitest';
import { isRestaurantOpenNow, formatTodayHours } from '@/utils/hours';
import { reorderCategoryList, ensureOwnership, deriveAvailabilityBadge, shouldRefetchOnFocus } from '@/utils/menuOrdering';

const sampleHours = [
  { day_of_week: 1, open_time: '09:00', close_time: '17:00', is_closed: false },
  { day_of_week: 2, open_time: '09:00', close_time: '17:00', is_closed: false },
  { day_of_week: 3, open_time: '09:00', close_time: '17:00', is_closed: false },
  { day_of_week: 4, open_time: '09:00', close_time: '17:00', is_closed: false },
  { day_of_week: 5, open_time: '09:00', close_time: '17:00', is_closed: false },
  { day_of_week: 6, open_time: '10:00', close_time: '14:00', is_closed: false },
];

describe('hours helpers', () => {
  it('returns true when within hours', () => {
    const mondayAtNoon = new Date('2024-07-08T12:00:00'); // Monday
    expect(isRestaurantOpenNow(sampleHours as any, mondayAtNoon)).toBe(true);
  });

  it('returns false when closed', () => {
    const saturdayLate = new Date('2024-07-13T20:00:00'); // Saturday
    expect(isRestaurantOpenNow(sampleHours as any, saturdayLate)).toBe(false);
  });

  it('formats today hours', () => {
    const label = formatTodayHours(sampleHours as any);
    expect(label === null || label.includes(':')).toBe(true);
  });
});

describe('category reordering', () => {
  it('moves category down and updates sort order', () => {
    const categories = [
      { id: 'a', name: 'A', sort_order: 0 },
      { id: 'b', name: 'B', sort_order: 1 },
      { id: 'c', name: 'C', sort_order: 2 },
    ];
    const reordered = reorderCategoryList(categories, 0, 'down');
    expect(reordered[1].id).toBe('a');
    expect(reordered[1].sort_order).toBe(1);
  });

  it('no change when move out of bounds', () => {
    const categories = [
      { id: 'a', name: 'A', sort_order: 0 },
    ];
    const reordered = reorderCategoryList(categories, 0, 'up');
    expect(reordered).toEqual(categories);
  });
});

describe('ownership guard', () => {
  it('allows when IDs match', () => {
    expect(ensureOwnership('rest1', 'rest1')).toBe(true);
  });
  it('blocks when IDs differ', () => {
    expect(ensureOwnership('rest1', 'rest2')).toBe(false);
  });
});

describe('availability badge logic', () => {
  it('returns unavailable when not available', () => {
    const badge = deriveAvailabilityBadge({ isAvailable: false });
    expect(badge.type).toBe('unavailable');
    expect(badge.label).toBe('Unavailable');
  });

  it('uses scheduled label when window provided', () => {
    const badge = deriveAvailabilityBadge({ isAvailable: true, isScheduled: true, availabilityLabel: '10:00 - 12:00' });
    expect(badge.type).toBe('scheduled');
    expect(badge.label).toBe('10:00 - 12:00');
  });

  it('defaults to available when no schedule', () => {
    const badge = deriveAvailabilityBadge({ isAvailable: true });
    expect(badge.type).toBe('available');
    expect(badge.label).toBe('Available');
  });
});

describe('menu focus refetch logic', () => {
  it('requires user and restaurant ids', () => {
    expect(shouldRefetchOnFocus('user1', 'rest1')).toBe(true);
    expect(shouldRefetchOnFocus(undefined, 'rest1')).toBe(false);
    expect(shouldRefetchOnFocus('user1', null)).toBe(false);
  });
});
