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
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
  danger?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  showArrow = true,
  danger = false,
}) => (
  <TouchableOpacity
    style={styles.settingItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
      {icon}
    </View>
    <View style={styles.settingContent}>
      <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>
        {title}
      </Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement || (showArrow && (
      <ChevronRight size={20} color={Colors.light.textMuted} />
    ))}
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, clearAll, biometricEnabled } = useAuth();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

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
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
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
            <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
            <Text style={styles.memberSince}>Member since {getMemberSince()}</Text>
            
            {user?.provider && (
              <View style={styles.providerBadge}>
                <Text style={styles.providerBadgeText}>
                  Connected via {user.provider}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon={<Mail size={20} color={Colors.light.primary} />}
                title="Email"
                subtitle={user?.email || 'Not provided'}
                showArrow={false}
              />
              
              {user?.phone && (
                <SettingItem
                  icon={<Phone size={20} color={Colors.light.primary} />}
                  title="Phone"
                  subtitle={user.phone}
                  showArrow={false}
                />
              )}

              {user?.walletAddress && (
                <SettingItem
                  icon={<Wallet size={20} color={Colors.light.primary} />}
                  title="Wallet Address"
                  subtitle={formatWalletAddress(user.walletAddress)}
                  onPress={handleCopyAddress}
                  rightElement={
                    copiedAddress ? (
                      <Check size={20} color={Colors.light.success} />
                    ) : (
                      <Copy size={20} color={Colors.light.textMuted} />
                    )
                  }
                />
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon={<Bell size={20} color={Colors.light.primary} />}
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
                      false: Colors.light.borderLight, 
                      true: Colors.light.primary 
                    }}
                    thumbColor="#FFFFFF"
                  />
                }
              />
              
              <SettingItem
                icon={<Moon size={20} color={Colors.light.primary} />}
                title="Dark Mode"
                subtitle="Switch to dark theme"
                showArrow={false}
                rightElement={
                  <Switch
                    value={darkModeEnabled}
                    onValueChange={(value) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDarkModeEnabled(value);
                    }}
                    trackColor={{ 
                      false: Colors.light.borderLight, 
                      true: Colors.light.primary 
                    }}
                    thumbColor="#FFFFFF"
                  />
                }
              />

              <SettingItem
                icon={<Globe size={20} color={Colors.light.primary} />}
                title="Language"
                subtitle="English"
                onPress={() => {}}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon={<Lock size={20} color={Colors.light.primary} />}
                title="Change Passcode"
                subtitle="Update your 6-digit PIN"
                onPress={() => {}}
              />
              
              <SettingItem
                icon={<Fingerprint size={20} color={Colors.light.primary} />}
                title="Biometric Login"
                subtitle={biometricEnabled ? 'Enabled' : 'Disabled'}
                showArrow={false}
                rightElement={
                  <View style={[
                    styles.statusBadge,
                    biometricEnabled ? styles.statusEnabled : styles.statusDisabled
                  ]}>
                    <Text style={[
                      styles.statusText,
                      biometricEnabled ? styles.statusTextEnabled : styles.statusTextDisabled
                    ]}>
                      {biometricEnabled ? 'On' : 'Off'}
                    </Text>
                  </View>
                }
              />

              <SettingItem
                icon={<Shield size={20} color={Colors.light.primary} />}
                title="Two-Factor Authentication"
                subtitle="Add extra security"
                onPress={() => {}}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <View style={styles.sectionCard}>
              <SettingItem
                icon={<HelpCircle size={20} color={Colors.light.primary} />}
                title="Help Center"
                subtitle="FAQs and support"
                onPress={() => {}}
              />
              
              <SettingItem
                icon={<FileText size={20} color={Colors.light.primary} />}
                title="Terms & Privacy"
                subtitle="Legal information"
                onPress={() => {}}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <SettingItem
                icon={<LogOut size={20} color={Colors.light.error} />}
                title="Log Out"
                onPress={handleLogout}
                danger
                showArrow={false}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Version 1.0.0</Text>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    color: '#FFFFFF',
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
    shadowColor: Colors.light.primary,
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 12,
  },
  providerBadge: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  providerBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(157, 193, 131, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingIconDanger: {
    backgroundColor: 'rgba(244, 166, 163, 0.12)',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingTitleDanger: {
    color: Colors.light.error,
  },
  settingSubtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusEnabled: {
    backgroundColor: 'rgba(184, 212, 168, 0.25)',
  },
  statusDisabled: {
    backgroundColor: Colors.light.borderLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  statusTextEnabled: {
    color: Colors.light.success,
  },
  statusTextDisabled: {
    color: Colors.light.textMuted,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 8,
    marginBottom: 16,
  },
  bottomSpacer: {
    height: 24,
  },
});
