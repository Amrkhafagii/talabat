import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/ui/Header';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import FormToggle from '@/components/ui/FormToggle';
import { Icon } from '@/components/ui/Icon';
import { loginSchema, LoginFormData } from '@/utils/validation/schemas';
import { supabase } from '@/utils/supabase';
import { useRestaurantTheme } from '@/styles/restaurantTheme';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const { signIn, userType } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true, // Default to true for better UX
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setFormError('');
    setLoading(true);

    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        // Handle specific error types with user-friendly messages
        if (error.message.includes('Invalid login credentials')) {
          setFormError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setFormError('Please check your email and click the confirmation link before signing in.');
        } else if (error.message.includes('Too many requests')) {
          setFormError('Too many login attempts. Please wait a moment before trying again.');
        } else if (error.message.includes('User not found')) {
          setFormError('No account found with this email address. Please sign up first.');
        } else {
          setFormError(error.message || 'An error occurred during sign in. Please try again.');
        }
      } else {
        // Fetch fresh user metadata to avoid stale userType before redirecting
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const validUserTypes = ['customer', 'restaurant', 'delivery'] as const;
        type UserType = typeof validUserTypes[number];

        const metadataType = userData.user?.user_metadata?.user_type as string | undefined;
        const resolvedUserType: UserType = validUserTypes.includes(metadataType as UserType)
          ? (metadataType as UserType)
          : (userType as UserType) || 'customer';

        if (userError || !userData.user) {
          router.replace('/(tabs)' as any);
          return;
        }

        if (resolvedUserType === 'customer') {
          router.replace('/(tabs)/customer' as any);
        } else if (resolvedUserType === 'restaurant') {
          router.replace('/(tabs)/restaurant' as any);
        } else if (resolvedUserType === 'delivery') {
          router.replace('/(tabs)/delivery' as any);
        } else {
          router.replace('/(tabs)' as any);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setFormError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = () => {
    if (formError) {
      setFormError('');
    }
  };

  const theme = useRestaurantTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Welcome Back" showBackButton />
      
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
              <Text style={styles.welcomeTitle}>Welcome to FoodieExpress</Text>
              <Text style={styles.welcomeSubtitle}>
                Sign in to your account to start ordering delicious food from your favorite restaurants
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
                name="email"
                label="Email"
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.inputContainer}
              />

              <FormField
                control={control}
                name="password"
                label="Password"
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                style={styles.inputContainer}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={theme.tap.hitSlop}>
                    <Icon
                      name={showPassword ? 'EyeOff' : 'Eye'}
                      size="md"
                      color={theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                }
              />

              {/* Remember Me Toggle */}
              <FormToggle
                control={control}
                name="rememberMe"
                label="Remember me"
                description="Keep me signed in on this device"
                style={styles.rememberMeContainer}
              />

              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => router.push('/forgot-password')}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                title={loading ? "Signing In..." : "Sign In"}
                onPress={handleSubmit(onSubmit)}
                disabled={loading || !isValid}
                style={styles.signInButton}
              />
            </View>

            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don&apos;t have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Session Info */}
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionInfoText}>
                🔒 Your session will be securely maintained across app restarts for your convenience.
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
    welcomeSection: {
      marginBottom: 40,
      alignItems: 'center',
    },
    welcomeTitle: {
      fontSize: 28,
      fontFamily: 'Inter-Bold',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    welcomeSubtitle: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
      lineHeight: 24,
      textAlign: 'center',
      paddingHorizontal: 16,
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
    inputContainer: {
      marginBottom: 16,
    },
    rememberMeContainer: {
      marginBottom: 16,
      marginTop: -4,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: 24,
      marginTop: -8,
    },
    forgotPasswordText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: theme.colors.primary[500],
    },
    signInButton: {
      marginBottom: 24,
    },
    signUpContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    signUpText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: theme.colors.textMuted,
    },
    signUpLink: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: theme.colors.primary[500],
    },
    sessionInfo: {
      backgroundColor: theme.colors.statusSoft.info,
      borderWidth: 1,
      borderColor: theme.colors.status.info,
      borderRadius: 12,
      padding: 16,
      marginTop: 'auto',
      marginBottom: 20,
    },
    sessionInfoText: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: theme.colors.status.info,
      textAlign: 'center',
      lineHeight: 16,
    },
  });
