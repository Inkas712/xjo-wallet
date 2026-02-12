import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  Wallet,
  Clock,
  DollarSign,
  Gift,
  ChevronRight,
  Building2,
  BarChart3,
  Gem,
  Bitcoin,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useTokenization } from '@/contexts/TokenizationContext';
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from '@/mocks/tokenizedAssets';
import { AssetType } from '@/types/tokenization';

const { width } = Dimensions.get('window');
const PIE_SIZE = 140;

const TYPE_ICONS: Record<AssetType, React.ComponentType<{ size: number; color: string }>> = {
  real_estate: Building2,
  stocks: BarChart3,
  gold: Gem,
  crypto: Bitcoin,
};

export default function TokenizationPortfolioScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { allAssets, holdings, portfolioSummary, transactions, claimIncome } = useTokenization();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleClaimIncome = useCallback(() => {
    if (portfolioSummary.pendingIncome <= 0) {
      Alert.alert('No Income', 'No pending income to claim at this time.');
      return;
    }
    const success = claimIncome();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Income Claimed', `$${portfolioSummary.pendingIncome.toFixed(2)} has been added to your balance.`);
    }
  }, [portfolioSummary.pendingIncome, claimIncome]);

  const allocationEntries = Object.entries(portfolioSummary.allocationByType)
    .filter(([_, value]) => value > 0)
    .sort(([, a], [, b]) => b - a);

  const totalAllocation = allocationEntries.reduce((sum, [_, v]) => sum + v, 0);

  const ownedAssets = holdings.map(h => {
    const asset = allAssets.find(a => a.id === h.assetId);
    return asset ? { ...asset, holding: h } : null;
  }).filter(Boolean);

  const recentTxs = transactions.slice(0, 10);

  const renderPieChart = () => {
    if (allocationEntries.length === 0) return null;

    let startAngle = 0;
    const segments = allocationEntries.map(([type, value]) => {
      const angle = totalAllocation > 0 ? (value / totalAllocation) * 360 : 0;
      const segment = { type, value, startAngle, angle, color: ASSET_TYPE_COLORS[type] };
      startAngle += angle;
      return segment;
    });

    return (
      <View style={styles.pieContainer}>
        <View style={[styles.pieChart, { width: PIE_SIZE, height: PIE_SIZE }]}>
          {segments.map((seg, i) => {
            const rotation = seg.startAngle;
            const percentage = totalAllocation > 0 ? (seg.value / totalAllocation) * 100 : 0;
            return (
              <View
                key={i}
                style={[
                  styles.pieSegment,
                  {
                    width: PIE_SIZE,
                    height: PIE_SIZE,
                    borderRadius: PIE_SIZE / 2,
                    borderWidth: 16,
                    borderColor: 'transparent',
                    borderTopColor: seg.color,
                    borderRightColor: percentage > 25 ? seg.color : 'transparent',
                    borderBottomColor: percentage > 50 ? seg.color : 'transparent',
                    borderLeftColor: percentage > 75 ? seg.color : 'transparent',
                    transform: [{ rotate: `${rotation}deg` }],
                  },
                ]}
              />
            );
          })}
          <View style={[styles.pieCenter, { backgroundColor: colors.background }]}>
            <Text style={[styles.pieCenterValue, { color: colors.text }]}>
              ${portfolioSummary.totalValue.toFixed(0)}
            </Text>
            <Text style={[styles.pieCenterLabel, { color: colors.textMuted }]}>Total</Text>
          </View>
        </View>

        <View style={styles.pieLegend}>
          {allocationEntries.map(([type, value]) => {
            const pct = totalAllocation > 0 ? ((value / totalAllocation) * 100).toFixed(1) : '0';
            return (
              <View key={type} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: ASSET_TYPE_COLORS[type] }]} />
                <Text style={[styles.legendText, { color: colors.textSecondary }]}>{ASSET_TYPE_LABELS[type]}</Text>
                <Text style={[styles.legendPct, { color: colors.text }]}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Portfolio', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.primary, headerTitleStyle: { color: colors.text } }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#1a0533', '#0f1b3d', '#0a1628']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.valueCard}
          >
            <Text style={styles.valueLabel}>Total Portfolio Value</Text>
            <Text style={styles.valueAmount}>
              ${portfolioSummary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <View style={styles.pnlRow}>
              {portfolioSummary.totalPnl >= 0 ? (
                <TrendingUp size={14} color="#14F195" />
              ) : (
                <TrendingDown size={14} color="#FF6B6B" />
              )}
              <Text style={[styles.pnlText, { color: portfolioSummary.totalPnl >= 0 ? '#14F195' : '#FF6B6B' }]}>
                {portfolioSummary.totalPnl >= 0 ? '+' : ''}
                ${portfolioSummary.totalPnl.toFixed(2)} ({portfolioSummary.totalPnlPercentage.toFixed(1)}%)
              </Text>
            </View>
          </LinearGradient>

          {renderPieChart()}

          <View style={[styles.incomeCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
            <View style={styles.incomeInfo}>
              <View style={[styles.incomeIcon, { backgroundColor: '#FFD70020' }]}>
                <Gift size={20} color="#FFD700" />
              </View>
              <View>
                <Text style={[styles.incomeLabel, { color: colors.textSecondary }]}>Pending Income</Text>
                <Text style={[styles.incomeAmount, { color: colors.text }]}>
                  ${portfolioSummary.pendingIncome.toFixed(2)}
                </Text>
                <Text style={[styles.incomeNote, { color: colors.textMuted }]}>Dividends & Rental Income (monthly)</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.claimBtn, { backgroundColor: portfolioSummary.pendingIncome > 0 ? '#FFD700' : '#555' }]}
              onPress={handleClaimIncome}
              disabled={portfolioSummary.pendingIncome <= 0}
            >
              <Text style={[styles.claimBtnText, { color: '#0A0A1A' }]}>Claim</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Holdings</Text>

          {ownedAssets.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No holdings yet</Text>
            </View>
          ) : (
            ownedAssets.map((item) => {
              if (!item) return null;
              const TypeIcon = TYPE_ICONS[item.type];
              const typeColor = ASSET_TYPE_COLORS[item.type];
              const h = item.holding;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.holdingCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/tokenization-detail?id=${item.id}`); }}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: item.images[0] }} style={styles.holdingImage} contentFit="cover" />
                  <View style={styles.holdingInfo}>
                    <Text style={[styles.holdingName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.holdingMeta}>
                      <View style={[styles.smallBadge, { backgroundColor: typeColor + '20' }]}>
                        <TypeIcon size={9} color={typeColor} />
                        <Text style={[styles.smallBadgeText, { color: typeColor }]}>{ASSET_TYPE_LABELS[item.type]}</Text>
                      </View>
                      <Text style={[styles.holdingTokens, { color: colors.textMuted }]}>{h.tokensOwned.toLocaleString()} tokens</Text>
                    </View>
                  </View>
                  <View style={styles.holdingRight}>
                    <Text style={[styles.holdingValue, { color: colors.text }]}>${h.currentValue.toFixed(2)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      {h.pnl >= 0 ? <TrendingUp size={10} color="#14F195" /> : <TrendingDown size={10} color="#FF6B6B" />}
                      <Text style={{ color: h.pnl >= 0 ? '#14F195' : '#FF6B6B', fontSize: 11, fontWeight: '600' as const }}>
                        {h.pnlPercentage >= 0 ? '+' : ''}{h.pnlPercentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>Recent Transactions</Text>

          {recentTxs.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted, paddingVertical: 16 }]}>No transactions yet</Text>
          ) : (
            recentTxs.map((tx) => (
              <View key={tx.id} style={[styles.txRow, { borderBottomColor: colors.borderLight }]}>
                <View style={[styles.txDot, { backgroundColor: tx.type === 'buy' ? '#14F195' : tx.type === 'sell' ? '#FF6B6B' : '#FFD700' }]} />
                <View style={styles.txInfo}>
                  <Text style={[styles.txTitle, { color: colors.text }]}>
                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} — {tx.assetName}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.textMuted }]}>{new Date(tx.timestamp).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'sell' || tx.type === 'income' ? '#14F195' : colors.text }]}>
                  {tx.type === 'sell' || tx.type === 'income' ? '+' : '-'}${tx.totalAmount.toFixed(2)}
                </Text>
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  valueCard: { borderRadius: 18, padding: 20, marginBottom: 16 },
  valueLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 },
  valueAmount: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.5 },
  pnlRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  pnlText: { fontSize: 13, fontWeight: '600' as const },
  pieContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 20 },
  pieChart: { position: 'relative' as const, alignItems: 'center', justifyContent: 'center' },
  pieSegment: { position: 'absolute' as const },
  pieCenter: { width: PIE_SIZE - 32, height: PIE_SIZE - 32, borderRadius: (PIE_SIZE - 32) / 2, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  pieCenterValue: { fontSize: 16, fontWeight: '800' as const },
  pieCenterLabel: { fontSize: 10 },
  pieLegend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, fontSize: 12 },
  legendPct: { fontSize: 13, fontWeight: '700' as const },
  incomeCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20 },
  incomeInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  incomeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  incomeLabel: { fontSize: 11 },
  incomeAmount: { fontSize: 18, fontWeight: '700' as const },
  incomeNote: { fontSize: 10, marginTop: 1 },
  claimBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  claimBtnText: { fontSize: 13, fontWeight: '700' as const },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 10 },
  emptyCard: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 13 },
  holdingCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 8 },
  holdingImage: { width: 44, height: 44, borderRadius: 8 },
  holdingInfo: { flex: 1, marginLeft: 10 },
  holdingName: { fontSize: 13, fontWeight: '600' as const, marginBottom: 2 },
  holdingMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, gap: 2 },
  smallBadgeText: { fontSize: 9, fontWeight: '600' as const },
  holdingTokens: { fontSize: 10 },
  holdingRight: { alignItems: 'flex-end' },
  holdingValue: { fontSize: 14, fontWeight: '700' as const },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  txDot: { width: 8, height: 8, borderRadius: 4 },
  txInfo: { flex: 1, marginLeft: 10 },
  txTitle: { fontSize: 13, fontWeight: '500' as const },
  txDate: { fontSize: 11, marginTop: 1 },
  txAmount: { fontSize: 13, fontWeight: '700' as const },
});
