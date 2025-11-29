import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Store, Clock, MapPin, Phone, Mail, Bell, CreditCard, Users, ChartBar as BarChart3, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getRestaurantByUserId } from '@/utils/database';
import { Restaurant } from '@/types/database';

const settingsOptions = [
  {
    id: 1,
    title: 'Restaurant Information',
    subtitle: 'Update name, description, and contact details',
    icon: Store,
    action: () => console.log('Restaurant Info'),
  },
  {
    id: 2,
    title: 'Operating Hours',
    subtitle: 'Set your opening and closing times',
    icon: Clock,
    action: () => console.log('Operating Hours'),
  },
  {
    id: 3,
    title: 'Location & Delivery',
    subtitle: 'Manage address and delivery settings',
    icon: MapPin,
    action: () => console.log('Location'),
  },
  {
    id: 4,
    title: 'Payment Settings',
    subtitle: 'Configure payment methods and fees',
    icon: CreditCard,
    action: () => console.log('Payment'),
  },
  {
    id: 5,
    title: 'Staff Management',
    subtitle: 'Add and manage restaurant staff',
    icon: Users,
    action: () => console.log('Staff'),
  },
  {
    id: 6,
    title: 'Analytics & Reports',
    subtitle: 'View sales reports and analytics',
    icon: BarChart3,
    action: () => console.log('Analytics'),
  },
  {
    id: 7,
    title: 'Notifications',
    subtitle: 'Configure order and system notifications',
    icon: Bell,
    action: () => console.log('Notifications'),
  },
  {
    id: 8,
    title: 'Wallet',
    subtitle: 'View balance and payouts',
    icon: CreditCard,
    action: () => router.push('/restaurant/wallet'),
  },
];

export default function RestaurantSettings() {
  const { user, signOut } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRestaurantData();
    }
  }, [user]);

  const loadRestaurantData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const restaurantData = await getRestaurantByUserId(user.id);
      setRestaurant(restaurantData);
    } catch (error) {
      console.error('Error loading restaurant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Restaurant Info */}
        <View style={styles.restaurantSection}>
          <View style={styles.restaurantInfo}>
            <View style={styles.restaurantIcon}>
              <Store size={24} color="#FF6B35" />
            </View>
            <View style={styles.restaurantDetails}>
              <Text style={styles.restaurantName}>{restaurant?.name || 'Restaurant Name'}</Text>
              <Text style={styles.restaurantCuisine}>{restaurant?.cuisine || 'Cuisine Type'}</Text>
              <Text style={styles.restaurantAddress}>{restaurant?.address || 'Restaurant Address'}</Text>
            </View>
          </View>
          
          <View style={styles.restaurantStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{restaurant?.rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{restaurant?.total_reviews || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: restaurant?.is_open ? '#10B981' : '#EF4444' }]}>
                {restaurant?.is_open ? 'Open' : 'Closed'}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.settingsSection}>
          {settingsOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <TouchableOpacity
                key={option.id}
                style={styles.settingItem}
                onPress={option.action}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.settingIcon}>
                    <IconComponent size={20} color="#FF6B35" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>{option.title}</Text>
                    <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
                  </View>
                </View>
                <Text style={styles.settingArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          {restaurant?.phone && (
            <View style={styles.contactItem}>
              <Phone size={16} color="#6B7280" />
              <Text style={styles.contactText}>{restaurant.phone}</Text>
            </View>
          )}
          
          {restaurant?.email && (
            <View style={styles.contactItem}>
              <Mail size={16} color="#6B7280" />
              <Text style={styles.contactText}>{restaurant.email}</Text>
            </View>
          )}
          
          <View style={styles.contactItem}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.contactText}>{restaurant?.address || 'Address not set'}</Text>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionText}>Privacy Policy</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionText}>Terms of Service</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionText}>Help & Support</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  restaurantSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  restaurantIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  restaurantCuisine: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  restaurantAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  restaurantStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  settingArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
  },
  contactSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    marginLeft: 12,
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  actionArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginLeft: 8,
  },
});
