import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import Header from '@/components/ui/Header';
import { Icon } from '@/components/ui/Icon';
import { useRestaurantTheme } from '@/styles/restaurantTheme';
import { uploadPaymentProof, submitPaymentProof } from '@/utils/db/orders';
import { useAuth } from '@/contexts/AuthContext';

type PickedFile = { uri: string; name?: string | null; mimeType?: string | null; size?: number | null };

const PAYMENT_PROOF_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;

export default function PaymentProofScreen() {
  const { orderId, reportedAmount, txnId: txnFromParams } = useLocalSearchParams();
  const [file, setFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const theme = useRestaurantTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const validateFile = (picked: PickedFile) => {
    if (picked.size && picked.size > PAYMENT_PROOF_MAX_BYTES) {
      return 'File too large. Please upload under 5MB.';
    }
    if (picked.mimeType && !PAYMENT_PROOF_ALLOWED_TYPES.includes(picked.mimeType)) {
      return 'Unsupported type. Please use PNG, JPG or PDF.';
    }
    return null;
  };

  const pickFromGallery = useCallback(async () => {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const picked: PickedFile = {
        uri: asset.uri,
        mimeType: (asset as any).mimeType ?? null,
        name: (asset as any).name ?? null,
        size: (asset as any).size ?? null,
      };
      const validation = validateFile(picked);
      if (validation) {
        setError(validation);
        return;
      }
      setFile(picked);
    } catch (err) {
      console.error('proof pick error', err);
      setError('Failed to pick file. Please try again.');
    }
  }, []);

  const pickFromCamera = useCallback(async () => {
    try {
      setError(null);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const picked: PickedFile = {
        uri: asset.uri,
        mimeType: asset.type ? `image/${asset.type}` : 'image/jpeg',
        name: asset.fileName ?? asset.uri,
        size: asset.fileSize ?? null,
      };
      const validation = validateFile(picked);
      if (validation) {
        setError(validation);
        return;
      }
      setFile(picked);
    } catch (err) {
      console.error('proof camera error', err);
      setError('Failed to capture photo. Please try again.');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!file) {
      setError('Please attach your payment proof.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadPaymentProof(file, user?.id);
      if (!uploaded) {
        setError('Upload failed. Please retry.');
        setUploading(false);
        return;
      }
      if (orderId) {
        const txn = (txnFromParams as string) || `manual-${Date.now()}`;
        const amount = reportedAmount ? Number(reportedAmount) : 0;
        const result = await submitPaymentProof({
          orderId: orderId as string,
          txnId: txn,
          reportedAmount: amount || 0,
          proofUrl: uploaded.url,
          paidAt: new Date().toISOString(),
        });
        if (!result.ok) {
          setError('Could not queue proof. Please retry.');
          setUploading(false);
          return;
        }
      }
      Alert.alert('Proof submitted', 'We received your payment proof and will verify shortly.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('proof submit error', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [file, orderId, reportedAmount, txnFromParams, user?.id]);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Upload Payment Proof" showBackButton />
      <View style={styles.content}>
        <Text style={styles.heading}>Upload Instructions</Text>
        <Text style={styles.subheading}>
          Please upload a clear screenshot of your transaction. Make sure the reference number, amount, and date are visible.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.dropzone} onPress={pickFromGallery} disabled={uploading}>
          <Icon name="CloudUpload" size="xl" color={theme.colors.primary[500]} />
          <Text style={styles.dropTitle}>
            {file ? 'Replace your proof' : 'Tap to upload your proof'}
          </Text>
          <Text style={styles.dropSubtitle}>
            {file ? (file.name || file.uri.split('/').pop()) : 'PNG, JPG or PDF up to 5MB'}
          </Text>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionButton, styles.photoButton]} onPress={pickFromCamera} disabled={uploading}>
            <Icon name="Camera" size="md" color={theme.colors.primary[500]} />
            <Text style={styles.actionText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.galleryButton]} onPress={pickFromGallery} disabled={uploading}>
            <Icon name="Gallery" size="md" color={theme.colors.text} />
            <Text style={[styles.actionText, styles.galleryText]}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          <Text style={styles.submitText}>{uploading ? 'Submitting...' : 'Submit Proof'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 12 },
    heading: { fontFamily: 'Inter-Bold', fontSize: 20, color: theme.colors.text },
    subheading: {
      fontFamily: 'Inter-Regular',
      fontSize: 14,
      color: theme.colors.textMuted,
      lineHeight: 20,
    },
    dropzone: {
      marginTop: 8,
      padding: 20,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      borderRadius: theme.radius.card,
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.surface,
    },
    dropTitle: {
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.text,
      fontSize: 16,
    },
    dropSubtitle: {
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    actions: { flexDirection: 'row', gap: 12, marginTop: 6 },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: theme.radius.cta,
      borderWidth: 1,
    },
    photoButton: {
      backgroundColor: theme.colors.primary[50],
      borderColor: theme.colors.primary[100],
    },
    galleryButton: {
      backgroundColor: theme.colors.surfaceAlt,
      borderColor: theme.colors.border,
    },
    actionText: {
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.primary[500],
    },
    galleryText: { color: theme.colors.text },
    footer: {
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    submitButton: {
      backgroundColor: theme.colors.primary[500],
      paddingVertical: 14,
      borderRadius: theme.radius.cta,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: theme.colors.borderMuted,
    },
    submitText: { color: theme.colors.textInverse, fontFamily: 'Inter-Bold', fontSize: 16 },
    errorText: { color: theme.colors.status.error, fontFamily: 'Inter-Regular' },
  });
