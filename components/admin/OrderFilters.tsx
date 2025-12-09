import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity, ScrollView } from 'react-native';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';
import { IOSInput } from '@/components/ios/IOSInput';
import { IOSPillButton } from '@/components/ios/IOSPillButton';
import { IOSQuickLinkPill } from '@/components/ios/IOSQuickLinkPill';
import { Icon } from '@/components/ui/Icon';
import { wp } from '@/styles/responsive';

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

const deliveryOptions = ['All', 'Active', 'Completed', 'Cancelled'];
const paymentOptions = ['All', 'Paid', 'Pending', 'Refunded'];

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
      <Text style={iosTypography.caption}>Load by order/user/restaurant id or filter by state</Text>
      <View style={iosStyles.searchRow}>
        <IOSInput
          value={search}
          onChangeText={onChangeSearch}
          placeholder="Search Order, User, Restaurant"
          autoCapitalize="none"
          style={{ flex: 1, paddingLeft: iosSpacing.lg }}
        />
        <Icon name="Filter" size="sm" color={iosColors.secondaryText} />
      </View>
      <View style={iosRow}>
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
      <IOSPillButton label={loading ? 'Loading…' : 'Apply'} onPress={onSubmit} disabled={loading} size="md" />
      {(onQuickReviews || onQuickPayouts) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[iosRow, { marginTop: iosSpacing.xs }]}>
          {onQuickReviews && <IOSQuickLinkPill label="Quick Links: Reviews" onPress={onQuickReviews} icon={<Icon name="ClipboardList" size="sm" color="#FFF" />} />}
          {onQuickPayouts && <IOSQuickLinkPill label="Quick Links: Payouts" onPress={onQuickPayouts} icon={<Icon name="CreditCard" size="sm" color="#FFF" />} />}
        </ScrollView>
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
      <Text style={iosTypography.caption}>{label}</Text>
      <View style={iosStyles.dropdown}>
        <Text style={iosStyles.dropdownValue}>{value}</Text>
        <View style={iosStyles.dropdownOptions}>
          {options.slice(0, 3).map(opt => {
            const active = opt === value;
            return (
              <TouchableOpacity key={opt} onPress={() => onChange(opt)} style={[iosStyles.chip, active && iosStyles.chipActive]}>
                <Text style={[iosStyles.chipText, active && iosStyles.chipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default OrderFilters;

const iosStyles = StyleSheet.create({
  dropdown: {
    backgroundColor: iosColors.surface,
    borderRadius: iosRadius.md,
    borderWidth: 1,
    borderColor: iosColors.separator,
    padding: iosSpacing.sm,
  },
  dropdownValue: { ...iosTypography.body, marginBottom: iosSpacing.xs },
  dropdownOptions: { flexDirection: 'row', gap: iosSpacing.xs },
  chip: {
    paddingHorizontal: iosSpacing.sm,
    paddingVertical: iosSpacing.xs,
    borderRadius: iosRadius.pill,
    backgroundColor: iosColors.chipBg,
  },
  chipActive: { backgroundColor: iosColors.primary },
  chipText: { ...iosTypography.subhead, color: iosColors.secondaryText },
  chipTextActive: { color: iosColors.textInverse },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: iosSpacing.xs,
  },
});

const iosRow: ViewStyle = { flexDirection: 'row', justifyContent: 'space-between', gap: iosSpacing.xs };
