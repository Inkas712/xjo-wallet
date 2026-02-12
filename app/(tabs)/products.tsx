import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  PiggyBank,
  Wallet,
  TrendingUp,
  GraduationCap,
  Home,
  Briefcase,
  ChevronRight,
  Sparkles,
  Zap,
  Gift,
  Target,
  CircleDot,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { mockProducts } from '@/mocks/products';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.72;
const CARD_SPACING = 16;

const getIcon = (iconName: string, size: number = 24, color: string = Colors.light.primary) => {
  const iconProps = { size, color };
  switch (iconName) {
    case 'piggy-bank': return <PiggyBank {...iconProps} />;
    case 'wallet': return <Wallet {...iconProps} />;
    case 'trending-up': return <TrendingUp {...iconProps} />;
    case 'graduation-cap': return <GraduationCap {...iconProps} />;
    case 'home': return <Home {...iconProps} />;
    case 'briefcase': return <Briefcase {...iconProps} />;
    default: return <Wallet {...iconProps} />;
  }
};

const cardThemes = [
  { bg: '#7BA05B', accent: '#9DC183', pattern: '#6B8E4E' },
  { bg: '#8B9A7D', accent: '#A8B89A', pattern: '#7A8970' },
  { bg: '#9DC183', accent: '#B8D4A8', pattern: '#8BB274' },
  { bg: '#6B8E4E', accent: '#7BA05B', pattern: '#5A7D3F' },
  { bg: '#A8B89A', accent: '#C4D4B6', pattern: '#97A78A' },
  { bg: '#8BB274', accent: '#9DC183', pattern: '#7AA165' },
];

