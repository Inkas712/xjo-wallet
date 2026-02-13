import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Building2,
  BarChart3,
  Gem,
  Bitcoin,
  Plus,
  ShoppingCart,
  PieChart,
  Zap,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useTokenization } from '@/contexts/TokenizationContext';
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from '@/mocks/tokenizedAssets';
import { AssetType } from '@/types/tokenization';

const TYPE_ICONS: Record<AssetType, React.ComponentType<{ size: number; color: string }>> = {
  real_estate: Building2,
  stocks: BarChart3,
  gold: Gem,
  crypto: Bitcoin,
};

export default function TokenizationTabScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { allAssets, holdings, portfolioSummary, transactions } = useTokenization();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleExit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/home');
  }, [router]);

  const ownedAssets = holdings.map(h => {
    const asset = allAssets.find(a => a.id === h.assetId);
    return asset ? { ...asset, holding: h } : null;
  }).filter(Boolean);

  const recentTxs = transactions.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <LinearGradient
          colors={['#1a0533', '#0f1b3d', '#0a1628']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.headerLabel}>Portfolio Value</Text>
                  <Text style={styles.headerValue}>
                    ${portfolioSummary.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.exitButton}
                  onPress={handleExit}
                  activeOpacity={0.7}
                  testID="tokenization-exit-button"
                >
                  <X size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.badgeRow}>
                <View style={styles.pnlBadge}>
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

                <View style={styles.solanaBadge}>
                  <Zap size={12} color="#9945FF" />
                  <Text style={styles.solanaText}>Powered by Solana</Text>
                  <View style={styles.devnetDot} />
                  <Text style={styles.devnetText}>Devnet</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/tokenization-marketplace'); }}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconWrap, { backgroundColor: '#9945FF20' }]}>
                <ShoppingCart size={22} color="#9945FF" />
              </View>
              <Text style={[styles.navLabel, { color: colors.text }]}>Marketplace</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/tokenization-create'); }}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconWrap, { backgroundColor: '#14F19520' }]}>
                <Plus size={22} color="#14F195" />
              </View>
              <Text style={[styles.navLabel, { color: colors.text }]}>Tokenize New</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/tokenization-portfolio'); }}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconWrap, { backgroundColor: '#FF6B3520' }]}>
                <PieChart size={22} color="#FF6B35" />
              </View>
              <Text style={[styles.navLabel, { color: colors.text }]}>Portfolio</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My Assets</Text>
            {holdings.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/tokenization-portfolio')}>
                <Text style={[styles.seeAll, { color: '#9945FF' }]}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {ownedAssets.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No tokenized assets yet. Browse the marketplace to start investing.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/tokenization-marketplace')}
              >
                <Text style={styles.emptyButtonText}>Explore Marketplace</Text>
              </TouchableOpacity>
            </View>
          ) : (
            ownedAssets.map((item) => {
              if (!item) return null;
              const TypeIcon = TYPE_ICONS[item.type];
              const typeColor = ASSET_TYPE_COLORS[item.type];
              const holding = item.holding;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.assetCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/tokenization-detail?id=${item.id}`); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.assetRow}>
                    <Image source={{ uri: item.images[0] }} style={styles.assetImage} contentFit="cover" />
                    <View style={styles.assetInfo}>
                      <View style={styles.assetNameRow}>
                        <Text style={[styles.assetName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                          <TypeIcon size={10} color={typeColor} />
                          <Text style={[styles.typeText, { color: typeColor }]}>{ASSET_TYPE_LABELS[item.type]}</Text>
                        </View>
                      </View>
                      <View style={styles.assetStats}>
                        <Text style={[styles.tokensOwned, { color: colors.textSecondary }]}>
                          {holding.tokensOwned.toLocaleString()} tokens
                        </Text>
                        <Text style={[styles.assetValue, { color: colors.text }]}>
                          ${holding.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <View style={styles.pnlRow}>
                        {holding.pnl >= 0 ? (
                          <TrendingUp size={12} color="#14F195" />
                        ) : (
                          <TrendingDown size={12} color="#FF6B6B" />
                        )}
                        <Text style={{ color: holding.pnl >= 0 ? '#14F195' : '#FF6B6B', fontSize: 12, marginLeft: 4 }}>
                          {holding.pnl >= 0 ? '+' : ''}{holding.pnlPercentage.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
          </View>

          {recentTxs.length === 0 ? (
            <Text style={[styles.noActivity, { color: colors.textSecondary }]}>No recent activity</Text>
          ) : (
            recentTxs.map((tx) => (
              <View key={tx.id} style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
                <View style={[styles.txIcon, { backgroundColor: tx.type === 'buy' ? '#14F19520' : tx.type === 'sell' ? '#FF6B6B20' : '#FFD70020' }]}>
                  {tx.type === 'buy' ? <TrendingUp size={16} color="#14F195" /> : tx.type === 'sell' ? <TrendingDown size={16} color="#FF6B6B" /> : <Gem size={16} color="#FFD700" />}
                </View>
                <View style={styles.txInfo}>
                  <Text style={[styles.txTitle, { color: colors.text }]}>
                    {tx.type === 'buy' ? 'Bought' : tx.type === 'sell' ? 'Sold' : tx.type === 'income' ? 'Income' : 'Minted'} {tx.assetName}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.textMuted }]}>
                    {new Date(tx.timestamp).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'sell' || tx.type === 'income' ? '#14F195' : colors.text }]}>
                  {tx.type === 'sell' || tx.type === 'income' ? '+' : '-'}${tx.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
  headerGradient: { paddingBottom: 24 },
  headerContent: { paddingHorizontal: 20, paddingTop: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  headerValue: { fontSize: 32, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: -0.5 },
  exitButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10, flexWrap: 'wrap' },
  pnlBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  pnlText: { fontSize: 13, fontWeight: '600' as const, marginLeft: 4 },
  solanaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(153,69,255,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  solanaText: { fontSize: 11, color: '#9945FF', marginLeft: 4, fontWeight: '600' as const },
  devnetDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#14F195', marginLeft: 8 },
  devnetText: { fontSize: 10, color: '#14F195', marginLeft: 4, fontWeight: '500' as const },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  navRow: { flexDirection: 'row', gap: 10 },
  navCard: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  navIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 12, fontWeight: '600' as const },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const },
  seeAll: { fontSize: 13, fontWeight: '600' as const },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, textAlign: 'center' as const, marginBottom: 16, lineHeight: 20 },
  emptyButton: { backgroundColor: '#9945FF', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  emptyButtonText: { color: '#FFFFFF', fontWeight: '600' as const, fontSize: 14 },
  assetCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  assetRow: { flexDirection: 'row', alignItems: 'center' },
  assetImage: { width: 52, height: 52, borderRadius: 10 },
  assetInfo: { flex: 1, marginLeft: 12 },
  assetNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  assetName: { fontSize: 14, fontWeight: '600' as const, flexShrink: 1 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, gap: 3 },
  typeText: { fontSize: 9, fontWeight: '600' as const },
  assetStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tokensOwned: { fontSize: 12 },
  assetValue: { fontSize: 14, fontWeight: '700' as const },
  pnlRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  txCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, marginLeft: 10 },
  txTitle: { fontSize: 13, fontWeight: '600' as const },
  txDate: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700' as const },
  noActivity: { fontSize: 13, textAlign: 'center' as const, paddingVertical: 20 },
});
