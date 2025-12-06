import React, { useMemo, useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { styles as adminStyles } from '@/styles/adminMetrics';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSInput } from '@/components/ios/IOSInput';

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
  useIos?: boolean;
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
  useIos = false,
}: FilterProps) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 400;
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
    <View style={{ marginBottom: useIos ? iosSpacing.sm : adminStyles.metaRow.fontSize ? 8 : 8 }}>
      <Text style={useIos ? iosTypography.caption : adminStyles.metaRow}>Showing {count} of {total}</Text>
      {!!savedChips.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={useIos ? iosFilter.chipRow : adminStyles.filterChipRow}>
          {savedChips.map(chip => renderChip(chip.value, chip.label, () => onChangeQuery(chip.value)))}
        </ScrollView>
      )}
      {!!presets.length && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={useIos ? iosFilter.chipRow : adminStyles.filterChipRow}>
          {presets.map((p, idx) => renderChip(`${p.value}-${idx}`, p.label, () => onChangeQuery(p.value)))}
        </ScrollView>
      )}
      {useIos ? (
        <IOSInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Filter by order id, txn, restaurant, driver..."
          autoCapitalize="none"
        />
      ) : (
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder="Filter by order id, txn, restaurant, driver..."
          style={adminStyles.input}
          autoCapitalize="none"
        />
      )}
      {!!statusOptions.length && onChangeStatus && (
        <View style={useIos ? iosFilter.sortRow : adminStyles.sortRow}>
          <Text style={useIos ? iosTypography.caption : adminStyles.metaRow}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={useIos ? iosFilter.chipRow : adminStyles.filterChipRow}>
            {statusOptions.map(opt => renderChip(opt.key, opt.label, () => onChangeStatus && onChangeStatus(opt.key), opt.key === status))}
          </ScrollView>
        </View>
      )}
      {!!sortOptions.length && onChangeSort && (
        <View style={useIos ? iosFilter.sortRow : adminStyles.sortRow}>
          <Text style={useIos ? iosTypography.caption : adminStyles.metaRow}>Sort</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={useIos ? iosFilter.chipRow : adminStyles.filterChipRow}>
            {sortOptions.map(opt => renderChip(opt.key, opt.label, () => onChangeSort && onChangeSort(opt.key), opt.key === sort))}
          </ScrollView>
        </View>
      )}
      {(typeof page === 'number' && typeof totalPages === 'number') && (
        <View style={useIos ? iosFilter.pageRow : adminStyles.pageRow}>
          <Text style={useIos ? iosTypography.caption : adminStyles.metaRow}>{`Page ${page + 1} / ${totalPages}`}</Text>
          {onJumpPage && (
            <View style={useIos ? iosFilter.pageJump : adminStyles.pageJump}>
              <Text style={useIos ? iosTypography.caption : adminStyles.metaRow}>Go to</Text>
              {useIos ? (
                <IOSInput
                  value={pageInput}
                  onChangeText={(txt) => setPageInput(txt.replace(/[^0-9]/g, ''))}
                  placeholder={`${page + 1}`}
                  keyboardType="number-pad"
                  style={[iosFilter.pageJumpInput]}
                />
              ) : (
                <TextInput
                  value={pageInput}
                  onChangeText={(txt) => {
                    setPageInput(txt.replace(/[^0-9]/g, ''));
                  }}
                  placeholder={`${page + 1}`}
                  keyboardType="number-pad"
                  style={[adminStyles.input, adminStyles.pageJumpInput]}
                />
              )}
              <TouchableOpacity
                style={useIos ? iosFilter.goButton : [adminStyles.button, adminStyles.buttonGhost, adminStyles.pageJumpButton]}
                disabled={safePage === null}
                onPress={() => {
                  if (safePage && totalPages) {
                    const target = Math.min(totalPages, Math.max(1, safePage));
                    onJumpPage(target - 1);
                  }
                }}
              >
                <Text style={useIos ? iosFilter.goText : adminStyles.secondaryButtonText}>Go</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      {(onPrev || onNext) && (
        <View style={useIos ? iosFilter.pageControls : adminStyles.buttonRow}>
          {useIos ? (
            <>
              <TouchableOpacity
                style={[iosFilter.navButton, disablePrev && iosFilter.navDisabled]}
                onPress={onPrev}
                disabled={disablePrev}
              >
                <Text style={iosFilter.navText}>Prev</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[iosFilter.navButton, disableNext && iosFilter.navDisabled]}
                onPress={onNext}
                disabled={disableNext}
              >
                <Text style={iosFilter.navText}>{pageLabel ?? 'Next'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[adminStyles.button, adminStyles.buttonGhost]}
                onPress={onPrev}
                disabled={disablePrev}
              >
                <Text style={adminStyles.secondaryButtonText}>{'Prev'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[adminStyles.button, adminStyles.buttonGhost]}
                onPress={onNext}
                disabled={disableNext}
              >
                <Text style={adminStyles.secondaryButtonText}>{pageLabel ?? 'Next'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );

  function renderChip(key: string, label: string, onPress: () => void, active = false) {
    if (useIos) {
      return (
        <TouchableOpacity
          key={key}
          style={[iosFilter.chip, active && iosFilter.chipActive]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
        >
          <Text style={[iosFilter.chipText, active && iosFilter.chipTextActive]}>{label}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        key={key}
        style={[adminStyles.filterChip, active && adminStyles.filterChipActive]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <Text style={[adminStyles.filterChipText, active && adminStyles.filterChipTextActive]}>{label}</Text>
      </TouchableOpacity>
    );
  }
}

export default ReviewFilters;

const iosFilter = StyleSheet.create({
  chipRow: { flexDirection: 'row', gap: iosSpacing.xs, paddingRight: iosSpacing.xs, marginTop: iosSpacing.xs, marginBottom: iosSpacing.xs },
  chip: {
    paddingHorizontal: iosSpacing.sm,
    paddingVertical: iosSpacing.xs,
    borderRadius: iosRadius.pill,
    backgroundColor: iosColors.chipBg,
    borderWidth: 1,
    borderColor: iosColors.separator,
  },
  chipActive: { backgroundColor: iosColors.chipActiveBg, borderColor: iosColors.primary },
  chipText: { ...iosTypography.subhead, color: iosColors.secondaryText },
  chipTextActive: { color: iosColors.primary },
  sortRow: { marginTop: iosSpacing.sm },
  pageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: iosSpacing.xs },
  pageJump: { flexDirection: 'row', alignItems: 'center', gap: iosSpacing.xs },
  pageJumpInput: { width: 60 },
  goButton: {
    minHeight: 36,
    paddingHorizontal: iosSpacing.sm,
    paddingVertical: iosSpacing.xs,
    borderRadius: iosRadius.pill,
    backgroundColor: iosColors.primary,
  },
  goText: { ...iosTypography.button, color: '#FFFFFF' },
  pageControls: { flexDirection: 'row', justifyContent: 'space-between', gap: iosSpacing.sm, marginTop: iosSpacing.sm },
  navButton: {
    flex: 1,
    height: 40,
    borderRadius: iosRadius.md,
    borderWidth: 1,
    borderColor: iosColors.separator,
    backgroundColor: iosColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { ...iosTypography.subhead, color: iosColors.secondaryText },
  navDisabled: { opacity: 0.5 },
});