export default function ProductsScreen() {
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);

  const featuredProducts = mockProducts.slice(0, 3);
  const otherProducts = mockProducts.slice(3);

  const handleProductPress = (productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/product-details?id=${productId}`);
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { 
      useNativeDriver: true,
      listener: (event: any) => {
        const index = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING));
        setActiveIndex(index);
      }
    }
  );

  const renderFeaturedCard = (product: typeof mockProducts[0], index: number) => {
    const theme = cardThemes[index % cardThemes.length];
    const inputRange = [
      (index - 1) * (CARD_WIDTH + CARD_SPACING),
      index * (CARD_WIDTH + CARD_SPACING),
      (index + 1) * (CARD_WIDTH + CARD_SPACING),
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.92, 1, 0.92],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={product.id}
        style={[
          styles.featuredCard,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.featuredCardInner, { backgroundColor: theme.bg }]}
          onPress={() => handleProductPress(product.id)}
          activeOpacity={0.95}
        >
          <View style={styles.featuredCardPattern}>
            <View style={[styles.patternDot, styles.patternDot1, { backgroundColor: theme.pattern }]} />
            <View style={[styles.patternDot, styles.patternDot2, { backgroundColor: theme.pattern }]} />
            <View style={[styles.patternLine, { backgroundColor: theme.pattern }]} />
          </View>

          <View style={styles.featuredCardHeader}>
            <View style={[styles.featuredIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              {getIcon(product.icon, 28, '#FFF')}
            </View>
            <View style={styles.featuredBadge}>
              <Zap size={12} color="#FFF" />
              <Text style={styles.featuredBadgeText}>Popular</Text>
            </View>
          </View>

          <View style={styles.featuredCardContent}>
            <Text style={styles.featuredCardTitle}>{product.name}</Text>
            <Text style={styles.featuredCardDesc} numberOfLines={2}>
              {product.shortDescription}
            </Text>
          </View>

          <View style={styles.featuredCardFooter}>
            <View style={styles.featuredStats}>
              <View style={styles.featuredStatItem}>
                <Text style={styles.featuredStatValue}>0%</Text>
                <Text style={styles.featuredStatLabel}>Interest</Text>
              </View>
              <View style={styles.featuredStatDivider} />
              <View style={styles.featuredStatItem}>
                <Text style={styles.featuredStatValue}>24h</Text>
                <Text style={styles.featuredStatLabel}>Approval</Text>
              </View>
            </View>
            <View style={styles.featuredArrow}>
              <ChevronRight size={20} color="#FFF" />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderProductItem = (product: typeof mockProducts[0], index: number) => {
    const theme = cardThemes[(index + 3) % cardThemes.length];
    
    return (
      <TouchableOpacity
        key={product.id}
        style={styles.productItem}
        onPress={() => handleProductPress(product.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.productItemIcon, { backgroundColor: `${theme.bg}15` }]}>
          {getIcon(product.icon, 22, theme.bg)}
        </View>
        <View style={styles.productItemContent}>
          <Text style={styles.productItemTitle}>{product.name}</Text>
          <Text style={styles.productItemDesc} numberOfLines={1}>
            {product.shortDescription}
          </Text>
        </View>
        <View style={[styles.productItemArrow, { backgroundColor: `${theme.bg}10` }]}>
          <ChevronRight size={18} color={theme.bg} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.headerLabel}>XJO Products</Text>
                <Text style={styles.headerTitle}>Financial Solutions</Text>
              </View>
              <TouchableOpacity style={styles.headerAction}>
                <Gift size={20} color={Colors.light.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>
              Interest-free products designed for your financial goals
            </Text>
          </View>

          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIcon, { backgroundColor: '#7BA05B15' }]}>
                <Target size={18} color="#7BA05B" />
              </View>
              <Text style={styles.quickStatValue}>6</Text>
              <Text style={styles.quickStatLabel}>Products</Text>
            </View>
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIcon, { backgroundColor: '#9DC18315' }]}>
                <Zap size={18} color="#9DC183" />
              </View>
              <Text style={styles.quickStatValue}>0%</Text>
              <Text style={styles.quickStatLabel}>Interest</Text>
            </View>
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIcon, { backgroundColor: '#6B8E4E15' }]}>
                <Sparkles size={18} color="#6B8E4E" />
              </View>
              <Text style={styles.quickStatValue}>24h</Text>
              <Text style={styles.quickStatLabel}>Fast Approval</Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured</Text>
            <View style={styles.pagination}>
              {featuredProducts.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.paginationDot,
                    activeIndex === i && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          <Animated.ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_SPACING}
            decelerationRate="fast"
            contentContainerStyle={styles.featuredList}
            onScroll={onScroll}
            scrollEventThrottle={16}
          >
            {featuredProducts.map((product, index) => renderFeaturedCard(product, index))}
          </Animated.ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>More Products</Text>
            <Text style={styles.sectionCount}>{otherProducts.length} available</Text>
          </View>

          <View style={styles.productsList}>
            {otherProducts.map((product, index) => renderProductItem(product, index))}
          </View>

          <View style={styles.ctaCard}>
            <View style={styles.ctaContent}>
              <View style={styles.ctaIconContainer}>
                <CircleDot size={24} color={Colors.light.primary} />
              </View>
              <Text style={styles.ctaTitle}>Need Help Choosing?</Text>
              <Text style={styles.ctaText}>
                Our advisors can help you find the perfect product for your needs
              </Text>
              <TouchableOpacity style={styles.ctaButton} activeOpacity={0.8}>
                <Text style={styles.ctaButtonText}>Talk to an Advisor</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    lineHeight: 22,
  },
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 12,
    color: Colors.light.textMuted,
    fontWeight: '500' as const,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  sectionCount: {
    fontSize: 13,
    color: Colors.light.textMuted,
    fontWeight: '500' as const,
  },
  pagination: {
    flexDirection: 'row',
    gap: 6,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.border,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: Colors.light.primary,
  },
  featuredList: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    marginBottom: 24,
  },
  featuredCard: {
    width: CARD_WIDTH,
    marginRight: CARD_SPACING,
  },
  featuredCardInner: {
    borderRadius: 24,
    padding: 24,
    minHeight: 220,
    overflow: 'hidden',
  },
  featuredCardPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  patternDot: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.3,
  },
  patternDot1: {
    width: 100,
    height: 100,
    top: -30,
    right: -30,
  },
  patternDot2: {
    width: 60,
    height: 60,
    bottom: 40,
    right: 60,
  },
  patternLine: {
    position: 'absolute',
    width: 2,
    height: 80,
    right: 40,
    top: 60,
    opacity: 0.2,
    transform: [{ rotate: '30deg' }],
  },
  featuredCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featuredIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredCardContent: {
    flex: 1,
  },
  featuredCardTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 8,
  },
  featuredCardDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  featuredCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  featuredStatItem: {
    alignItems: 'center',
  },
  featuredStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  featuredStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 14,
  },
  featuredArrow: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productsList: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  productItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productItemContent: {
    flex: 1,
    marginLeft: 14,
  },
  productItemTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  productItemDesc: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  productItemArrow: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaCard: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ctaContent: {
    padding: 24,
    alignItems: 'center',
  },
  ctaIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${Colors.light.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: Colors.light.primaryDark,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFF',
  },
});
