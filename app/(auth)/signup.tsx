import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Location from 'expo-location';

import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import UserTypeSelector from '@/components/ui/UserTypeSelector';
import { signupSchema, SignupFormData } from '@/utils/validation/schemas';
import { supabase } from '@/utils/supabase';

export default function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const { signUp, userType } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      userType: 'customer',
    },
  });

  const selectedUserType = watch('userType');
  const password = watch('password');

  const onSubmit = async (data: SignupFormData) => {
    setFormError('');
    setLoading(true);

    try {
      let extraMetadata = {};

      if (data.userType === 'restaurant') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const position = await Location.getCurrentPositionAsync({});
            extraMetadata = {
              restaurant_latitude: position.coords.latitude,
              restaurant_longitude: position.coords.longitude,
            };
          }
        } catch (err) {
          console.warn('Restaurant location capture failed:', err);
        }
      }

      const { error } = await signUp(data.email, data.password, data.userType, extraMetadata);

      if (error) {
        // Handle specific error types
        if (error.message.includes('User already registered')) {
          setFormError('An account with this email already exists. Please sign in instead.');
        } else if (error.message.includes('Password should be at least')) {
          setFormError('Password must be at least 8 characters long.');
        } else if (error.message.includes('Invalid email')) {
          setFormError('Please enter a valid email address.');
        } else {
          setFormError(error.message || 'An error occurred during sign up. Please try again.');
        }
      } else {
        // If auto-confirm is enabled, sign the user in immediately to ensure we have a session for redirect.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (signInError) {
          setFormError(signInError.message || 'Account created, but automatic sign-in failed. Please sign in manually.');
          setLoading(false);
          return;
        }

        // Ensure a restaurant record exists for restaurant signups
        const { data: userResult } = await supabase.auth.getUser();
        const userId = userResult?.user?.id;
        if (userId && data.userType === 'restaurant') {
          const { data: existing } = await supabase
            .from('restaurants')
            .select('id')
            .eq('owner_id', userId)
            .maybeSingle();

          if (!existing) {
            const defaultName = `${data.email.split('@')[0] || 'My'} Restaurant`;
            await supabase
              .from('restaurants')
              .insert({
                owner_id: userId,
                name: defaultName,
                cuisine: 'general',
                delivery_time: '30-45 mins',
                delivery_fee: 0,
                minimum_order: 0,
                image: '',
                cover_image: '',
                address: 'Pending address',
                phone: null,
                email: data.email,
                is_promoted: false,
                is_active: true,
                is_open: false,
                rating: 0,
                total_reviews: 0,
              })
              .select()
              .maybeSingle();
          }
        }
        Alert.alert(
          'Success',
          'Account created successfully!',
          [
            { 
              text: 'OK', 
              onPress: () => {
                // Wait a moment for the auth context to update with userType
                setTimeout(() => {
                  // Redirect to the specific role dashboard
                  if (data.userType === 'customer') {
                    router.replace('/(tabs)/customer' as any);
                  } else if (data.userType === 'restaurant') {
                    router.replace('/(tabs)/restaurant' as any);
                  } else if (data.userType === 'delivery') {
                    router.replace('/(tabs)/delivery' as any);
                  } else {
                    // Fallback to generic tabs
                    router.replace('/(tabs)' as any);
                  }
                }, 100);
              }
            }
          ]
        );
      }
    } catch (err) {
      console.error('Signup error:', err);
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserTypeSelect = (userType: 'customer' | 'restaurant' | 'delivery') => {
    setValue('userType', userType);
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    strength = Object.values(checks).filter(Boolean).length;
    
    return {
      score: strength,
      checks,
      label: strength < 2 ? 'Weak' : strength < 4 ? 'Medium' : 'Strong',
      color: strength < 2 ? '#EF4444' : strength < 4 ? '#F59E0B' : '#10B981',
    };
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Create Account" showBackButton />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.content}>
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeTitle}>Join FoodieExpress</Text>
              <Text style={styles.welcomeSubtitle}>
                Create your account to start ordering delicious food, managing your restaurant, or delivering meals
              </Text>
            </View>

            {/* General form error */}
            {formError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{formError}</Text>
              </View>
            ) : null}

            {/* User Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>I want to</Text>
              <UserTypeSelector
                selectedType={selectedUserType}
                onSelect={handleUserTypeSelect}
              />
            </View>

            {/* Account Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Details</Text>
              
              <FormField
                control={control}
                name="email"
                label="Email"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <FormField
                control={control}
                name="password"
                label="Password"
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color="#6B7280" />
                    ) : (
                      <Eye size={20} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                }
              />

              {/* Password Strength Indicator */}
              {passwordStrength && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.strengthHeader}>
                    <Text style={styles.strengthLabel}>Password Strength:</Text>
                    <Text style={[styles.strengthValue, { color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                  
                  <View style={styles.strengthBar}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.strengthSegment,
                          {
                            backgroundColor: level <= passwordStrength.score 
                              ? passwordStrength.color 
                              : '#E5E7EB'
                          }
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.strengthChecks}>
                    <Text style={[styles.checkItem, passwordStrength.checks.length && styles.checkPassed]}>
                      ✓ At least 8 characters
                    </Text>
                    <Text style={[styles.checkItem, passwordStrength.checks.lowercase && styles.checkPassed]}>
                      ✓ One lowercase letter
                    </Text>
                    <Text style={[styles.checkItem, passwordStrength.checks.uppercase && styles.checkPassed]}>
                      ✓ One uppercase letter
                    </Text>
                    <Text style={[styles.checkItem, passwordStrength.checks.number && styles.checkPassed]}>
                      ✓ One number
                    </Text>
                    <Text style={[styles.checkItem, passwordStrength.checks.special && styles.checkPassed]}>
                      ✓ One special character
                    </Text>
                  </View>
                </View>
              )}

              <FormField
                control={control}
                name="confirmPassword"
                label="Confirm Password"
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                rightElement={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#6B7280" />
                    ) : (
                      <Eye size={20} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                }
              />
            </View>

            <Button
              title={loading ? "Creating Account..." : "Create Account"}
              onPress={handleSubmit(onSubmit)}
              disabled={loading || !isValid}
              style={styles.signUpButton}
            />

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    minHeight: '100%',
  },
  welcomeSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    lineHeight: 20,
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
  passwordStrengthContainer: {
    marginTop: -12,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  strengthValue: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  strengthBar: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 12,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthChecks: {
    gap: 2,
  },
  checkItem: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  checkPassed: {
    color: '#10B981',
  },
  signUpButton: {
    marginBottom: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  loginText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FF6B35',
  },
});
