import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Star, Plus, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getMenuItemById, updateMenuItem, getCategories, createCategory } from '@/utils/database';
import { MenuItem, Category, MenuItemOption } from '@/types/database';
import { logMutationError } from '@/utils/telemetry';
import { supabase } from '@/utils/supabase';

const defaultCategories = ['Mains', 'Sides', 'Beverages', 'Desserts', 'Appetizers', 'Salads'];
const timeOptions = Array.from({ length: 48 }, (_, idx) => {
  const hours = Math.floor(idx / 2);
  const minutes = idx % 2 === 0 ? '00' : '30';
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
});

export default function EditMenuItem() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const itemId = params.itemId as string;

  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('Mains');
  const [preparationTime, setPreparationTime] = useState('15');
  const [isPopular, setIsPopular] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [availableStart, setAvailableStart] = useState('');
  const [availableEnd, setAvailableEnd] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [allergens, setAllergens] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [variants, setVariants] = useState<MenuItemOption[]>([]);
  const [addons, setAddons] = useState<MenuItemOption[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [timePicker, setTimePicker] = useState<{ field: 'start' | 'end' | null; visible: boolean }>({ field: null, visible: false });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && itemId) {
      loadData();
    }
  }, [user, itemId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const menuItemData = await getMenuItemById(itemId);

      if (!menuItemData) {
        Alert.alert('Error', 'Menu item not found', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      const categoriesData = await getCategories(menuItemData.restaurant_id);

      if (menuItemData.restaurant?.owner_id && menuItemData.restaurant.owner_id !== user?.id) {
        Alert.alert('Unauthorized', 'You can only edit items from your restaurant.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      setMenuItem(menuItemData);
      setCategories(categoriesData);

      // Populate form
      setName(menuItemData.name);
      setDescription(menuItemData.description);
      setPrice(menuItemData.price.toString());
      setCategoryId(menuItemData.category_id ?? null);
      setCategoryName(menuItemData.category);
      setPreparationTime(menuItemData.preparation_time.toString());
      setIsPopular(menuItemData.is_popular);
      setIsAvailable(menuItemData.is_available);
      setImageUrl(menuItemData.image);
      setAvailableStart(menuItemData.available_start_time || '');
      setAvailableEnd(menuItemData.available_end_time || '');
      setSortOrder((menuItemData.sort_order ?? 0).toString());
      setAllergens((menuItemData.allergens || []).join(', '));
      setIngredients((menuItemData.ingredients || []).join(', '));
      setVariants(menuItemData.variants || []);
      setAddons(menuItemData.addons || []);
    } catch (err) {
      console.error('Error loading data:', err);
      Alert.alert('Error', 'Failed to load menu item data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Enter the item name';
    if (!description.trim()) nextErrors.description = 'Enter the item description';

    const priceVal = parseFloat(price);
    if (!price.trim() || isNaN(priceVal) || priceVal <= 0) {
      nextErrors.price = 'Enter a valid price';
    }

    const prepVal = parseInt(preparationTime);
    if (!preparationTime.trim() || isNaN(prepVal) || prepVal <= 0) {
      nextErrors.prep = 'Enter valid prep time (minutes)';
    }

    if ((availableStart && !timeOptions.includes(availableStart)) || (availableEnd && !timeOptions.includes(availableEnd))) {
      nextErrors.availability = 'Select availability times from the picker';
    }
    if (availableStart && availableEnd && availableStart >= availableEnd) {
      nextErrors.availability = 'End time must be after start time';
    }

    if (!imageUrl.trim()) nextErrors.image = 'Add an image (URL or pick from device)';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openTimePicker = (field: 'start' | 'end') => {
    setTimePicker({ field, visible: true });
  };

  const selectTime = (value: string) => {
    if (timePicker.field === 'start') setAvailableStart(value);
    if (timePicker.field === 'end') setAvailableEnd(value);
    setTimePicker({ field: null, visible: false });
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUrl(result.assets[0].uri);
    }
  };

  const uploadMenuPhoto = async (uri: string, restId: string, itemId?: string) => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const owner = authUser?.user?.id ?? restId;
      const response = await fetch(uri);
      const blob = await response.blob();
      const extGuess = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const slug = itemId ? `item-${itemId}` : 'new';
      const path = `${owner}/${slug}-${Date.now()}.${extGuess}`;
      const { data, error } = await supabase.storage.from('menu-photos').upload(path, blob, { cacheControl: '3600', upsert: true });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('menu-photos').getPublicUrl(data.path);
      return publicUrlData?.publicUrl || data.path || null;
    } catch (err) {
      console.error('Menu photo upload failed', err);
      return null;
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { category, errorCode, errorMessage } = await createCategory({
      name: newCategoryName.trim(),
      emoji: '🍽️',
      description: '',
      restaurant_id: menuItem?.restaurant_id ?? null,
      is_active: true,
      sort_order: (categories[categories.length - 1]?.sort_order || 0) + 1,
    });
    if (category) {
      setCategories((prev) => [...prev, category]);
      setCategoryId(category.id);
      setCategoryName(category.name);
      setNewCategoryName('');
    } else {
      const friendly = errorCode === '42501'
        ? 'You do not have permission to create categories for this restaurant.'
        : 'Could not create category.';
      logMutationError('category.create.failed', { errorCode, errorMessage });
      Alert.alert('Error', friendly);
    }
  };

  const updateOption = (type: 'variant' | 'addon', index: number, field: 'name' | 'price', value: string) => {
    const setter = type === 'variant' ? setVariants : setAddons;
    setter((prev) => prev.map((opt, i) => i === index ? { ...opt, [field]: field === 'price' ? parseFloat(value) || 0 : value } : opt));
  };

  const addOption = (type: 'variant' | 'addon') => {
    const setter = type === 'variant' ? setVariants : setAddons;
    setter((prev) => [...prev, { name: '', price: 0 }]);
  };

  const removeOption = (type: 'variant' | 'addon', index: number) => {
    const setter = type === 'variant' ? setVariants : setAddons;
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!menuItem || !validateForm()) return;

    try {
      setSaving(true);

      let photoUrl = imageUrl.trim();
      if (photoUrl && !photoUrl.startsWith('http')) {
        const uploaded = await uploadMenuPhoto(photoUrl, menuItem.restaurant_id, menuItem.id);
        if (!uploaded) {
          Alert.alert('Error', 'Failed to upload photo. Please try again.');
          setSaving(false);
          return;
        }
        photoUrl = uploaded;
        setImageUrl(uploaded);
      }

      const updates = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        image: photoUrl,
        category: categoryName,
        category_id: categoryId ?? undefined,
        is_popular: isPopular,
        is_available: isAvailable,
        preparation_time: parseInt(preparationTime),
        updated_at: new Date().toISOString(),
        available_start_time: availableStart || null,
        available_end_time: availableEnd || null,
        sort_order: parseInt(sortOrder) || 0,
        allergens: allergens ? allergens.split(',').map(a => a.trim()).filter(Boolean) : [],
        ingredients: ingredients ? ingredients.split(',').map(i => i.trim()).filter(Boolean) : [],
        variants,
        addons,
      };

      const { success, error, errorCode } = await updateMenuItem(menuItem.id, updates, menuItem.restaurant_id);

      if (success) {
        Alert.alert('Success', 'Menu item updated successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        const friendly = errorCode === '42501'
          ? 'You do not have permission to update this item.'
          : (error || 'Failed to update menu item');
        logMutationError('menu.update.failed', { error, errorCode });
        Alert.alert('Error', friendly);
      }
    } catch (err) {
      console.error('Error updating menu item:', err);
      logMutationError('menu.update.failed', { err: String(err) });
      Alert.alert('Error', 'Failed to update menu item');
    } finally {
      setSaving(false);
    }
  };

  const availableCategories = categories.length > 0 
    ? categories
    : defaultCategories.map((name, idx) => ({ id: `default-${idx}`, name, emoji: '🍽️', description: '', restaurant_id: null, is_active: true, sort_order: idx, created_at: new Date().toISOString() } as any));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Edit Menu Item" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading menu item...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!menuItem) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Edit Menu Item" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Menu item not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Edit Menu Item" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Item Image</Text>
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Camera size={32} color="#9CA3AF" />
                <Text style={styles.imagePlaceholderText}>Add Image</Text>
              </View>
            )}
          </View>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.buttonLight, styles.flex1]} onPress={handlePickImage}>
              <Text style={styles.buttonLightText}>Choose from device</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.buttonLight, styles.flex1]} onPress={() => setImageUrl('')}>
              <Text style={styles.buttonLightText}>Reset</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter image URL (e.g., from Pexels)"
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.inputHelp}>
            Use a high-quality image URL from Pexels or other sources
          </Text>
          {errors.image && <Text style={styles.errorFieldText}>{errors.image}</Text>}
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Item Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Margherita Pizza"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your dish, ingredients, and what makes it special..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputContainer, styles.flex1]}>
              <Text style={styles.inputLabel}>Price ($) *</Text>
              <TextInput
                style={styles.input}
                placeholder="12.99"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
              {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>

            <View style={[styles.inputContainer, styles.flex1, styles.marginLeft]}>
              <Text style={styles.inputLabel}>Prep Time (min) *</Text>
              <TextInput
                style={styles.input}
                placeholder="15"
                value={preparationTime}
                onChangeText={setPreparationTime}
                keyboardType="numeric"
              />
              {errors.prep && <Text style={styles.errorText}>{errors.prep}</Text>}
            </View>
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.categoryGrid}>
            {availableCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryButton,
                  categoryId === cat.id && styles.selectedCategory
                ]}
                onPress={() => { setCategoryId(cat.id); setCategoryName(cat.name); }}
              >
                <Text style={[
                  styles.categoryText,
                  categoryId === cat.id && styles.selectedCategoryText
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.addCategoryRow}>
            <TextInput
              style={[styles.input, styles.flex1]}
              placeholder="New category name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <TouchableOpacity style={styles.addCategoryButton} onPress={handleAddCategory}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addCategoryText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Options</Text>
          
        <TouchableOpacity
          style={styles.optionToggle}
          onPress={() => setIsPopular(!isPopular)}
        >
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Mark as Popular</Text>
            <Text style={styles.optionSubtitle}>
              Popular items are highlighted and appear first in the menu
            </Text>
          </View>
          <View style={[
            styles.toggle,
            isPopular && styles.toggleActive
          ]}>
            <View style={[
              styles.toggleThumb,
              isPopular && styles.toggleThumbActive
            ]}>
              {isPopular && <Star size={12} color="#FFFFFF" fill="#FFFFFF" />}
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionToggle}
          onPress={() => setIsAvailable(!isAvailable)}
        >
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Available for Order</Text>
            <Text style={styles.optionSubtitle}>
              Customers can order this item when available
            </Text>
          </View>
          <View style={[
            styles.toggle,
            isAvailable && styles.toggleActive
          ]}>
            <View style={[
              styles.toggleThumb,
              isAvailable && styles.toggleThumbActive
            ]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Availability window */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Availability Window</Text>
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex1]}>
              <Text style={styles.inputLabel}>Available From</Text>
              <TouchableOpacity style={styles.input} onPress={() => openTimePicker('start')}>
                <Text style={styles.inputTextValue}>{availableStart || 'Select time'}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputContainer, styles.flex1, styles.marginLeft]}>
              <Text style={styles.inputLabel}>Available Until</Text>
              <TouchableOpacity style={styles.input} onPress={() => openTimePicker('end')}>
                <Text style={styles.inputTextValue}>{availableEnd || 'Select time'}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {errors.availability && <Text style={styles.errorText}>{errors.availability}</Text>}
      </View>

      {/* Metadata */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Metadata</Text>
        <View style={styles.row}>
          <View style={[styles.inputContainer, styles.flex1]}>
            <Text style={styles.inputLabel}>Sort Order</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={sortOrder}
              onChangeText={setSortOrder}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputContainer, styles.flex1, styles.marginLeft]}>
            <Text style={styles.inputLabel}>Allergens (comma-separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="gluten, nuts"
              value={allergens}
              onChangeText={setAllergens}
            />
          </View>
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Ingredients (comma-separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="tomato, basil, mozzarella"
            value={ingredients}
            onChangeText={setIngredients}
          />
        </View>
      </View>

      {/* Variants */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Variants</Text>
        {variants.map((v, idx) => (
          <View key={`variant-${idx}`} style={styles.optionRow}>
            <TextInput
              style={[styles.input, styles.flex1]}
              placeholder="Size"
              value={v.name}
              onChangeText={(val) => updateOption('variant', idx, 'name', val)}
            />
            <TextInput
              style={[styles.input, styles.priceInput]}
              placeholder="0.00"
              value={v.price.toString()}
              onChangeText={(val) => updateOption('variant', idx, 'price', val)}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.removeChip} onPress={() => removeOption('variant', idx)}>
              <X size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.buttonLight} onPress={() => addOption('variant')}>
          <Text style={styles.buttonLightText}>Add variant</Text>
        </TouchableOpacity>
      </View>

      {/* Add-ons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add-ons</Text>
        {addons.map((v, idx) => (
          <View key={`addon-${idx}`} style={styles.optionRow}>
            <TextInput
              style={[styles.input, styles.flex1]}
              placeholder="Extra cheese"
              value={v.name}
              onChangeText={(val) => updateOption('addon', idx, 'name', val)}
            />
            <TextInput
              style={[styles.input, styles.priceInput]}
              placeholder="0.50"
              value={v.price.toString()}
              onChangeText={(val) => updateOption('addon', idx, 'price', val)}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.removeChip} onPress={() => removeOption('addon', idx)}>
              <X size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.buttonLight} onPress={() => addOption('addon')}>
          <Text style={styles.buttonLightText}>Add add-on</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    {timePicker.visible && (
      <View style={styles.timePickerOverlay}>
        <View style={styles.timePickerCard}>
          <Text style={styles.sectionTitle}>Select time</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {timeOptions.map((t) => (
              <TouchableOpacity key={t} style={styles.timeOption} onPress={() => selectTime(t)}>
                <Text style={styles.timeOptionText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Button title="Close" onPress={() => setTimePicker({ field: null, visible: false })} />
        </View>
      </View>
    )}

    {/* Save Button */}
    <View style={styles.bottomContainer}>
      <Button
        title={saving ? "Saving Changes..." : "Save Changes"}
        onPress={handleSave}
        disabled={saving}
      />
    </View>
  </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontFamily: 'Inter-Regular',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  buttonLight: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonLightText: {
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  errorFieldText: {
    color: '#EF4444',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  inputHelp: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addCategoryText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedCategory: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  optionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#FF6B35',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  priceInput: {
    width: 90,
  },
  removeChip: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  row: { flexDirection: 'row', gap: 8 },
  inputTextValue: { fontFamily: 'Inter-Regular', color: '#111827' },
  timePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
  },
  timeOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeOptionText: {
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
});
