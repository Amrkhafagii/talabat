import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin, Clock, Star } from 'lucide-react-native';
import Card from '../ui/Card';
import { formatCurrency } from '@/utils/formatters';

interface DeliveryHistory {
  id: string;
  orderNumber: string;
  restaurantName: string;
  customerAddress: string;
  distance: string;
  duration: string;
  earnings: number;
  completedAt: string;
  rating?: number;
  tip?: number;
}

interface DeliveryHistoryCardProps {
  delivery: DeliveryHistory;
}

export default function DeliveryHistoryCard({ delivery }: DeliveryHistoryCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.orderNumber}>{delivery.orderNumber}</Text>
          <Text style={styles.restaurantName}>{delivery.restaurantName}</Text>
        </View>
        <View style={styles.earnings}>
          <Text style={styles.earningsAmount}>{formatCurrency(delivery.earnings)}</Text>
          {delivery.tip && delivery.tip > 0 && (
            <Text style={styles.tipAmount}>+{formatCurrency(delivery.tip)} tip</Text>
          )}
        </View>
      </View>

      <View style={styles.addressContainer}>
        <MapPin size={16} color="#6B7280" />
        <Text style={styles.address} numberOfLines={2}>
          {delivery.customerAddress}
        </Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.detailText}>{delivery.duration}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.detailText}>{delivery.distance}</Text>
        </View>

        {delivery.rating && (
          <View style={styles.detailItem}>
            <Star size={14} color="#FFB800" fill="#FFB800" />
            <Text style={styles.detailText}>{delivery.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.completedDate}>
          Completed {formatDate(delivery.completedAt)}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  restaurantName: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  earnings: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  tipAmount: {
    fontSize: 12,
    color: '#059669',
    fontFamily: 'Inter-Medium',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Regular',
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginLeft: 4,
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  completedDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
  },
});