import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/styles/appTheme';
import { UserAddress } from '@/types/database';

type Props = {
  address: UserAddress | null;
  onSelect: () => void;
};

export function CartAddressSection({ address, onSelect }: Props) {
  const theme = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Delivery Address</Text>
      {address ? (
        <TouchableOpacity style={styles.addressCard} onPress={onSelect}>
          <Icon name='MapPin' size='md' color={theme.colors.primary[500]} />
          <View style={styles.addressInfo}>
            <Text style={styles.addressType}>{address.label}</Text>
            <Text style={styles.addressText}>
              {address.address_line_1}
              {address.address_line_2 && `, ${address.address_line_2}`}
            </Text>
            <Text style={styles.addressText}>
              {address.city}, {address.state} {address.postal_code}
            </Text>
          </View>
          <Icon name='ChevronDown' size='md' color={theme.colors.textMuted} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.addAddressCard} onPress={onSelect}>
          <Icon name='MapPin' size='md' color={theme.colors.textMuted} />
          <Text style={styles.addAddressText}>Add delivery address</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    section: {
      backgroundColor: theme.colors.surface,
      marginBottom: 8,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    addressCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.formSurface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.formBorder,
    },
    addressInfo: {
      flex: 1,
      marginLeft: 12,
    },
    addressType: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
    },
    addressText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginTop: 2,
      lineHeight: 18,
    },
    addAddressCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: theme.colors.formSurface,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    addAddressText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Medium',
      marginLeft: 8,
    },
  });
