import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listSubstitutionsByRestaurant, upsertSubstitution, getMenuItemsByRestaurant } from '@/utils/database';
import type { ItemSubstitution, MenuItem } from '@/types/database';

export default function AdminSubstitutions() {
  const [restaurantId, setRestaurantId] = useState<string>(''); // TODO: wire selection input
  const [subs, setSubs] = useState<ItemSubstitution[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      setLoading(true);
      const [s, items] = await Promise.all([
        listSubstitutionsByRestaurant(restaurantId),
        getMenuItemsByRestaurant(restaurantId),
      ]);
      setSubs(s);
      setMenuItems(items);
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Manage Substitutions</Text>
      {!restaurantId && (
        <Text style={styles.helper}>Set a restaurant ID in code to load substitutions.</Text>
      )}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <ScrollView>
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
});
