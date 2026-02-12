import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Building2,
  BarChart3,
  Gem,
  Bitcoin,
  ChevronRight,
  CheckCircle,
  Zap,
  Shield,
  FileText,
  Lock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useTokenization } from '@/contexts/TokenizationContext';
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from '@/mocks/tokenizedAssets';
import { AssetType, TokenizedAsset } from '@/types/tokenization';
import { shortenAddress } from '@/services/solana';

type CreateStep = 'type' | 'details' | 'params' | 'kyc' | 'deploying' | 'success';

const ASSET_TYPES: { key: AssetType; label: string; icon: React.ComponentType<{ size: number; color: string }>; desc: string }[] = [
  { key: 'real_estate', label: 'Real Estate', icon: Building2, desc: 'Tokenize property into fractional shares' },
  { key: 'stocks', label: 'Stocks / Securities', icon: BarChart3, desc: 'Tokenize company shares as security tokens' },
  { key: 'gold', label: 'Gold & Metals', icon: Gem, desc: 'Tokenize precious metals by weight' },
  { key: 'crypto', label: 'Crypto Assets', icon: Bitcoin, desc: 'Wrap existing crypto into app tokens' },
];

const DEFAULT_IMAGES: Record<AssetType, string> = {
  real_estate: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
  stocks: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
  gold: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800',
  crypto: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
};

