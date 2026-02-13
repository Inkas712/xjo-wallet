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
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Shield,
  Zap,
  DollarSign,
  Copy,
  Building2,
  BarChart3,
  Gem,
  Bitcoin,
  MapPin,
  Percent,
  Lock,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useTokenization } from '@/contexts/TokenizationContext';
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS, generateMockPriceHistory } from '@/mocks/tokenizedAssets';
import { shortenAddress } from '@/services/solana';
import { AssetType } from '@/types/tokenization';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 160;

type TimeRange = '7d' | '30d' | 'all';

const TYPE_ICONS: Record<AssetType, React.ComponentType<{ size: number; color: string }>> = {
  real_estate: Building2,
  stocks: BarChart3,
  gold: Gem,
  crypto: Bitcoin,
};

export default function TokenizationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { getAssetById, getHoldingForAsset, transactions } = useTokenization();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const asset = id ? getAssetById(id) : undefined;
  const holding = id ? getHoldingForAsset(id) : undefined;
  const assetTxs = transactions.filter(t => t.assetId === id);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const priceHistory = asset ? generateMockPriceHistory(
    asset.pricePerToken,
    timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
  ) : [];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  if (!asset) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Asset Details' }} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Asset not found</Text>
      </View>
    );
  }

  const typeColor = ASSET_TYPE_COLORS[asset.type];
  const TypeIcon = TYPE_ICONS[asset.type];

  const renderChart = () => {
    if (priceHistory.length < 2) return null;
    const minVal = Math.min(...priceHistory.map(p => p.value));
    const maxVal = Math.max(...priceHistory.map(p => p.value));
    const range = maxVal - minVal || 1;

    const isPositive = priceHistory[priceHistory.length - 1].value >= priceHistory[0].value;
    const chartColor = isPositive ? '#14F195' : '#FF6B6B';

    return (
      <View style={styles.chartContainer}>
        <View style={[styles.chartArea, { height: CHART_HEIGHT }]}>
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <View key={i} style={[styles.gridLine, { top: pct * CHART_HEIGHT, backgroundColor: colors.borderLight }]} />
          ))}
          <View style={{ width: CHART_WIDTH, height: CHART_HEIGHT }}>
            {priceHistory.map((p, i) => {
              if (i === 0) return null;
              const x1 = ((i - 1) / (priceHistory.length - 1)) * CHART_WIDTH;
              const y1 = CHART_HEIGHT - ((priceHistory[i - 1].value - minVal) / range) * (CHART_HEIGHT - 20) - 10;
              const x2 = (i / (priceHistory.length - 1)) * CHART_WIDTH;
              const y2 = CHART_HEIGHT - ((p.value - minVal) / range) * (CHART_HEIGHT - 20) - 10;
              return (
                <View
                  key={i}
                  style={{
                    position: 'absolute' as const,
                    left: x1,
                    top: Math.min(y1, y2),
                    width: Math.max(x2 - x1, 1),
                    height: Math.max(Math.abs(y2 - y1), 2),
                    backgroundColor: chartColor,
                    opacity: 0.8,
                    borderRadius: 1,
                    transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }],
                  }}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.chartLabels}>
          <Text style={[styles.chartLabel, { color: colors.textMuted }]}>${minVal.toLocaleString()}</Text>
          <Text style={[styles.chartLabel, { color: colors.textMuted }]}>${maxVal.toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: '', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.primary }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Image source={{ uri: asset.images[0] }} style={styles.heroImage} contentFit="cover" />
          <LinearGradient colors={['transparent', colors.background]} style={styles.heroOverlay} />

          <View style={styles.content}>
            <View style={styles.titleRow}>
              <View style={styles.titleInfo}>
                <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                  <TypeIcon size={12} color={typeColor} />
                  <Text style={[styles.typeText, { color: typeColor }]}>{ASSET_TYPE_LABELS[asset.type]}</Text>
                </View>
                <Text style={[styles.assetName, { color: colors.text }]}>{asset.name}</Text>
              </View>
              {asset.verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: '#14F19520' }]}>
                  <Shield size={14} color="#14F195" />
                </View>
              )}
            </View>

            <View style={styles.priceRow}>
              <Text style={[styles.price, { color: colors.text }]}>
                ${asset.pricePerToken.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={[styles.priceLabel, { color: colors.textMuted }]}> / token</Text>
            </View>

            <View style={[styles.solanaRow, { backgroundColor: '#9945FF12' }]}>
              <Zap size={12} color="#9945FF" />
              <Text style={styles.solanaAddr}>{shortenAddress(asset.solanaAddress)}</Text>
              <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <Copy size={12} color="#9945FF" />
              </TouchableOpacity>
              <View style={styles.devnetDot} />
              <Text style={styles.devnetLabel}>Devnet</Text>
            </View>

            {renderChart()}

            <View style={styles.timeFilters}>
              {(['7d', '30d', 'all'] as TimeRange[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timeChip, { backgroundColor: timeRange === t ? typeColor : colors.card, borderColor: colors.borderLight }]}
                  onPress={() => { setTimeRange(t); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.timeChipText, { color: timeRange === t ? '#FFFFFF' : colors.textSecondary }]}>
                    {t === 'all' ? 'All Time' : t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.statsGrid}>
              {[
                { label: 'Total Supply', value: asset.totalSupply.toLocaleString(), icon: DollarSign },
                { label: 'Holders', value: asset.holdersCount.toLocaleString(), icon: Users },
                { label: 'Funded', value: `${asset.fundedPercentage}%`, icon: TrendingUp },
                { label: 'Min. Invest', value: `$${asset.minInvestment}`, icon: Lock },
              ].map((stat, i) => {
                const StatIcon = stat.icon;
                return (
                  <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                    <StatIcon size={16} color={typeColor} />
                    <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
                  </View>
                );
              })}
            </View>

            {asset.apy !== undefined && (
              <View style={[styles.apyCard, { backgroundColor: '#14F19510', borderColor: '#14F19530' }]}>
                <Percent size={16} color="#14F195" />
                <View style={styles.apyInfo}>
                  <Text style={[styles.apyLabel, { color: colors.textSecondary }]}>Expected APY</Text>
                  <Text style={styles.apyValue}>{asset.apy}%</Text>
                </View>
              </View>
            )}

            {asset.location && (
              <View style={[styles.infoRow, { borderColor: colors.borderLight }]}>
                <MapPin size={16} color={typeColor} />
                <Text style={[styles.infoText, { color: colors.text }]}>{asset.location}</Text>
              </View>
            )}

            {asset.vaultLocation && (
              <View style={[styles.infoRow, { borderColor: colors.borderLight }]}>
                <Lock size={16} color={typeColor} />
                <Text style={[styles.infoText, { color: colors.text }]}>Stored in {asset.vaultLocation}</Text>
              </View>
            )}

            {asset.underlyingAsset && (
              <View style={[styles.infoRow, { borderColor: colors.borderLight }]}>
                <Bitcoin size={16} color={typeColor} />
                <Text style={[styles.infoText, { color: colors.text }]}>Backed 1:{asset.backingRatio} by {asset.underlyingAsset}</Text>
              </View>
            )}

            {holding && (
              <View style={[styles.holdingCard, { backgroundColor: colors.card, borderColor: typeColor + '40' }]}>
                <Text style={[styles.holdingTitle, { color: colors.text }]}>Your Position</Text>
                <View style={styles.holdingRow}>
                  <Text style={[styles.holdingLabel, { color: colors.textSecondary }]}>Tokens Owned</Text>
                  <Text style={[styles.holdingValue, { color: colors.text }]}>{holding.tokensOwned.toLocaleString()}</Text>
                </View>
                <View style={styles.holdingRow}>
                  <Text style={[styles.holdingLabel, { color: colors.textSecondary }]}>Current Value</Text>
                  <Text style={[styles.holdingValue, { color: colors.text }]}>${holding.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.holdingRow}>
                  <Text style={[styles.holdingLabel, { color: colors.textSecondary }]}>P&L</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {holding.pnl >= 0 ? <TrendingUp size={14} color="#14F195" /> : <TrendingDown size={14} color="#FF6B6B" />}
                    <Text style={{ color: holding.pnl >= 0 ? '#14F195' : '#FF6B6B', fontWeight: '700' as const, fontSize: 14 }}>
                      {holding.pnl >= 0 ? '+' : ''}${holding.pnl.toFixed(2)} ({holding.pnlPercentage.toFixed(1)}%)
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <Text style={[styles.descTitle, { color: colors.text }]}>About</Text>
            <Text style={[styles.descText, { color: colors.textSecondary }]}>{asset.description}</Text>

            {assetTxs.length > 0 && (
              <>
                <Text style={[styles.descTitle, { color: colors.text, marginTop: 20 }]}>Transaction History</Text>
                {assetTxs.map((tx) => (
                  <View key={tx.id} style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                    <View style={[styles.txDot, { backgroundColor: tx.type === 'buy' ? '#14F195' : tx.type === 'sell' ? '#FF6B6B' : '#FFD700' }]} />
                    <View style={styles.txInfo}>
                      <Text style={[styles.txTitle, { color: colors.text }]}>
                        {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                      </Text>
                      <Text style={[styles.txDate, { color: colors.textMuted }]}>{new Date(tx.timestamp).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.txRight}>
                      {tx.tokens > 0 && <Text style={[styles.txTokens, { color: colors.textSecondary }]}>{tx.tokens} tokens</Text>}
                      <Text style={[styles.txAmount, { color: colors.text }]}>${tx.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            <View style={{ height: 100 }} />
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.backgroundSecondary, borderTopColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[styles.buyBtn, { backgroundColor: '#14F195' }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/tokenization-buy?id=${asset.id}`); }}
        >
          <Text style={[styles.buyBtnText, { color: '#0A0A1A' }]}>Buy Tokens</Text>
        </TouchableOpacity>
        {holding && holding.tokensOwned > 0 && (
          <TouchableOpacity
            style={[styles.sellBtn, { borderColor: '#FF6B6B' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/tokenization-buy?id=${asset.id}`);
            }}
          >
            <Text style={[styles.sellBtnText, { color: '#FF6B6B' }]}>Sell</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorText: { fontSize: 14, textAlign: 'center' as const, marginTop: 40 },
  heroImage: { width: '100%', height: 220 },
  heroOverlay: { position: 'absolute' as const, top: 140, left: 0, right: 0, height: 80 },
  content: { paddingHorizontal: 16, marginTop: -20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleInfo: { flex: 1 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, gap: 4, alignSelf: 'flex-start', marginBottom: 6 },
  typeText: { fontSize: 11, fontWeight: '600' as const },
  assetName: { fontSize: 22, fontWeight: '800' as const },
  verifiedBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  price: { fontSize: 28, fontWeight: '800' as const },
  priceLabel: { fontSize: 14 },
  solanaRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 6, alignSelf: 'flex-start', marginTop: 10 },
  solanaAddr: { color: '#9945FF', fontSize: 12, fontWeight: '500' as const },
  devnetDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#14F195', marginLeft: 4 },
  devnetLabel: { color: '#14F195', fontSize: 10, fontWeight: '500' as const },
  chartContainer: { marginTop: 20, paddingHorizontal: 8 },
  chartArea: { overflow: 'hidden' as const },
  gridLine: { position: 'absolute' as const, left: 0, right: 0, height: 1, opacity: 0.5 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartLabel: { fontSize: 10 },
  timeFilters: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 16 },
  timeChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  timeChipText: { fontSize: 12, fontWeight: '600' as const },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 8, marginBottom: 16 },
  statCard: { width: (width - 48) / 2 - 4, borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  statValue: { fontSize: 16, fontWeight: '700' as const },
  statLabel: { fontSize: 11 },
  apyCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, gap: 10, marginBottom: 12 },
  apyInfo: { flex: 1 },
  apyLabel: { fontSize: 11 },
  apyValue: { color: '#14F195', fontSize: 20, fontWeight: '800' as const },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1 },
  infoText: { fontSize: 13 },
  holdingCard: { borderRadius: 14, borderWidth: 1.5, padding: 16, marginTop: 16, marginBottom: 16 },
  holdingTitle: { fontSize: 15, fontWeight: '700' as const, marginBottom: 10 },
  holdingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  holdingLabel: { fontSize: 13 },
  holdingValue: { fontSize: 14, fontWeight: '600' as const },
  descTitle: { fontSize: 16, fontWeight: '700' as const, marginBottom: 6, marginTop: 8 },
  descText: { fontSize: 13, lineHeight: 20 },
  txCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 6 },
  txDot: { width: 8, height: 8, borderRadius: 4 },
  txInfo: { flex: 1, marginLeft: 10 },
  txTitle: { fontSize: 13, fontWeight: '600' as const },
  txDate: { fontSize: 11, marginTop: 1 },
  txRight: { alignItems: 'flex-end' },
  txTokens: { fontSize: 11 },
  txAmount: { fontSize: 13, fontWeight: '700' as const },
  bottomBar: { flexDirection: 'row', borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  buyBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buyBtnText: { fontSize: 15, fontWeight: '700' as const },
  sellBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 14, alignItems: 'center' },
  sellBtnText: { fontSize: 15, fontWeight: '700' as const },
});
