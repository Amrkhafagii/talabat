import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '@/styles/appTheme';

type Props = {
  receiptUri: string | null;
  receiptError: string | null;
  uploading: boolean;
  onPick: () => void;
};

export function CartReceiptSection({ receiptUri, receiptError, uploading, onPick }: Props) {
  const theme = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.section}>
      <View style={styles.receiptHeader}>
        <Text style={styles.sectionTitle}>Payment Receipt</Text>
        {receiptUri ? <Text style={styles.receiptStatus}>Attached</Text> : <Text style={styles.receiptStatusPending}>Required</Text>}
      </View>
      {receiptError ? <Text style={styles.receiptError}>{receiptError}</Text> : null}
      <TouchableOpacity style={styles.receiptButton} onPress={onPick} disabled={uploading}>
        <Text style={styles.receiptButtonText}>{uploading ? 'Uploading...' : receiptUri ? 'Replace Receipt' : 'Upload Receipt'}</Text>
      </TouchableOpacity>
      <Text style={styles.receiptHelper}>Upload your payment receipt. Restaurant will start preparing after verification.</Text>
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
    receiptButton: {
      backgroundColor: theme.colors.primary[100],
      borderWidth: 1,
      borderColor: theme.colors.primary[100],
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginBottom: 6,
    },
    receiptButtonText: {
      color: theme.colors.primary[500],
      fontFamily: 'Inter-SemiBold',
      textAlign: 'center',
    },
    receiptHelper: {
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      fontSize: 12,
    },
    receiptError: {
      color: theme.colors.status.error,
      fontFamily: 'Inter-Regular',
      marginBottom: 8,
    },
  });
