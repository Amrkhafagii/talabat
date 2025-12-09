import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onRefresh: () => void;
};

export function OfferUnavailableModal({ visible, onClose, onRefresh }: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={styles.modalIconCircle}>
          <Icon name="Clock" size={28} color={theme.colors.accent} />
        </View>
        <Text style={styles.modalTitle}>Offer No Longer Available</Text>
        <Text style={styles.modalText}>This offer was accepted by another driver just a moment ago.</Text>
        <Button title="See Other Offers" onPress={() => { onClose(); onRefresh(); }} fullWidth />
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    modalCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      padding: theme.spacing.xl,
      alignItems: 'center',
      gap: theme.spacing.sm,
      ...theme.shadows.card,
    },
    modalIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    modalTitle: { ...theme.typography.titleM, color: theme.colors.text },
    modalText: { ...theme.typography.body, color: theme.colors.textMuted, textAlign: 'center' },
  });
