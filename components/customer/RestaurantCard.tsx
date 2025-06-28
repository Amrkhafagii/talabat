import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Star, Clock, Heart } from 'lucide-react-native';
import Card from '../ui/Card';

interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  deliveryFee: number;
  image: string;
  promoted?: boolean;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
  onFavoritePress: () => void;
  isFavorite: boolean;
  variant?: 'default' | 'promoted';
}

export default function RestaurantCard({
  restaurant,
  onPress,
  onFavoritePress,
  isFavorite,
  variant = 'default',
}: RestaurantCardProps) {
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
          <Heart
            size={20}
            color={isFavorite ? "#FF6B35" : "#FFF"}
            fill={isFavorite ? "#FF6B35" : "transparent"}
          />
        </TouchableOpacity>
        <View style={styles.promotedInfo}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.restaurantCuisine}>{restaurant.cuisine}</Text>
          <View style={styles.restaurantMeta}>
            <View style={styles.rating}>
              <Star size={14} color="#FFB800" fill="#FFB800" />
              <Text style={styles.ratingText}>{restaurant.rating}</Text>
            </View>
            <View style={styles.delivery}>
              <Clock size={14} color="#6B7280" />
              <Text style={styles.deliveryText}>{restaurant.deliveryTime} min</Text>
            </View>
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
            <Heart
              size={20}
              color={isFavorite ? "#FF6B35" : "#6B7280"}
              fill={isFavorite ? "#FF6B35" : "transparent"}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.restaurantCuisine}>{restaurant.cuisine}</Text>
        <View style={styles.restaurantMeta}>
          <View style={styles.rating}>
            <Star size={14} color="#FFB800" fill="#FFB800" />
            <Text style={styles.ratingText}>{restaurant.rating}</Text>
          </View>
          <View style={styles.delivery}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.deliveryText}>{restaurant.deliveryTime} min</Text>
          </View>
          <Text style={styles.deliveryFee}>${restaurant.deliveryFee} delivery</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  promotedCard: {
    width: 280,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  promotedText: {
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promotedInfo: {
    padding: 16,
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#111827',
    flex: 1,
  },
  restaurantCuisine: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#374151',
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
    color: '#6B7280',
    marginLeft: 4,
    fontFamily: 'Inter-Regular',
  },
  deliveryFee: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
});