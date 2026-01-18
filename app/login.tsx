import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  Fingerprint,
  Delete,
  Wallet,
  Chrome,
  Apple,
  Twitter,
  MessageCircle,
  ChevronRight,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

const SOCIAL_PROVIDERS = [
  { id: 'google', name: 'Google', icon: Chrome, color: '#4285F4' },
  { id: 'apple', name: 'Apple', icon: Apple, color: '#FFFFFF' },
  { id: 'twitter', name: 'Twitter', icon: Twitter, color: '#1DA1F2' },
  { id: 'discord', name: 'Discord', icon: MessageCircle, color: '#5865F2' },
];

export default function LoginScreen() {
  const router = useRouter();
  const { user, login, loginWithBiometric, loginWithPrivy, biometricEnabled, passcode, clearAll } = useAuth();
  
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const isPrivyUser = user?.provider && !passcode;

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const dotAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
      if (biometricEnabled && Platform.OS !== 'web' && !isPrivyUser) {
        handleBiometricAuth();
      }
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricEnabled, isPrivyUser]);

  useEffect(() => {
    if (lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (lockTimer === 0 && isLocked) {
      setIsLocked(false);
      setAttempts(0);
    }
  }, [lockTimer, isLocked]);

  useEffect(() => {
    if (enteredPasscode.length === 6 && !isPrivyUser) {
      handleLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enteredPasscode, isPrivyUser]);

  const animateDot = (index: number, filled: boolean) => {
    Animated.spring(dotAnims[index], {
      toValue: filled ? 1 : 0,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const shakePasscode = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleBiometricAuth = async () => {
    if (Platform.OS === 'web') return;
    
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to access XJO',
          fallbackLabel: 'Use Passcode',
        });
        
        if (result.success) {
          await loginWithBiometric();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(tabs)/home');
        }
      }
    } catch (error) {
      console.log('Biometric auth error:', error);
    }
  };

  const handleLogin = async () => {
    if (!isReady) {
      console.log('Auth not ready yet, waiting...');
      return;
    }
    
    console.log('Attempting login with passcode length:', enteredPasscode.length);
    const success = await login(enteredPasscode);
    
    if (success) {
      console.log('Login successful, navigating to home');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/home');
    } else {
      console.log('Login failed');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakePasscode();
      
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setIsLocked(true);
        setLockTimer(30);
      }
      
      setEnteredPasscode('');
      dotAnims.forEach((anim) => anim.setValue(0));
    }
  };

  const handleSocialLogin = async (providerId: string) => {
    console.log(`Starting ${providerId} re-authentication...`);
    setLoadingProvider(providerId);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const success = await loginWithPrivy(providerId);
      
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)/home');
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Authentication Failed', 'Please try again or use a different login method.');
      }
    } catch (error) {
      console.error('Social login error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleNumberPress = (num: string) => {
    if (isLocked || enteredPasscode.length >= 6) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPasscode = enteredPasscode + num;
    setEnteredPasscode(newPasscode);
    animateDot(newPasscode.length - 1, true);
  };

  const handleDelete = () => {
    if (isLocked || enteredPasscode.length === 0) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateDot(enteredPasscode.length - 1, false);
    setEnteredPasscode(enteredPasscode.slice(0, -1));
  };

  const handleForgotPasscode = () => {
    Alert.alert(
      'Reset Account',
      'This will delete all your data and you will need to register again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            router.replace('/');
          },
        },
      ]
    );
  };

  const renderKeypad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['bio', '0', 'del'],
    ];

    return (
      <View style={styles.keypad}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key) => {
              if (key === 'bio') {
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.keypadButton}
                    onPress={handleBiometricAuth}
                    disabled={!biometricEnabled || Platform.OS === 'web'}
                    activeOpacity={0.7}
                  >
                    <Fingerprint
                      size={28}
                      color={biometricEnabled ? Colors.light.primary : Colors.light.textMuted}
                    />
                  </TouchableOpacity>
                );
              }
              
              if (key === 'del') {
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.keypadButton}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                  >
                    <Delete size={28} color={Colors.light.primary} />
                  </TouchableOpacity>
                );
              }
              
              return (
                <TouchableOpacity
                  key={key}
                  style={styles.keypadButton}
                  onPress={() => handleNumberPress(key)}
                  disabled={isLocked}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keypadText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  if (isPrivyUser) {
    return (
      <SafeAreaView style={styles.web3Container}>
        <View style={styles.web3Content}>
          <View style={styles.web3Header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoInner}>
                <Wallet size={32} color="#FFF" />
              </View>
            </View>
            <Text style={styles.web3Greeting}>
              Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
            </Text>
            <Text style={styles.web3Subtitle}>Sign in to continue to XJO</Text>
            
            {user?.walletAddress && (
              <View style={styles.walletBadge}>
                <Text style={styles.walletBadgeText}>
                  {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.socialContainer}>
            {SOCIAL_PROVIDERS.map((provider) => {
              const Icon = provider.icon;
              const isProviderLoading = loadingProvider === provider.id;
              const isCurrentProvider = user?.provider === provider.id;
              
              return (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.socialButton,
                    isCurrentProvider && styles.socialButtonHighlighted,
                  ]}
                  onPress={() => handleSocialLogin(provider.id)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.socialIconContainer,
                      { backgroundColor: provider.color + '20' },
                    ]}
                  >
                    {isProviderLoading ? (
                      <ActivityIndicator size="small" color={provider.color} />
                    ) : (
                      <Icon size={22} color={provider.color} />
                    )}
                  </View>
                  <Text style={styles.socialButtonText}>
                    Continue with {provider.name}
                  </Text>
                  {isCurrentProvider && (
                    <View style={styles.lastUsedBadge}>
                      <Text style={styles.lastUsedText}>Last used</Text>
                    </View>
                  )}
                  <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={handleForgotPasscode} style={styles.web3ForgotButton}>
            <Text style={styles.web3ForgotText}>Use a different account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.passcodeLogoContainer}>
            <Text style={styles.passcodeLogoText}>XJO</Text>
          </View>
          <Text style={styles.greeting}>
            Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
          </Text>
          <Text style={styles.subtitle}>Enter your passcode to continue</Text>
        </View>

        <Animated.View
          style={[
            styles.dotsContainer,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {[...Array(6)].map((_, index) => (
            <View key={index} style={styles.dotWrapper}>
              <View style={[styles.dot, styles.dotEmpty]} />
              <Animated.View
                style={[
                  styles.dot,
                  styles.dotFilled,
                  {
                    opacity: dotAnims[index],
                    transform: [
                      {
                        scale: dotAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          ))}
        </Animated.View>

        {isLocked && (
          <View style={styles.lockedContainer}>
            <Text style={styles.lockedText}>
              Too many attempts. Try again in {lockTimer}s
            </Text>
          </View>
        )}

        {renderKeypad()}

        <TouchableOpacity onPress={handleForgotPasscode} style={styles.forgotButton}>
          <Text style={styles.forgotText}>Forgot Passcode?</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  passcodeLogoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: Colors.light.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  passcodeLogoText: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.light.white,
    letterSpacing: 2,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.light.primaryDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 48,
  },
  dotWrapper: {
    width: 16,
    height: 16,
    position: 'relative' as const,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute' as const,
  },
  dotEmpty: {
    backgroundColor: '#E8E4DC',
  },
  dotFilled: {
    backgroundColor: Colors.light.primary,
  },
  lockedContainer: {
    backgroundColor: Colors.light.errorLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
  },
  lockedText: {
    fontSize: 14,
    color: Colors.light.error,
    fontWeight: '500' as const,
  },
  keypad: {
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 24,
  },
  keypadButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.light.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  keypadText: {
    fontSize: 28,
    fontWeight: '500' as const,
    color: Colors.light.primaryDark,
  },
  forgotButton: {
    marginTop: 32,
    padding: 12,
  },
  forgotText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },
  web3Container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  web3Content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  web3Header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(45, 90, 39, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoInner: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  web3Greeting: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  web3Subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  walletBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  walletBadgeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  socialContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  socialButtonHighlighted: {
    borderColor: Colors.light.primary,
    backgroundColor: 'rgba(45, 90, 39, 0.1)',
  },
  socialIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  lastUsedBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  lastUsedText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  web3ForgotButton: {
    marginTop: 32,
    alignItems: 'center',
    padding: 12,
  },
  web3ForgotText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500' as const,
  },
});
