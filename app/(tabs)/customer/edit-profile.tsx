import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, useWindowDimensions, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '@/utils/database';
import { User as UserType } from '@/types/database';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function EditProfile() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const theme = useRestaurantTheme();
  const responsive = useMemo(() => computeResponsiveSizes(screenWidth), [screenWidth]);
  const styles = useMemo(() => createStyles(theme, responsive), [theme, responsive]);

  const loadUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const profileData = await getUserProfile(user.id);
      
      if (profileData) {
        setUserProfile(profileData);
        setFullName(profileData.full_name || '');
        setPhone(profileData.phone || '');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const handleSave = async () => {
    if (!user) return;

    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    try {
      setSaving(true);
      
      const updates: Partial<UserType> = {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        updated_at: new Date().toISOString(),
      };

      const success = await updateUserProfile(user.id, updates);
      
      if (success) {
        Alert.alert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Edit Profile" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Edit Profile" showBackButton />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={styles.profilePictureSection}>
          <View style={styles.profilePictureContainer}>
            <View style={styles.profilePicture}>
              <Text style={styles.profileInitial}>
                {getInitials(fullName || userProfile?.full_name)}
              </Text>
            </View>
            <TouchableOpacity style={styles.cameraButton}>
              <Icon name="CameraPlus" size="md" color={theme.colors.textInverse} />
            </TouchableOpacity>
          </View>
          <Text style={styles.changePictureText}>Tap to change picture</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={theme.colors.formPlaceholder}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={user?.email || ''}
              editable={false}
              placeholderTextColor={theme.colors.formPlaceholder}
            />
            <Text style={styles.inputHelp}>Email cannot be changed</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              placeholderTextColor={theme.colors.formPlaceholder}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Account Type</Text>
            <View style={styles.accountTypeContainer}>
              <Icon name="User" size="md" color={theme.colors.primary[500]} />
              <Text style={styles.accountTypeText}>
                {userProfile?.user_type === 'customer' ? 'Customer' : 
                 userProfile?.user_type === 'restaurant' ? 'Restaurant Owner' : 
                 userProfile?.user_type === 'delivery' ? 'Delivery Driver' : 'Customer'}
              </Text>
            </View>
            <Text style={styles.inputHelp}>Account type cannot be changed</Text>
          </View>
        </View>

        {/* Account Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>Account Information</Text>
            <View style={styles.membershipBadge}>
              <Text style={styles.membershipText}>Foodie Gold</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Member since</Text>
            <Text style={styles.infoValue}>
              {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'Unknown'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last updated</Text>
            <Text style={styles.infoValue}>
              {userProfile?.updated_at ? new Date(userProfile.updated_at).toLocaleDateString() : 'Never'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <Button
          title={saving ? "Saving..." : "Save Changes"}
          onPress={handleSave}
          disabled={saving}
        />
      </View>
    </SafeAreaView>
  );
}

type ResponsiveSizes = { avatar: number; camera: number };

const computeResponsiveSizes = (screenWidth: number): ResponsiveSizes => {
  const avatar = Math.min(Math.max(screenWidth * 0.26, 80), 112);
  const camera = Math.min(Math.max(avatar * 0.32, 30), 36);
  return { avatar, camera };
};

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>, responsive: ResponsiveSizes) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginTop: 12,
    },
    content: {
      flex: 1,
    },
    profilePictureSection: {
      alignItems: 'center',
      paddingVertical: 32,
      backgroundColor: theme.colors.surface,
      marginBottom: 16,
    },
    profilePictureContainer: {
      position: 'relative',
      marginBottom: 12,
    },
    profilePicture: {
      width: responsive.avatar,
      height: responsive.avatar,
      borderRadius: responsive.avatar / 2,
      backgroundColor: theme.colors.primary[500],
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileInitial: {
      color: theme.colors.textInverse,
      fontSize: 36,
      fontFamily: 'Inter-Bold',
    },
    cameraButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: responsive.camera,
      height: responsive.camera,
      borderRadius: responsive.camera / 2,
      backgroundColor: theme.colors.text,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.surface,
    },
    changePictureText: {
      fontSize: 14,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
    },
    formSection: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 24,
      marginBottom: 16,
    },
    inputContainer: {
      marginBottom: 24,
    },
    inputLabel: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.formSurface,
      borderWidth: 1,
      borderColor: theme.colors.formBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: theme.colors.formText,
    },
    disabledInput: {
      backgroundColor: theme.colors.surfaceAlt,
      color: theme.colors.textSubtle,
    },
    inputHelp: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'Inter-Regular',
      marginTop: 4,
    },
    accountTypeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.formSurface,
      borderWidth: 1,
      borderColor: theme.colors.formBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    accountTypeText: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
      marginLeft: 8,
    },
  infoSection: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text,
  },
  membershipBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
  },
  membershipText: { fontFamily: 'Inter-SemiBold', color: theme.colors.primary[600], fontSize: 12 },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    infoLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
    },
    infoValue: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: theme.colors.text,
    },
    bottomContainer: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
  });
