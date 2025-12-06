import React from 'react';
import { View, TextInput, Text, TouchableOpacity } from 'react-native';
import { styles } from '@/styles/adminMetrics';

type Props = {
  search: string;
  onChangeSearch: (val: string) => void;
  deliveryStatus: string;
  onChangeDeliveryStatus: (val: string) => void;
  paymentStatus: string;
  onChangePaymentStatus: (val: string) => void;
  onSubmit: () => void;
  loading: boolean;
  onQuickReviews?: () => void;
  onQuickPayouts?: () => void;
};

const deliveryOptions = ['any', 'pending', 'picked_up', 'delivered', 'cancelled'];
const paymentOptions = ['any', 'payment_pending', 'paid_pending_review', 'paid', 'captured', 'failed', 'refunded', 'voided'];

export function OrderFilters({
  search,
  onChangeSearch,
  deliveryStatus,
  onChangeDeliveryStatus,
  paymentStatus,
  onChangePaymentStatus,
  onSubmit,
  loading,
  onQuickReviews,
  onQuickPayouts,
}: Props) {
  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      <Text style={styles.metaRow}>Load by order/user/restaurant id or filter by state</Text>
      <TextInput
        value={search}
        onChangeText={onChangeSearch}
        placeholder="Enter order/user/restaurant id"
        style={styles.input}
        autoCapitalize="none"
      />
      <View style={styles.buttonRow}>
        <Dropdown
          label="Delivery status"
          value={deliveryStatus}
          options={deliveryOptions}
          onChange={onChangeDeliveryStatus}
        />
        <Dropdown
          label="Payment"
          value={paymentStatus}
          options={paymentOptions}
          onChange={onChangePaymentStatus}
        />
      </View>
      <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Loading…' : 'Apply'}</Text>
      </TouchableOpacity>
      {(onQuickReviews || onQuickPayouts) && (
        <View style={styles.buttonRow}>
          {onQuickReviews && (
            <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={onQuickReviews}>
              <Text style={styles.outlineButtonText}>Open Reviews</Text>
            </TouchableOpacity>
          )}
          {onQuickPayouts && (
            <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={onQuickPayouts}>
              <Text style={styles.outlineButtonText}>Open Payouts</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metaRow}>{label}</Text>
      <View style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={styles.row}>{value}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {options.slice(0, 3).map(opt => (
            <TouchableOpacity key={opt} onPress={() => onChange(opt)} style={[styles.badge, styles.badgeNeutral]}>
              <Text style={[styles.badgeText, styles.badgeNeutralText]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

export default OrderFilters;
