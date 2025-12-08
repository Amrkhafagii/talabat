import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import Header from '@/components/ui/Header';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverByUserId, getUserProfile } from '@/utils/database';
import { DeliveryDriver, User as UserType } from '@/types/database';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { useDeliveryLayout } from '@/styles/layout';

export default function DeliveryProfile() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const theme = useRestaurantTheme();
  const { contentPadding } = useDeliveryLayout();
  const styles = useMemo(() => createStyles(theme, contentPadding.horizontal), [theme, contentPadding.horizontal]);

  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [userProfile, setUserProfile] = useState<UserType | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const [driverData, profileData] = await Promise.all([
        getDriverByUserId(user.id),
        getUserProfile(user.id),
      ]);
      setDriver(driverData);
      setUserProfile(profileData);
    };
    load();
  }, [user]);

  const initials = () => {
    const name = userProfile?.full_name || user?.email || 'D';
    return name
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Profile" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials()}</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.name}>{userProfile?.full_name || 'Driver'}</Text>
            <Text style={styles.meta}>{userProfile?.phone || user?.email}</Text>
            <View style={styles.verifiedRow}>
              <Icon name="CheckCircle2" size={16} color={theme.colors.success} />
              <Text style={styles.verifiedText}>{driver?.documents_verified ? 'Verified' : 'Pending Verification'}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statValue}>{driver?.rating?.toFixed(1) || '4.9'}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Deliveries</Text>
            <Text style={styles.statValue}>{driver?.total_deliveries || 0}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Earnings</Text>
            <Text style={styles.statValue}>${driver?.total_earnings?.toFixed(0) || '0'}</Text>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>Vehicle & License</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="Car" size="sm" color={theme.colors.accent} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Vehicle</Text>
              <Text style={styles.infoValue}>
                {driver?.vehicle_year ? `${driver.vehicle_year} ` : ''}
                {driver?.vehicle_make} {driver?.vehicle_model || driver?.vehicle_type || 'Not set'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="ShieldCheck" size="sm" color={theme.colors.success} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>License</Text>
              <Text style={styles.infoValue}>{driver?.license_number || 'Not provided'}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Documents</Text>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Icon name="FileText" size="sm" color={theme.colors.text} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>ID / License</Text>
              <Text style={styles.infoValue}>{driver?.license_document_status || 'pending'}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Icon name="FileText" size="sm" color={theme.colors.text} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Vehicle Registration</Text>
              <Text style={styles.infoValue}>{driver?.vehicle_document_url ? 'Uploaded' : 'Pending'}</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Card style={styles.infoCard}>
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(tabs)/delivery/earnings' as any)}>
            <Icon name="Phone" size="sm" color={theme.colors.text} />
            <Text style={styles.actionText}>My Earnings</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(tabs)/delivery/history' as any)}>
            <Icon name="MapPin" size="sm" color={theme.colors.text} />
            <Text style={styles.actionText}>Delivery History</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(tabs)/delivery/wallet' as any)}>
            <Icon name="Settings" size="sm" color={theme.colors.text} />
            <Text style={styles.actionText}>Wallet & Payouts</Text>
          </TouchableOpacity>
        </Card>

        <Button title="Sign Out" onPress={handleSignOut} variant="danger" fullWidth pill />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>, horizontal: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: horizontal, paddingBottom: theme.insets.bottom + theme.spacing.lg, gap: theme.spacing.md },
    hero: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.lg },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { ...theme.typography.titleM, color: theme.colors.text },
    heroText: { flex: 1, gap: 4 },
    name: { ...theme.typography.titleM, color: theme.colors.text },
    meta: { ...theme.typography.caption, color: theme.colors.textMuted },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    verifiedText: { ...theme.typography.caption, color: theme.colors.success },
    statsRow: { flexDirection: 'row', gap: theme.spacing.sm },
    statCard: { flex: 1, padding: theme.spacing.md, alignItems: 'center' },
    statLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
    statValue: { ...theme.typography.titleM, color: theme.colors.text },
    sectionTitle: { ...theme.typography.subhead, color: theme.colors.text, marginTop: theme.spacing.sm },
    infoCard: { padding: theme.spacing.md, gap: theme.spacing.sm },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    infoText: { flex: 1, gap: 2 },
    infoLabel: { ...theme.typography.caption, color: theme.colors.textMuted },
    infoValue: { ...theme.typography.body, color: theme.colors.text },
    divider: { height: 1, backgroundColor: theme.colors.border },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
    actionText: { ...theme.typography.body, color: theme.colors.text },
  });
