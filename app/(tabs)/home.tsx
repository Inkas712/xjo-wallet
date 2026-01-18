import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  EyeOff,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Send,
  Download,
  ScanLine,
  Bell,
  Sparkles,
  Wallet,
  CreditCard,
  LineChart,
  CandlestickChart,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { mockTransactions } from '@/mocks/transactions';
import { CryptoCompareAPI } from '@/services/crypto';

const { width } = Dimensions.get('window');
const CHART_HEIGHT = 160;
const CHART_WIDTH = width - 80;

type TimeFilter = '1D' | '1W' | '1M' | '1Y';
type ChartType = 'line' | 'candle';

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'SOL', 'USDT', 'BNB'];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>('1W');
  const [refreshing, setRefreshing] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('line');
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { data: cryptoPrices = [], isLoading: pricesLoading } = useQuery({
    queryKey: ['cryptoPrices'],
    queryFn: () => CryptoCompareAPI.getPrices(CRYPTO_SYMBOLS),
    staleTime: 5000,
    refetchInterval: 5000,
  });

  const { data: chartData = [], isLoading: chartLoading } = useQuery({
    queryKey: ['chartData', selectedTimeFilter],
    queryFn: async () => {
      switch (selectedTimeFilter) {
        case '1D':
          return CryptoCompareAPI.getHistoricalHourly('BTC', 'USD', 24);
        case '1W':
          return CryptoCompareAPI.getHistoricalHourly('BTC', 'USD', 168);
        case '1M':
          return CryptoCompareAPI.getHistoricalDaily('BTC', 'USD', 30);
        case '1Y':
          return CryptoCompareAPI.getHistoricalDaily('BTC', 'USD', 365);
        default:
          return CryptoCompareAPI.getHistoricalHourly('BTC', 'USD', 168);
      }
    },
    staleTime: 60000,
  });

  const primaryAsset = cryptoPrices[0] || null;
  const totalPortfolioChange = cryptoPrices.length > 0
    ? cryptoPrices.reduce((sum, coin) => sum + coin.change24h, 0) / cryptoPrices.length
    : 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['cryptoPrices'] });
    await queryClient.invalidateQueries({ queryKey: ['chartData'] });
    setRefreshing(false);
  }, [queryClient]);

  const toggleBalanceVisibility = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    setBalanceVisible(!balanceVisible);
  };

  const handleQuickAction = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 50, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
    ]).start();
    
    switch (action) {
      case 'send':
        router.push('/(tabs)/payments');
        break;
      case 'receive':
        router.push('/receive');
        break;
      case 'scan':
        router.push('/scan');
        break;
    }
  };

  const formatCurrency = (value: number): string => {
    if (!balanceVisible) return '••••••';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const renderMiniChart = () => {
    if (chartLoading || chartData.length === 0) {
      return (
        <View style={styles.chartWrapper}>
          {renderChartTypeToggle()}
          <View style={[styles.chartContainer, styles.chartLoadingContainer]}>
            <ActivityIndicator size="small" color={Colors.light.primary} />
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

    const PADDING_TOP = 30;
    const PADDING_BOTTOM = 30;
    const USABLE_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    const points = chartData.map((point, index) => {
      const x = (index / (chartData.length - 1)) * CHART_WIDTH;
      const y = PADDING_TOP + (1 - (point.close - minValue) / range) * USABLE_HEIGHT;
      return { x, y, value: point.close };
    });

    const formatPrice = (val: number) => {
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}k`;
      }
      return `${val.toFixed(2)}`;
    };

    const renderLineChart = () => (
      <>
        <LinearGradient
          colors={isPositive 
            ? ['rgba(157, 193, 131, 0.35)', 'rgba(157, 193, 131, 0.08)', 'rgba(157, 193, 131, 0)']
            : ['rgba(244, 166, 163, 0.35)', 'rgba(244, 166, 163, 0.08)', 'rgba(244, 166, 163, 0)']
          }
          style={[
            styles.chartGradientFill,
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
              shadowColor: isPositive ? Colors.light.primary : '#F4A6A3',
            },
          ]}
        >
          <View style={styles.chartEndDotInner} />
        </View>
        
        <View style={[styles.chartEndPriceBadge, { top: points[points.length - 1].y - 12, right: 0 }]}>
          <Text style={styles.chartEndPriceText}>{formatPrice(lastValue)}</Text>
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
          <View style={[styles.chartEndPriceBadge, { top: points[points.length - 1].y - 12, right: 0 }]}>
            <Text style={styles.chartEndPriceText}>{formatPrice(lastValue)}</Text>
          </View>
        </>
      );
    };

    return (
      <View style={styles.chartWrapper}>
        {renderChartTypeToggle()}
        <View style={styles.chartPriceLabels}>
          <Text style={styles.chartPriceMax}>{formatPrice(maxValue)}</Text>
          <Text style={styles.chartPriceMin}>{formatPrice(minValue)}</Text>
        </View>
        
        <View style={styles.chartContainer}>
          <View style={styles.chartGridLines}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.chartGridLine} />
            ))}
          </View>
          
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

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerLeft}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/(tabs)/profile');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#9DC183', '#7BA05B']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </LinearGradient>
              <View style={styles.onlineIndicator} />
            </View>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{user?.fullName?.split(' ')[0] || 'User'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Alert.alert(
                'Notifications',
                'You have no new notifications',
                [{ text: 'OK', style: 'default' }]
              );
            }}
            activeOpacity={0.7}
          >
            <Bell size={22} color={Colors.light.primaryDark} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

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
          <View style={styles.balanceSection}>
            <LinearGradient
              colors={['#7BA05B', '#6B8E4E', '#5A7D40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.balanceCard}
            >
              <View style={styles.balanceCardPattern}>
                <View style={styles.patternCircle1} />
                <View style={styles.patternCircle2} />
              </View>
              
              <View style={styles.balanceHeader}>
                <View style={styles.balanceLabel}>
                  <Wallet size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.balanceLabelText}>Total Balance</Text>
                </View>
                <TouchableOpacity 
                  onPress={toggleBalanceVisibility}
                  style={styles.visibilityButton}
                >
                  {balanceVisible ? (
                    <Eye size={20} color="rgba(255,255,255,0.9)" />
                  ) : (
                    <EyeOff size={20} color="rgba(255,255,255,0.9)" />
                  )}
                </TouchableOpacity>
              </View>
              
              <Animated.Text style={[styles.balanceAmount, { opacity: fadeAnim }]}>
                {formatCurrency(0)}
              </Animated.Text>
              
              <View style={styles.balanceChange}>
                <View style={styles.changeIndicator}>
                  {totalPortfolioChange >= 0 ? (
                    <TrendingUp size={14} color="#B8D4A8" />
                  ) : (
                    <TrendingDown size={14} color="#F4A6A3" />
                  )}
                  <Text style={[styles.changePercentage, totalPortfolioChange < 0 && styles.changeNegativeText]}>
                    {totalPortfolioChange >= 0 ? '+' : ''}{totalPortfolioChange.toFixed(2)}%
                  </Text>
                </View>
                <Text style={styles.changeLabel}>24h avg change</Text>
              </View>

              <View style={styles.balanceCardFooter}>
                <View style={styles.cardNumber}>
                  <CreditCard size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.cardNumberText}>•••• 4582</Text>
                </View>
                <View style={styles.xjoMark}>
                  <Text style={styles.xjoMarkText}>XJO</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.quickActionsSection}>
            <Animated.View style={[styles.quickActions, { transform: [{ scale: scaleAnim }] }]}>
              <TouchableOpacity 
                style={styles.quickActionItem}
                onPress={() => handleQuickAction('send')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#9DC183', '#8FBC8F']}
                  style={styles.quickActionIcon}
                >
                  <Send size={22} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.quickActionLabel}>Send</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickActionItem}
                onPress={() => handleQuickAction('receive')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#A8D08D', '#9DC183']}
                  style={styles.quickActionIcon}
                >
                  <Download size={22} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.quickActionLabel}>Receive</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickActionItem}
                onPress={() => handleQuickAction('scan')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#B8D4A8', '#A8D08D']}
                  style={styles.quickActionIcon}
                >
                  <ScanLine size={22} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.quickActionLabel}>Scan QR</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickActionItem}
                onPress={() => router.push('/all-assets')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#7BA05B', '#6B8E4E']}
                  style={styles.quickActionIcon}
                >
                  <Sparkles size={22} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.quickActionLabel}>Assets</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.assetSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bitcoin</Text>
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => router.push('/all-assets')}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight size={16} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.assetCard}>
              {pricesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.light.primary} />
                </View>
              ) : primaryAsset ? (
                <>
                  <View style={styles.assetRow}>
                    <View style={styles.assetLeft}>
                      <Image
                        source={{ uri: primaryAsset.imageUrl }}
                        style={styles.assetLogo}
                        contentFit="contain"
                      />
                      <View>
                        <Text style={styles.assetName}>{primaryAsset.name}</Text>
                        <Text style={styles.assetSymbol}>{primaryAsset.symbol}</Text>
                      </View>
                    </View>
                    <View style={styles.assetRight}>
                      <Text style={styles.assetValue}>{formatCurrency(primaryAsset.price)}</Text>
                      <View style={[
                        styles.assetChange,
                        primaryAsset.change24h >= 0 ? styles.changePositive : styles.changeNegative,
                      ]}>
                        {primaryAsset.change24h >= 0 ? (
                          <TrendingUp size={12} color={Colors.light.success} />
                        ) : (
                          <TrendingDown size={12} color={Colors.light.error} />
                        )}
                        <Text style={[
                          styles.assetChangeText,
                          primaryAsset.change24h >= 0 ? styles.changeTextPositive : styles.changeTextNegative,
                        ]}>
                          {Math.abs(primaryAsset.change24h).toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                  {renderMiniChart()}
                </>
              ) : (
                <Text style={styles.errorText}>Failed to load data</Text>
              )}
            </View>
          </View>

          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => router.push('/transactions')}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight size={16} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.transactionsList}>
              {mockTransactions.slice(0, 4).map((tx, index) => (
                <TouchableOpacity 
                  key={tx.id} 
                  style={[
                    styles.transactionItem,
                    index === mockTransactions.slice(0, 4).length - 1 && styles.transactionItemLast,
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.transactionIcon,
                    tx.type === 'received' ? styles.iconReceived : styles.iconSent,
                  ]}>
                    {tx.type === 'received' ? (
                      <ArrowDownLeft size={18} color={Colors.light.success} />
                    ) : (
                      <ArrowUpRight size={18} color={Colors.light.error} />
                    )}
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionName}>
                      {tx.type === 'received' ? tx.sender : tx.recipient}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(tx.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    tx.type === 'received' ? styles.amountReceived : styles.amountSent,
                  ]}>
                    {tx.type === 'received' ? '+' : '-'}${tx.amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: Colors.light.background,
  },
  greeting: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.light.primaryDark,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.error,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  balanceSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  balanceCard: {
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  balanceCardPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  patternCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  patternCircle2: {
    position: 'absolute',
    bottom: -80,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceLabelText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500' as const,
  },
  visibilityButton: {
    padding: 4,
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginBottom: 8,
  },
  balanceChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changePercentage: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#B8D4A8',
  },
  changeLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  balanceCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 16,
  },
  cardNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardNumberText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
    letterSpacing: 1,
  },
  xjoMark: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  xjoMarkText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    alignItems: 'center',
    gap: 10,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.primaryDark,
  },
  assetSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.light.primaryDark,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  assetCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assetLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.primaryDark,
    marginBottom: 2,
  },
  assetSymbol: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetValue: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.light.primaryDark,
    marginBottom: 4,
  },
  assetChange: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  changePositive: {
    backgroundColor: 'rgba(184, 212, 168, 0.25)',
  },
  changeNegative: {
    backgroundColor: 'rgba(244, 166, 163, 0.25)',
  },
  assetChangeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  changeTextPositive: {
    color: Colors.light.success,
  },
  changeTextNegative: {
    color: Colors.light.error,
  },
  chartWrapper: {
    marginTop: 12,
    position: 'relative',
  },
  chartPriceLabels: {
    position: 'absolute',
    left: -4,
    top: 24,
    bottom: 50,
    width: 50,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  chartPriceMax: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.light.textMuted,
    backgroundColor: Colors.light.card,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chartPriceMin: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.light.textMuted,
    backgroundColor: Colors.light.card,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chartContainer: {
    height: CHART_HEIGHT,
    position: 'relative',
    marginBottom: 16,
    marginLeft: 40,
    overflow: 'hidden',
    borderRadius: 12,
  },
  chartGridLines: {
    position: 'absolute',
    top: 30,
    bottom: 30,
    left: 0,
    right: 0,
    justifyContent: 'space-between',
  },
  chartGridLine: {
    height: 1,
    backgroundColor: 'rgba(157, 193, 131, 0.12)',
  },
  chartGradientFill: {
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
  chartEndPriceBadge: {
    position: 'absolute',
    backgroundColor: Colors.light.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chartEndPriceText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  chartLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    padding: 20,
  },
  changeNegativeText: {
    color: '#F4A6A3',
  },
  timeFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 40,
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
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
  transactionsSection: {
    paddingHorizontal: 20,
  },
  transactionsList: {
    backgroundColor: Colors.light.card,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  transactionItemLast: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconReceived: {
    backgroundColor: 'rgba(184, 212, 168, 0.2)',
  },
  iconSent: {
    backgroundColor: 'rgba(244, 166, 163, 0.15)',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.primaryDark,
    marginBottom: 3,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  amountReceived: {
    color: Colors.light.success,
  },
  amountSent: {
    color: Colors.light.primaryDark,
  },
  bottomSpacer: {
    height: 24,
  },
  chartTypeToggle: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
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
