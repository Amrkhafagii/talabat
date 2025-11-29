import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck, User, MapPin, Star, DollarSign, Clock, Phone, Mail, CreditCard as Edit, LogOut } from 'lucide-react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/contexts/AuthContext';
import { getDriverByUserId, getUserProfile, updateDriverProfile, uploadDriverDocument } from '@/utils/database';
import { DeliveryDriver, User as UserType } from '@/types/database';

export default function DeliveryProfile() {
  const { user, signOut } = useAuth();
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [userProfile, setUserProfile] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'id' | 'license' | null>(null);
  const [form, setForm] = useState({
    license_number: '',
    vehicle_type: 'car' as DeliveryDriver['vehicle_type'],
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDriverData();
    }
  }, [user]);

  const loadDriverData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [driverData, profileData] = await Promise.all([
        getDriverByUserId(user.id),
        getUserProfile(user.id)
      ]);
      
      setDriver(driverData);
      setUserProfile(profileData);
      if (driverData) {
        setForm({
          license_number: driverData.license_number || '',
          vehicle_type: driverData.vehicle_type || 'car',
          vehicle_make: driverData.vehicle_make || '',
          vehicle_model: driverData.vehicle_model || '',
          vehicle_year: driverData.vehicle_year ? String(driverData.vehicle_year) : '',
          vehicle_color: driverData.vehicle_color || '',
          license_plate: driverData.license_plate || '',
        });
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
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

  const pickAndUpload = async (type: 'id' | 'license') => {
    if (!driver) return;

    try {
      setUploading(type);
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        setUploading(null);
        return;
      }

      const file = result.assets[0];
      const uploadedUrl = await uploadDriverDocument(driver.id, file.uri, type);

      if (!uploadedUrl) {
        Alert.alert('Upload Failed', 'Could not upload document. Please try again.');
      } else {
        const updated = await updateDriverProfile(driver.id, {
          id_document_url: type === 'id' ? uploadedUrl : driver.id_document_url,
          license_document_url: type === 'license' ? uploadedUrl : driver.license_document_url,
          documents_verified: false,
          background_check_status: 'pending',
          is_online: false,
          is_available: false,
        });
        if (updated) {
          setDriver(updated);
          Alert.alert('Uploaded', 'Document uploaded. Verification pending.');
        }
      }
    } catch (err) {
      console.error('Document upload error:', err);
      Alert.alert('Upload Failed', 'Unexpected error. Please try again.');
    } finally {
      setUploading(null);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'D';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  const getVehicleDisplayName = (type: string) => {
    switch (type) {
      case 'bicycle':
        return 'Bicycle';
      case 'motorcycle':
        return 'Motorcycle';
      case 'car':
        return 'Car';
      case 'scooter':
        return 'Scooter';
      default:
        return 'Vehicle';
    }
  };

  const saveProfile = async () => {
    if (!driver) return;

    if (!form.license_number.trim()) {
      setFormError('License number is required.');
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      const updated = await updateDriverProfile(driver.id, {
        license_number: form.license_number.trim(),
        vehicle_type: form.vehicle_type,
        vehicle_make: form.vehicle_make || null as any,
        vehicle_model: form.vehicle_model || null as any,
        vehicle_year: form.vehicle_year ? Number(form.vehicle_year) : null as any,
        vehicle_color: form.vehicle_color || null as any,
        license_plate: form.license_plate || null as any,
      });

      if (updated) {
        setDriver(updated);
        setEditing(false);
        Alert.alert('Profile Updated', 'Your profile has been submitted for verification.');
      } else {
        setFormError('Failed to update profile. Please try again.');
      }
    } catch (err) {
      console.error('Error updating driver profile:', err);
      setFormError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Driver Profile</Text>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setEditing(!editing)}
          >
            <Edit size={20} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.profilePicture}>
            <Text style={styles.profileInitial}>
              {getInitials(userProfile?.full_name)}
            </Text>
          </View>
          <Text style={styles.profileName}>
            {userProfile?.full_name || 'Driver'}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {userProfile?.phone && (
            <Text style={styles.profilePhone}>{userProfile.phone}</Text>
          )}
          
          {/* Driver Status */}
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              driver?.background_check_status === 'approved' && driver.documents_verified
                ? styles.onlineStatus
                : styles.offlineStatus
            ]}>
              <Text style={[
                styles.statusText,
                driver?.background_check_status === 'approved' && driver.documents_verified
                  ? styles.onlineText
                  : styles.offlineText
              ]}>
                {driver?.background_check_status === 'approved' && driver.documents_verified
                  ? 'Verified'
                  : driver?.background_check_status === 'rejected'
                    ? 'Rejected'
                    : 'Pending Verification'}
            </Text>
          </View>
          <View style={styles.verificationBanner}>
            <Text style={styles.verificationBannerTitle}>Account Verification</Text>
            <Text style={styles.verificationBannerText}>
              We verify your ID and vehicle documents before you can go online. Updates reset your status to pending.
            </Text>
            <Text style={styles.verificationBannerStatus}>
              Background Check: {driver?.background_check_status || 'pending'} • Documents: {driver?.documents_verified ? 'verified' : 'not verified'}
            </Text>
          </View>
        </View>
        </View>

        {/* Driver Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Star size={24} color="#FFB800" fill="#FFB800" />
            <Text style={styles.statNumber}>{driver?.rating?.toFixed(1) || '5.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Truck size={24} color="#3B82F6" />
            <Text style={styles.statNumber}>{driver?.total_deliveries || 0}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statCard}>
            <DollarSign size={24} color="#10B981" />
            <Text style={styles.statNumber}>${driver?.total_earnings?.toFixed(2) || '0.00'}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>

        {/* Vehicle / License Information */}
        <View style={styles.vehicleSection}>
          <Text style={styles.sectionTitle}>Vehicle & License</Text>
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleHeader}>
              <Truck size={20} color="#FF6B35" />
              <Text style={styles.vehicleType}>
                {driver ? getVehicleDisplayName(driver.vehicle_type) : 'Not Set'}
              </Text>
            </View>
            
            {!editing && (
              <>
                <Text style={styles.vehicleDetails}>
                  License: {driver?.license_number || 'Not set'}
                </Text>
                {driver?.vehicle_make && driver?.vehicle_model && (
                  <Text style={styles.vehicleDetails}>
                    {driver.vehicle_year} {driver.vehicle_make} {driver.vehicle_model}
                  </Text>
                )}
                {driver?.vehicle_color && (
                  <Text style={styles.vehicleDetails}>
                    Color: {driver.vehicle_color}
                  </Text>
                )}
                {driver?.license_plate && (
                  <Text style={styles.vehicleDetails}>
                    Plate: {driver.license_plate}
                  </Text>
                )}
                <Text style={styles.verificationNote}>
                  Status: {driver?.background_check_status || 'pending'} • Documents {driver?.documents_verified ? 'verified' : 'unverified'}
                </Text>
                <Text style={styles.verificationHelper}>
                  Update your profile and upload documents to get approved.
                </Text>
              </>
            )}

            {editing && (
              <View style={styles.form}>
                {formError ? <Text style={styles.formError}>{formError}</Text> : null}
                <Text style={styles.label}>License Number</Text>
                <TextInput
                  style={styles.input}
                  value={form.license_number}
                  onChangeText={(text) => setForm({ ...form, license_number: text })}
                  placeholder="Driver license number"
                />

                <Text style={styles.label}>Vehicle Type</Text>
                <View style={styles.typeRow}>
                  {(['car', 'motorcycle', 'scooter', 'bicycle'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        form.vehicle_type === type && styles.typeChipActive
                      ]}
                      onPress={() => setForm({ ...form, vehicle_type: type })}
                    >
                      <Text style={[
                        styles.typeChipText,
                        form.vehicle_type === type && styles.typeChipTextActive
                      ]}>
                        {getVehicleDisplayName(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Make</Text>
                <TextInput
                  style={styles.input}
                  value={form.vehicle_make}
                  onChangeText={(text) => setForm({ ...form, vehicle_make: text })}
                  placeholder="e.g., Toyota"
                />

                <Text style={styles.label}>Model</Text>
                <TextInput
                  style={styles.input}
                  value={form.vehicle_model}
                  onChangeText={(text) => setForm({ ...form, vehicle_model: text })}
                  placeholder="e.g., Prius"
                />

                <Text style={styles.label}>Year</Text>
                <TextInput
                  style={styles.input}
                  value={form.vehicle_year}
                  onChangeText={(text) => setForm({ ...form, vehicle_year: text })}
                  placeholder="e.g., 2020"
                  keyboardType="numeric"
                />

                <Text style={styles.label}>Color</Text>
                <TextInput
                  style={styles.input}
                  value={form.vehicle_color}
                  onChangeText={(text) => setForm({ ...form, vehicle_color: text })}
                  placeholder="e.g., Blue"
                />

                <Text style={styles.label}>License Plate</Text>
                <TextInput
                  style={styles.input}
                  value={form.license_plate}
                  onChangeText={(text) => setForm({ ...form, license_plate: text })}
                  placeholder="Plate number"
                  autoCapitalize="characters"
                />

                <Text style={styles.verificationHelper}>
                  Submitting updates will set your account to pending until verified. Documents need manual review.
                </Text>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                    onPress={saveProfile}
                    disabled={saving}
                  >
                    <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save & Submit'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setEditing(false);
                      setFormError(null);
                      if (driver) {
                        setForm({
                          license_number: driver.license_number || '',
                          vehicle_type: driver.vehicle_type || 'car',
                          vehicle_make: driver.vehicle_make || '',
                          vehicle_model: driver.vehicle_model || '',
                          vehicle_year: driver.vehicle_year ? String(driver.vehicle_year) : '',
                          vehicle_color: driver.vehicle_color || '',
                          license_plate: driver.license_plate || '',
                        });
                      }
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Document Upload Placeholder */}
        <View style={styles.vehicleSection}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <View style={styles.vehicleCard}>
            <Text style={styles.vehicleDetails}>Upload your ID and vehicle documents for verification.</Text>
            {(driver?.id_document_url || driver?.license_document_url) && (
              <View style={styles.docStatus}>
                {driver?.id_document_url && (
                  <Text style={styles.vehicleDetails}>ID uploaded ✓</Text>
                )}
                {driver?.license_document_url && (
                  <Text style={styles.vehicleDetails}>License/Registration uploaded ✓</Text>
                )}
              </View>
            )}
            <View style={styles.docButtons}>
              <TouchableOpacity style={styles.docButton} onPress={() => pickAndUpload('id')} disabled={!!uploading}>
                <Text style={styles.docButtonText}>
                  {uploading === 'id' ? 'Uploading...' : 'Upload ID'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.docButton} onPress={() => pickAndUpload('license')} disabled={!!uploading}>
                <Text style={styles.docButtonText}>
                  {uploading === 'license' ? 'Uploading...' : 'Upload License / Registration'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.verificationHelper}>
              Files are stored in Supabase Storage bucket `driver-docs`. Review and approve in backoffice.
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => router.push('/delivery/earnings')}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
                <DollarSign size={20} color="#10B981" />
              </View>
              <Text style={styles.actionText}>View Earnings</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => router.push('/delivery/history')}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
                <Clock size={20} color="#3B82F6" />
              </View>
              <Text style={styles.actionText}>Delivery History</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => router.push('/delivery/location')}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                <MapPin size={20} color="#F59E0B" />
              </View>
              <Text style={styles.actionText}>Location Settings</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Account Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Driver since</Text>
            <Text style={styles.infoValue}>
              {driver?.created_at ? new Date(driver.created_at).toLocaleDateString() : 'Unknown'}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>License number</Text>
            <Text style={styles.infoValue}>
              {driver?.license_number || 'Not provided'}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Background check</Text>
            <Text style={[
              styles.infoValue,
              { color: driver?.background_check_status === 'approved' ? '#10B981' : '#F59E0B' }
            ]}>
              {driver?.background_check_status === 'approved' ? 'Approved' : 'Pending'}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Documents verified</Text>
            <Text style={[
              styles.infoValue,
              { color: driver?.documents_verified ? '#10B981' : '#EF4444' }
            ]}>
              {driver?.documents_verified ? 'Verified' : 'Not verified'}
            </Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  editButton: {
    padding: 4,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  verificationNote: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  verificationHelper: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  verificationBanner: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF7F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignSelf: 'stretch',
    marginHorizontal: 20,
  },
  verificationBannerTitle: {
    fontFamily: 'Inter-SemiBold',
    color: '#9A3412',
    marginBottom: 4,
  },
  verificationBannerText: {
    fontFamily: 'Inter-Regular',
    color: '#9A3412',
    fontSize: 13,
    marginBottom: 6,
  },
  verificationBannerStatus: {
    fontFamily: 'Inter-Medium',
    color: '#7C2D12',
    fontSize: 13,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
  },
  profileName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
  },
  statusContainer: {
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  onlineStatus: {
    backgroundColor: '#D1FAE5',
  },
  offlineStatus: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  onlineText: {
    color: '#10B981',
  },
  offlineText: {
    color: '#EF4444',
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  vehicleSection: {
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
  vehicleCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleType: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  form: {
    marginTop: 12,
    gap: 10,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeChipActive: {
    backgroundColor: '#FFF1EA',
    borderColor: '#FF6B35',
  },
  typeChipText: {
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  typeChipTextActive: {
    color: '#FF6B35',
  },
  docButtons: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  docStatus: {
    marginTop: 8,
    gap: 4,
  },
  docButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  docButtonText: {
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontFamily: 'Inter-SemiBold',
  },
  formError: {
    color: '#DC2626',
    fontFamily: 'Inter-Medium',
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  actionArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
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
