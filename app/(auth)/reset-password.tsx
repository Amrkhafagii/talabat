import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Lock, Eye, EyeOff, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Card from '@/components/ui/Card';
import { supabase } from '@/utils/supabase';
import { resetPasswordSchema, ResetPasswordFormData } from '@/utils/validation/schemas';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function ResetPassword() {
  const params = useLocalSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [formError, setFormError] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');
  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    // Extract access token from URL parameters
    const token = params.access_token as string;
    if (token) {
      setAccessToken(token);
    } else {
      // If no token, redirect to forgot password
      Alert.alert(
        'Invalid Reset Link',
        'This password reset link is invalid or has expired. Please request a new one.',
        [{ text: 'OK', onPress: () => router.replace('/forgot-password') }]
      );
    }
  }, [params]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!accessToken) {
      setFormError('Invalid reset token. Please request a new password reset link.');
      return;
    }

    setFormError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        if (error.message.includes('Password should be at least')) {
          setFormError('Password must be at least 6 characters long.');
        } else if (error.message.includes('New password should be different')) {
          setFormError('Your new password must be different from your current password.');
        } else if (error.message.includes('Invalid token')) {
          setFormError('This reset link has expired or is invalid. Please request a new one.');
        } else {
          setFormError(error.message || 'An error occurred while updating your password. Please try again.');
        }
      } else {
        setPasswordReset(true);
      }
    } catch (err) {
      console.error('Password reset error:', err);
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
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
      color: strength < 2 ? theme.colors.status.error : strength < 4 ? theme.colors.status.warning : theme.colors.status.success,
    };
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  if (passwordReset) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Password Reset" />
        
        <View style={styles.content}>
          <Card style={styles.successCard}>
            <View style={styles.successIcon}>
              <CheckCircle size={64} color={theme.colors.status.success} />
            </View>
            
            <Text style={styles.successTitle}>Password Reset Successful!</Text>
            <Text style={styles.successMessage}>
              Your password has been successfully updated. You can now sign in with your new password.
            </Text>
            
            <Button
              title="Sign In Now"
              onPress={() => router.replace('/login')}
              style={styles.signInButton}
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Reset Password" />
      
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
            <View style={styles.headerSection}>
              <View style={styles.iconContainer}>
                <Lock size={48} color={theme.colors.primary[500]} />
              </View>
              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.subtitle}>
                Please create a strong password that you haven&apos;t used before.
              </Text>
            </View>

            <View style={styles.formSection}>
              {/* General form error */}
              {formError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <FormField
                control={control}
                name="password"
                label="New Password"
                placeholder="Enter your new password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={20} color={theme.colors.textMuted} />
                    ) : (
                      <Eye size={20} color={theme.colors.textMuted} />
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
                      : theme.colors.border
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
                label="Confirm New Password"
                placeholder="Confirm your new password"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                rightElement={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={theme.colors.textMuted} />
                    ) : (
                      <Eye size={20} color={theme.colors.textMuted} />
                    )}
                  </TouchableOpacity>
                }
              />

              <Button
                title={loading ? "Updating Password..." : "Update Password"}
                onPress={handleSubmit(onSubmit)}
                disabled={loading || !isValid}
                style={styles.submitButton}
              />
            </View>

            <View style={styles.securityNote}>
              <Text style={styles.securityText}>
                🔒 Make sure to use a password that&apos;s unique to this account and not used elsewhere.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useRestaurantTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
      paddingTop: 32,
      minHeight: '100%',
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: 40,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary[50],
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
      lineHeight: 24,
      textAlign: 'center',
    },
    formSection: {
      marginBottom: 40,
    },
    errorContainer: {
      backgroundColor: theme.colors.statusSoft.error,
      borderWidth: 1,
      borderColor: theme.colors.status.error,
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.status.error,
      fontFamily: 'Inter-Medium',
      textAlign: 'center',
      lineHeight: 20,
    },
    passwordStrengthContainer: {
      marginTop: -12,
      marginBottom: 16,
      padding: 12,
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
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
      color: theme.colors.textMuted,
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
      color: theme.colors.textSubtle,
    },
    checkPassed: {
      color: theme.colors.status.success,
    },
    submitButton: {
      marginTop: 8,
    },
    securityNote: {
      backgroundColor: theme.colors.statusSoft.info,
      borderWidth: 1,
      borderColor: theme.colors.status.info,
      borderRadius: 8,
      padding: 12,
      marginTop: 'auto',
      marginBottom: 20,
    },
    securityText: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: theme.colors.status.info,
      textAlign: 'center',
      lineHeight: 16,
    },
    successCard: {
      alignItems: 'center',
      marginTop: 64,
      paddingVertical: 32,
    },
    successIcon: {
      marginBottom: 24,
    },
    successTitle: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    successMessage: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    signInButton: {
      alignSelf: 'stretch',
    },
  });
