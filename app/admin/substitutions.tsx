import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import {
  listSubstitutionsByRestaurant,
  upsertSubstitution,
  getMenuItemsByRestaurant,
  listBackupMappings,
  rerouteOrder,
  getRestaurants,
} from '@/utils/database';
import type { ItemSubstitution, MenuItem, Restaurant } from '@/types/database';
import type { BackupMapping } from '@/utils/db/reroute';
import { AdminShell } from '@/components/admin/AdminShell';
import { useAdminGate } from '@/hooks/useAdminGate';
import { IOSCard } from '@/components/ios/IOSCard';
import { IOSPillButton } from '@/components/ios/IOSPillButton';
import { iosColors, iosRadius, iosSpacing, iosTypography } from '@/styles/iosTheme';

export default function AdminSubstitutions() {
  const { allowed, loading: gateLoading, signOut } = useAdminGate();
  const [restaurantId, setRestaurantId] = useState<string>('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [restaurantResults, setRestaurantResults] = useState<Restaurant[]>([]);
  const [subs, setSubs] = useState<ItemSubstitution[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mappings, setMappings] = useState<BackupMapping[]>([]);
  const [mappingStatus, setMappingStatus] = useState<string | null>(null);
  const [rerouteForm, setRerouteForm] = useState({ orderId: '', backupRestaurantId: '' });

  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      setLoading(true);
      const [s, items, maps] = await Promise.all([
        listSubstitutionsByRestaurant(restaurantId),
        getMenuItemsByRestaurant(restaurantId),
        listBackupMappings(restaurantId),
      ]);
      setSubs(s);
      setMenuItems(items);
      setMappings(maps || []);
      setLoading(false);
    };
    load();
  }, [restaurantId]);

  const toggleAutoApply = async (sub: ItemSubstitution) => {
    await upsertSubstitution({
      restaurant_id: sub.restaurant_id,
      item_id: sub.item_id,
      substitute_item_id: sub.substitute_item_id,
      rule_type: sub.rule_type,
      max_delta_pct: sub.max_delta_pct ?? 10,
      auto_apply: !sub.auto_apply,
      notes: sub.notes ?? undefined,
    });
    const updated = await listSubstitutionsByRestaurant(sub.restaurant_id);
    setSubs(updated);
  };

  useEffect(() => {
    const runSearch = async () => {
      if (!restaurantSearch.trim()) {
        setRestaurantResults([]);
        return;
      }
      const results = await getRestaurants({ search: restaurantSearch.trim() }, { pageSize: 10 });
      setRestaurantResults(results);
    };
    runSearch();
  }, [restaurantSearch]);

  const handleReroute = async () => {
    setMappingStatus(null);
    if (!rerouteForm.orderId || !rerouteForm.backupRestaurantId) {
      setMappingStatus('Order ID and backup restaurant ID are required.');
      return;
    }
    const res = await rerouteOrder(rerouteForm.orderId.trim(), rerouteForm.backupRestaurantId.trim());
    if (res.ok) {
      setMappingStatus(`Reroute created. New order: ${res.newOrderId}`);
      setRerouteForm({ orderId: '', backupRestaurantId: '' });
    } else {
      setMappingStatus(`Failed to reroute: ${res.reason}`);
    }
  };

  if (gateLoading || !allowed) return null;

  return (
    <AdminShell title="Substitutions" onSignOut={signOut} headerVariant="ios">
      <ScrollView contentContainerStyle={{ paddingBottom: iosSpacing.lg }}>
        <Text style={styles.header}>Manage Substitutions</Text>
        <IOSCard padding="md" style={styles.card}>
          <Text style={styles.inputLabel}>Search restaurant</Text>
          <TextInput
            style={styles.input}
            value={restaurantSearch}
            onChangeText={setRestaurantSearch}
            placeholder="Search by name or cuisine"
            autoCapitalize="none"
          />
          {restaurantResults.length > 0 && (
            <View style={styles.resultsBox}>
              {restaurantResults.map(r => (
                <TouchableOpacity key={r.id} style={styles.resultRow} onPress={() => setRestaurantId(r.id)}>
                  <Text style={styles.resultText}>{r.name}</Text>
                  <Text style={styles.resultSub}>{r.cuisine} • {r.id.slice(0, 6)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={styles.inputLabel}>Restaurant ID</Text>
          <TextInput
            style={styles.input}
            value={restaurantId}
            onChangeText={setRestaurantId}
            placeholder="Enter restaurant UUID"
            autoCapitalize="none"
          />
          {!restaurantId && (
            <Text style={styles.helper}>Enter a restaurant ID to load substitutions.</Text>
          )}
        </IOSCard>

        <IOSCard padding="md" style={styles.card}>
          <Text style={styles.title}>Backup mappings</Text>
          {loading ? (
            <View style={styles.loading}><ActivityIndicator size="small" color={iosColors.primary} /></View>
          ) : mappings.length === 0 ? (
            <Text style={styles.helper}>No backup mappings found for this restaurant.</Text>
          ) : (
            mappings.map(m => (
              <Text key={m.id} style={styles.meta}>
                {m.source_item?.name ?? m.source_item_id} → {m.target_item?.name ?? m.target_item_id} (to backup)
              </Text>
            ))
          )}
        </IOSCard>

        <IOSCard padding="md" style={styles.card}>
          <Text style={styles.title}>Trigger reroute</Text>
          <Text style={styles.inputLabel}>Order ID</Text>
          <TextInput
            style={styles.input}
            value={rerouteForm.orderId}
            onChangeText={v => setRerouteForm(prev => ({ ...prev, orderId: v }))}
            placeholder="order uuid"
            autoCapitalize="none"
          />
          <Text style={styles.inputLabel}>Backup restaurant ID</Text>
          <TextInput
            style={styles.input}
            value={rerouteForm.backupRestaurantId}
            onChangeText={v => setRerouteForm(prev => ({ ...prev, backupRestaurantId: v }))}
            placeholder="backup restaurant uuid"
            autoCapitalize="none"
          />
          <IOSPillButton label="Reroute order" onPress={handleReroute} />
          {mappingStatus && <Text style={styles.helper}>{mappingStatus}</Text>}
        </IOSCard>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator size="small" color={iosColors.primary} /></View>
        ) : (
          subs.map((sub) => {
            const item = (sub as any).item || menuItems.find(mi => mi.id === sub.item_id);
            const replacement = (sub as any).substitute_item || menuItems.find(mi => mi.id === sub.substitute_item_id);
            return (
              <IOSCard key={sub.id} padding="md" style={styles.card}>
                <Text style={styles.title}>{item?.name || sub.item_id} → {replacement?.name || sub.substitute_item_id}</Text>
                <Text style={styles.meta}>Rule: {sub.rule_type} • Max Δ%: {sub.max_delta_pct ?? 10}</Text>
                <Text style={styles.meta}>Auto apply: {sub.auto_apply ? 'Yes' : 'No'}</Text>
                <IOSPillButton label={sub.auto_apply ? 'Disable auto-apply' : 'Enable auto-apply'} onPress={() => toggleAutoApply(sub)} size="sm" />
              </IOSCard>
            );
          })
        )}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  header: { ...iosTypography.subhead, color: iosColors.secondaryText, marginBottom: iosSpacing.sm },
  helper: { ...iosTypography.caption, color: iosColors.secondaryText, marginBottom: iosSpacing.sm },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: iosSpacing.md },
  card: {
    marginBottom: iosSpacing.md,
    borderRadius: iosRadius.xl,
  },
  inputLabel: { ...iosTypography.caption, color: iosColors.secondaryText, marginBottom: iosSpacing.xs },
  input: {
    borderWidth: 1,
    borderColor: iosColors.separator,
    borderRadius: iosRadius.md,
    padding: iosSpacing.sm,
    backgroundColor: iosColors.surface,
    ...iosTypography.body,
    marginBottom: iosSpacing.sm,
  },
  title: { ...iosTypography.subhead, marginBottom: iosSpacing.xs },
  meta: { ...iosTypography.caption, color: iosColors.secondaryText },
  resultsBox: {
    backgroundColor: iosColors.surface,
    borderWidth: 1,
    borderColor: iosColors.separator,
    borderRadius: iosRadius.md,
    marginBottom: iosSpacing.sm,
  },
  resultRow: {
    padding: iosSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: iosColors.separator,
  },
  resultText: { ...iosTypography.body },
  resultSub: { ...iosTypography.caption, color: iosColors.secondaryText },
});
