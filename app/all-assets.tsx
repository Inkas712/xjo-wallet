import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { CryptoCompareAPI } from '@/services/crypto';

const TOP_COINS = ['BTC', 'ETH', 'SOL', 'USDT', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT'];

export default function AllAssetsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: cryptoPrices = [], isLoading } = useQuery({
    queryKey: ['allCryptoPrices'],
    queryFn: () => CryptoCompareAPI.getPrices(TOP_COINS),
    staleTime: 60000,
    refetchInterval: 60000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['allCryptoPrices'] });
    setRefreshing(false);
  }, [queryClient]);

  const formatCurrency = (value: number): string => {
    if (!balanceVisible) return '••••••';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'All Assets',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.totalCard}>
          <View style={styles.totalHeader}>
            <Text style={styles.totalLabel}>Total Portfolio Value</Text>
            <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
              {balanceVisible ? (
                <Eye size={20} color={Colors.light.white} />
              ) : (
                <EyeOff size={20} color={Colors.light.white} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.totalValue}>{formatCurrency(0)}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Market Prices</Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading prices...</Text>
          </View>
        ) : cryptoPrices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Failed to load prices</Text>
          </View>
        ) : (
          cryptoPrices.map((asset, index) => (
            <TouchableOpacity 
              key={`${asset.symbol}-${index}`} 
              style={[styles.assetCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} 
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/asset-details', params: { symbol: asset.symbol } })}
            >
              <Image
                source={{ uri: asset.imageUrl }}
                style={styles.assetLogo}
                contentFit="contain"
              />
              <View style={styles.assetInfo}>
                <Text style={[styles.assetName, { color: colors.text }]}>{asset.name}</Text>
                <Text style={styles.assetBalance}>{asset.symbol}</Text>
              </View>
              <View style={styles.assetValues}>
                <Text style={[styles.assetUsdValue, { color: colors.text }]}>{formatCurrency(asset.price)}</Text>
                <View style={[
                  styles.changeContainer,
                  asset.change24h >= 0 ? styles.changePositive : styles.changeNegative,
                ]}>
                  {asset.change24h >= 0 ? (
                    <TrendingUp size={12} color={Colors.light.success} />
                  ) : (
                    <TrendingDown size={12} color={Colors.light.error} />
                  )}
                  <Text style={[
                    styles.changeText,
                    asset.change24h >= 0 ? styles.changeTextPositive : styles.changeTextNegative,
                  ]}>
                    {Math.abs(asset.change24h).toFixed(2)}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  totalCard: {
    backgroundColor: Colors.light.primaryDark,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  totalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.light.white,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  assetLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.backgroundSecondary,
    marginRight: 12,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  assetBalance: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  assetValues: {
    alignItems: 'flex-end',
  },
  assetUsdValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  changePositive: {
    backgroundColor: 'rgba(184, 212, 168, 0.3)',
  },
  changeNegative: {
    backgroundColor: 'rgba(244, 166, 163, 0.3)',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  changeTextPositive: {
    color: Colors.light.success,
  },
  changeTextNegative: {
    color: Colors.light.error,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
