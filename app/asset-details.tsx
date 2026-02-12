import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Download,
  BarChart3,
  Clock,
  DollarSign,
  Activity,
  LineChart,
  CandlestickChart,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { CryptoCompareAPI } from '@/services/crypto';

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 180;
const CHART_WIDTH = width - 64;

type TimeFilter = '1D' | '1W' | '1M' | '1Y';
type ChartType = 'line' | 'candle';

export default function AssetDetailsScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>('1W');
  const [refreshing, setRefreshing] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('line');

  const { data: coinData, isLoading: coinLoading } = useQuery({
    queryKey: ['coinPrice', symbol],
    queryFn: () => CryptoCompareAPI.getCoinPrice(symbol || 'BTC'),
    staleTime: 60000,
    refetchInterval: 60000,
    enabled: !!symbol,
  });

  const { data: chartData = [], isLoading: chartLoading } = useQuery({
    queryKey: ['assetChartData', symbol, selectedTimeFilter],
    queryFn: async () => {
      const coin = symbol || 'BTC';
      switch (selectedTimeFilter) {
        case '1D':
          return CryptoCompareAPI.getHistoricalHourly(coin, 'USD', 24);
        case '1W':
          return CryptoCompareAPI.getHistoricalHourly(coin, 'USD', 168);
        case '1M':
          return CryptoCompareAPI.getHistoricalDaily(coin, 'USD', 30);
        case '1Y':
          return CryptoCompareAPI.getHistoricalDaily(coin, 'USD', 365);
        default:
          return CryptoCompareAPI.getHistoricalHourly(coin, 'USD', 168);
      }
    },
    staleTime: 60000,
    enabled: !!symbol,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['coinPrice', symbol] });
    await queryClient.invalidateQueries({ queryKey: ['assetChartData', symbol] });
    setRefreshing(false);
  }, [queryClient, symbol]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 1 ? 6 : 2,
    }).format(value);
  };

  const formatLargeNumber = (value: number): string => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return formatCurrency(value);
  };

  const renderChart = () => {
    if (chartLoading || chartData.length === 0) {
      return (
        <View style={styles.chartSection}>
          {renderChartTypeToggle()}
          <View style={styles.chartContainer}>
            <View style={styles.chartLoadingContainer}>
              <ActivityIndicator size="small" color={Colors.light.primary} />
            </View>
          </View>
          {renderTimeFilters()}
        </View>
      );
    }

    const chartValues = chartData.map(d => d.close);
    const highValues = chartData.map(d => d.high);
    const lowValues = chartData.map(d => d.low);
    const maxValue = chartType === 'candle' ? Math.max(...highValues) : Math.max(...chartValues);
    const minValue = chartType === 'candle' ? Math.min(...lowValues) : Math.min(...chartValues);
    const range = maxValue - minValue || 1;
    const lastValue = chartValues[chartValues.length - 1];
    const firstValue = chartValues[0];
    const isPositive = lastValue >= firstValue;
    const priceChange = lastValue - firstValue;
    const percentChange = ((priceChange / firstValue) * 100);

    const PADDING_TOP = 20;
    const PADDING_BOTTOM = 20;
    const USABLE_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    const points = chartData.map((point, index) => {
      const x = (index / (chartData.length - 1)) * CHART_WIDTH;
      const y = PADDING_TOP + (1 - (point.close - minValue) / range) * USABLE_HEIGHT;
      return { x, y, value: point.close };
    });

    const renderLineChart = () => (
      <>
        <LinearGradient
          colors={isPositive 
            ? ['rgba(157, 193, 131, 0.3)', 'rgba(157, 193, 131, 0.05)', 'rgba(157, 193, 131, 0)']
            : ['rgba(244, 166, 163, 0.3)', 'rgba(244, 166, 163, 0.05)', 'rgba(244, 166, 163, 0)']
          }
          style={[
            styles.chartGradient,
            {
              top: points.reduce((min, p) => Math.min(min, p.y), CHART_HEIGHT),
              height: CHART_HEIGHT - points.reduce((min, p) => Math.min(min, p.y), CHART_HEIGHT) + PADDING_BOTTOM,
            }
          ]}
        />
        
        {points.map((point, index) => {
          if (index === 0) return null;
          const prevPoint = points[index - 1];
          const lineLength = Math.sqrt(Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2));
          const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);
          
          return (
            <View
              key={index}
              style={[
                styles.chartLine,
                {
                  left: prevPoint.x,
                  top: prevPoint.y,
                  width: lineLength,
                  backgroundColor: isPositive ? Colors.light.primary : '#F4A6A3',
                  transform: [{ rotate: `${angle}rad` }],
                  transformOrigin: 'left center',
                },
              ]}
            />
          );
        })}
        
        <View
          style={[
            styles.chartEndDot,
            { 
              left: points[points.length - 1].x - 6, 
              top: points[points.length - 1].y - 6,
              backgroundColor: isPositive ? Colors.light.primary : '#F4A6A3',
            },
          ]}
        >
          <View style={styles.chartEndDotInner} />
        </View>
      </>
    );

    const renderCandleChart = () => {
      const candleWidth = Math.max(2, (CHART_WIDTH / chartData.length) * 0.6);
      
      return (
        <>
          {chartData.map((candle, index) => {
            const x = (index / (chartData.length - 1)) * CHART_WIDTH - candleWidth / 2;
            const openY = PADDING_TOP + (1 - (candle.open - minValue) / range) * USABLE_HEIGHT;
            const closeY = PADDING_TOP + (1 - (candle.close - minValue) / range) * USABLE_HEIGHT;
            const highY = PADDING_TOP + (1 - (candle.high - minValue) / range) * USABLE_HEIGHT;
            const lowY = PADDING_TOP + (1 - (candle.low - minValue) / range) * USABLE_HEIGHT;
            const isBullish = candle.close >= candle.open;
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(1, Math.abs(closeY - openY));
            
            return (
              <View key={index}>
                <View
                  style={[
                    styles.candleWick,
                    {
                      left: x + candleWidth / 2 - 0.5,
                      top: highY,
                      height: lowY - highY,
                      backgroundColor: isBullish ? Colors.light.primary : '#F4A6A3',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.candleBody,
                    {
                      left: x,
                      top: bodyTop,
                      width: candleWidth,
                      height: bodyHeight,
                      backgroundColor: isBullish ? Colors.light.primary : '#F4A6A3',
                    },
                  ]}
                />
              </View>
            );
          })}
        </>
      );
    };

    return (
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={styles.chartPrice}>{formatCurrency(lastValue)}</Text>
            <View style={styles.chartChangeRow}>
              {isPositive ? (
                <TrendingUp size={14} color={Colors.light.success} />
              ) : (
                <TrendingDown size={14} color={Colors.light.error} />
              )}
              <Text style={[styles.chartChange, isPositive ? styles.positiveText : styles.negativeText]}>
                {isPositive ? '+' : ''}{formatCurrency(priceChange)} ({percentChange.toFixed(2)}%)
              </Text>
            </View>
          </View>
          {renderChartTypeToggle()}
        </View>

        <View style={styles.chartContainer}>
          {chartType === 'line' ? renderLineChart() : renderCandleChart()}
        </View>

        {renderTimeFilters()}
      </View>
    );
  };

  const renderChartTypeToggle = () => (
    <View style={styles.chartTypeToggle}>
      <TouchableOpacity
        style={[styles.chartTypeButton, chartType === 'line' && styles.chartTypeButtonActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setChartType('line');
        }}
      >
        <LineChart size={16} color={chartType === 'line' ? '#FFFFFF' : Colors.light.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.chartTypeButton, chartType === 'candle' && styles.chartTypeButtonActive]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setChartType('candle');
        }}
      >
        <CandlestickChart size={16} color={chartType === 'candle' ? '#FFFFFF' : Colors.light.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const renderTimeFilters = () => (
    <View style={styles.timeFilters}>
      {(['1D', '1W', '1M', '1Y'] as TimeFilter[]).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.timeFilterButton,
            selectedTimeFilter === filter && styles.timeFilterButtonActive,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedTimeFilter(filter);
          }}
        >
          <Text
            style={[
              styles.timeFilterText,
              selectedTimeFilter === filter && styles.timeFilterTextActive,
            ]}
          >
            {filter}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const handleSend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)/payments');
  };

  const handleReceive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/receive');
  };

  if (coinLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen
          options={{
            title: symbol || 'Asset Details',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.text },
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: coinData?.name || symbol || 'Asset Details',
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
            tintColor={Colors.light.primary}
          />
        }
      >
        <View style={styles.headerCard}>
          <Image
            source={{ uri: coinData?.imageUrl || `https://www.cryptocompare.com/media/37746251/${symbol?.toLowerCase()}.png` }}
            style={styles.assetLogo}
            contentFit="contain"
          />
          <View style={styles.headerInfo}>
            <Text style={styles.assetName}>{coinData?.name || symbol}</Text>
            <Text style={styles.assetSymbol}>{coinData?.symbol || symbol}</Text>
          </View>
          <View style={[
            styles.changeBadge,
            (coinData?.change24h || 0) >= 0 ? styles.changeBadgePositive : styles.changeBadgeNegative,
          ]}>
            {(coinData?.change24h || 0) >= 0 ? (
              <TrendingUp size={14} color={Colors.light.success} />
            ) : (
              <TrendingDown size={14} color={Colors.light.error} />
            )}
            <Text style={[
              styles.changeBadgeText,
              (coinData?.change24h || 0) >= 0 ? styles.positiveText : styles.negativeText,
            ]}>
              {Math.abs(coinData?.change24h || 0).toFixed(2)}%
            </Text>
          </View>
        </View>

        <View style={styles.priceCard}>
          <Text style={styles.currentPriceLabel}>Current Price</Text>
          <Text style={styles.currentPrice}>{formatCurrency(coinData?.price || 0)}</Text>
        </View>

        {renderChart()}

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSend} activeOpacity={0.7}>
            <LinearGradient colors={['#9DC183', '#8FBC8F']} style={styles.actionButtonIcon}>
              <Send size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.actionButtonLabel}>Send</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleReceive} activeOpacity={0.7}>
            <LinearGradient colors={['#A8D08D', '#9DC183']} style={styles.actionButtonIcon}>
              <Download size={20} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.actionButtonLabel}>Receive</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Market Statistics</Text>
          
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <BarChart3 size={16} color={Colors.light.primary} />
              </View>
              <View>
                <Text style={styles.statLabel}>Market Cap</Text>
                <Text style={styles.statValue}>{formatLargeNumber(coinData?.marketCap || 0)}</Text>
              </View>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Activity size={16} color={Colors.light.primary} />
              </View>
              <View>
                <Text style={styles.statLabel}>24h Volume</Text>
                <Text style={styles.statValue}>{formatLargeNumber(coinData?.volume24h || 0)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <ArrowUpRight size={16} color={Colors.light.success} />
              </View>
              <View>
                <Text style={styles.statLabel}>24h High</Text>
                <Text style={styles.statValue}>{formatCurrency(coinData?.high24h || 0)}</Text>
              </View>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <ArrowDownLeft size={16} color={Colors.light.error} />
              </View>
              <View>
                <Text style={styles.statLabel}>24h Low</Text>
                <Text style={styles.statValue}>{formatCurrency(coinData?.low24h || 0)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Clock size={16} color={Colors.light.textSecondary} />
            <Text style={styles.infoText}>Prices updated every 60 seconds</Text>
          </View>
          <View style={styles.infoRow}>
            <DollarSign size={16} color={Colors.light.textSecondary} />
            <Text style={styles.infoText}>All prices shown in USD</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  assetLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  assetName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  assetSymbol: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontWeight: '500' as const,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  changeBadgePositive: {
    backgroundColor: 'rgba(184, 212, 168, 0.25)',
  },
  changeBadgeNegative: {
    backgroundColor: 'rgba(244, 166, 163, 0.25)',
  },
  changeBadgeText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  positiveText: {
    color: Colors.light.success,
  },
  negativeText: {
    color: Colors.light.error,
  },
  priceCard: {
    backgroundColor: Colors.light.primaryDark,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  currentPriceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  chartSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  chartPrice: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  chartChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartChange: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  chartContainer: {
    height: CHART_HEIGHT,
    position: 'relative',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chartLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  chartLine: {
    position: 'absolute',
    height: 2.5,
    borderRadius: 2,
  },
  chartEndDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  chartEndDotInner: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  timeFilters: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
  },
  timeFilterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeFilterButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  timeFilterText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textMuted,
  },
  timeFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  actionButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  statsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(157, 193, 131, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: 'rgba(157, 193, 131, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  bottomSpacer: {
    height: 24,
  },
  chartTypeToggle: {
    flexDirection: 'row',
    gap: 4,
  },
  chartTypeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  chartTypeButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  candleWick: {
    position: 'absolute',
    width: 1,
  },
  candleBody: {
    position: 'absolute',
    borderRadius: 1,
  },
});
