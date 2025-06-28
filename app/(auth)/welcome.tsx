import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Button from '@/components/ui/Button';

export default function Welcome() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Hero Section */}
        <View style={styles.heroSection}>
          <Image 
            source={{ uri: 'https://images.pexels.com/photos/4393426/pexels-photo-4393426.jpeg?auto=compress&cs=tinysrgb&w=800' }}
            style={styles.heroImage}
          />
          <Text style={styles.title}>FoodieExpress</Text>
          <Text style={styles.subtitle}>
            Order food, manage your restaurant, or deliver meals - all in one app
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <View style={styles.feature}>
            <Text style={styles.featureEmoji}>🍕</Text>
            <Text style={styles.featureTitle}>Order Food</Text>
            <Text style={styles.featureDescription}>Browse restaurants and order your favorite meals</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureEmoji}>🏪</Text>
            <Text style={styles.featureTitle}>Manage Restaurant</Text>
            <Text style={styles.featureDescription}>Handle orders and grow your business</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureEmoji}>🚚</Text>
            <Text style={styles.featureTitle}>Deliver Orders</Text>
            <Text style={styles.featureDescription}>Earn money by delivering food to customers</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Button
            title="Get Started"
            onPress={() => router.push('/signup')}
            style={styles.primaryButton}
          />
          <Button
            title="Already have an account? Sign In"
            onPress={() => router.push('/login')}
            variant="outline"
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  heroImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
  },
  featuresSection: {
    marginBottom: 48,
  },
  feature: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  featureEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  actionSection: {
    gap: 16,
  },
  primaryButton: {
    marginBottom: 8,
  },
  secondaryButton: {
    marginTop: 8,
  },
});