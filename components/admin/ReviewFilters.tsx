import React, { useMemo, useState } from 'react';
import { View, TextInput, Text, TouchableOpacity } from 'react-native';
import { styles } from '@/styles/adminMetrics';

type SavedChip = { label: string; value: string };
type SortOption = { key: string; label: string };
type Preset = { label: string; value: string };
type StatusOption = { key: string; label: string };

type FilterProps = {
  query: string;
  onChangeQuery: (val: string) => void;
  count: number;
  total: number;
  savedChips?: SavedChip[];
  presets?: Preset[];
  statusOptions?: StatusOption[];
  status?: string;
  onChangeStatus?: (key: string) => void;
  sortOptions?: SortOption[];
  sort?: string;
  onChangeSort?: (key: string) => void;
  page?: number;
  totalPages?: number;
  onJumpPage?: (page: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
  pageLabel?: string;
};

export function ReviewFilters({
  query,
  onChangeQuery,
  count,
  total,
  savedChips = [],
  presets = [],
  statusOptions = [],
  status,
  onChangeStatus,
  sortOptions = [],
  sort,
  onChangeSort,
  page,
  totalPages,
  onJumpPage,
  onPrev,
  onNext,
  disablePrev,
  disableNext,
  pageLabel,
}: FilterProps) {
  const [pageInput, setPageInput] = useState(typeof page === 'number' ? String(page + 1) : '');
  const safePage = useMemo(() => {
    if (!pageInput) return null;
    const n = parseInt(pageInput, 10);
    return Number.isNaN(n) ? null : Math.max(1, n);
  }, [pageInput]);

  React.useEffect(() => {
    if (typeof page === 'number') {
      setPageInput(String(page + 1));
    }
  }, [page]);

  return (
    <View style={{ marginBottom: styles.metaRow.fontSize ? 8 : 8 }}>
      <Text style={styles.metaRow}>Showing {count} of {total}</Text>
      {!!savedChips.length && (
        <View style={styles.filterChipRow}>
          {savedChips.map(chip => (
            <TouchableOpacity
              key={chip.value}
              style={styles.filterChip}
              onPress={() => onChangeQuery(chip.value)}
              accessibilityRole="button"
            >
              <Text style={styles.filterChipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {!!presets.length && (
        <View style={styles.filterChipRow}>
          {presets.map((p, idx) => (
            <TouchableOpacity
              key={`${p.label}-${p.value}-${idx}`}
              style={styles.filterChip}
              onPress={() => onChangeQuery(p.value)}
              accessibilityRole="button"
            >
              <Text style={styles.filterChipText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TextInput
        value={query}
        onChangeText={onChangeQuery}
        placeholder="Filter by order id, txn, restaurant, driver..."
        style={styles.input}
        autoCapitalize="none"
      />
      {!!statusOptions.length && onChangeStatus && (
        <View style={styles.sortRow}>
          <Text style={styles.metaRow}>Status</Text>
          <View style={styles.filterChipRow}>
            {statusOptions.map(opt => {
              const active = opt.key === status;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => onChangeStatus(opt.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
      {!!sortOptions.length && onChangeSort && (
        <View style={styles.sortRow}>
          <Text style={styles.metaRow}>Sort</Text>
          <View style={styles.filterChipRow}>
            {sortOptions.map(opt => {
              const active = opt.key === sort;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => onChangeSort(opt.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
      {(typeof page === 'number' && typeof totalPages === 'number') && (
        <View style={styles.pageRow}>
          <Text style={styles.metaRow}>{`Page ${page + 1} / ${totalPages}`}</Text>
          {onJumpPage && (
            <View style={styles.pageJump}>
              <Text style={styles.metaRow}>Go to</Text>
              <TextInput
                value={pageInput}
                onChangeText={(txt) => {
                  setPageInput(txt.replace(/[^0-9]/g, ''));
                }}
                placeholder={`${page + 1}`}
                keyboardType="number-pad"
                style={[styles.input, styles.pageJumpInput]}
              />
              <TouchableOpacity
                style={[styles.button, styles.buttonGhost, styles.pageJumpButton]}
                disabled={safePage === null}
                onPress={() => {
                  if (safePage && totalPages) {
                    const target = Math.min(totalPages, Math.max(1, safePage));
                    onJumpPage(target - 1);
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>Go</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      {(onPrev || onNext) && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.buttonGhost]}
            onPress={onPrev}
            disabled={disablePrev}
          >
            <Text style={styles.secondaryButtonText}>{'Prev'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonGhost]}
            onPress={onNext}
            disabled={disableNext}
          >
            <Text style={styles.secondaryButtonText}>{pageLabel ?? 'Next'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default ReviewFilters;
