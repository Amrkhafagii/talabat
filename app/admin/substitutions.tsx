import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export default function AdminSubstitutions() {
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Manage Substitutions</Text>
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
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <ScrollView>
          <View style={styles.card}>
            <Text style={styles.title}>Backup mappings</Text>
            {mappings.length === 0 ? (
              <Text style={styles.helper}>No backup mappings found for this restaurant.</Text>
            ) : (
              mappings.map(m => (
                <Text key={m.id} style={styles.meta}>
                  {m.source_item?.name ?? m.source_item_id} → {m.target_item?.name ?? m.target_item_id} (to backup)
                </Text>
              ))
            )}
          </View>

          <View style={styles.card}>
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
            <TouchableOpacity style={styles.button} onPress={handleReroute}>
              <Text style={styles.buttonText}>Reroute order</Text>
            </TouchableOpacity>
            {mappingStatus && <Text style={styles.helper}>{mappingStatus}</Text>}
          </View>

          {subs.map((sub) => {
            const item = (sub as any).item || menuItems.find(mi => mi.id === sub.item_id);
            const replacement = (sub as any).substitute_item || menuItems.find(mi => mi.id === sub.substitute_item_id);
            return (
              <View key={sub.id} style={styles.card}>
                <Text style={styles.title}>{item?.name || sub.item_id} → {replacement?.name || sub.substitute_item_id}</Text>
                <Text style={styles.meta}>Rule: {sub.rule_type} • Max Δ%: {sub.max_delta_pct ?? 10}</Text>
                <Text style={styles.meta}>Auto apply: {sub.auto_apply ? 'Yes' : 'No'}</Text>
                <TouchableOpacity style={styles.button} onPress={() => toggleAutoApply(sub)}>
                  <Text style={styles.buttonText}>{sub.auto_apply ? 'Disable auto-apply' : 'Enable auto-apply'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  header: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#111827', marginBottom: 12 },
  helper: { fontFamily: 'Inter-Regular', color: '#6B7280', marginBottom: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 12,
  },
  inputLabel: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
    fontFamily: 'Inter-Regular',
    color: '#111827',
    marginBottom: 12,
  },
  title: { fontFamily: 'Inter-SemiBold', color: '#111827', marginBottom: 4 },
  meta: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12 },
  button: {
    marginTop: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontFamily: 'Inter-SemiBold' },
  resultsBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 12,
  },
  resultRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  resultText: { fontFamily: 'Inter-SemiBold', color: '#111827' },
  resultSub: { fontFamily: 'Inter-Regular', color: '#6B7280', fontSize: 12 },
});
