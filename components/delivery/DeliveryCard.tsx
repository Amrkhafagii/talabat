import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Navigation, Phone, CircleCheck as CheckCircle } from 'lucide-react-native';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface DeliveryOrder {
  id: number;
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
  onComplete?: () => void;
}

export default function DeliveryCard({
  order,
  onAccept,
  onCall,
  onNavigate,
  onComplete,
}: DeliveryCardProps) {
  const isActive = order.status === 'active';

  return (
    <Card style={[styles.card, isActive && styles.activeCard]}>
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
              <Phone size={20} color="#FFFFFF" />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
          )}
          {onNavigate && (
            <TouchableOpacity style={styles.navigateButton} onPress={onNavigate}>
              <Navigation size={20} color="#FFFFFF" />
              <Text style={styles.navigateButtonText}>Navigate</Text>
            </TouchableOpacity>
          )}
          {onComplete && (
            <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        onAccept && <Button title="Accept Order" onPress={onAccept} />
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
    marginBottom: 16,
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
    gap: 8,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
  },
  callButtonText: {
    fontSize: 14,
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
    paddingVertical: 12,
    borderRadius: 8,
  },
  navigateButtonText: {
    fontSize: 14,
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
    paddingVertical: 12,
    borderRadius: 8,
  },
  completeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
});