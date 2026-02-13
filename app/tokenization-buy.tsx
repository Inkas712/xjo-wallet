import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Minus,
  Plus,
  Wallet,
  Smartphone,
  Radio,
  Hash,
  CheckCircle,
  Zap,
  AlertTriangle,
  Copy,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useTokenization } from '@/contexts/TokenizationContext';
import { useWallet } from '@/contexts/WalletContext';
import { ASSET_TYPE_COLORS } from '@/mocks/tokenizedAssets';
import { shortenTxHash, generateMockTxHash } from '@/services/solana';

type BuyStep = 'amount' | 'payment' | 'confirm' | 'processing' | 'success';

export default function TokenizationBuyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { getAssetById, buyTokens } = useTokenization();
  const { getBalance } = useWallet();
  const [step, setStep] = useState<BuyStep>('amount');
  const [tokenCount, setTokenCount] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'nfc' | 'ble' | 'code'>('balance');
  const [txHash, setTxHash] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const asset = id ? getAssetById(id) : undefined;
  const usdBalance = getBalance('USD');

  const totalCost = asset ? tokenCount * asset.pricePerToken : 0;
  const fee = 0.000005;
  const canAfford = usdBalance >= totalCost;

  const animateTransition = useCallback(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim]);

  const handleTokenChange = useCallback((text: string) => {
    setInputValue(text);
    const num = parseInt(text, 10);
    if (!isNaN(num) && num > 0) {
      setTokenCount(num);
    }
  }, []);

  const adjustTokens = useCallback((delta: number) => {
    const newCount = Math.max(1, tokenCount + delta);
    setTokenCount(newCount);
    setInputValue(newCount.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [tokenCount]);

  const handleConfirmPurchase = useCallback(async () => {
    if (!asset || !id) return;
    setStep('processing');
    animateTransition();

    await new Promise(resolve => setTimeout(resolve, 2500));

    const success = buyTokens(id, tokenCount);
    if (success) {
      const hash = generateMockTxHash();
      setTxHash(hash);
      setStep('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    } else {
      Alert.alert('Purchase Failed', 'Insufficient balance. Please add funds and try again.');
      setStep('confirm');
    }
  }, [asset, id, tokenCount, buyTokens, animateTransition, successScale]);

  if (!asset) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Buy Tokens' }} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Asset not found</Text>
      </View>
    );
  }

  const typeColor = ASSET_TYPE_COLORS[asset.type];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: step === 'success' ? 'Success' : 'Buy Tokens', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.primary, headerTitleStyle: { color: colors.text } }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {step !== 'success' && step !== 'processing' && (
            <View style={[styles.assetHeader, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <Image source={{ uri: asset.images[0] }} style={styles.assetThumb} contentFit="cover" />
              <View style={styles.assetHeaderInfo}>
                <Text style={[styles.assetName, { color: colors.text }]} numberOfLines={1}>{asset.name}</Text>
                <Text style={[styles.assetPrice, { color: typeColor }]}>${asset.pricePerToken.toLocaleString()} / token</Text>
              </View>
            </View>
          )}

          {step === 'amount' && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>How many tokens?</Text>

              <View style={[styles.tokenSelector, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <TouchableOpacity style={[styles.adjustBtn, { backgroundColor: colors.backgroundTertiary }]} onPress={() => adjustTokens(-10)}>
                  <Text style={[styles.adjustBtnText, { color: colors.text }]}>-10</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.adjustBtn, { backgroundColor: colors.backgroundTertiary }]} onPress={() => adjustTokens(-1)}>
                  <Minus size={18} color={colors.text} />
                </TouchableOpacity>
                <TextInput
                  style={[styles.tokenInput, { color: colors.text, borderColor: colors.borderLight }]}
                  value={inputValue}
                  onChangeText={handleTokenChange}
                  keyboardType="number-pad"
                  textAlign="center"
                />
                <TouchableOpacity style={[styles.adjustBtn, { backgroundColor: colors.backgroundTertiary }]} onPress={() => adjustTokens(1)}>
                  <Plus size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.adjustBtn, { backgroundColor: colors.backgroundTertiary }]} onPress={() => adjustTokens(10)}>
                  <Text style={[styles.adjustBtnText, { color: colors.text }]}>+10</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.costCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <View style={styles.costRow}>
                  <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Tokens</Text>
                  <Text style={[styles.costValue, { color: colors.text }]}>{tokenCount.toLocaleString()}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Price per token</Text>
                  <Text style={[styles.costValue, { color: colors.text }]}>${asset.pricePerToken.toLocaleString()}</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Network fee</Text>
                  <Text style={[styles.costValue, { color: colors.textMuted }]}>~{fee} SOL</Text>
                </View>
                <View style={[styles.costDivider, { backgroundColor: colors.borderLight }]} />
                <View style={styles.costRow}>
                  <Text style={[styles.costLabelBold, { color: colors.text }]}>Total</Text>
                  <Text style={[styles.costTotal, { color: colors.text }]}>
                    ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              {!canAfford && (
                <View style={styles.warningRow}>
                  <AlertTriangle size={14} color="#FF6B6B" />
                  <Text style={styles.warningText}>Insufficient balance (${usdBalance.toFixed(2)} available)</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: canAfford ? '#9945FF' : '#555' }]}
                onPress={() => { animateTransition(); setStep('payment'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                disabled={!canAfford}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'payment' && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Payment Method</Text>

              {[
                { key: 'balance' as const, icon: Wallet, label: 'App Balance', desc: `$${usdBalance.toFixed(2)} available`, color: '#14F195' },
                { key: 'nfc' as const, icon: Smartphone, label: 'NFC Tap to Pay', desc: 'Tap devices to pay', color: '#4ECDC4' },
                { key: 'ble' as const, icon: Radio, label: 'Nearby Pay (BLE)', desc: 'Bluetooth payment', color: '#9945FF' },
                { key: 'code' as const, icon: Hash, label: 'Enter Code', desc: '6-digit payment code', color: '#FFD700' },
              ].map((method) => {
                const MethodIcon = method.icon;
                const isSelected = paymentMethod === method.key;
                return (
                  <TouchableOpacity
                    key={method.key}
                    style={[
                      styles.paymentOption,
                      { backgroundColor: colors.card, borderColor: isSelected ? method.color : colors.borderLight },
                      isSelected && { borderWidth: 2 },
                    ]}
                    onPress={() => { setPaymentMethod(method.key); Haptics.selectionAsync(); }}
                  >
                    <View style={[styles.paymentIconWrap, { backgroundColor: method.color + '20' }]}>
                      <MethodIcon size={20} color={method.color} />
                    </View>
                    <View style={styles.paymentInfo}>
                      <Text style={[styles.paymentLabel, { color: colors.text }]}>{method.label}</Text>
                      <Text style={[styles.paymentDesc, { color: colors.textMuted }]}>{method.desc}</Text>
                    </View>
                    {isSelected && <CheckCircle size={20} color={method.color} />}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#9945FF' }]}
                onPress={() => { animateTransition(); setStep('confirm'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'confirm' && (
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>Confirm Purchase</Text>

              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Asset</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{asset.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tokens</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{tokenCount.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Cost</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Payment</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {paymentMethod === 'balance' ? 'App Balance' : paymentMethod === 'nfc' ? 'NFC' : paymentMethod === 'ble' ? 'BLE' : 'Code'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Network</Text>
                  <Text style={[styles.summaryValue, { color: '#9945FF' }]}>Solana (Devnet)</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Fee</Text>
                  <Text style={[styles.summaryValue, { color: colors.textMuted }]}>~0.000005 SOL</Text>
                </View>
              </View>

              <View style={[styles.disclaimerBox, { backgroundColor: '#FF6B3520', borderColor: '#FF6B3540' }]}>
                <AlertTriangle size={14} color="#FF6B35" />
                <Text style={styles.disclaimerText}>
                  This is an MVP demo. No real funds or tokens are involved. Not financial advice.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#14F195' }]}
                onPress={handleConfirmPurchase}
              >
                <Text style={[styles.primaryButtonText, { color: '#0A0A1A' }]}>Confirm & Buy</Text>
              </TouchableOpacity>
            </View>
          )}

          {step === 'processing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#9945FF" />
              <Text style={[styles.processingTitle, { color: colors.text }]}>Minting Tokens...</Text>
              <Text style={[styles.processingDesc, { color: colors.textSecondary }]}>
                Submitting transaction to Solana network
              </Text>
              <View style={[styles.solanaBadgeLg, { backgroundColor: '#9945FF15' }]}>
                <Zap size={14} color="#9945FF" />
                <Text style={styles.solanaBadgeText}>Processing on Solana Devnet</Text>
              </View>
            </View>
          )}

          {step === 'success' && (
            <Animated.View style={[styles.successContainer, { transform: [{ scale: successScale }] }]}>
              <LinearGradient
                colors={['#14F19520', '#9945FF10', 'transparent']}
                style={styles.successGlow}
              />
              <View style={[styles.successIcon, { backgroundColor: '#14F19520' }]}>
                <CheckCircle size={48} color="#14F195" />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Purchase Complete!</Text>
              <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
                You now own {tokenCount.toLocaleString()} tokens of {asset.name}
              </Text>

              <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <View style={[styles.mintBadge, { backgroundColor: '#9945FF20' }]}>
                  <Zap size={12} color="#9945FF" />
                  <Text style={styles.mintBadgeText}>Token minted on Solana</Text>
                </View>
                <View style={styles.txRow}>
                  <Text style={[styles.txLabel, { color: colors.textMuted }]}>Tx Hash</Text>
                  <View style={styles.txHashRow}>
                    <Text style={[styles.txHashText, { color: colors.textSecondary }]}>{shortenTxHash(txHash)}</Text>
                    <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                      <Copy size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.txRow}>
                  <Text style={[styles.txLabel, { color: colors.textMuted }]}>Network</Text>
                  <Text style={[styles.txHashText, { color: '#9945FF' }]}>Solana Devnet</Text>
                </View>
                <View style={styles.txRow}>
                  <Text style={[styles.txLabel, { color: colors.textMuted }]}>Fee</Text>
                  <Text style={[styles.txHashText, { color: colors.textSecondary }]}>~0.000005 SOL</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: '#9945FF' }]}
                onPress={() => router.back()}
              >
                <Text style={styles.primaryButtonText}>Done</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  errorText: { fontSize: 14, textAlign: 'center' as const, marginTop: 40 },
  assetHeader: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 20 },
  assetThumb: { width: 48, height: 48, borderRadius: 10 },
  assetHeaderInfo: { marginLeft: 12, flex: 1 },
  assetName: { fontSize: 15, fontWeight: '600' as const },
  assetPrice: { fontSize: 13, fontWeight: '700' as const, marginTop: 2 },
  stepContent: {},
  stepTitle: { fontSize: 20, fontWeight: '700' as const, marginBottom: 16 },
  tokenSelector: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 8, gap: 6, marginBottom: 16 },
  adjustBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  adjustBtnText: { fontSize: 13, fontWeight: '700' as const },
  tokenInput: { flex: 1, fontSize: 24, fontWeight: '700' as const, borderWidth: 1, borderRadius: 10, paddingVertical: 8 },
  costCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  costLabel: { fontSize: 13 },
  costValue: { fontSize: 13, fontWeight: '600' as const },
  costDivider: { height: 1, marginVertical: 8 },
  costLabelBold: { fontSize: 15, fontWeight: '700' as const },
  costTotal: { fontSize: 18, fontWeight: '800' as const },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  warningText: { color: '#FF6B6B', fontSize: 12 },
  primaryButton: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' as const },
  paymentOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  paymentIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paymentInfo: { flex: 1, marginLeft: 12 },
  paymentLabel: { fontSize: 14, fontWeight: '600' as const },
  paymentDesc: { fontSize: 11, marginTop: 2 },
  summaryCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '600' as const, maxWidth: '60%', textAlign: 'right' as const },
  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 10, borderWidth: 1, padding: 12, gap: 8, marginBottom: 8 },
  disclaimerText: { flex: 1, color: '#FF6B35', fontSize: 11, lineHeight: 16 },
  processingContainer: { alignItems: 'center', paddingTop: 60 },
  processingTitle: { fontSize: 20, fontWeight: '700' as const, marginTop: 20 },
  processingDesc: { fontSize: 13, marginTop: 6 },
  solanaBadgeLg: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, gap: 6, marginTop: 20 },
  solanaBadgeText: { color: '#9945FF', fontSize: 12, fontWeight: '600' as const },
  successContainer: { alignItems: 'center', paddingTop: 20 },
  successGlow: { position: 'absolute' as const, top: -20, left: -40, right: -40, height: 200, borderRadius: 100 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 24, fontWeight: '800' as const, marginTop: 16 },
  successDesc: { fontSize: 14, textAlign: 'center' as const, marginTop: 6, marginBottom: 20 },
  successCard: { borderRadius: 14, borderWidth: 1, padding: 16, width: '100%', marginBottom: 20 },
  mintBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 6, alignSelf: 'flex-start', marginBottom: 12 },
  mintBadgeText: { color: '#9945FF', fontSize: 11, fontWeight: '600' as const },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  txLabel: { fontSize: 12 },
  txHashRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  txHashText: { fontSize: 12, fontWeight: '500' as const },
});