export default function TokenizationCreateScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { tokenizeAsset } = useTokenization();

  const [step, setStep] = useState<CreateStep>('type');
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [ticker, setTicker] = useState('');
  const [metalType, setMetalType] = useState<'gold' | 'silver' | 'platinum'>('gold');
  const [vaultLocation, setVaultLocation] = useState('');
  const [underlyingAsset, setUnderlyingAsset] = useState<'BTC' | 'ETH' | 'SOL' | 'USDC'>('BTC');
  const [totalSupply, setTotalSupply] = useState('1000000');
  const [pricePerToken, setPricePerToken] = useState('1.00');
  const [minInvestment, setMinInvestment] = useState('10');
  const [lockupPeriod, setLockupPeriod] = useState('6 months');
  const [apy, setApy] = useState('');
  const [newAsset, setNewAsset] = useState<TokenizedAsset | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  const animateStep = useCallback(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim]);

  const handleDeploy = useCallback(async () => {
    if (!selectedType || !name.trim()) {
      Alert.alert('Missing Info', 'Please fill in all required fields.');
      return;
    }

    setStep('deploying');
    animateStep();

    const assetData: Omit<TokenizedAsset, 'id' | 'solanaAddress' | 'createdAt'> = {
      type: selectedType,
      name: name.trim(),
      description: description.trim() || `Tokenized ${ASSET_TYPE_LABELS[selectedType]} asset`,
      totalSupply: parseInt(totalSupply, 10) || 1000000,
      pricePerToken: parseFloat(pricePerToken) || 1,
      currency: 'USD',
      apy: apy ? parseFloat(apy) : undefined,
      images: [DEFAULT_IMAGES[selectedType]],
      fundedPercentage: 0,
      minInvestment: parseInt(minInvestment, 10) || 10,
      lockupPeriod: lockupPeriod || undefined,
      holdersCount: 0,
      verified: false,
      location: selectedType === 'real_estate' ? location : undefined,
      ticker: selectedType === 'stocks' ? ticker : undefined,
      exchange: selectedType === 'stocks' ? 'Tokenized' : undefined,
      metalType: selectedType === 'gold' ? metalType : undefined,
      gramsPerToken: selectedType === 'gold' ? 1 : undefined,
      vaultLocation: selectedType === 'gold' ? vaultLocation : undefined,
      underlyingAsset: selectedType === 'crypto' ? underlyingAsset : undefined,
      backingRatio: selectedType === 'crypto' ? 1 : undefined,
    };

    const result = await tokenizeAsset(assetData);
    if (result) {
      setNewAsset(result);
      setStep('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
    } else {
      Alert.alert('Error', 'Failed to tokenize asset. Please try again.');
      setStep('params');
    }
  }, [selectedType, name, description, totalSupply, pricePerToken, apy, minInvestment, lockupPeriod, location, ticker, metalType, vaultLocation, underlyingAsset, tokenizeAsset, animateStep, successScale]);

  const renderInput = (label: string, value: string, onChange: (t: string) => void, placeholder: string, keyboardType: 'default' | 'number-pad' | 'decimal-pad' = 'default') => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.textInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.borderLight }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: step === 'success' ? 'Asset Created' : 'Tokenize Asset', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.primary, headerTitleStyle: { color: colors.text } }} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View style={{ opacity: fadeAnim }}>
            {step === 'type' && (
              <View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Select Asset Type</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>Choose what kind of asset you want to tokenize</Text>

                {ASSET_TYPES.map((t) => {
                  const TypeIcon = t.icon;
                  const typeColor = ASSET_TYPE_COLORS[t.key];
                  const isSelected = selectedType === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.typeCard, { backgroundColor: colors.card, borderColor: isSelected ? typeColor : colors.borderLight }, isSelected && { borderWidth: 2 }]}
                      onPress={() => { setSelectedType(t.key); Haptics.selectionAsync(); }}
                    >
                      <View style={[styles.typeIconWrap, { backgroundColor: typeColor + '20' }]}>
                        <TypeIcon size={24} color={typeColor} />
                      </View>
                      <View style={styles.typeInfo}>
                        <Text style={[styles.typeLabel, { color: colors.text }]}>{t.label}</Text>
                        <Text style={[styles.typeDesc, { color: colors.textMuted }]}>{t.desc}</Text>
                      </View>
                      {isSelected && <CheckCircle size={20} color={typeColor} />}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: selectedType ? '#9945FF' : '#555' }]}
                  disabled={!selectedType}
                  onPress={() => { animateStep(); setStep('details'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {step === 'details' && selectedType && (
              <View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Asset Details</Text>

                {renderInput('Asset Name *', name, setName, 'e.g. Downtown Miami Apartment')}
                {renderInput('Description', description, setDescription, 'Describe your asset...')}

                {selectedType === 'real_estate' && renderInput('Location', location, setLocation, 'e.g. Miami, FL, USA')}
                {selectedType === 'stocks' && renderInput('Ticker Symbol', ticker, setTicker, 'e.g. AAPL')}
                {selectedType === 'gold' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Metal Type</Text>
                      <View style={styles.chipRow}>
                        {(['gold', 'silver', 'platinum'] as const).map((m) => (
                          <TouchableOpacity
                            key={m}
                            style={[styles.chip, { backgroundColor: metalType === m ? ASSET_TYPE_COLORS.gold : colors.card, borderColor: colors.borderLight }]}
                            onPress={() => setMetalType(m)}
                          >
                            <Text style={[styles.chipText, { color: metalType === m ? '#0A0A1A' : colors.text }]}>
                              {m.charAt(0).toUpperCase() + m.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    {renderInput('Vault Location', vaultLocation, setVaultLocation, 'e.g. Zurich, Switzerland')}
                  </>
                )}
                {selectedType === 'crypto' && (
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Underlying Asset</Text>
                    <View style={styles.chipRow}>
                      {(['BTC', 'ETH', 'SOL', 'USDC'] as const).map((c) => (
                        <TouchableOpacity
                          key={c}
                          style={[styles.chip, { backgroundColor: underlyingAsset === c ? '#9945FF' : colors.card, borderColor: colors.borderLight }]}
                          onPress={() => setUnderlyingAsset(c)}
                        >
                          <Text style={[styles.chipText, { color: underlyingAsset === c ? '#FFFFFF' : colors.text }]}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: name.trim() ? '#9945FF' : '#555' }]}
                  disabled={!name.trim()}
                  onPress={() => { animateStep(); setStep('params'); }}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {step === 'params' && (
              <View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Token Parameters</Text>

                {renderInput('Total Token Supply', totalSupply, setTotalSupply, '1000000', 'number-pad')}
                {renderInput('Price per Token (USD)', pricePerToken, setPricePerToken, '1.00', 'decimal-pad')}
                {renderInput('Minimum Investment (USD)', minInvestment, setMinInvestment, '10', 'number-pad')}
                {renderInput('Lock-up Period', lockupPeriod, setLockupPeriod, 'e.g. 6 months')}
                {renderInput('Expected APY (%)', apy, setApy, 'e.g. 8.5', 'decimal-pad')}

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#9945FF' }]}
                  onPress={() => { animateStep(); setStep('kyc'); }}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {step === 'kyc' && (
              <View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>KYC & Compliance</Text>

                <View style={[styles.kycCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                  <View style={[styles.kycIconWrap, { backgroundColor: '#14F19520' }]}>
                    <Shield size={32} color="#14F195" />
                  </View>
                  <Text style={[styles.kycTitle, { color: colors.text }]}>Verification Passed</Text>
                  <Text style={[styles.kycDesc, { color: colors.textSecondary }]}>
                    Identity verified • AML check passed • Compliant
                  </Text>

                  <View style={styles.kycBadges}>
                    {[
                      { label: 'KYC Verified', color: '#14F195' },
                      { label: 'AML Cleared', color: '#4ECDC4' },
                      { label: 'Compliant', color: '#9945FF' },
                    ].map((badge) => (
                      <View key={badge.label} style={[styles.kycBadge, { backgroundColor: badge.color + '20' }]}>
                        <CheckCircle size={12} color={badge.color} />
                        <Text style={[styles.kycBadgeText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={[styles.disclaimerBox, { backgroundColor: '#FF6B3520', borderColor: '#FF6B3540' }]}>
                  <FileText size={14} color="#FF6B35" />
                  <Text style={styles.disclaimerText}>
                    By proceeding, you agree to the terms of service and acknowledge that this is an MVP demo.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#14F195' }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleDeploy(); }}
                >
                  <Zap size={18} color="#0A0A1A" />
                  <Text style={[styles.primaryButtonText, { color: '#0A0A1A', marginLeft: 6 }]}>Deploy on Solana</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'deploying' && (
              <View style={styles.deployingContainer}>
                <ActivityIndicator size="large" color="#9945FF" />
                <Text style={[styles.deployingTitle, { color: colors.text }]}>Deploying Token...</Text>
                <Text style={[styles.deployingDesc, { color: colors.textSecondary }]}>
                  Creating SPL token on Solana network
                </Text>
                <View style={styles.deploySteps}>
                  {['Compiling token metadata', 'Submitting to Solana', 'Confirming transaction'].map((s, i) => (
                    <View key={i} style={styles.deployStepRow}>
                      <ActivityIndicator size="small" color="#9945FF" />
                      <Text style={[styles.deployStepText, { color: colors.textSecondary }]}>{s}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {step === 'success' && newAsset && (
              <Animated.View style={[styles.successContainer, { transform: [{ scale: successScale }] }]}>
                <LinearGradient
                  colors={['#14F19520', '#9945FF10', 'transparent']}
                  style={styles.successGlow}
                />
                <View style={[styles.successIcon, { backgroundColor: '#14F19520' }]}>
                  <CheckCircle size={48} color="#14F195" />
                </View>
                <Text style={[styles.successTitle, { color: colors.text }]}>Asset is Live!</Text>
                <Text style={[styles.successDesc, { color: colors.textSecondary }]}>
                  {newAsset.name} is now tokenized on Solana
                </Text>

                <View style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                  <View style={styles.successRow}>
                    <Text style={[styles.successLabel, { color: colors.textMuted }]}>Token Address</Text>
                    <Text style={[styles.successValue, { color: '#9945FF' }]}>{shortenAddress(newAsset.solanaAddress)}</Text>
                  </View>
                  <View style={styles.successRow}>
                    <Text style={[styles.successLabel, { color: colors.textMuted }]}>Total Supply</Text>
                    <Text style={[styles.successValue, { color: colors.text }]}>{newAsset.totalSupply.toLocaleString()}</Text>
                  </View>
                  <View style={styles.successRow}>
                    <Text style={[styles.successLabel, { color: colors.textMuted }]}>Price/Token</Text>
                    <Text style={[styles.successValue, { color: colors.text }]}>${newAsset.pricePerToken}</Text>
                  </View>
                  <View style={styles.successRow}>
                    <Text style={[styles.successLabel, { color: colors.textMuted }]}>Network</Text>
                    <Text style={[styles.successValue, { color: '#9945FF' }]}>Solana Devnet</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#9945FF', width: '100%' }]}
                  onPress={() => router.back()}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  stepTitle: { fontSize: 22, fontWeight: '700' as const, marginBottom: 4 },
  stepDesc: { fontSize: 13, marginBottom: 16 },
  typeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  typeIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  typeInfo: { flex: 1, marginLeft: 12 },
  typeLabel: { fontSize: 15, fontWeight: '600' as const },
  typeDesc: { fontSize: 12, marginTop: 2 },
  primaryButton: { flexDirection: 'row', borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' as const },
  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: '600' as const, marginBottom: 6 },
  textInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '600' as const },
  kycCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 16 },
  kycIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kycTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 4 },
  kycDesc: { fontSize: 12, textAlign: 'center' as const, marginBottom: 16 },
  kycBadges: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 8, justifyContent: 'center' },
  kycBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  kycBadgeText: { fontSize: 11, fontWeight: '600' as const },
  disclaimerBox: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 10, borderWidth: 1, padding: 12, gap: 8, marginBottom: 8 },
  disclaimerText: { flex: 1, color: '#FF6B35', fontSize: 11, lineHeight: 16 },
  deployingContainer: { alignItems: 'center', paddingTop: 60 },
  deployingTitle: { fontSize: 20, fontWeight: '700' as const, marginTop: 20 },
  deployingDesc: { fontSize: 13, marginTop: 6 },
  deploySteps: { marginTop: 24, gap: 12 },
  deployStepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deployStepText: { fontSize: 13 },
  successContainer: { alignItems: 'center', paddingTop: 20 },
  successGlow: { position: 'absolute' as const, top: -20, left: -40, right: -40, height: 200, borderRadius: 100 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 24, fontWeight: '800' as const, marginTop: 16 },
  successDesc: { fontSize: 14, textAlign: 'center' as const, marginTop: 6, marginBottom: 20 },
  successCard: { borderRadius: 14, borderWidth: 1, padding: 16, width: '100%', marginBottom: 20 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  successLabel: { fontSize: 12 },
  successValue: { fontSize: 13, fontWeight: '600' as const },
});
