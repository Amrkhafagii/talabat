import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { CreditCard as Edit, Trash2, Eye, EyeOff, Star, Clock } from 'lucide-react-native';
import Card from '../ui/Card';
import { deriveAvailabilityBadge } from '@/utils/menuOrdering';

interface MenuItemManagement {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  isPopular: boolean;
  isAvailable: boolean;
  preparationTime: number;
  isScheduled?: boolean;
  availabilityLabel?: string;
  highlight?: boolean;
  photoStatus?: 'pending' | 'approved' | 'rejected';
  photoNote?: string | null;
}

interface MenuItemManagementCardProps {
  item: MenuItemManagement;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAvailability: () => void;
  onTogglePopular: () => void;
}

export default function MenuItemManagementCard({
  item,
  onEdit,
  onDelete,
  onToggleAvailability,
  onTogglePopular,
}: MenuItemManagementCardProps) {
  return (
    <Card style={[
      styles.card,
      !item.isAvailable ? styles.unavailableCard : undefined,
      item.highlight ? styles.highlightCard : undefined
    ] as any}>
      <View style={styles.content}>
        <Image source={{ uri: item.image }} style={styles.image} />
        
        <View style={styles.details}>
          <View style={styles.header}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <View style={styles.badges}>
              {item.isPopular && (
                <View style={styles.popularBadge}>
                  <Star size={10} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              )}
              <StatusPill
                isAvailable={item.isAvailable}
                isScheduled={item.isScheduled}
                availabilityLabel={item.availabilityLabel}
              />
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>

          {item.photoStatus && item.photoStatus !== 'approved' && (
            <View style={styles.photoStatusRow}>
              <Text
                style={[
                  styles.photoStatusText,
                  item.photoStatus === 'pending' ? styles.photoStatusPending : styles.photoStatusRejected,
                ]}
                numberOfLines={1}
              >
                {item.photoStatus === 'pending' ? 'Waiting for admin approval' : 'Photo rejected - update required'}
              </Text>
            </View>
          )}

          <View style={styles.meta}>
            <Text style={styles.category}>{item.category}</Text>
            <View style={styles.prepTime}>
              <Clock size={12} color="#6B7280" />
              <Text style={styles.prepTimeText}>{item.preparationTime}min</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.toggleButton]}
                onPress={onToggleAvailability}
              >
                {item.isAvailable ? (
                  <Eye size={16} color="#10B981" />
                ) : (
                  <EyeOff size={16} color="#EF4444" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.toggleButton,
                  item.isPopular && styles.popularActionButton
                ]}
                onPress={onTogglePopular}
              >
                <Star 
                  size={16} 
                  color={item.isPopular ? "#FFFFFF" : "#6B7280"} 
                  fill={item.isPopular ? "#FFFFFF" : "transparent"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={onEdit}
              >
                <Edit size={16} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={onDelete}
              >
                <Trash2 size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

function StatusPill({ isAvailable, isScheduled, availabilityLabel }: { isAvailable: boolean; isScheduled?: boolean; availabilityLabel?: string }) {
  const badge = deriveAvailabilityBadge({ isAvailable, isScheduled, availabilityLabel });

  if (badge.type === 'unavailable') {
    return (
      <View style={[styles.statusBadge, styles.unavailableBadge]}>
        <Text style={[styles.statusText, styles.unavailableText]}>{badge.label}</Text>
      </View>
    );
  }
  if (badge.type === 'scheduled') {
    return (
      <View style={[styles.statusBadge, styles.scheduledBadge]}>
        <Text style={[styles.statusText, styles.scheduledText]}>{badge.label}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.statusBadge, styles.availableBadge]}>
      <Text style={[styles.statusText, styles.availableText]}>{badge.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  highlightCard: {
    borderWidth: 1.5,
    borderColor: '#FF6B35',
  },
  unavailableCard: {
    opacity: 0.7,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  content: {
    flexDirection: 'row',
  },
  image: {
    width: 100,
    height: 120,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  details: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFB800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  popularText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    marginLeft: 2,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  availableBadge: {
    backgroundColor: '#D1FAE5',
  },
  unavailableBadge: {
    backgroundColor: '#FEE2E2',
  },
  scheduledBadge: {
    backgroundColor: '#E0E7FF',
  },
  statusText: {
    fontSize: 8,
    fontFamily: 'Inter-SemiBold',
  },
  availableText: {
    color: '#10B981',
  },
  unavailableText: {
    color: '#EF4444',
  },
  scheduledText: {
    color: '#4338CA',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
    marginBottom: 8,
  },
  photoStatusRow: {
    marginBottom: 8,
  },
  photoStatusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  photoStatusPending: {
    color: '#92400E',
  },
  photoStatusRejected: {
    color: '#B91C1C',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter-Medium',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  prepTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prepTimeText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButton: {
    backgroundColor: '#F3F4F6',
  },
  popularActionButton: {
    backgroundColor: '#FFB800',
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
});
