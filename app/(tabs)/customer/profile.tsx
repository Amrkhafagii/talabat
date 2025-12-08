import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, CreditCard, Bell, CircleHelp as HelpCircle, LogOut, CreditCard as Edit, Plus } from 'lucide-react-native';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, getUserAddresses } from '@/utils/database';
import { User as UserType, UserAddress } from '@/types/database';

const profileOptions = [
  {
    id: 1,
    title: 'Payment Methods',
    icon: CreditCard,
    action: () => console.log('Payment'),
  },
  {
    id: 2,
    title: 'Notifications',
    icon: Bell,
    action: () => console.log('Notifications'),
  },
  {
    id: 3,
    title: 'Help & Support',
    icon: HelpCircle,
    action: () => console.log('Help'),
  },
  {
    id: 4,
    title: 'Wallet',
    icon: CreditCard,
    action: () => router.push('/customer/wallet' as any),
  },
];

export default function Profile() {
  const { user, signOut } = useAuth();
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [profileData, addressesData] = await Promise.all([
        getUserProfile(user.id),
        getUserAddresses(user.id)
      ]);
      
      setUserProfile(profileData);
      setAddresses(addressesData);
    } catch (error) {
      console.error('Error loading user data:', error);
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
            router.replace('/(auth)/welcome' as any);
          },
        },
      ]
    );
  };

  const editProfile = () => {
    router.push('/customer/edit-profile');
  };

  const manageAddresses = () => {
    router.push('/customer/addresses');
  };

  const getInitials = (name?: string) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const defaultAddress = addresses.find(addr => addr.is_default);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.editButton} onPress={editProfile}>
          <Edit size={20} color={theme.colors.primary[500]} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profilePicture}>
            <Text style={styles.profileInitial}>
              {getInitials(userProfile?.full_name)}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {userProfile?.full_name || 'User'}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {userProfile?.phone && (
            <Text style={styles.profilePhone}>{userProfile.phone}</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>47</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>$342</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>4.8</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>

        {/* Delivery Addresses */}
        <View style={styles.addressSection}>
          <View style={styles.addressHeader}>
            <View style={styles.addressHeaderLeft}>
              <MapPin size={20} color={theme.colors.primary[500]} />
              <Text style={styles.addressTitle}>Delivery Addresses</Text>
            </View>
            <TouchableOpacity onPress={manageAddresses}>
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          {defaultAddress ? (
            <View style={styles.addressCard}>
              <View style={styles.addressInfo}>
                <Text style={styles.addressLabel}>{defaultAddress.label}</Text>
                <Text style={styles.addressText}>
                  {defaultAddress.address_line_1}
                  {defaultAddress.address_line_2 && `, ${defaultAddress.address_line_2}`}
                </Text>
                <Text style={styles.addressText}>
                  {defaultAddress.city}, {defaultAddress.state} {defaultAddress.postal_code}
                </Text>
              </View>
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultText}>Default</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addAddressCard} onPress={manageAddresses}>
              <Plus size={24} color={theme.colors.textMuted} />
              <Text style={styles.addAddressText}>Add delivery address</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Options */}
        <View style={styles.optionsSection}>
          {profileOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <TouchableOpacity
                key={option.id}
                style={styles.optionItem}
                onPress={option.action}
                activeOpacity={0.7}
              >
                <View style={styles.optionLeft}>
                  <View style={styles.optionIcon}>
                    <IconComponent size={20} color={theme.colors.primary[500]} />
                  </View>
                  <Text style={styles.optionText}>{option.title}</Text>
                </View>
                <Text style={styles.optionArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <LogOut size={20} color={theme.colors.status.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  editButton: {
    padding: 4,
  },
  profileSection: {
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInitial: {
    color: theme.colors.textInverse,
    fontSize: 28,
    fontFamily: 'Inter-Bold',
  },
  profileName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginBottom: 16,
    paddingVertical: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontFamily: 'Inter-Regular',
  },
  addressSection: {
    backgroundColor: theme.colors.surface,
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginLeft: 8,
  },
  manageText: {
    fontSize: 14,
    color: theme.colors.primary[500],
    fontFamily: 'Inter-SemiBold',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  defaultBadge: {
    backgroundColor: theme.colors.status.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultText: {
    fontSize: 12,
    color: theme.colors.textInverse,
    fontFamily: 'Inter-SemiBold',
  },
  addAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  addAddressText: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
  },
  optionsSection: {
    backgroundColor: theme.colors.surface,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: theme.colors.text,
  },
  optionArrow: {
    fontSize: 20,
    color: theme.colors.textSubtle,
    fontFamily: 'Inter-Regular',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.statusSoft.error,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.status.error,
    marginLeft: 8,
  },
});
