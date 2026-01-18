import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Animated,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  Copy,
  Share2,
  Check,
  QrCode,
  Wallet,
  DollarSign,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function ReceiveScreen() {
  const { user } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const checkAnim = useRef(new Animated.Value(0)).current;

  const walletAddress = '0x742d35Cc6634C0532925a3b844Bc454C3827e019';
  const xjoUsername = `@${user?.fullName?.toLowerCase().replace(/\s+/g, '_') || 'user'}`;

  const handleCopy = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedField(field);
    
    Animated.sequence([
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(checkAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setCopiedField(null));
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `Send me crypto using XJO!\n\nUsername: ${xjoUsername}\nWallet: ${walletAddress}`,
        title: 'My XJO Payment Details',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const generateQRPattern = () => {
    const size = 7;
    const pattern = [];
    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < size; j++) {
        const isBorder = i === 0 || i === size - 1 || j === 0 || j === size - 1;
        const isCorner = (i < 3 && j < 3) || (i < 3 && j > size - 4) || (i > size - 4 && j < 3);
        const isCenter = i === Math.floor(size / 2) && j === Math.floor(size / 2);
        row.push(isBorder || isCorner || isCenter || Math.random() > 0.5);
      }
      pattern.push(row);
    }
    return pattern;
  };

  const qrPattern = generateQRPattern();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Receive Payment',
          headerStyle: { backgroundColor: Colors.light.background },
          headerTintColor: Colors.light.primaryDark,
        }}
      />

      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <View style={styles.content}>
          <LinearGradient
            colors={['#7BA05B', '#6B8E4E', '#5A7D40']}
            style={styles.qrCard}
          >
            <View style={styles.qrCardPattern}>
              <View style={styles.patternCircle1} />
              <View style={styles.patternCircle2} />
            </View>

            <View style={styles.qrContainer}>
              <View style={styles.qrCode}>
                {qrPattern.map((row, i) => (
                  <View key={i} style={styles.qrRow}>
                    {row.map((cell, j) => (
                      <View
                        key={j}
                        style={[
                          styles.qrCell,
                          cell ? styles.qrCellFilled : styles.qrCellEmpty,
                        ]}
                      />
                    ))}
                  </View>
                ))}
                <View style={styles.qrLogo}>
                  <Text style={styles.qrLogoText}>XJO</Text>
                </View>
              </View>
            </View>

            <Text style={styles.qrLabel}>Scan to pay with XJO</Text>
          </LinearGradient>

          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Payment Details</Text>

            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <QrCode size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>XJO Username</Text>
                <Text style={styles.detailValue}>{xjoUsername}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => handleCopy(xjoUsername, 'username')}
              >
                {copiedField === 'username' ? (
                  <Check size={18} color={Colors.light.success} />
                ) : (
                  <Copy size={18} color={Colors.light.primary} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.detailItem}>
              <View style={styles.detailIcon}>
                <Wallet size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Wallet Address</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {walletAddress.slice(0, 12)}...{walletAddress.slice(-8)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => handleCopy(walletAddress, 'wallet')}
              >
                {copiedField === 'wallet' ? (
                  <Check size={18} color={Colors.light.success} />
                ) : (
                  <Copy size={18} color={Colors.light.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoCard}>
            <DollarSign size={20} color={Colors.light.primary} />
            <Text style={styles.infoText}>
              Share your QR code or payment details to receive crypto payments instantly
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share2 size={20} color="#FFFFFF" />
            <Text style={styles.shareButtonText}>Share Payment Details</Text>
          </TouchableOpacity>
        </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  qrCard: {
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  qrCardPattern: {
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
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  qrCode: {
    width: 180,
    height: 180,
    position: 'relative',
  },
  qrRow: {
    flexDirection: 'row',
    flex: 1,
  },
  qrCell: {
    flex: 1,
    margin: 1,
    borderRadius: 2,
  },
  qrCellFilled: {
    backgroundColor: Colors.light.primaryDark,
  },
  qrCellEmpty: {
    backgroundColor: 'transparent',
  },
  qrLogo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLogoText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  qrLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.9)',
  },
  detailsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.light.primaryDark,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(157, 193, 131, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.primaryDark,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(157, 193, 131, 0.1)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primaryDark,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: Colors.light.primaryDarker,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  shareButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
