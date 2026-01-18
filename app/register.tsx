import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  ChevronRight,
  Shield,
  Fingerprint,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

type Step = 'personal' | 'security';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [step, setStep] = useState<Step>('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [showConfirmPasscode, setShowConfirmPasscode] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validatePersonalInfo = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSecurity = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!passcode.trim()) {
      newErrors.passcode = 'Passcode is required';
    } else if (passcode.length !== 6 || !/^\d+$/.test(passcode)) {
      newErrors.passcode = 'Passcode must be 6 digits';
    }

    if (passcode !== confirmPasscode) {
      newErrors.confirmPasscode = 'Passcodes do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validatePersonalInfo()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep('security');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleRegister = async () => {
    if (!validateSecurity()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('Starting registration...');
      
      const success = await register(
        {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          dateOfBirth: dateOfBirth.trim(),
        },
        passcode,
        biometricEnabled
      );

      if (success) {
        console.log('Registration successful');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/home');
      } else {
        console.log('Registration failed');
        setErrors({ general: 'Registration failed. Please try again.' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'An error occurred. Please try again.' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = (
    icon: React.ReactNode,
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    error?: string,
    options?: {
      keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
      autoCapitalize?: 'none' | 'sentences' | 'words';
      secureTextEntry?: boolean;
      showToggle?: boolean;
      onToggle?: () => void;
      isVisible?: boolean;
      maxLength?: number;
    }
  ) => (
    <View style={styles.inputGroup}>
      <View style={[styles.inputContainer, error && styles.inputError]}>
        <View style={styles.inputIcon}>{icon}</View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            if (errors[placeholder.toLowerCase().replace(/\s/g, '')]) {
              setErrors((prev) => ({ ...prev, [placeholder.toLowerCase().replace(/\s/g, '')]: '' }));
            }
          }}
          keyboardType={options?.keyboardType || 'default'}
          autoCapitalize={options?.autoCapitalize || 'sentences'}
          secureTextEntry={options?.secureTextEntry && !options?.isVisible}
          maxLength={options?.maxLength}
          editable={!isLoading}
        />
        {options?.showToggle && (
          <TouchableOpacity onPress={options.onToggle} style={styles.toggleButton}>
            {options.isVisible ? (
              <EyeOff size={20} color="rgba(255,255,255,0.5)" />
            ) : (
              <Eye size={20} color="rgba(255,255,255,0.5)" />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (step === 'security') {
                  setStep('personal');
                } else {
                  router.back();
                }
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={22} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, step === 'personal' && styles.stepDotActive]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, step === 'security' && styles.stepDotActive]} />
            </View>

            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.titleSection}>
              <Text style={styles.title}>
                {step === 'personal' ? 'Create Account' : 'Secure Your Account'}
              </Text>
              <Text style={styles.subtitle}>
                {step === 'personal'
                  ? 'Enter your personal information to get started'
                  : 'Set up a 6-digit passcode to protect your wallet'}
              </Text>
            </View>

            {errors.general && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            )}

            {step === 'personal' && (
              <View style={styles.formSection}>
                {renderInput(
                  <User size={20} color={Colors.light.primary} />,
                  'Full Name',
                  fullName,
                  setFullName,
                  errors.fullName,
                  { autoCapitalize: 'words' }
                )}

                {renderInput(
                  <Mail size={20} color={Colors.light.primary} />,
                  'Email',
                  email,
                  setEmail,
                  errors.email,
                  { keyboardType: 'email-address', autoCapitalize: 'none' }
                )}

                {renderInput(
                  <Phone size={20} color={Colors.light.primary} />,
                  'Phone',
                  phone,
                  setPhone,
                  errors.phone,
                  { keyboardType: 'phone-pad' }
                )}

                {renderInput(
                  <Calendar size={20} color={Colors.light.primary} />,
                  'Date of Birth (DD/MM/YYYY)',
                  dateOfBirth,
                  setDateOfBirth,
                  errors.dateOfBirth
                )}
              </View>
            )}

            {step === 'security' && (
              <View style={styles.formSection}>
                {renderInput(
                  <Lock size={20} color={Colors.light.primary} />,
                  'Passcode',
                  passcode,
                  setPasscode,
                  errors.passcode,
                  {
                    keyboardType: 'numeric',
                    secureTextEntry: true,
                    showToggle: true,
                    onToggle: () => setShowPasscode(!showPasscode),
                    isVisible: showPasscode,
                    maxLength: 6,
                  }
                )}

                {renderInput(
                  <Lock size={20} color={Colors.light.primary} />,
                  'Confirm Passcode',
                  confirmPasscode,
                  setConfirmPasscode,
                  errors.confirmPasscode,
                  {
                    keyboardType: 'numeric',
                    secureTextEntry: true,
                    showToggle: true,
                    onToggle: () => setShowConfirmPasscode(!showConfirmPasscode),
                    isVisible: showConfirmPasscode,
                    maxLength: 6,
                  }
                )}

                <TouchableOpacity
                  style={styles.biometricOption}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setBiometricEnabled(!biometricEnabled);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.biometricLeft}>
                    <View style={styles.biometricIcon}>
                      <Fingerprint size={22} color={Colors.light.primary} />
                    </View>
                    <View>
                      <Text style={styles.biometricTitle}>Enable Biometrics</Text>
                      <Text style={styles.biometricSubtitle}>Use Face ID or Touch ID</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      biometricEnabled && styles.checkboxActive,
                    ]}
                  >
                    {biometricEnabled && <View style={styles.checkboxInner} />}
                  </View>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.securityNote}>
              <Shield size={16} color={Colors.light.primary} />
              <Text style={styles.securityNoteText}>
                Your data is encrypted and stored securely
              </Text>
            </View>
          </ScrollView>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.buttonDisabled]}
              onPress={step === 'personal' ? handleNextStep : handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text style={styles.continueButtonText}>
                    {step === 'personal' ? 'Continue' : 'Create Account'}
                  </Text>
                  <ChevronRight size={20} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/login');
                }}
              >
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepDotActive: {
    backgroundColor: Colors.light.primary,
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 24,
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  inputError: {
    borderColor: '#E57373',
  },
  inputIcon: {
    width: 52,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#FFFFFF',
    paddingHorizontal: 12,
  },
  toggleButton: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#E57373',
    marginLeft: 4,
  },
  errorBanner: {
    backgroundColor: 'rgba(229, 115, 115, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 115, 115, 0.3)',
  },
  errorBannerText: {
    color: '#E57373',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500' as const,
  },
  biometricOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  biometricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  biometricIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(157, 193, 131, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  biometricSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(157, 193, 131, 0.1)',
    borderRadius: 12,
  },
  securityNoteText: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '500' as const,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    height: 56,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginPromptText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
});
