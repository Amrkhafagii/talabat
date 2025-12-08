import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowDown, ArrowUp, GripVertical, Pencil, Trash2, X, Check } from 'lucide-react-native';
import { router } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { ensureRestaurantForUser, getCategories, createCategory, updateCategory, deleteCategory, reorderCategories } from '@/utils/database';
import { Category, Restaurant } from '@/types/database';
import { reorderCategoryList } from '@/utils/menuOrdering';
import { logMutationError } from '@/utils/telemetry';

export default function CategoryManagerScreen() {
  const { user } = useAuth();
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  const load = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const rest = await ensureRestaurantForUser(user.id);
      if (!rest) return;
      setRestaurant(rest);
      const data = await getCategories(rest.id);
      setCategories(data);
    } catch (err) {
      console.error('load categories failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const reordered = reorderCategoryList<Category>(categories, index, direction);
    if (reordered === categories) return;
    const previous = categories;
    setCategories(reordered);
    const ok = await reorderCategories(reordered.map((c) => ({ id: c.id, sort_order: c.sort_order })));
    if (!ok) {
      setCategories(previous);
      Alert.alert('Reorder failed', 'Could not update category order.');
    }
  };

  const handleRename = async (id: string) => {
    const name = (renameDrafts[id] ?? '').trim();
    if (!name) {
      Alert.alert('Name required', 'Enter a category name.');
      return;
    }
    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Duplicate', 'Category name already exists.');
      return;
    }
    const previous = categories;
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    const ok = await updateCategory(id, { name });
    if (!ok) {
      setCategories(previous);
        Alert.alert('Rename failed', 'Could not update category.');
      } else {
        setEditingId(null);
      }
  };

  const handleDelete = async (id: string) => {
    Alert.alert('Delete category', 'Items will lose this category. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const previous = categories;
          setCategories(previous.filter((c) => c.id !== id));
          const ok = await deleteCategory(id);
          if (!ok) {
            setCategories(previous);
            Alert.alert('Delete failed', 'Could not delete category.');
          }
        },
      },
    ]);
  };

  const handleAdd = async () => {
    if (!newCategory.trim() || !restaurant) return;
    if (categories.some((c) => c.name.toLowerCase() === newCategory.trim().toLowerCase())) {
      Alert.alert('Duplicate', 'Category name already exists.');
      return;
    }
    try {
      setSavingNew(true);
      const { category, errorCode, errorMessage } = await createCategory({
        name: newCategory.trim(),
        emoji: '🍽️',
        description: '',
        restaurant_id: restaurant.id,
        is_active: true,
        sort_order: (categories[categories.length - 1]?.sort_order || 0) + 1,
      });
      if (category) {
        setCategories((prev) => [...prev, category]);
        setNewCategory('');
      } else {
        const friendly = errorCode === '42501' ? 'Not allowed to create categories' : 'Could not create category';
        logMutationError('category.create.failed', { errorCode, errorMessage });
        Alert.alert('Error', friendly);
      }
    } finally {
      setSavingNew(false);
    }
  };

  const renderCategory = ({ item, index }: { item: Category; index: number }) => {
    const draft = renameDrafts[item.id] ?? item.name;
    const isEditing = editingId === item.id;
    return (
      <View style={styles.row}>
        <GripVertical size={theme.iconSizes.md} strokeWidth={theme.icons.strokeWidth} color={theme.colors.secondaryText} />
        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={draft}
            onChangeText={(val) => setRenameDrafts((prev) => ({ ...prev, [item.id]: val }))}
            onSubmitEditing={() => handleRename(item.id)}
            autoFocus
            returnKeyType="done"
          />
        ) : (
          <Text style={styles.name}>{item.name}</Text>
        )}
        <View style={styles.rowActions}>
          <TouchableOpacity onPress={() => handleMove(index, 'up')} disabled={index === 0} hitSlop={theme.tap.hitSlop}>
            <ArrowUp size={18} color={index === 0 ? theme.colors.border : theme.colors.secondaryText} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleMove(index, 'down')} disabled={index === categories.length - 1} hitSlop={theme.tap.hitSlop}>
            <ArrowDown size={18} color={index === categories.length - 1 ? theme.colors.border : theme.colors.secondaryText} />
          </TouchableOpacity>
          {isEditing ? (
            <TouchableOpacity onPress={() => handleRename(item.id)} hitSlop={theme.tap.hitSlop}>
              <Check size={18} color={theme.colors.accent} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setEditingId(item.id); setRenameDrafts((prev) => ({ ...prev, [item.id]: item.name })); }} hitSlop={theme.tap.hitSlop}>
              <Pencil size={18} color={theme.colors.secondaryText} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={theme.tap.hitSlop}>
            <Trash2 size={18} color={theme.colors.status.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={theme.tap.hitSlop} style={styles.headerIcon}>
          <X size={theme.iconSizes.md} strokeWidth={theme.icons.strokeWidth} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Category Management</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={theme.tap.hitSlop}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.subtitle}>Loading categories...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={renderCategory}
            ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.subtitle}>No categories yet.</Text>}
          />

          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="Enter new category name"
              value={newCategory}
              onChangeText={setNewCategory}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAdd} disabled={savingNew}>
              <Text style={styles.addButtonText}>{savingNew ? 'Adding...' : 'Add Category'}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  const isCompact = theme.device.isSmallScreen;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
      paddingTop: theme.spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.lg,
    },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      ...theme.typography.title2,
      textAlign: 'center',
    },
    doneText: { ...theme.typography.subhead, color: theme.colors.accent },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.secondaryText,
      marginTop: theme.spacing.xs,
      lineHeight: 22,
      textAlign: 'center',
    },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
    list: { paddingBottom: theme.spacing.xl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    name: { ...theme.typography.subhead, flex: 1, marginHorizontal: theme.spacing.sm },
    nameInput: {
      flex: 1,
      marginHorizontal: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderMuted,
      paddingVertical: theme.spacing.xs,
      ...theme.typography.body,
    },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    addRow: { gap: theme.spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.formBorder,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.formSurface,
      color: theme.colors.formText,
    },
    addButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radius.cta,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.card,
    },
    addButtonText: { ...theme.typography.button, color: theme.colors.textInverse },
  });
}
