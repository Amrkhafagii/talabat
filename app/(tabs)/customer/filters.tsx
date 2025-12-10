import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { getCategories } from '@/utils/database';
import { Category } from '@/types/database';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function Filters() {
  const params = useLocalSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxDeliveryFee, setMaxDeliveryFee] = useState<number>(50);
  const [showPromotedOnly, setShowPromotedOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'delivery_time'>('recommended');
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const loadCategories = useCallback(async () => {
    try {
      const categoriesData = await getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  const loadCurrentFilters = useCallback(() => {
    // Load current filter values from params
    if (params.selectedCuisines) {
      try {
        setSelectedCuisines(JSON.parse(params.selectedCuisines as string));
      } catch (e) {
        console.error('Error parsing selectedCuisines:', e);
      }
    }
    if (params.minRating) {
      setMinRating(parseFloat(params.minRating as string));
    }
    if (params.maxDeliveryFee) {
      setMaxDeliveryFee(parseFloat(params.maxDeliveryFee as string));
    }
    if (params.showPromotedOnly) {
      setShowPromotedOnly(params.showPromotedOnly === 'true');
    }
    if (params.sortBy) {
      const sortParam = (params.sortBy as string) as typeof sortBy;
      if (['recommended', 'rating', 'delivery_time'].includes(sortParam)) {
        setSortBy(sortParam);
      }
    }
  }, [params.maxDeliveryFee, params.minRating, params.selectedCuisines, params.showPromotedOnly, params.sortBy, sortBy]);

  useEffect(() => {
    loadCategories();
    loadCurrentFilters();
  }, [loadCategories, loadCurrentFilters]);

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev => 
      prev.includes(cuisine) 
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const setRating = (rating: number) => {
    setMinRating(rating === minRating ? 0 : rating);
  };

  const deliveryFeeOptions = [
    { label: 'Any', value: 50, helper: 'Show all' },
    { label: '< $2', value: 2, helper: 'Budget friendly' },
    { label: '< $5', value: 5, helper: 'Keep fees low' },
    { label: 'Free', value: 0, helper: 'No delivery fee' },
  ];

  const applyFilters = () => {
    router.setParams({
      selectedCuisines: JSON.stringify(selectedCuisines),
      minRating: minRating.toString(),
      maxDeliveryFee: maxDeliveryFee.toString(),
      showPromotedOnly: showPromotedOnly.toString(),
      sortBy,
    });
    router.back();
  };

  const clearFilters = () => {
    setSelectedCuisines([]);
    setMinRating(0);
    setMaxDeliveryFee(50);
    setShowPromotedOnly(false);
    setSortBy('recommended');
  };

  const hasActiveFilters = selectedCuisines.length > 0 || minRating > 0 || maxDeliveryFee < 50 || showPromotedOnly;

  // Get unique cuisines from categories
  const cuisines = [...new Set(categories.map(cat => cat.name))];
  const sortOptions: { key: typeof sortBy; label: string }[] = [
    { key: 'recommended', label: 'Recommended' },
    { key: 'rating', label: 'Rating' },
    { key: 'delivery_time', label: 'Delivery Time' },
  ];
  const ratingOptions = [
    { value: 4.5, label: '4.5 ★ & Up', helper: 'Top picks' },
    { value: 4, label: '4.0 ★ & Up', helper: 'Great value' },
    { value: 0, label: 'Any Rating', helper: 'No minimum' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Filters"
        showBackButton
        rightComponent={
          hasActiveFilters ? (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sort by</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowGap}>
            {sortOptions.map(option => (
              <TouchableOpacity
                key={option.key}
                style={[styles.pill, sortBy === option.key && styles.pillActive]}
                onPress={() => setSortBy(option.key)}
                activeOpacity={0.85}
              >
                <Text style={[styles.pillText, sortBy === option.key && styles.pillTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Cuisine Filter */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cuisines</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cuisineGrid}>
            {cuisines.map((cuisine) => {
              const selected = selectedCuisines.includes(cuisine);
              return (
                <TouchableOpacity
                  key={cuisine}
                  style={[styles.cuisineChip, selected && styles.selectedChip]}
                  onPress={() => toggleCuisine(cuisine)}
                  activeOpacity={0.9}
                >
                  <Icon name="Utensils" size="sm" color={selected ? theme.colors.textInverse : theme.colors.text} />
                  <Text style={[styles.cuisineChipText, selected && styles.selectedChipText]}>
                    {cuisine}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.cuisineChip, styles.addCuisineChip]} onPress={() => router.back()}>
              <Icon name="Plus" size="sm" color={theme.colors.textMuted} />
              <Text style={[styles.cuisineChipText, styles.mutedText]}>More</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rating Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rating</Text>
          <View style={styles.ratingContainer}>
            {ratingOptions.map((rating) => {
              const selected = minRating === rating.value;
              return (
                <TouchableOpacity
                  key={rating.value}
                  style={[styles.ratingOption, selected && styles.ratingOptionActive]}
                  onPress={() => setRating(rating.value)}
                  activeOpacity={0.9}
                >
                  <View style={styles.ratingRow}>
                    <View style={[styles.ratingBadge, selected && styles.ratingBadgeActive]}>
                      <Text style={[styles.ratingBadgeText, selected && styles.ratingBadgeTextActive]}>
                        {rating.value === 0 ? 'Any' : rating.value.toFixed(1)}
                      </Text>
                      {rating.value !== 0 && <Icon name="Star" size="sm" color={selected ? theme.colors.textInverse : theme.colors.status.warning} />}
                    </View>
                    <Text style={[styles.ratingText, selected && styles.ratingTextActive]}>{rating.label}</Text>
                  </View>
                  <View style={[styles.radioButton, selected && styles.selectedRadio]}>
                    {selected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Delivery Fee Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Fee</Text>
          <View style={styles.deliveryFeeContainer}>
            {deliveryFeeOptions.map((option) => {
              const selected = maxDeliveryFee === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.deliveryFeePill, selected && styles.deliveryFeePillActive]}
                  onPress={() => setMaxDeliveryFee(option.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.deliveryFeeText, selected && styles.deliveryFeeTextActive]}>{option.label}</Text>
                  <Text style={[styles.deliveryFeeHelper, selected && styles.deliveryFeeHelperActive]}>{option.helper}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Promoted Only Filter */}
        <View style={styles.section}>
          <View style={styles.promotedToggle}>
            <View>
              <Text style={styles.promotedTitle}>Promoted only</Text>
              <Text style={styles.promotedSubtitle}>Show only sponsored partners</Text>
            </View>
            <Switch
              value={showPromotedOnly}
              onValueChange={setShowPromotedOnly}
              thumbColor={showPromotedOnly ? theme.colors.textInverse : theme.colors.surface}
              trackColor={{ false: theme.colors.borderMuted, true: theme.colors.primary[500] }}
            />
          </View>
        </View>
      </ScrollView>

      {/* Apply Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity onPress={clearFilters} disabled={!hasActiveFilters} style={styles.clearAll}>
          <Text style={[styles.linkText, !hasActiveFilters && styles.disabledText]}>Clear all</Text>
        </TouchableOpacity>
        <Button
          title="Apply Filters"
          onPress={applyFilters}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    clearText: {
      fontSize: 16,
      color: theme.colors.primary[500],
      fontFamily: 'Inter-SemiBold',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    section: {
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    linkText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.primary[500],
    },
    rowGap: {
      gap: 10,
      paddingRight: 12,
    },
    pill: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderMuted,
      backgroundColor: theme.colors.surface,
      marginRight: 8,
    },
    pillActive: {
      backgroundColor: theme.colors.primary[50],
      borderColor: theme.colors.primary[500],
    },
    pillText: {
      fontSize: 15,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
    },
    pillTextActive: {
      color: theme.colors.primary[600],
    },
    cuisineGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    cuisineChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectedChip: {
      backgroundColor: theme.colors.primary[500],
      borderColor: theme.colors.primary[500],
    },
    cuisineChipText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
      marginLeft: 6,
    },
    selectedChipText: {
      color: theme.colors.textInverse,
    },
    chipIcon: {
      marginLeft: 4,
    },
    addCuisineChip: {
      borderStyle: 'dashed',
    },
    mutedText: {
      color: theme.colors.textSubtle,
    },
    ratingContainer: {
      gap: 10,
    },
    ratingOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'space-between',
    },
    ratingOptionActive: {
      backgroundColor: theme.colors.primary[50],
      borderColor: theme.colors.primary[500],
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    ratingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.colors.surfaceAlt,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.radius.pill,
    },
    ratingBadgeActive: {
      backgroundColor: theme.colors.primary[500],
    },
    ratingBadgeText: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    ratingBadgeTextActive: {
      color: theme.colors.textInverse,
    },
    ratingStars: {
      flexDirection: 'row',
      marginRight: 12,
    },
    ratingText: {
      flex: 1,
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
    },
    ratingTextActive: {
      color: theme.colors.primary[600],
    },
    radioButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedRadio: {
      borderColor: theme.colors.primary[500],
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary[500],
    },
    deliveryFeeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    deliveryFeePill: {
      minWidth: '46%',
      padding: 14,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    deliveryFeePillActive: {
      borderColor: theme.colors.primary[500],
      backgroundColor: theme.colors.primary[50],
    },
    deliveryFeeText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
    },
    deliveryFeeTextActive: {
      color: theme.colors.primary[600],
    },
    deliveryFeeHelper: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginTop: 4,
    },
    deliveryFeeHelperActive: {
      color: theme.colors.primary[600],
    },
    promotedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 18,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    promotedTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 2,
    },
    promotedSubtitle: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
    },
    bottomContainer: {
      padding: 16,
      paddingBottom: 16 + theme.insets.bottom,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    clearAll: {
      paddingHorizontal: 8,
    },
    disabledText: {
      color: theme.colors.textSubtle,
      opacity: 0.6,
    },
  });
