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
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useWallet, CURRENCY_INFO } from '@/contexts/WalletContext';
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
  const { colors, isDark } = useTheme();
  const { totalBalanceUsd, balances, getUsdRate, transactions: walletTransactions } = useWallet();
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
            <ActivityIndicator size="small" color={colors.primary} />
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

    const positiveColor = colors.primary;
    const negativeColor = isDark ? '#F4A6A3' : '#FF6B6B';

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
                  backgroundColor: isPositive ? positiveColor : negativeColor,
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
              backgroundColor: isPositive ? positiveColor : negativeColor,
              shadowColor: isPositive ? positiveColor : negativeColor,
            },
          ]}
        >
          <View style={styles.chartEndDotInner} />
        </View>
        
        <View style={[styles.chartEndPriceBadge, { top: points[points.length - 1].y - 12, right: 0, backgroundColor: colors.primaryDark }]}>
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
                      backgroundColor: isBullish ? positiveColor : negativeColor,
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
                      backgroundColor: isBullish ? positiveColor : negativeColor,
                    },
                  ]}
                />
              </View>
            );
          })}
          <View style={[styles.chartEndPriceBadge, { top: points[points.length - 1].y - 12, right: 0, backgroundColor: colors.primaryDark }]}>
            <Text style={styles.chartEndPriceText}>{formatPrice(lastValue)}</Text>
          </View>
        </>
      );
    };

    return (
      <View style={styles.chartWrapper}>
        {renderChartTypeToggle()}
        <View style={styles.chartPriceLabels}>
          <Text style={[styles.chartPriceLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>{formatPrice(maxValue)}</Text>
          <Text style={[styles.chartPriceLabel, { color: colors.textMuted, backgroundColor: colors.card }]}>{formatPrice(minValue)}</Text>
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
        style={[styles.chartTypeButton, { backgroundColor: colors.backgroundSecondary }, chartType === 'line' && { backgroundColor: colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setChartType('line');
        }}
      >
        <LineChart size={16} color={chartType === 'line' ? '#FFFFFF' : colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.chartTypeButton, { backgroundColor: colors.backgroundSecondary }, chartType === 'candle' && { backgroundColor: colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setChartType('candle');
        }}
      >
        <CandlestickChart size={16} color={chartType === 'candle' ? '#FFFFFF' : colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const renderTimeFilters = () => (
    <View style={[styles.timeFilters, { backgroundColor: colors.backgroundSecondary }]}>
      {(['1D', '1W', '1M', '1Y'] as TimeFilter[]).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.timeFilterButton,
            selectedTimeFilter === filter && { backgroundColor: colors.primary },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedTimeFilter(filter);
          }}
        >
          <Text
            style={[
              styles.timeFilterText,
              { color: colors.textMuted },
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
              <View style={[styles.onlineIndicator, { borderColor: colors.background }]} />
            </View>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()}</Text>
              <Text style={[styles.userName, { color: colors.text }]}>{user?.fullName?.split(' ')[0] || 'User'}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.notificationButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
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
            <Bell size={22} color={colors.primary} />
            <View style={[styles.notificationBadge, { backgroundColor: colors.error }]} />
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
              tintColor={colors.primary}
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
                {formatCurrency(totalBalanceUsd)}
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
                <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>Send</Text>
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
                <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>Receive</Text>
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
                <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>Scan QR</Text>
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
                <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>Assets</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          <View style={styles.assetSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Bitcoin</Text>
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => router.push('/all-assets')}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
                <ChevronRight size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.assetCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {pricesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : primaryAsset ? (
                <>
                  <View style={styles.assetRow}>
                    <View style={styles.assetLeft}>
                      <Image
                        source={{ uri: primaryAsset.imageUrl }}
                        style={[styles.assetLogo, { backgroundColor: colors.backgroundSecondary }]}
                        contentFit="contain"
                      />
                      <View>
                        <Text style={[styles.assetName, { color: colors.text }]}>{primaryAsset.name}</Text>
                        <Text style={[styles.assetSymbol, { color: colors.textSecondary }]}>{primaryAsset.symbol}</Text>
                      </View>
                    </View>
                    <View style={styles.assetRight}>
                      <Text style={[styles.assetValue, { color: colors.text }]}>{formatCurrency(primaryAsset.price)}</Text>
                      <View style={[
                        styles.assetChange,
                        primaryAsset.change24h >= 0 ? styles.changePositive : styles.changeNegative,
                      ]}>
                        {primaryAsset.change24h >= 0 ? (
                          <TrendingUp size={12} color={colors.success} />
                        ) : (
                          <TrendingDown size={12} color={colors.error} />
                        )}
                        <Text style={[
                          styles.assetChangeText,
                          { color: primaryAsset.change24h >= 0 ? colors.success : colors.error },
                        ]}>
                          {Math.abs(primaryAsset.change24h).toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                  {renderMiniChart()}
                </>
              ) : (
                <Text style={[styles.errorText, { color: colors.textSecondary }]}>Failed to load data</Text>
              )}
            </View>
          </View>

          {balances.filter(b => b.amount > 0).length > 0 && (
            <View style={styles.holdingsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Holdings</Text>
              </View>
              <View style={[styles.holdingsList, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                {balances.filter(b => b.amount > 0).map((bal, index, arr) => {
                  const info = CURRENCY_INFO[bal.currency];
                  const usdVal = bal.amount * getUsdRate(bal.currency);
                  return (
                    <View
                      key={bal.currency}
                      style={[
                        styles.holdingItem,
                        { borderBottomColor: colors.borderLight },
                        index === arr.length - 1 && styles.holdingItemLast,
                      ]}
                    >
                      <View style={styles.holdingLeft}>
                        <Image source={{ uri: info.icon }} style={[styles.holdingIcon, { backgroundColor: colors.backgroundSecondary }]} contentFit="contain" />
                        <View>
                          <Text style={[styles.holdingName, { color: colors.text }]}>{info.name}</Text>
                          <Text style={[styles.holdingSymbol, { color: colors.textMuted }]}>{bal.currency}</Text>
                        </View>
                      </View>
                      <View style={styles.holdingRight}>
                        <Text style={[styles.holdingAmount, { color: colors.text }]}>
                          {bal.currency === 'USD' ? `${bal.amount.toFixed(2)}` : bal.amount.toFixed(8)}
                        </Text>
                        {bal.currency !== 'USD' && (
                          <Text style={[styles.holdingUsd, { color: colors.textMuted }]}>${usdVal.toFixed(2)}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => router.push('/transactions')}
              >
                <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
                <ChevronRight size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.transactionsList, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
              {(walletTransactions.length > 0 ? walletTransactions : mockTransactions).slice(0, 4).map((tx, index) => {
                const isWalletTx = 'counterparty' in tx;
                const txType = tx.type === 'received' ? 'received' : 'sent';
                const displayName = isWalletTx
                  ? ((tx as any).counterparty || (tx.type === 'exchange' ? 'Exchange' : 'Unknown'))
                  : (tx.type === 'received' ? (tx as any).sender : (tx as any).recipient);
                const txCurrency = isWalletTx ? (tx as any).currency : 'USD';
                return (
                  <TouchableOpacity 
                    key={tx.id} 
                    style={[
                      styles.transactionItem,
                      { borderBottomColor: colors.borderLight },
                      index === 3 && styles.transactionItemLast,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.transactionIcon,
                      txType === 'received' ? styles.iconReceived : styles.iconSent,
                    ]}>
                      {txType === 'received' ? (
                        <ArrowDownLeft size={18} color={colors.success} />
                      ) : (
                        <ArrowUpRight size={18} color={colors.error} />
                      )}
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={[styles.transactionName, { color: colors.text }]}>{displayName}</Text>
                      <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
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
                      { color: txType === 'received' ? colors.success : colors.textSecondary },
                    ]}>
                      {txType === 'received' ? '+' : '-'}{txCurrency === 'USD' ? '$' : ''}{tx.amount}{txCurrency !== 'USD' ? (' ' + txCurrency) : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
  },
  greeting: {
    fontSize: 13,
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
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
    shadowColor: '#9DC183',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
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
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  assetCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
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
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  assetSymbol: {
    fontSize: 13,
  },
  assetRight: {
    alignItems: 'flex-end',
  },
  assetValue: {
    fontSize: 17,
    fontWeight: '700' as const,
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
  chartPriceLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
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
    padding: 20,
  },
  changeNegativeText: {
    color: '#F4A6A3',
  },
  timeFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 40,
    borderRadius: 12,
    padding: 4,
  },
  timeFilterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeFilterText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  timeFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  transactionsSection: {
    paddingHorizontal: 20,
  },
  transactionsList: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
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
    marginBottom: 3,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  holdingsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  holdingsList: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  holdingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  holdingItemLast: {
    borderBottomWidth: 0,
  },
  holdingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  holdingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  holdingName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  holdingSymbol: {
    fontSize: 12,
  },
  holdingRight: {
    alignItems: 'flex-end',
  },
  holdingAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  holdingUsd: {
    fontSize: 12,
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
