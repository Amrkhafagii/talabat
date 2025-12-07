import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Plus, X } from 'lucide-react-native';
import { router } from 'expo-router';

import ScreenHeader from '@/components/ui/ScreenHeader';
import Button from '@/components/ui/Button';
import LabeledInput from '@/components/ui/LabeledInput';
import { useAuth } from '@/contexts/AuthContext';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { ensureRestaurantForUser, createMenuItem, getCategories, createCategory } from '@/utils/database';
import { Restaurant, Category } from '@/types/database';
import { supabase } from '@/utils/supabase';
import { logMutationError } from '@/utils/telemetry';

export default function AddMenuItem() {
  const { user } = useAuth();
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isPopular, setIsPopular] = useState(false);
  const [imageUri, setImageUri] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageChanged, setImageChanged] = useState(false);

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
      if (!rest) {
        Alert.alert('Error', 'Restaurant not found', [{ text: 'OK', onPress: () => router.back() }]);
        return;
      }
      const cats = await getCategories(rest.id);
      setRestaurant(rest);
      setCategories(cats);
      setCategoryId(cats[0]?.id ?? null);
    } catch (err) {
      console.error('Error loading menu form', err);
      Alert.alert('Error', 'Failed to load restaurant data');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter item name';
    if (!description.trim()) next.description = 'Enter description';
    const priceVal = parseFloat(price);
    if (!price.trim() || Number.isNaN(priceVal) || priceVal <= 0) next.price = 'Price must be greater than 0';
    if (!imageUri.trim()) next.image = 'Add an image';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) {
      setImageUri(result.assets[0].uri);
      setImageChanged(true);
    }
  };

  const uploadImage = async (uri: string, ownerId: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const path = `${ownerId}/menu-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('menu-photos').upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from('menu-photos').getPublicUrl(data.path);
      return publicUrl?.publicUrl || data.path;
    } catch (err) {
      console.error('upload failed', err);
      return null;
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !restaurant) return;
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
      setCategoryId(category.id);
      setNewCategory('');
    } else {
      const friendly = errorCode === '42501' ? 'Not allowed to create categories' : 'Could not create category';
      logMutationError('category.create.failed', { errorCode, errorMessage });
      Alert.alert('Error', friendly);
    }
  };

  const handleSave = async () => {
    if (!restaurant || !validate()) return;
    try {
      setSaving(true);
      let photoUrl = imageUri.trim();
      if (photoUrl && !photoUrl.startsWith('http')) {
        const uploaded = await uploadImage(photoUrl, restaurant.id);
        if (!uploaded) {
          Alert.alert('Upload failed', 'Please try another image.');
          setSaving(false);
          return;
        }
        photoUrl = uploaded;
        setImageUri(uploaded);
      }

      const payload = {
        restaurant_id: restaurant.id,
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        image: photoUrl,
        category_id: categoryId ?? undefined,
        category: (categories.find((c) => c.id === categoryId)?.name ?? categories[0]?.name ?? newCategory) || 'Uncategorized',
        is_available: isAvailable,
        is_popular: isPopular,
        preparation_time: 15,
        photo_approval_status: imageChanged ? ('pending' as const) : undefined,
        sort_order: 0,
      };

      const { success, errorCode, errorMessage } = await createMenuItem(payload);
      if (success) {
        Alert.alert('Saved', 'Menu item added', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        const friendly = errorCode === '42501' ? 'Not allowed to add items' : 'Failed to add item';
        logMutationError('menu.create.failed', { errorCode, errorMessage });
        Alert.alert('Error', friendly);
      }
    } catch (err) {
      console.error('Save failed', err);
      Alert.alert('Error', 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor={theme.colors.background} />
        <ScreenHeader title="Add Menu Item" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor={theme.colors.background} />
      <ScreenHeader title="Add Menu Item" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.insets.bottom + theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Item photo</Text>
          <TouchableOpacity style={styles.photoPlaceholder} onPress={pickImage} activeOpacity={0.8}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photo} />
            ) : (
              <>
                <Camera size={28} color={theme.colors.formPlaceholder} />
                <Text style={styles.photoText}>Upload Photo</Text>
              </>
            )}
          </TouchableOpacity>
          {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
        </View>

        <View style={styles.card}>
          <LabeledInput label="Item Name *" value={name} onChangeText={setName} placeholder="e.g., Classic Cheeseburger" errorText={errors.name} />
          <LabeledInput
            label="Description *"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the dish..."
            multiline
            numberOfLines={4}
            errorText={errors.description}
            style={styles.textArea}
          />
          <LabeledInput
            label="Price ($) *"
            value={price}
            onChangeText={setPrice}
            placeholder="12.50"
            keyboardType="decimal-pad"
            errorText={errors.price}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {categories.map((cat) => {
              const active = cat.id === categoryId;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategoryId(cat.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.newCategoryRow}>
            <TextInput
              style={[styles.input, styles.flex1]}
              placeholder="New category name"
              value={newCategory}
              onChangeText={setNewCategory}
              placeholderTextColor={theme.colors.formPlaceholder}
            />
            <TouchableOpacity style={styles.addCategoryButton} onPress={handleAddCategory}>
              <Text style={styles.addCategoryButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Visibility</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Available</Text>
            <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ false: theme.colors.borderMuted, true: theme.colors.accent }} thumbColor="#FFFFFF" />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Mark as popular</Text>
            <Switch value={isPopular} onValueChange={setIsPopular} trackColor={{ false: theme.colors.borderMuted, true: theme.colors.accent }} thumbColor="#FFFFFF" />
          </View>
        </View>

        <Button title={saving ? 'Saving...' : 'Save Item'} onPress={handleSave} disabled={saving} style={styles.saveButton} pill fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useRestaurantTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.lg },
    loadingText: { ...theme.typography.body, color: theme.colors.secondaryText },
    card: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      padding: theme.spacing.lg,
      borderRadius: theme.radius.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    sectionTitle: { ...theme.typography.subhead, marginBottom: theme.spacing.sm },
    photoPlaceholder: {
      height: 180,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      backgroundColor: theme.colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    photo: { width: '100%', height: '100%', borderRadius: theme.radius.lg },
    photoText: { ...theme.typography.caption, color: theme.colors.formPlaceholder },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    chipRow: { gap: theme.spacing.sm },
    chip: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.formBorder,
      backgroundColor: theme.colors.formSurfaceAlt,
    },
    chipActive: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
    chipText: { ...theme.typography.body, color: theme.colors.formText },
    chipTextActive: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
    newCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.formBorder,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.formSurface,
      color: theme.colors.formText,
    },
    addCategoryButton: {
      backgroundColor: theme.colors.accent,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    addCategoryButtonText: { ...theme.typography.buttonSmall, color: '#FFFFFF' },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: theme.spacing.sm },
    toggleLabel: { ...theme.typography.body, color: theme.colors.formText },
    saveButton: { marginHorizontal: theme.spacing.lg, marginVertical: theme.spacing.lg },
    errorText: { ...theme.typography.caption, color: theme.colors.status.error, marginTop: theme.spacing.xs },
    inputHelp: { ...theme.typography.caption, color: theme.colors.formPlaceholder, marginTop: theme.spacing.xs },
    row: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
    flex1: { flex: 1 },
  });
}
