import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
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
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { user, logout, clearAll, biometricEnabled } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const settingItemColors = {
    textColor: colors.text,
    subtitleColor: colors.textMuted,
    arrowColor: colors.textMuted,
    iconBg: isDark ? 'rgba(157, 193, 131, 0.12)' : 'rgba(107, 142, 78, 0.1)',
    borderColor: colors.borderLight,
    dangerColor: colors.error,
    dangerIconBg: isDark ? 'rgba(248, 113, 113, 0.12)' : 'rgba(255, 59, 48, 0.1)',
  };

  const handleCopyAddress = async () => {
    if (user?.walletAddress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Clipboard.setStringAsync(user.walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
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
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
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
            <Text style={[styles.memberSince, { color: colors.textSecondary }]}>Member since {getMemberSince()}</Text>
            
            {user?.provider && (
              <View style={[styles.providerBadge, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.providerBadgeText, { color: colors.primary }]}>
                  Connected via {user.provider}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Information</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <SettingItem
                icon={<Mail size={20} color={colors.primary} />}
                title="Email"
                subtitle={user?.email || 'Not provided'}
                showArrow={false}
                {...settingItemColors}
              />
              
              {user?.phone && (
                <SettingItem
                  icon={<Phone size={20} color={colors.primary} />}
                  title="Phone"
                  subtitle={user.phone}
                  showArrow={false}
                  {...settingItemColors}
                />
              )}

              {user?.walletAddress && (
                <SettingItem
                  icon={<Wallet size={20} color={colors.primary} />}
                  title="Wallet Address"
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
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <SettingItem
                icon={<Bell size={20} color={colors.primary} />}
                title="Push Notifications"
                subtitle="Receive alerts for transactions"
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
                title="Dark Mode"
                subtitle={isDark ? "Dark theme active" : "Light theme active"}
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
                title="Language"
                subtitle="English"
                onPress={() => {}}
                {...settingItemColors}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Security</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <SettingItem
                icon={<Lock size={20} color={colors.primary} />}
                title="Change Passcode"
                subtitle="Update your 6-digit PIN"
                onPress={() => {}}
                {...settingItemColors}
              />
              
              <SettingItem
                icon={<Fingerprint size={20} color={colors.primary} />}
                title="Biometric Login"
                subtitle={biometricEnabled ? 'Enabled' : 'Disabled'}
                showArrow={false}
                rightElement={
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: biometricEnabled 
                      ? (isDark ? 'rgba(184, 212, 168, 0.25)' : 'rgba(52, 199, 89, 0.12)') 
                      : colors.borderLight 
                    }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: biometricEnabled ? colors.success : colors.textMuted }
                    ]}>
                      {biometricEnabled ? 'On' : 'Off'}
                    </Text>
                  </View>
                }
                {...settingItemColors}
              />

              <SettingItem
                icon={<Shield size={20} color={colors.primary} />}
                title="Two-Factor Authentication"
                subtitle="Add extra security"
                onPress={() => {}}
                {...settingItemColors}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <SettingItem
                icon={<HelpCircle size={20} color={colors.primary} />}
                title="Help Center"
                subtitle="FAQs and support"
                onPress={() => {}}
                {...settingItemColors}
              />
              
              <SettingItem
                icon={<FileText size={20} color={colors.primary} />}
                title="Terms & Privacy"
                subtitle="Legal information"
                onPress={() => {}}
                {...settingItemColors}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={[styles.sectionCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              <SettingItem
                icon={<LogOut size={20} color={colors.error} />}
                title="Log Out"
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
            <Text style={[styles.deleteButtonText, { color: colors.error }]}>Delete Account</Text>
          </TouchableOpacity>

          <Text style={[styles.versionText, { color: colors.textMuted }]}>Version 1.0.0</Text>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
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
});
