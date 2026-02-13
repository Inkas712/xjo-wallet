import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Lock, Check } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Step = 'current' | 'new' | 'confirm';

export default function ChangePasscodeScreen() {
  const router = useRouter();
  const { changePasscode } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const [step, setStep] = useState<Step>('current');
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const inputRef = useRef<TextInput>(null);

  const getActiveCode = () => {
    switch (step) {
      case 'current': return currentCode;
      case 'new': return newCode;
      case 'confirm': return confirmCode;
    }
  };

  const setActiveCode = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    switch (step) {
      case 'current': setCurrentCode(cleaned); break;
      case 'new': setNewCode(cleaned); break;
      case 'confirm': setConfirmCode(cleaned); break;
    }
  };

  const handleNext = async () => {
    const code = getActiveCode();
    if (code.length !== 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', t('passcodeLength'));
      return;
    }

    if (step === 'current') {
      setStep('new');
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (step === 'new') {
      setStep('confirm');
      setTimeout(() => inputRef.current?.focus(), 100);
    } else if (step === 'confirm') {
      if (newCode !== confirmCode) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('passcodeMismatch'), t('passcodeMismatchMsg'));
        setConfirmCode('');
        return;
      }

      const success = await changePasscode(currentCode, newCode);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('passcodeChanged'), t('passcodeChangedMsg'), [
          { text: t('ok'), onPress: () => router.back() }
        ]);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('incorrectPasscode'), t('incorrectPasscodeMsg'));
        setCurrentCode('');
        setNewCode('');
        setConfirmCode('');
        setStep('current');
      }
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'current': return t('currentPasscode');
      case 'new': return t('newPasscode');
      case 'confirm': return t('confirmNewPasscode');
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'current': return t('enterCurrentPasscode');
      case 'new': return t('enterNewPasscode');
      case 'confirm': return t('confirmPasscode');
    }
  };

  const activeCode = getActiveCode();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{
        headerShown: false,
        presentation: 'card',
      }} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('changePasscodeTitle')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.iconContainer}>
            <View style={[styles.lockIcon, { backgroundColor: isDark ? 'rgba(157,193,131,0.15)' : 'rgba(107,142,78,0.1)' }]}>
              <Lock size={32} color={colors.primary} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{getTitle()}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{getSubtitle()}</Text>

          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { borderColor: colors.border },
                  i < activeCode.length && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              />
            ))}
          </View>

          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={activeCode}
            onChangeText={setActiveCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            secureTextEntry
          />

          <View style={styles.stepIndicator}>
            {['current', 'new', 'confirm'].map((s, i) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  { backgroundColor: colors.borderLight },
                  s === step && { backgroundColor: colors.primary, width: 24 },
                  (['current', 'new', 'confirm'].indexOf(step) > i) && { backgroundColor: colors.primary },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: colors.primary },
              activeCode.length !== 6 && { opacity: 0.5 },
            ]}
            onPress={handleNext}
            disabled={activeCode.length !== 6}
          >
            {step === 'confirm' ? (
              <Check size={22} color="#FFFFFF" />
            ) : null}
            <Text style={styles.nextButtonText}>
              {step === 'confirm' ? t('done') : t('ok')}
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const },
  headerPlaceholder: { width: 44 },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: { marginBottom: 24 },
  lockIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700' as const, marginBottom: 8, textAlign: 'center' as const },
  subtitle: { fontSize: 14, textAlign: 'center' as const, marginBottom: 32, lineHeight: 20 },
  dotsContainer: {
    flexDirection: 'row', gap: 16, marginBottom: 40,
  },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2,
  },
  hiddenInput: {
    position: 'absolute', opacity: 0, width: 1, height: 1,
  },
  stepIndicator: {
    flexDirection: 'row', gap: 8, marginBottom: 40,
  },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 40,
    borderRadius: 16, gap: 8, width: '100%',
  },
  nextButtonText: {
    fontSize: 17, fontWeight: '700' as const, color: '#FFFFFF',
  },
});
