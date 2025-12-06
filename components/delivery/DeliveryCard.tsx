import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Navigation, Phone, CircleCheck as CheckCircle, Package } from 'lucide-react-native';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface DeliveryOrder {
  id: string;
  restaurantName: string;
  customerName: string;
  customerPhone?: string;
  pickupAddress: string;
  deliveryAddress: string;
  distance: string;
  estimatedTime: string;
  payment: number;
  items: string[];
  status?: 'available' | 'active';
}

interface DeliveryCardProps {
  order: DeliveryOrder;
  onAccept?: () => void;
  onCall?: () => void;
  onNavigate?: () => void;
  onPickup?: () => void;
  onComplete?: () => void;
}

export default function DeliveryCard({
  order,
  onAccept,
  onCall,
  onNavigate,
  onPickup,
  onComplete,
}: DeliveryCardProps) {
  const isActive = order.status === 'active';

  return (
    <Card style={[styles.card, isActive ? styles.activeCard : undefined] as any}>
      <View style={styles.header}>
        <View>
          <Text style={styles.restaurantName}>{order.restaurantName}</Text>
          <Text style={styles.customerName}>To: {order.customerName}</Text>
        </View>
        <View style={styles.payment}>
          <Text style={styles.paymentAmount}>${order.payment.toFixed(2)}</Text>
          <Text style={styles.paymentLabel}>Payment</Text>
        </View>
      </View>

      {/* Order Items */}
      {order.items.length > 0 && (
        <View style={styles.itemsSection}>
          <Text style={styles.itemsTitle}>Items:</Text>
          {order.items.slice(0, 2).map((item, index) => (
            <Text key={index} style={styles.itemText}>• {item}</Text>
          ))}
          {order.items.length > 2 && (
            <Text style={styles.moreItems}>+{order.items.length - 2} more items</Text>
          )}
        </View>
      )}

      <View style={styles.addressInfo}>
        <View style={styles.addressContainer}>
          <MapPin size={16} color="#6B7280" />
          <View style={styles.addressDetails}>
            {isActive && <Text style={styles.addressLabel}>Pickup</Text>}
            <Text style={styles.addressText}>{order.pickupAddress}</Text>
          </View>
        </View>
        <View style={styles.addressContainer}>
          <MapPin size={16} color="#FF6B35" />
          <View style={styles.addressDetails}>
            {isActive && <Text style={styles.addressLabel}>Delivery</Text>}
            <Text style={styles.addressText}>{order.deliveryAddress}</Text>
          </View>
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={styles.distance}>{order.distance}</Text>
        <Text style={styles.time}>Est. {order.estimatedTime}</Text>
      </View>

      {isActive ? (
        <View style={styles.activeActions}>
          {onCall && (
            <TouchableOpacity style={styles.callButton} onPress={onCall}>
              <Phone size={18} color="#FFFFFF" />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          )}
          {onNavigate && (
            <TouchableOpacity style={styles.navigateButton} onPress={onNavigate}>
              <Navigation size={18} color="#FFFFFF" />
              <Text style={styles.navigateButtonText}>Navigate</Text>
            </TouchableOpacity>
          )}
          {onPickup && (
            <TouchableOpacity style={styles.pickupButton} onPress={onPickup}>
              <Package size={18} color="#FFFFFF" />
              <Text style={styles.pickupButtonText}>Picked Up</Text>
            </TouchableOpacity>
          )}
          {onComplete && (
            <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
              <CheckCircle size={18} color="#FFFFFF" />
              <Text style={styles.completeButtonText}>Delivered to Customer</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        onAccept && <Button title="Accept Delivery" onPress={onAccept} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  payment: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  paymentLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  itemsSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  moreItems: {
    fontSize: 13,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  addressInfo: {
    marginBottom: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  addressDetails: {
    marginLeft: 8,
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Inter-Regular',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  distance: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Medium',
  },
  time: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Inter-Medium',
  },
  activeActions: {
    flexDirection: 'row',
    gap: 6,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 8,
  },
  callButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  navigateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
  },
  navigateButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  pickupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    borderRadius: 8,
  },
  pickupButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    borderRadius: 8,
  },
  completeButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
});
