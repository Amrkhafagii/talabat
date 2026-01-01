import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { Icon } from '@/components/ui/Icon';

type Props = {
  receiptUri: string | null;
  receiptError: string | null;
  uploading: boolean;
  onPick: () => void;
  onCapture?: () => void;
  required?: boolean;
};

export function CartReceiptSection({ receiptUri, receiptError, uploading, onPick, onCapture, required = true }: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const statusLabel = receiptUri ? 'Attached' : required ? 'Required' : 'Optional';
  const statusStyle = receiptUri ? styles.receiptStatus : required ? styles.receiptStatusPending : styles.receiptStatusOptional;

  return (
    <View style={styles.section}>
      <View style={styles.receiptHeader}>
        <Text style={styles.sectionTitle}>Proof of Payment</Text>
        <Text style={statusStyle}>{statusLabel}</Text>
      </View>
      {receiptError ? <Text style={styles.receiptError}>{receiptError}</Text> : null}

      <TouchableOpacity style={styles.dropzone} onPress={onPick} disabled={uploading}>
        <Icon name="CloudUpload" size="xl" color={theme.colors.primary[500]} />
        <Text style={styles.dropTitle}>
          {uploading ? 'Uploading...' : receiptUri ? 'Replace your proof' : 'Tap to upload your proof'}
        </Text>
        <Text style={styles.dropSubtitle}>PNG, JPG or PDF up to 5MB</Text>
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={onCapture} disabled={uploading}>
          <Icon name="Camera" size="md" color={theme.colors.primary[500]} />
          <Text style={styles.actionText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionSecondary]} onPress={onPick} disabled={uploading}>
          <Icon name="Gallery" size="md" color={theme.colors.text} />
          <Text style={[styles.actionText, styles.actionSecondaryText]}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.receiptHelper}>
        {required
          ? 'Upload a clear screenshot that shows the reference number, amount, and date. We’ll verify it before preparing your order.'
          : 'Optional when paying with wallet. Upload only if you paid via bank transfer or Instapay.'}
      </Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
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
    receiptHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    receiptStatus: {
      color: theme.colors.status.success,
      fontFamily: 'Inter-SemiBold',
    },
    receiptStatusPending: {
      color: theme.colors.status.warning,
      fontFamily: 'Inter-SemiBold',
    },
    receiptStatusOptional: {
      color: theme.colors.textMuted,
      fontFamily: 'Inter-SemiBold',
    },
    dropzone: {
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      borderRadius: theme.radius.card,
      padding: 20,
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.surfaceAlt,
    },
    dropTitle: {
      fontFamily: 'Inter-SemiBold',
      fontSize: 16,
      color: theme.colors.text,
      textAlign: 'center',
    },
    dropSubtitle: {
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: theme.radius.cta,
      backgroundColor: theme.colors.primary[50],
      borderWidth: 1,
      borderColor: theme.colors.primary[100],
      gap: 8,
    },
    actionSecondary: {
      backgroundColor: theme.colors.surfaceAlt,
      borderColor: theme.colors.border,
    },
    actionText: {
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.primary[500],
    },
    actionSecondaryText: {
      color: theme.colors.text,
    },
    receiptHelper: {
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      fontSize: 12,
      marginTop: 10,
      lineHeight: 18,
    },
    receiptError: {
      color: theme.colors.status.error,
      fontFamily: 'Inter-Regular',
      marginBottom: 8,
    },
  });
