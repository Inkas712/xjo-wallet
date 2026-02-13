import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Mail,
  Phone,
  Wallet,
  Shield,
  Bell,
  Lock,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Copy,
  Check,
  Fingerprint,
  Moon,
  Globe,
  X,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGES, Language } from '@/constants/i18n';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
  danger?: boolean;
  textColor: string;
  subtitleColor: string;
  arrowColor: string;
  iconBg: string;
  borderColor: string;
  dangerColor: string;
  dangerIconBg: string;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  showArrow = true,
  danger = false,
  textColor,
  subtitleColor,
  arrowColor,
  iconBg,
  borderColor,
  dangerColor,
  dangerIconBg,
}) => (
  <TouchableOpacity
    style={[settingStyles.settingItem, { borderBottomColor: borderColor }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[settingStyles.settingIcon, { backgroundColor: danger ? dangerIconBg : iconBg }]}>
      {icon}
    </View>
    <View style={settingStyles.settingContent}>
      <Text style={[settingStyles.settingTitle, { color: danger ? dangerColor : textColor }]}>
        {title}
      </Text>
      {subtitle && <Text style={[settingStyles.settingSubtitle, { color: subtitleColor }]}>{subtitle}</Text>}
    </View>
    {rightElement || (showArrow && (
      <ChevronRight size={20} color={arrowColor} />
    ))}
  </TouchableOpacity>
);

const settingStyles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
});

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, clearAll, biometricEnabled, toggleBiometric } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const settingItemColors = {
    textColor: colors.text,
    subtitleColor: colors.textMuted,
    arrowColor: colors.textMuted,
    iconBg: isDark ? 'rgba(157, 193, 131, 0.12)' : 'rgba(107, 142, 78, 0.1)',
    borderColor: colors.borderLight,
    dangerColor: colors.error,
    dangerIconBg: isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(255, 59, 48, 0.1)',
  };

  const currentLangInfo = LANGUAGES.find(l => l.code === language);

  const handleCopyAddress = async () => {
    if (user?.walletAddress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Clipboard.setStringAsync(user.walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleToggleBiometric = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS !== 'web') {
      try {
        const LocalAuth = require('expo-local-authentication');
        const hasHardware = await LocalAuth.hasHardwareAsync();
        if (!hasHardware) {
          Alert.alert(t('biometricLogin'), 'Biometric hardware not available on this device.');
          return;
        }
        const isEnrolled = await LocalAuth.isEnrolledAsync();
        if (!isEnrolled) {
          Alert.alert(t('biometricLogin'), 'No biometric data enrolled. Please set up fingerprint/face in your device settings.');
          return;
        }
        const auth = await LocalAuth.authenticateAsync({
          promptMessage: 'Authenticate to change biometric settings',
          cancelLabel: t('cancel'),
        });
        if (!auth.success) return;
      } catch (error) {
        console.log('Local auth check error:', error);
      }
    }

    const newValue = await toggleBiometric();
    if (newValue) {
      Alert.alert(t('biometricEnabled'), t('biometricEnabledMsg'));
    } else {
      Alert.alert(t('biometricDisabled'), t('biometricDisabledMsg'));
    }
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('logOut'),
      t('logOutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('logOut'), 
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/');
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      t('deleteAccount'),
      t('deleteConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            router.replace('/');
          }
        },
      ]
    );
  };

  const formatWalletAddress = (address: string) => {
    if (address.length > 16) {
      return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }
    return address;
  };

  const getInitials = () => {
    if (!user?.fullName) return 'U';
    const names = user.fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const getMemberSince = () => {
    if (!user?.createdAt) return 'N/A';
    return new Date(user.createdAt).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const handleSelectLanguage = (lang: Language) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLanguage(lang);
    setShowLanguagePicker(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile')}</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileSection}>
            <LinearGradient
              colors={['#9DC183', '#7BA05B']}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </LinearGradient>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.fullName || 'User'}</Text>
            <Text style={[styles.memberSince, { color: colors.textSecondary }]}>{t('memberSince')} {getMemberSince()}</Text>
            
            {user?.provider && (
              <View style={[styles.providerBadge, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.providerBadgeText, { color: colors.primary }]}>
                  {t('connectedVia')} {user.provider}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('accountInfo')}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <SettingItem
                icon={<Mail size={20} color={colors.primary} />}
                title={t('email')}
                subtitle={user?.email || 'Not provided'}
                showArrow={false}
                {...settingItemColors}
              />
              
              {user?.phone && (
                <SettingItem
                  icon={<Phone size={20} color={colors.primary} />}
                  title={t('phone')}
                  subtitle={user.phone}
                  showArrow={false}
                  {...settingItemColors}
                />
              )}

              {user?.walletAddress && (
                <SettingItem
                  icon={<Wallet size={20} color={colors.primary} />}
                  title={t('walletAddress')}
                  subtitle={formatWalletAddress(user.walletAddress)}
                  onPress={handleCopyAddress}
                  rightElement={
                    copiedAddress ? (
                      <Check size={20} color={colors.success} />
                    ) : (
                      <Copy size={20} color={colors.textMuted} />
                    )
                  }
                  {...settingItemColors}
                />
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('preferences')}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <SettingItem
                icon={<Bell size={20} color={colors.primary} />}
                title={t('pushNotifications')}
                subtitle={t('receiveAlerts')}
                showArrow={false}
                rightElement={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={(value) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNotificationsEnabled(value);
                    }}
                    trackColor={{ 
                      false: colors.borderLight, 
                      true: colors.primary 
                    }}
                    thumbColor="#FFFFFF"
                  />
                }
                {...settingItemColors}
              />
              
              <SettingItem
                icon={<Moon size={20} color={colors.primary} />}
                title={t('darkMode')}
                subtitle={isDark ? t('darkThemeActive') : t('lightThemeActive')}
                showArrow={false}
                rightElement={
                  <Switch
                    value={isDark}
                    onValueChange={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      toggleTheme();
                    }}
                    trackColor={{ 
                      false: colors.borderLight, 
                      true: colors.primary 
                    }}
                    thumbColor="#FFFFFF"
                  />
                }
                {...settingItemColors}
              />

              <SettingItem
                icon={<Globe size={20} color={colors.primary} />}
                title={t('language')}
                subtitle={currentLangInfo?.nativeName || 'English'}
                onPress={() => setShowLanguagePicker(true)}
                {...settingItemColors}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('security')}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <SettingItem
                icon={<Lock size={20} color={colors.primary} />}
                title={t('changePasscode')}
                subtitle={t('updatePin')}
                onPress={() => router.push('/change-passcode' as any)}
                {...settingItemColors}
              />
              
              <SettingItem
                icon={<Fingerprint size={20} color={colors.primary} />}
                title={t('biometricLogin')}
                subtitle={biometricEnabled ? t('enabled') : t('disabled')}
                onPress={handleToggleBiometric}
                showArrow={false}
                rightElement={
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleToggleBiometric}
                    trackColor={{ 
                      false: colors.borderLight, 
                      true: colors.primary 
                    }}
                    thumbColor="#FFFFFF"
                  />
                }
                {...settingItemColors}
              />

              <SettingItem
                icon={<Shield size={20} color={colors.primary} />}
                title={t('twoFactor')}
                subtitle={t('addExtraSecurity')}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(t('twoFactor'), 'Coming soon!');
                }}
                {...settingItemColors}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('support')}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <SettingItem
                icon={<HelpCircle size={20} color={colors.primary} />}
                title={t('helpCenter')}
                subtitle={t('faqAndSupport')}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(t('helpCenter'), 'Coming soon!');
                }}
                {...settingItemColors}
              />
              
              <SettingItem
                icon={<FileText size={20} color={colors.primary} />}
                title={t('termsPrivacy')}
                subtitle={t('legalInfo')}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Alert.alert(t('termsPrivacy'), 'Coming soon!');
                }}
                {...settingItemColors}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <SettingItem
                icon={<LogOut size={20} color={colors.error} />}
                title={t('logOut')}
                onPress={handleLogout}
                danger
                showArrow={false}
                {...settingItemColors}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.deleteButtonText, { color: colors.error }]}>{t('deleteAccount')}</Text>
          </TouchableOpacity>

          <Text style={[styles.versionText, { color: colors.textMuted }]}>{t('version')} 1.0.0</Text>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showLanguagePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setShowLanguagePicker(false)}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  { borderBottomColor: colors.borderLight },
                  language === lang.code && { backgroundColor: isDark ? 'rgba(157,193,131,0.12)' : 'rgba(107,142,78,0.08)' },
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <View style={styles.languageInfo}>
                  <Text style={[styles.languageName, { color: colors.text }]}>{lang.nativeName}</Text>
                  <Text style={[styles.languageEnglish, { color: colors.textMuted }]}>{lang.name}</Text>
                </View>
                {language === lang.code && (
                  <Check size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#9DC183',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    marginBottom: 12,
  },
  providerBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  providerBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  bottomSpacer: {
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  languageEnglish: {
    fontSize: 13,
  },
});
