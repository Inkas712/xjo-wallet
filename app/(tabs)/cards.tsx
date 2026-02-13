import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  CreditCard,
  Snowflake,
  RefreshCw,
  XCircle,
  Eye,
  X,
  Wifi,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { mockCards } from '@/mocks/cards';
import { Card } from '@/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64;
const CARD_HEIGHT = 200;

type CardAction = 'freeze' | 'reissue' | 'close' | 'details' | null;

export default function CardsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [cards, setCards] = useState<Card[]>(
    mockCards.map(card => ({ ...card, cardholderName: user?.fullName?.toUpperCase() || 'CARDHOLDER' }))
  );
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeAction, setActiveAction] = useState<CardAction>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  const scrollRef = useRef<ScrollView>(null);
  const modalAnim = useRef(new Animated.Value(0)).current;

  const openActionModal = (action: CardAction, card: Card) => {
    setSelectedCard(card);
    setActiveAction(action);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(modalAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveAction(null);
      setSelectedCard(null);
      setShowDetails(false);
    });
  };

  const handleFreezeCard = () => {
    if (selectedCard) {
      setCards(prev =>
        prev.map(c =>
          c.id === selectedCard.id ? { ...c, isFrozen: !c.isFrozen } : c
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    closeModal();
  };

  const handleReissueCard = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeModal();
  };

  const handleCloseCard = () => {
    if (selectedCard) {
      setCards(prev => prev.filter(c => c.id !== selectedCard.id));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    closeModal();
  };

  const getCardGradient = (color: string): [string, string] => {
    switch (color) {
      case '#9DC183':
        return ['#9DC183', '#7BA05B'];
      case '#7BA05B':
        return ['#7BA05B', '#6B8E4E'];
      case '#6B8E4E':
        return ['#6B8E4E', '#5A7D3D'];
      default:
        return ['#9DC183', '#7BA05B'];
    }
  };

  const renderCard = (card: Card, index: number) => (
    <View key={card.id} style={styles.cardWrapper}>
      <LinearGradient
        colors={getCardGradient(card.color)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, card.isFrozen && styles.cardFrozen]}
      >
        {card.isFrozen && (
          <View style={styles.frozenOverlay}>
            <Snowflake size={48} color="rgba(255,255,255,0.5)" />
            <Text style={styles.frozenText}>FROZEN</Text>
          </View>
        )}
        
        <View style={styles.cardHeader}>
          <View style={styles.cardBrandContainer}>
            <Text style={styles.cardBrandText}>XJO</Text>
          </View>
          <View style={styles.cardTypeContainer}>
            <Text style={styles.cardType}>
              {card.type === 'virtual' ? 'Virtual' : 'Physical'}
            </Text>
            <Wifi size={18} color="rgba(255,255,255,0.8)" />
          </View>
        </View>

        <View style={styles.cardChip}>
          <View style={styles.chipLines}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.chipLine} />
            ))}
          </View>
        </View>

        <Text style={styles.cardNumber}>
          •••• •••• •••• {card.lastFour}
        </Text>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardLabel}>CARDHOLDER</Text>
            <Text style={styles.cardholderName}>{card.cardholderName}</Text>
          </View>
          <View>
            <Text style={styles.cardLabel}>EXPIRES</Text>
            <Text style={styles.cardExpiry}>{card.expiryDate}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.cardActions, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openActionModal('freeze', card)}
          activeOpacity={0.7}
        >
          <Snowflake size={20} color={card.isFrozen ? colors.primary : colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }, card.isFrozen && { color: colors.primary }]}>
            {card.isFrozen ? 'Unfreeze' : 'Freeze'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openActionModal('reissue', card)}
          activeOpacity={0.7}
        >
          <RefreshCw size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Reissue</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openActionModal('close', card)}
          activeOpacity={0.7}
        >
          <XCircle size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Close</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setSelectedCard(card);
            setShowDetails(true);
            openActionModal('details', card);
          }}
          activeOpacity={0.7}
        >
          <Eye size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderModal = () => {
    if (!activeAction || !selectedCard) return null;

    const modalContent = () => {
      switch (activeAction) {
        case 'freeze':
          return (
            <>
              <View style={[styles.modalIcon, styles.modalIconFreeze]}>
                <Snowflake size={32} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {selectedCard.isFrozen ? 'Unfreeze Card?' : 'Freeze Card?'}
              </Text>
              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                {selectedCard.isFrozen
                  ? 'This will reactivate your card for all transactions.'
                  : 'This will temporarily block all transactions on this card.'}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={closeModal}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, { backgroundColor: colors.primaryDark }]}
                  onPress={handleFreezeCard}
                >
                  <Text style={styles.modalConfirmText}>
                    {selectedCard.isFrozen ? 'Unfreeze' : 'Freeze'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          );
        case 'reissue':
          return (
            <>
              <View style={[styles.modalIcon, styles.modalIconReissue]}>
                <RefreshCw size={32} color={colors.warning} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Reissue Card?</Text>
              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                A new card will be issued with a new number. Your current card will be deactivated.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={closeModal}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, { backgroundColor: colors.primaryDark }]}
                  onPress={handleReissueCard}
                >
                  <Text style={styles.modalConfirmText}>Reissue</Text>
                </TouchableOpacity>
              </View>
            </>
          );
        case 'close':
          return (
            <>
              <View style={[styles.modalIcon, styles.modalIconClose]}>
                <XCircle size={32} color={colors.error} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Close Card?</Text>
              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                This action cannot be undone. The card will be permanently closed.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={closeModal}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, { backgroundColor: colors.error }]}
                  onPress={handleCloseCard}
                >
                  <Text style={styles.modalConfirmText}>Close Card</Text>
                </TouchableOpacity>
              </View>
            </>
          );
        case 'details':
          return (
            <>
              <View style={[styles.modalIcon, styles.modalIconDetails]}>
                <CreditCard size={32} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Card Details</Text>
              <View style={[styles.detailsContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Card Number</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {showDetails ? `4532 8721 5643 ${selectedCard.lastFour}` : '•••• •••• •••• ' + selectedCard.lastFour}
                  </Text>
                </View>
                <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>CVV</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{showDetails ? '847' : '•••'}</Text>
                </View>
                <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Expiry</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCard.expiryDate}</Text>
                </View>
                <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Cardholder</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedCard.cardholderName}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.primaryDark }]}
                onPress={closeModal}
              >
                <Text style={styles.modalConfirmText}>Done</Text>
              </TouchableOpacity>
            </>
          );
      }
    };

    return (
      <Modal visible={true} transparent animationType="none">
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={closeModal}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.backgroundTertiary,
                borderColor: colors.border,
                opacity: modalAnim,
                transform: [
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
              {modalContent()}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={[styles.headerLogoMark, { backgroundColor: colors.primary }]}>
              <Text style={styles.headerLogoText}>XJO</Text>
            </View>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>My Cards</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{cards.length} cards</Text>
            </View>
          </View>
        </View>

        {cards.length > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsContainer}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + 24}
          >
            {cards.map((card, index) => renderCard(card, index))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <CreditCard size={48} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Cards Yet</Text>
            <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
              You don&apos;t have any cards. Add a new card to get started.
            </Text>
            <TouchableOpacity style={[styles.addCardButton, { backgroundColor: colors.primaryDark }]}>
              <Text style={styles.addCardText}>Add Card</Text>
            </TouchableOpacity>
          </View>
        )}

        {renderModal()}
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogoMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 15,
  },
  cardsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: 24,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
  },
  cardFrozen: {
    opacity: 0.7,
  },
  frozenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  frozenText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    letterSpacing: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardBrandContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardBrandText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  cardTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardType: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardChip: {
    width: 45,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    padding: 4,
    marginBottom: 16,
  },
  chipLines: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
  chipLine: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 1,
  },
  cardNumber: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardholderName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardExpiry: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addCardButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addCardText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalIconFreeze: {
    backgroundColor: 'rgba(157, 193, 131, 0.15)',
  },
  modalIconReissue: {
    backgroundColor: 'rgba(245, 215, 148, 0.15)',
  },
  modalIconClose: {
    backgroundColor: 'rgba(244, 166, 163, 0.15)',
  },
  modalIconDetails: {
    backgroundColor: 'rgba(157, 193, 131, 0.15)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  detailsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
