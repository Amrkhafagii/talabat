import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera, User } from 'lucide-react-native';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '@/utils/database';
import { User as UserType } from '@/types/database';
import { useAppTheme } from '@/styles/appTheme';

export default function EditProfile() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
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
  };

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
              <Camera size={16} color={theme.colors.textInverse} />
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
              <User size={20} color={theme.colors.primary[500]} />
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
          <Text style={styles.infoTitle}>Account Information</Text>
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

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
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
      width: 100,
      height: 100,
      borderRadius: 50,
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
      width: 32,
      height: 32,
      borderRadius: 16,
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
    infoTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      marginBottom: 16,
    },
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
