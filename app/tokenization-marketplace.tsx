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
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Search,
  Building2,
  BarChart3,
  Gem,
  Bitcoin,
  Users,
  TrendingUp,
  Shield,
  ChevronRight,
  Filter,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useTokenization } from '@/contexts/TokenizationContext';
import { ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from '@/mocks/tokenizedAssets';
import { AssetType, TokenizedAsset } from '@/types/tokenization';

const { width } = Dimensions.get('window');

type FilterType = 'all' | AssetType;

const FILTERS: { key: FilterType; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'all', label: 'All', icon: Filter },
  { key: 'real_estate', label: 'Real Estate', icon: Building2 },
  { key: 'stocks', label: 'Stocks', icon: BarChart3 },
  { key: 'gold', label: 'Gold', icon: Gem },
  { key: 'crypto', label: 'Crypto', icon: Bitcoin },
];

export default function TokenizationMarketplaceScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { allAssets } = useTokenization();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const filteredAssets = activeFilter === 'all'
    ? allAssets
    : allAssets.filter(a => a.type === activeFilter);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const renderAssetCard = useCallback((asset: TokenizedAsset, index: number) => {
    const typeColor = ASSET_TYPE_COLORS[asset.type];
    const fundedWidth = Math.min(asset.fundedPercentage, 100);

    return (
      <TouchableOpacity
        key={asset.id}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/tokenization-detail?id=${asset.id}`);
        }}
        activeOpacity={0.7}
      >
        <Image source={{ uri: asset.images[0] }} style={styles.cardImage} contentFit="cover" />
        <View style={styles.cardOverlay}>
          <View style={[styles.cardTypeBadge, { backgroundColor: typeColor }]}>
            <Text style={styles.cardTypeText}>{ASSET_TYPE_LABELS[asset.type]}</Text>
          </View>
          {asset.verified && (
            <View style={styles.verifiedBadge}>
              <Shield size={10} color="#14F195" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{asset.name}</Text>
          {asset.location && (
            <Text style={[styles.cardLocation, { color: colors.textMuted }]} numberOfLines={1}>{asset.location}</Text>
          )}
          {asset.ticker && (
            <Text style={[styles.cardLocation, { color: colors.textMuted }]}>{asset.ticker} · {asset.exchange}</Text>
          )}

          <View style={styles.cardMetrics}>
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Price/Token</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>${asset.pricePerToken.toLocaleString()}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Min. Invest</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>${asset.minInvestment}</Text>
            </View>
            {asset.apy !== undefined && (
              <View style={styles.metric}>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>APY</Text>
                <Text style={[styles.metricValue, { color: '#14F195' }]}>{asset.apy}%</Text>
              </View>
            )}
          </View>

          <View style={styles.fundedSection}>
            <View style={styles.fundedHeader}>
              <Text style={[styles.fundedLabel, { color: colors.textSecondary }]}>Funded</Text>
              <Text style={[styles.fundedPercent, { color: colors.text }]}>{asset.fundedPercentage}%</Text>
            </View>
            <View style={[styles.fundedBar, { backgroundColor: colors.borderLight }]}>
              <View style={[styles.fundedFill, { width: `${fundedWidth}%`, backgroundColor: typeColor }]} />
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.holdersInfo}>
              <Users size={12} color={colors.textMuted} />
              <Text style={[styles.holdersText, { color: colors.textMuted }]}>{asset.holdersCount.toLocaleString()} holders</Text>
            </View>
            <TouchableOpacity
              style={[styles.investButton, { backgroundColor: typeColor }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(`/tokenization-buy?id=${asset.id}`);
              }}
            >
              <Text style={styles.investButtonText}>Invest</Text>
              <ChevronRight size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [colors, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Marketplace', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.primary, headerTitleStyle: { color: colors.text } }} />

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            const FilterIcon = f.icon;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: isActive ? '#9945FF' : colors.card, borderColor: isActive ? '#9945FF' : colors.borderLight },
                ]}
                onPress={() => { Haptics.selectionAsync(); setActiveFilter(f.key); }}
              >
                <FilterIcon size={14} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.filterText, { color: isActive ? '#FFFFFF' : colors.textSecondary }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {filteredAssets.map((asset, index) => renderAssetCard(asset, index))}
          {filteredAssets.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No assets found for this category</Text>
            </View>
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { paddingVertical: 12 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  filterText: { fontSize: 13, fontWeight: '600' as const },
  listContent: { paddingHorizontal: 16 },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden' as const },
  cardImage: { width: '100%', height: 160 },
  cardOverlay: { position: 'absolute' as const, top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  cardTypeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  cardTypeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' as const },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  verifiedText: { color: '#14F195', fontSize: 10, fontWeight: '600' as const },
  cardBody: { padding: 14 },
  cardName: { fontSize: 16, fontWeight: '700' as const, marginBottom: 2 },
  cardLocation: { fontSize: 12, marginBottom: 10 },
  cardMetrics: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metric: {},
  metricLabel: { fontSize: 10, marginBottom: 2 },
  metricValue: { fontSize: 14, fontWeight: '700' as const },
  fundedSection: { marginBottom: 12 },
  fundedHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  fundedLabel: { fontSize: 11 },
  fundedPercent: { fontSize: 11, fontWeight: '700' as const },
  fundedBar: { height: 6, borderRadius: 3, overflow: 'hidden' as const },
  fundedFill: { height: '100%', borderRadius: 3 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  holdersInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  holdersText: { fontSize: 11 },
  investButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  investButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' as const },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
});
