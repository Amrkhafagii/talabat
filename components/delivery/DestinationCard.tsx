import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Card from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

type Destination = {
  address: string;
  latitude?: number;
  longitude?: number;
  type: 'pickup' | 'delivery';
  label: string;
};

type Props = {
  destination: Destination;
  onGoogle: () => void;
  onApple?: () => void;
  onWaze: () => void;
};

export function DestinationCard({ destination, onGoogle, onApple, onWaze }: Props) {
  const theme = useRestaurantTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          {destination.type === 'pickup' ? (
            <Icon name='Package' size='xl' color={theme.colors.accent} />
          ) : (
            <Icon name='MapPin' size='xl' color={theme.colors.status.success} />
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.label}>{destination.label}</Text>
          <Text style={styles.address}>{destination.address}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.navButton, styles.google]} onPress={onGoogle}>
          <Icon name='Navigation' size='md' color={theme.colors.textInverse} />
          <Text style={styles.navText}>Google Maps</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && onApple && (
          <TouchableOpacity style={[styles.navButton, styles.apple]} onPress={onApple}>
            <Icon name='MapPin' size='md' color={theme.colors.textInverse} />
            <Text style={styles.navText}>Apple Maps</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.navButton, styles.waze]} onPress={onWaze}>
          <Icon name='Navigation' size='md' color={theme.colors.textInverse} />
          <Text style={styles.navText}>Waze</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    card: {
      marginBottom: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    label: {
      ...theme.typography.subhead,
      color: theme.colors.text,
    },
    address: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    navButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      gap: theme.spacing.xs,
    },
    google: {
      backgroundColor: theme.colors.primary[500],
    },
    apple: {
      backgroundColor: theme.colors.accentStrong,
    },
    waze: {
      backgroundColor: theme.colors.status.info,
    },
    navText: {
      ...theme.typography.buttonSmall,
      color: theme.colors.textInverse,
    },
  });
