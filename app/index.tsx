import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Shield, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { hasAccount, isAuthenticated, isLoading } = useAuth();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, scaleAnim, pulseAnim]);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)/home');
      } else if (hasAccount) {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated, hasAccount, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.splashLogoContainer}>
          <Text style={styles.splashLogoText}>XJO</Text>
        </View>
        <Text style={styles.loadingTagline}>Your Smart Financial Companion</Text>
      </View>
    );
  }

  if (hasAccount) {
    return null;
  }

  const handleGetStarted = () => {
    router.push('/register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ scale: scaleAnim }, { scale: pulseAnim }] },
          ]}
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>XJO</Text>
          </View>
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>XJO</Text>
          <Text style={styles.subtitle}>
            Your Smart Financial Companion
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Shield size={20} color={Colors.light.primary} />
            </View>
            <Text style={styles.featureText}>Secure & Private</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Sparkles size={20} color={Colors.light.primary} />
            </View>
            <Text style={styles.featureText}>Ethical Banking</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.bottomContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
          <ArrowRight size={20} color={Colors.light.white} />
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  splashLogoText: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: Colors.light.white,
    letterSpacing: 2,
  },
  loadingTagline: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 32,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primaryDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  logoText: {
    fontSize: 44,
    fontWeight: '800' as const,
    color: Colors.light.white,
    letterSpacing: 3,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 42,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 17,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: width * 0.8,
  },
  featuresContainer: {
    flexDirection: 'row',
    gap: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.light.primary,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  button: {
    backgroundColor: Colors.light.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
    shadowColor: Colors.light.primaryDarker,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonText: {
    color: Colors.light.white,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  termsText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
