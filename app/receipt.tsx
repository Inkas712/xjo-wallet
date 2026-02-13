import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle,
  Share2,
  ArrowUpRight,
  ArrowDownLeft,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReceiptScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{
    txId: string;
    txType: string;
    txAmount: string;
    txCurrency: string;
    txCounterparty: string;
    txNote: string;
    txMethod: string;
    txDate: string;
  }>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [fadeAnim, scaleAnim, slideAnim]);

  const txDate = params.txDate ? new Date(params.txDate) : new Date();
  const isSent = params.txType === 'sent';

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const receiptText = [
        `--- ${t('transactionReceipt')} ---`,
        `${t('transactionId')}: ${params.txId}`,
        `${t('date')}: ${txDate.toLocaleDateString()}`,
        `${t('time')}: ${txDate.toLocaleTimeString()}`,
        `${t('type')}: ${isSent ? t('sent') : t('received')}`,
        `${t('amount')}: ${params.txAmount} ${params.txCurrency}`,
        params.txCounterparty ? `${isSent ? t('recipient') : t('sender')}: ${params.txCounterparty}` : '',
        params.txMethod ? `${t('method')}: ${params.txMethod}` : '',
        params.txNote ? `${t('note')}: ${params.txNote}` : '',
        `${t('status')}: ${t('completed')}`,
        '---',
        'XJO Fintech App',
      ].filter(Boolean).join('\n');

      await Share.share({ message: receiptText });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.dismiss();
    router.replace('/(tabs)/home');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('receipt')}</Text>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            onPress={handleDone}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Animated.View style={[styles.successSection, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
            <View style={[styles.checkCircle, { backgroundColor: isDark ? 'rgba(74,222,128,0.15)' : 'rgba(52,199,89,0.12)' }]}>
              <CheckCircle size={48} color={colors.success} />
            </View>
            <Text style={[styles.successTitle, { color: colors.success }]}>{t('paymentSuccessful')}</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.amountText, { color: colors.text }]}>
                {isSent ? '-' : '+'}{params.txAmount} {params.txCurrency}
              </Text>
            </View>
          </Animated.View>

          <Animated.View style={[
            styles.receiptCard,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}>
            <View style={styles.receiptDivider}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View key={i} style={[styles.dividerDot, { backgroundColor: colors.background }]} />
              ))}
            </View>

            <ReceiptRow
              label={t('transactionId')}
              value={params.txId || 'N/A'}
              colors={colors}
              mono
            />
            <ReceiptRow
              label={t('date')}
              value={txDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              colors={colors}
            />
            <ReceiptRow
              label={t('time')}
              value={txDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              colors={colors}
            />
            <ReceiptRow
              label={t('type')}
              value={isSent ? t('sent') : t('received')}
              colors={colors}
              icon={isSent
                ? <ArrowUpRight size={14} color={colors.error} />
                : <ArrowDownLeft size={14} color={colors.success} />
              }
            />
            <ReceiptRow
              label={t('amount')}
              value={`${params.txAmount} ${params.txCurrency}`}
              colors={colors}
              bold
            />
            {params.txCounterparty ? (
              <ReceiptRow
                label={isSent ? t('recipient') : t('sender')}
                value={params.txCounterparty}
                colors={colors}
              />
            ) : null}
            {params.txMethod ? (
              <ReceiptRow
                label={t('method')}
                value={params.txMethod}
                colors={colors}
              />
            ) : null}
            {params.txNote ? (
              <ReceiptRow
                label={t('note')}
                value={params.txNote}
                colors={colors}
              />
            ) : null}
            <ReceiptRow
              label={t('status')}
              value={t('completed')}
              colors={colors}
              statusColor={colors.success}
            />

            <View style={styles.receiptDividerBottom}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View key={i} style={[styles.dividerDot, { backgroundColor: colors.background }]} />
              ))}
            </View>
          </Animated.View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.shareButton, { borderColor: colors.primary }]}
              onPress={handleShare}
            >
              <Share2 size={18} color={colors.primary} />
              <Text style={[styles.shareButtonText, { color: colors.primary }]}>{t('shareReceipt')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
              onPress={handleDone}
            >
              <Text style={styles.doneButtonText}>{t('done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

interface ReceiptRowProps {
  label: string;
  value: string;
  colors: any;
  bold?: boolean;
  mono?: boolean;
  icon?: React.ReactNode;
  statusColor?: string;
}

function ReceiptRow({ label, value, colors, bold, mono, icon, statusColor }: ReceiptRowProps) {
  return (
    <View style={styles.receiptRow}>
      <Text style={[styles.receiptLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.receiptValueRow}>
        {icon}
        <Text
          style={[
            styles.receiptValue,
            { color: statusColor || colors.text },
            bold && { fontWeight: '700' as const },
            mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const },
  closeButton: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  content: {
    flex: 1, paddingHorizontal: 20,
    justifyContent: 'center',
  },
  successSection: {
    alignItems: 'center', marginBottom: 24,
  },
  checkCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20, fontWeight: '700' as const, marginBottom: 8,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  amountText: { fontSize: 32, fontWeight: '800' as const },
  receiptCard: {
    borderRadius: 20, borderWidth: 1, overflow: 'hidden',
    paddingHorizontal: 20, paddingVertical: 16, marginBottom: 24,
  },
  receiptDivider: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginHorizontal: -20, marginTop: -16, marginBottom: 16, paddingHorizontal: 4,
  },
  receiptDividerBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginHorizontal: -20, marginBottom: -16, marginTop: 16, paddingHorizontal: 4,
  },
  dividerDot: {
    width: 12, height: 12, borderRadius: 6,
  },
  receiptRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10,
  },
  receiptLabel: { fontSize: 13, fontWeight: '500' as const },
  receiptValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '55%' },
  receiptValue: { fontSize: 14, fontWeight: '600' as const },
  actions: { gap: 12 },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, gap: 8,
  },
  shareButtonText: { fontSize: 16, fontWeight: '600' as const },
  doneButton: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16,
  },
  doneButtonText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF' },
});
