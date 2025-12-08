import React, { useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  image: string;
  promoted?: boolean;
  distanceKm?: number | null;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  onFavoritePress: () => void;
  isFavorite: boolean;
  variant?: 'default' | 'promoted';
  etaLabel?: string;
  trusted?: boolean;
}

export default function RestaurantCard({
  restaurant,
  onPress,
  onFavoritePress,
  isFavorite,
  variant = 'default',
  etaLabel,
  trusted = false,
}: RestaurantCardProps) {
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (variant === 'promoted') {
    return (
      <TouchableOpacity style={styles.promotedCard} onPress={onPress}>
        <Image source={{ uri: restaurant.image }} style={styles.promotedImage} />
        {restaurant.promoted && (
          <View style={styles.promotedBadge}>
            <Text style={styles.promotedText}>PROMOTED</Text>
          </View>
        )}
        <TouchableOpacity style={styles.favoriteButton} onPress={onFavoritePress}>
          <Icon
            name="Heart"
            size="md"
            color={isFavorite ? theme.colors.primary[500] : theme.colors.textInverse}
          />
        </TouchableOpacity>
          <View style={styles.promotedInfo}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <Text style={styles.restaurantCuisine}>{restaurant.cuisine}</Text>
            <View style={styles.restaurantMeta}>
              <View style={styles.rating}>
                <Icon name="Star" size={14} color={theme.colors.status.warning} />
                <Text style={styles.ratingText}>{restaurant.rating}</Text>
              </View>
              <View style={styles.delivery}>
                <Icon name="Clock" size={14} color={theme.colors.textMuted} />
                <Text style={styles.deliveryText}>{restaurant.deliveryTime} min</Text>
              </View>
              {etaLabel && (
                <View style={[styles.trustedBadge, trusted ? styles.trusted : styles.untrusted]}>
                  <Icon name="ShieldCheck" size={12} color={trusted ? theme.colors.status.success : theme.colors.status.warning} />
                  <Text style={[styles.trustedText, trusted ? styles.trustedTextStrong : styles.untrustedText]}>
                    {etaLabel}
                  </Text>
                </View>
              )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.restaurantCard} onPress={onPress}>
      <Image source={{ uri: restaurant.image }} style={styles.restaurantImage} />
      <View style={styles.restaurantDetails}>
        <View style={styles.restaurantHeader}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <TouchableOpacity onPress={onFavoritePress}>
          <Icon
            name="Heart"
            size="md"
            color={isFavorite ? theme.colors.primary[500] : theme.colors.textMuted}
          />
        </TouchableOpacity>
        </View>
        <Text style={styles.restaurantCuisine}>{restaurant.cuisine}</Text>
          <View style={styles.restaurantMeta}>
            <View style={styles.rating}>
              <Icon name="Star" size={14} color={theme.colors.status.warning} />
              <Text style={styles.ratingText}>{restaurant.rating}</Text>
            </View>
            <View style={styles.delivery}>
              <Icon name="Clock" size={14} color={theme.colors.textMuted} />
              <Text style={styles.deliveryText}>{restaurant.deliveryTime} min</Text>
            </View>
            <Text style={styles.deliveryFee}>${restaurant.deliveryFee} delivery</Text>
            {restaurant.distanceKm !== undefined && restaurant.distanceKm !== null && (
              <Text style={styles.distanceText}>{restaurant.distanceKm.toFixed(1)} km</Text>
            )}
            {etaLabel && (
              <View style={[styles.trustedBadge, trusted ? styles.trusted : styles.untrusted]}>
                <Icon
                  name="ShieldCheck"
                  size={12}
                  color={trusted ? theme.colors.status.success : theme.colors.status.warning}
                />
                <Text style={[styles.trustedText, trusted ? styles.trustedTextStrong : styles.untrustedText]}>
                  {etaLabel}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    promotedCard: {
      width: 280,
      marginRight: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      ...theme.shadows.card,
      overflow: 'hidden',
    },
  promotedImage: {
    width: '100%',
    height: 160,
  },
    promotedBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: theme.colors.primary[500],
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    promotedText: {
      color: theme.colors.textInverse,
      fontSize: 10,
      fontFamily: 'Inter-Bold',
    },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promotedInfo: {
    padding: 16,
  },
    restaurantCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surface,
      marginBottom: 12,
      borderRadius: 12,
      ...theme.shadows.card,
      overflow: 'hidden',
    },
  restaurantImage: {
    width: 100,
    height: 100,
  },
    restaurantDetails: {
      flex: 1,
      padding: 16,
    },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
    restaurantName: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      flex: 1,
    },
    restaurantCuisine: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginBottom: 8,
    },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
    ratingText: {
      fontSize: 12,
      color: theme.colors.text,
      marginLeft: 4,
      fontFamily: 'Inter-Medium',
    },
    delivery: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
    },
    deliveryText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginLeft: 4,
      fontFamily: 'Inter-Regular',
    },
    deliveryFee: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginRight: 12,
    },
    distanceText: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
  trustedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    gap: 4,
  },
    trusted: {
      backgroundColor: theme.colors.statusSoft.success,
      borderColor: theme.colors.status.success,
      borderWidth: 1,
    },
    untrusted: {
      backgroundColor: theme.colors.statusSoft.warning,
      borderColor: theme.colors.status.warning,
      borderWidth: 1,
    },
    trustedText: {
      fontSize: 11,
      fontFamily: 'Inter-Medium',
    },
    trustedTextStrong: {
      color: theme.colors.status.success,
    },
    untrustedText: {
      color: theme.colors.status.warning,
    },
  });
