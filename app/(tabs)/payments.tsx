import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import {
  User,
  Phone,
  CreditCard,
  QrCode,
  Send,
  Check,
  X,
  DollarSign,
  FileText,
  Flashlight,
  FlashlightOff,
  ImagePlus,
  Nfc,
  Bluetooth,
  Hash,
} from 'lucide-react-native';
import Colors from '@/constants/colors';

const { width } = Dimensions.get('window');
const SCAN_FRAME_SIZE = width * 0.7;

type PaymentMethod = 'nickname' | 'phone' | 'card';

interface ScannedPaymentData {
  recipient: string;
  amount?: string;
  currency?: string;
  note?: string;
}

export default function PaymentsScreen() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('nickname');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanLinePosition] = useState(new Animated.Value(0));

  const [permission, requestPermission] = useCameraPermissions();

  const modalAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;

  const isFormValid = recipient.length > 0 && parseFloat(amount) > 0;

  useEffect(() => {
    if (showScanner) {
      scanLinePosition.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLinePosition, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLinePosition, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showScanner, scanLinePosition]);



  const getPlaceholder = () => {
    switch (paymentMethod) {
      case 'nickname': return '@username';
      case 'phone': return '+1 234 567 8900';
      case 'card': return '4532 8721 5643 1234';
    }
  };

  const getIcon = () => {
    switch (paymentMethod) {
      case 'nickname': return <User size={20} color={Colors.light.textMuted} />;
      case 'phone': return <Phone size={20} color={Colors.light.textMuted} />;
      case 'card': return <CreditCard size={20} color={Colors.light.textMuted} />;
    }
  };

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].slice(0, 2);
    }
    return cleaned;
  };

  const handleSend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowConfirmation(true);
    Animated.spring(modalAnim, {
      toValue: 1,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const handleConfirm = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowConfirmation(false);
      setShowSuccess(true);
      
      Animated.sequence([
        Animated.spring(successAnim, {
          toValue: 1,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.spring(checkmarkAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        closeSuccess();
      }, 2500);
    });
  };

  const closeConfirmation = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowConfirmation(false));
  };

  const closeSuccess = () => {
    Animated.timing(successAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowSuccess(false);
      checkmarkAnim.setValue(0);
      setRecipient('');
      setAmount('');
      setNote('');
    });
  };

  const handleScanQR = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        return;
      }
    }
    setScanned(false);
    setShowScanner(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const parseQRPaymentData = (qrString: string): ScannedPaymentData => {
    console.log('Parsing QR code:', qrString);
    
    try {
      if (qrString.startsWith('XJO:pay?') || qrString.includes('recipient=')) {
        const queryString = qrString.includes('?') ? qrString.split('?')[1] : qrString;
        const params = new URLSearchParams(queryString);
        return {
          recipient: params.get('recipient') || qrString,
          amount: params.get('amount') || undefined,
          currency: params.get('currency') || 'USD',
          note: params.get('note') || undefined,
        };
      }

      if (qrString.startsWith('{')) {
        const parsed = JSON.parse(qrString);
        return {
          recipient: parsed.recipient || parsed.to || parsed.user || qrString,
          amount: parsed.amount?.toString(),
          currency: parsed.currency || 'USD',
          note: parsed.note || parsed.message,
        };
      }

      return { recipient: qrString };
    } catch (error) {
      console.log('QR parse error, using raw value:', error);
      return { recipient: qrString };
    }
  };

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    console.log('Barcode scanned:', result.data);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    const paymentData = parseQRPaymentData(result.data);
    
    setTimeout(() => {
      setRecipient(paymentData.recipient);
      if (paymentData.amount) {
        setAmount(paymentData.amount);
      }
      if (paymentData.note) {
        setNote(paymentData.note);
      }
      setShowScanner(false);
      setTorchEnabled(false);
    }, 500);
  };

  const closeScanner = () => {
    setShowScanner(false);
    setTorchEnabled(false);
    setScanned(false);
  };

  const renderPaymentMethods = () => (
    <View style={styles.methodsContainer}>
      {[
        { key: 'nickname' as PaymentMethod, label: 'Nickname', icon: User },
        { key: 'phone' as PaymentMethod, label: 'Phone', icon: Phone },
        { key: 'card' as PaymentMethod, label: 'Card', icon: CreditCard },
      ].map((method) => (
        <TouchableOpacity
          key={method.key}
          style={[
            styles.methodButton,
            paymentMethod === method.key && styles.methodButtonActive,
          ]}
          onPress={() => {
            setPaymentMethod(method.key);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.7}
        >
          <method.icon
            size={20}
            color={paymentMethod === method.key ? Colors.light.white : Colors.light.textSecondary}
          />
          <Text
            style={[
              styles.methodText,
              paymentMethod === method.key && styles.methodTextActive,
            ]}
          >
            {method.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderConfirmationModal = () => (
    <Modal visible={showConfirmation} transparent animationType="none">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={closeConfirmation}
      >
        <Animated.View
          style={[
            styles.modalContent,
            {
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
            <TouchableOpacity style={styles.modalCloseButton} onPress={closeConfirmation}>
              <X size={20} color={Colors.light.textMuted} />
            </TouchableOpacity>
            
            <View style={styles.modalHeader}>
              <View style={styles.modalLogoMark}>
                <Text style={styles.modalLogoText}>XJO</Text>
              </View>
              <Text style={styles.modalTitle}>Confirm Payment</Text>
            </View>
            
            <View style={styles.confirmDetails}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Recipient</Text>
                <Text style={styles.confirmValue}>{recipient}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Amount</Text>
                <Text style={styles.confirmAmount}>${amount}</Text>
              </View>
              {note ? (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Note</Text>
                  <Text style={styles.confirmValue}>{note}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={closeConfirmation}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirm}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSuccessModal = () => (
    <Modal visible={showSuccess} transparent animationType="none">
      <View style={styles.successOverlay}>
        <Animated.View
          style={[
            styles.successContent,
            {
              opacity: successAnim,
              transform: [
                {
                  scale: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.successIcon,
              {
                transform: [{ scale: checkmarkAnim }],
              },
            ]}
          >
            <Check size={48} color={Colors.light.white} />
          </Animated.View>
          <Text style={styles.successTitle}>Payment Sent!</Text>
          <Text style={styles.successDescription}>
            ${amount} has been sent to {recipient}
          </Text>
          <Text style={styles.transactionId}>
            Transaction ID: XJO-{Date.now().toString(36).toUpperCase()}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderScannerModal = () => {
    const scanLineTranslate = scanLinePosition.interpolate({
      inputRange: [0, 1],
      outputRange: [0, SCAN_FRAME_SIZE - 4],
    });

    return (
      <Modal visible={showScanner} animationType="slide">
        <View style={styles.scannerContainer}>
          {Platform.OS === 'web' ? (
            <View style={styles.webFallback}>
              <SafeAreaView style={styles.scannerSafeArea}>
                <View style={styles.scannerHeader}>
                  <TouchableOpacity
                    style={styles.scannerCloseButton}
                    onPress={closeScanner}
                  >
                    <X size={24} color={Colors.light.white} />
                  </TouchableOpacity>
                  <View style={styles.scannerLogoContainer}>
                    <Text style={styles.scannerLogoText}>XJO</Text>
                  </View>
                  <View style={{ width: 44 }} />
                </View>

                <View style={styles.webFallbackContent}>
                  <View style={styles.webFallbackIcon}>
                    <QrCode size={64} color={Colors.light.primary} />
                  </View>
                  <Text style={styles.webFallbackTitle}>Camera not available on web</Text>
                  <Text style={styles.webFallbackText}>
                    QR scanning requires a native device. Use the demo scan below to test the feature.
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.demoScanButton}
                    onPress={() => {
                      const demoData: ScannedPaymentData = {
                        recipient: '@john_doe',
                        amount: '50.00',
                        note: 'Coffee payment',
                      };
                      setRecipient(demoData.recipient);
                      setAmount(demoData.amount || '');
                      setNote(demoData.note || '');
                      setShowScanner(false);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                  >
                    <QrCode size={20} color={Colors.light.white} />
                    <Text style={styles.demoScanButtonText}>Demo Scan</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          ) : (
            <>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                enableTorch={torchEnabled}
              />
              
              <SafeAreaView style={styles.scannerSafeArea}>
                <View style={styles.scannerHeader}>
                  <TouchableOpacity
                    style={styles.scannerCloseButton}
                    onPress={closeScanner}
                  >
                    <X size={24} color={Colors.light.white} />
                  </TouchableOpacity>
                  <View style={styles.scannerLogoContainer}>
                    <Text style={styles.scannerLogoText}>XJO</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.scannerCloseButton}
                    onPress={() => {
                      setTorchEnabled(!torchEnabled);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    {torchEnabled ? (
                      <FlashlightOff size={24} color={Colors.light.primary} />
                    ) : (
                      <Flashlight size={24} color={Colors.light.white} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.scannerContent}>
                  <View style={styles.scannerOverlay}>
                    <View style={styles.scannerOverlayTop} />
                    <View style={styles.scannerOverlayMiddle}>
                      <View style={styles.scannerOverlaySide} />
                      <View style={styles.scannerFrame}>
                        <View style={[styles.scannerCorner, styles.cornerTopLeft]} />
                        <View style={[styles.scannerCorner, styles.cornerTopRight]} />
                        <View style={[styles.scannerCorner, styles.cornerBottomLeft]} />
                        <View style={[styles.scannerCorner, styles.cornerBottomRight]} />
                        
                        <Animated.View
                          style={[
                            styles.scanLine,
                            {
                              transform: [{ translateY: scanLineTranslate }],
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.scannerOverlaySide} />
                    </View>
                    <View style={styles.scannerOverlayBottom} />
                  </View>
                </View>

                <View style={styles.scannerFooter}>
                  <Text style={styles.scannerInstructions}>
                    Point camera at QR code
                  </Text>
                  <Text style={styles.scannerHint}>
                    Hold steady for best results
                  </Text>

                  <TouchableOpacity style={styles.uploadButton}>
                    <ImagePlus size={20} color={Colors.light.white} />
                    <Text style={styles.uploadButtonText}>Upload QR Image</Text>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>

              {scanned && (
                <View style={styles.scannedOverlay}>
                  <View style={styles.scannedIcon}>
                    <Check size={48} color={Colors.light.white} />
                  </View>
                  <Text style={styles.scannedText}>QR Code Detected!</Text>
                </View>
              )}
            </>
          )}
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerLogoMark}>
                <Text style={styles.headerLogoText}>XJO</Text>
              </View>
              <View>
                <Text style={styles.title}>Send Payment</Text>
                <Text style={styles.subtitle}>Fast & secure with XJO</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.headerQrButton}
              onPress={handleScanQR}
            >
              <QrCode size={22} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderPaymentMethods()}

            <View style={styles.quickActionsRow}>
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={handleScanQR}
                activeOpacity={0.8}
              >
                <View style={styles.quickActionIconContainer}>
                  <QrCode size={24} color={Colors.light.white} />
                </View>
                <Text style={styles.quickActionTitle}>Scan QR</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.quickActionCard, styles.quickActionCardAlt]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/payment-request');
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.quickActionIconContainer, styles.quickActionIconAlt]}>
                  <Hash size={24} color={Colors.light.primaryDark} />
                </View>
                <Text style={[styles.quickActionTitle, styles.quickActionTitleAlt]}>Request</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.advancedPayCard}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/payment-request');
              }}
              activeOpacity={0.8}
            >
              <View style={styles.advancedPayContent}>
                <View style={styles.advancedPayIcons}>
                  <View style={styles.advancedPayIcon}>
                    <Nfc size={18} color={Colors.light.white} />
                  </View>
                  <View style={[styles.advancedPayIcon, styles.advancedPayIconMiddle]}>
                    <Bluetooth size={18} color={Colors.light.white} />
                  </View>
                  <View style={styles.advancedPayIcon}>
                    <Hash size={18} color={Colors.light.white} />
                  </View>
                </View>
                <View style={styles.advancedPayText}>
                  <Text style={styles.advancedPayTitle}>Advanced Payment</Text>
                  <Text style={styles.advancedPayDescription}>
                    NFC, Bluetooth, or Code payment
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recipient</Text>
                <View style={styles.inputWrapper}>
                  {getIcon()}
                  <TextInput
                    style={styles.input}
                    placeholder={getPlaceholder()}
                    placeholderTextColor={Colors.light.textMuted}
                    value={recipient}
                    onChangeText={setRecipient}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.qrButton}
                    onPress={handleScanQR}
                  >
                    <QrCode size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount</Text>
                <View style={styles.inputWrapper}>
                  <DollarSign size={20} color={Colors.light.textMuted} />
                  <TextInput
                    style={[styles.input, styles.amountInput]}
                    placeholder="0.00"
                    placeholderTextColor={Colors.light.textMuted}
                    value={amount}
                    onChangeText={(text) => setAmount(formatAmount(text))}
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyText}>USD</Text>
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Note (optional)</Text>
                <View style={styles.inputWrapper}>
                  <FileText size={20} color={Colors.light.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="What's this for?"
                    placeholderTextColor={Colors.light.textMuted}
                    value={note}
                    onChangeText={setNote}
                    maxLength={100}
                  />
                </View>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Demo Mode</Text>
              <Text style={styles.infoText}>
                This is a demo payment screen. No real money will be transferred.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                !isFormValid && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!isFormValid}
              activeOpacity={0.8}
            >
              <Send size={20} color={Colors.light.white} />
              <Text style={styles.sendButtonText}>Send Payment</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {renderConfirmationModal()}
        {renderSuccessModal()}
        {renderScannerModal()}
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.light.white,
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  headerQrButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  methodsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  methodButtonActive: {
    backgroundColor: Colors.light.primaryDark,
    borderColor: Colors.light.primaryDark,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  methodTextActive: {
    color: Colors.light.white,
  },
  scanQrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 16,
  },
  scanQrIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanQrTextContainer: {
    flex: 1,
  },
  scanQrTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.white,
    marginBottom: 4,
  },
  scanQrDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.primary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '600' as const,
  },
  qrButton: {
    padding: 8,
  },
  currencyBadge: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  infoCard: {
    backgroundColor: 'rgba(157, 193, 131, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sendButton: {
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
  sendButtonDisabled: {
    backgroundColor: Colors.light.textMuted,
    shadowOpacity: 0,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.light.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1C2128',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalLogoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalLogoText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.light.white,
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  confirmDetails: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  confirmLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  confirmAmount: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.light.primaryDark,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: Colors.light.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.light.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.light.white,
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  transactionId: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerSafeArea: {
    flex: 1,
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scannerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerLogoContainer: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  scannerLogoText: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.light.white,
    letterSpacing: 2,
  },
  scannerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scannerOverlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scannerOverlayMiddle: {
    flexDirection: 'row',
    height: SCAN_FRAME_SIZE,
  },
  scannerOverlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scannerOverlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scannerFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  scannerCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.light.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  scannerFooter: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scannerInstructions: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.light.white,
    marginBottom: 8,
  },
  scannerHint: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 24,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  uploadButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scannedText: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  webFallback: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  webFallbackContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  webFallbackIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(157, 193, 131, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  webFallbackTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  webFallbackText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  demoScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryDark,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
  },
  demoScanButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.light.primaryDark,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  quickActionCardAlt: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIconAlt: {
    backgroundColor: 'rgba(157, 193, 131, 0.15)',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  quickActionTitleAlt: {
    color: '#FFFFFF',
  },
  advancedPayCard: {
    backgroundColor: Colors.light.primaryDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  advancedPayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  advancedPayIcons: {
    flexDirection: 'row',
  },
  advancedPayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedPayIconMiddle: {
    marginLeft: -8,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  advancedPayText: {
    flex: 1,
  },
  advancedPayTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.white,
    marginBottom: 4,
  },
  advancedPayDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
});
