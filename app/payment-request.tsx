import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Device from 'expo-device';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import {
  ArrowLeft,
  Nfc,
  Bluetooth,
  Hash,
  Send,
  Check,
  Smartphone,
  Wifi,
  Clock,
  Copy,
  Share2,
  RefreshCw,
  AlertCircle,
  QrCode,
  User,
  X,
  CheckCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet, CURRENCY_INFO } from '@/contexts/WalletContext';
import { trpc } from '@/lib/trpc';
import { PaymentMethod } from '@/types/payment';
import { CurrencyCode } from '@/types';
import { formatExpirationTime } from '@/utils/paymentSecurity';
import { Image } from 'expo-image';
import { ChevronDown, AlertTriangle } from 'lucide-react-native';

interface NearbyUser {
  id: string;
  name: string;
  deviceName: string;
  signalStrength: number;
}

interface PendingPaymentRequest {
  id: string;
  senderId: string;
  senderName: string;
  amount: number;
  currency: string;
  note?: string;
}

const SUPPORTED_CURRENCIES: CurrencyCode[] = ['USD', 'BTC', 'ETH', 'SOL', 'USDT', 'BNB'];

export default function PaymentRequestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { sendPayment, receivePayment, getBalance, hasEnoughBalance, convertAmount, getUsdRate } = useWallet();
  
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('code');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [step, setStep] = useState<'input' | 'processing' | 'waiting' | 'success'>('input');
  
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [codeExpiresAt, setCodeExpiresAt] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<string>('10:00');
  
  const [inputCode, setInputCode] = useState<string>('');
  const [isReceiveMode, setIsReceiveMode] = useState(false);
  
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [nearbyConnectionStatus, setNearbyConnectionStatus] = useState<'idle' | 'sending' | 'waiting' | 'accepted' | 'rejected'>('idle');
  const [currentRequestId, setCurrentRequestId] = useState<string>('');
  
  const [pendingRequests, setPendingRequests] = useState<PendingPaymentRequest[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  
  const [nfcStatus, setNfcStatus] = useState<'idle' | 'searching' | 'found' | 'transferring'>('idle');
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const codeInputRefs = useRef<TextInput[]>([]);
  
  const generateCodeMutation = trpc.payment.generateCode.useMutation();
  const verifyCodeMutation = trpc.payment.verifyCode.useMutation();
  const registerNearbyMutation = trpc.payment.registerNearby.useMutation();
  const unregisterNearbyMutation = trpc.payment.unregisterNearby.useMutation();
  const heartbeatMutation = trpc.payment.heartbeat.useMutation();
  const sendNearbyPaymentMutation = trpc.payment.sendNearbyPayment.useMutation();
  const respondToNearbyPaymentMutation = trpc.payment.respondToNearbyPayment.useMutation();
  
  const trpcUtils = trpc.useUtils();

  const deviceName = Device.deviceName || `${Device.brand || 'Device'} ${Device.modelName || ''}`.trim() || 'Unknown Device';

  useEffect(() => {
    if (selectedMethod === 'ble' && user) {
      registerNearbyMutation.mutate({
        userId: user.id,
        userName: user.fullName,
        deviceName: deviceName,
      });

      const heartbeatInterval = setInterval(() => {
        heartbeatMutation.mutate({ userId: user.id });
      }, 5000);

      return () => {
        clearInterval(heartbeatInterval);
        unregisterNearbyMutation.mutate({ userId: user.id });
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMethod, user?.id]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (selectedMethod === 'ble' && user && isScanning) {
      const fetchNearbyUsers = async () => {
        try {
          const result = await trpcUtils.payment.getNearbyUsers.fetch({ userId: user.id });
          setNearbyUsers(result.users);
        } catch (error) {
          console.log('Error fetching nearby users:', error);
        }
      };
      
      fetchNearbyUsers();
      interval = setInterval(fetchNearbyUsers, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMethod, user?.id, isScanning]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (selectedMethod === 'ble' && user) {
      const fetchPendingRequests = async () => {
        try {
          const result = await trpcUtils.payment.getPendingNearbyPayments.fetch({ userId: user.id });
          if (result.requests.length > 0) {
            setPendingRequests(result.requests);
            setShowPendingModal(true);
          }
        } catch (error) {
          console.log('Error fetching pending requests:', error);
        }
      };
      
      fetchPendingRequests();
      interval = setInterval(fetchPendingRequests, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMethod, user?.id]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (currentRequestId && nearbyConnectionStatus === 'waiting') {
      const checkStatus = async () => {
        try {
          const result = await trpcUtils.payment.getNearbyPaymentStatus.fetch({ requestId: currentRequestId });
          if (result.found) {
            if (result.status === 'accepted' || result.status === 'completed') {
              setNearbyConnectionStatus('accepted');
              const pAmount = parseFloat(amount);
              if (pAmount > 0) {
                sendPayment(selectedCurrency, pAmount, selectedUser?.name || 'Unknown', note || undefined);
              }
              setTransactionId(`TXN_${Date.now().toString(36).toUpperCase()}`);
              showSuccessAnimation();
            } else if (result.status === 'rejected') {
              setNearbyConnectionStatus('rejected');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Payment Rejected', 'The recipient rejected your payment request.');
              setSelectedUser(null);
              setNearbyConnectionStatus('idle');
              setCurrentRequestId('');
            }
          }
        } catch (error) {
          console.log('Error checking payment status:', error);
        }
      };
      
      checkStatus();
      interval = setInterval(checkStatus, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRequestId, nearbyConnectionStatus]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (codeExpiresAt > 0 && step === 'waiting') {
      interval = setInterval(() => {
        const remaining = formatExpirationTime(codeExpiresAt);
        setTimeRemaining(remaining);
        if (remaining === 'Expired') {
          setStep('input');
          setGeneratedCode('');
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [codeExpiresAt, step]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (generatedCode && step === 'waiting' && selectedMethod === 'code') {
      const checkCodeStatus = async () => {
        try {
          const result = await trpcUtils.payment.getPaymentStatus.fetch({ code: generatedCode });
          if (result.exists && result.status === 'matched') {
            const pAmount = parseFloat(amount);
            if (pAmount > 0) {
              sendPayment(selectedCurrency, pAmount, (result as any).recipientName || 'Code Recipient', note || undefined);
            }
            setTransactionId(`TXN_${Date.now().toString(36).toUpperCase()}`);
            showSuccessAnimation();
          }
        } catch (error) {
          console.log('Error checking code status:', error);
        }
      };
      
      interval = setInterval(checkCodeStatus, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedCode, step, selectedMethod]);

  const startNFCPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const startScanAnimation = useCallback(() => {
    scanAnim.setValue(0);
    Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [scanAnim]);

  useEffect(() => {
    if (step === 'waiting' && selectedMethod === 'nfc') {
      startNFCPulse();
    }
  }, [step, selectedMethod, startNFCPulse]);

  useEffect(() => {
    if (isScanning) {
      startScanAnimation();
    }
  }, [isScanning, startScanAnimation]);

  const formatAmount = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    const maxDecimals = selectedCurrency === 'USD' ? 2 : 8;
    if (parts[1] && parts[1].length > maxDecimals) {
      return parts[0] + '.' + parts[1].slice(0, maxDecimals);
    }
    return cleaned;
  };

  const currentBalance = getBalance(selectedCurrency);
  const parsedAmount = parseFloat(amount) || 0;
  const insufficientBalance = parsedAmount > 0 && parsedAmount > currentBalance;

  const handleGenerateCode = async () => {
    if (!user || !amount) return;
    
    if (insufficientBalance) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Insufficient Balance', `You don't have enough ${selectedCurrency}. Available: ${currentBalance.toFixed(selectedCurrency === 'USD' ? 2 : 8)} ${selectedCurrency}`);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('processing');
    
    try {
      const result = await generateCodeMutation.mutateAsync({
        senderId: user.id,
        senderName: user.fullName,
        amount: parseFloat(amount),
        currency: selectedCurrency,
        note: note || undefined,
      });
      
      if (result.success) {
        setGeneratedCode(result.code);
        setCodeExpiresAt(result.expiresAt);
        setStep('waiting');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error generating code:', error);
      setStep('input');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleVerifyCode = async () => {
    if (!user || inputCode.length !== 6) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const result = await verifyCodeMutation.mutateAsync({
        code: inputCode,
        recipientId: user.id,
        recipientName: user.fullName,
      });
      
      if (result.success && result.paymentData) {
        const pCurrency = (result.paymentData.currency || 'USD') as CurrencyCode;
        receivePayment(pCurrency, result.paymentData.amount, result.paymentData.senderName, result.paymentData.note);
        setTransactionId(`TXN_${Date.now().toString(36).toUpperCase()}`);
        showSuccessAnimation();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', result.error || 'Invalid code');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to verify code');
    }
  };

  const handleStartNearbyScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsScanning(true);
    setNearbyUsers([]);
  };

  const handleStopNearbyScan = () => {
    setIsScanning(false);
    scanAnim.setValue(0);
  };

  const handleSelectNearbyUser = async (nearbyUser: NearbyUser) => {
    if (!user || !amount) return;
    
    if (insufficientBalance) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Insufficient Balance', `You don't have enough ${selectedCurrency}.`);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedUser(nearbyUser);
    setNearbyConnectionStatus('sending');
    
    try {
      const result = await sendNearbyPaymentMutation.mutateAsync({
        senderId: user.id,
        senderName: user.fullName,
        recipientId: nearbyUser.id,
        amount: parseFloat(amount),
        currency: selectedCurrency,
        note: note || undefined,
      });
      
      if (result.success) {
        setCurrentRequestId(result.requestId);
        setNearbyConnectionStatus('waiting');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error sending nearby payment:', error);
      setNearbyConnectionStatus('idle');
      setSelectedUser(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to send payment request');
    }
  };

  const handleRespondToRequest = async (request: PendingPaymentRequest, accept: boolean) => {
    if (!user) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const result = await respondToNearbyPaymentMutation.mutateAsync({
        requestId: request.id,
        recipientId: user.id,
        accept,
      });
      
      if (result.success) {
        setPendingRequests(prev => prev.filter(r => r.id !== request.id));
        if (pendingRequests.length <= 1) {
          setShowPendingModal(false);
        }
        
        if (accept) {
          const pCurrency = (request.currency || 'USD') as CurrencyCode;
          receivePayment(pCurrency, request.amount, request.senderName, request.note);
          setAmount(request.amount.toString());
          setTransactionId(`TXN_${Date.now().toString(36).toUpperCase()}`);
          showSuccessAnimation();
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleStartNFC = () => {
    if (!amount) return;
    
    if (insufficientBalance) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Insufficient Balance', `You don't have enough ${selectedCurrency}.`);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('waiting');
    setNfcStatus('searching');
    
    setTimeout(() => {
      setNfcStatus('found');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 3000);
    
    setTimeout(() => {
      setNfcStatus('transferring');
    }, 3500);
    
    setTimeout(() => {
      const sent = sendPayment(selectedCurrency, parseFloat(amount), 'NFC Recipient', note || undefined);
      if (sent) {
        setTransactionId(`TXN_${Date.now().toString(36).toUpperCase()}`);
        showSuccessAnimation();
      } else {
        setStep('input');
        setNfcStatus('idle');
        Alert.alert('Payment Failed', 'Insufficient balance');
      }
    }, 4500);
  };

  const showSuccessAnimation = () => {
    setShowSuccess(true);
    Animated.spring(successAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setTimeout(() => {
      router.back();
    }, 3000);
  };

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(generatedCode);
      setCodeCopied(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const handleShareCode = async () => {
    try {
      const currSymbol = CURRENCY_INFO[selectedCurrency].symbol;
      await Share.share({
        message: `Pay me ${currSymbol}${amount} ${selectedCurrency} using code: ${generatedCode}\n\nOpen XJO app and enter this code to complete the payment.`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const renderMethodTabs = () => (
    <View style={styles.methodTabs}>
      {[
        { key: 'nfc' as PaymentMethod, label: 'NFC Pay', icon: Nfc, disabled: Platform.OS === 'web' },
        { key: 'ble' as PaymentMethod, label: 'Nearby', icon: Bluetooth },
        { key: 'code' as PaymentMethod, label: 'Code Pay', icon: Hash },
      ].map((method) => (
        <TouchableOpacity
          key={method.key}
          style={[
            styles.methodTab,
            selectedMethod === method.key && styles.methodTabActive,
            method.disabled && styles.methodTabDisabled,
          ]}
          onPress={() => {
            if (!method.disabled) {
              setSelectedMethod(method.key);
              setStep('input');
              setIsScanning(false);
              setSelectedUser(null);
              setNearbyConnectionStatus('idle');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          disabled={method.disabled}
        >
          <method.icon
            size={20}
            color={
              method.disabled
                ? Colors.light.textMuted
                : selectedMethod === method.key
                ? Colors.light.white
                : Colors.light.textSecondary
            }
          />
          <Text
            style={[
              styles.methodTabText,
              selectedMethod === method.key && styles.methodTabTextActive,
              method.disabled && styles.methodTabTextDisabled,
            ]}
          >
            {method.label}
          </Text>
          {method.disabled && (
            <View style={styles.webBadge}>
              <Text style={styles.webBadgeText}>Native</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCurrencyPicker = () => (
    <Modal visible={showCurrencyPicker} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
              <X size={24} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {SUPPORTED_CURRENCIES.map((curr) => {
              const info = CURRENCY_INFO[curr];
              const bal = getBalance(curr);
              return (
                <TouchableOpacity
                  key={curr}
                  style={[
                    styles.currencyOption,
                    selectedCurrency === curr && styles.currencyOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedCurrency(curr);
                    setShowCurrencyPicker(false);
                    setAmount('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Image source={{ uri: info.icon }} style={styles.currencyIcon} contentFit="contain" />
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyName}>{info.name}</Text>
                    <Text style={styles.currencyBalance}>
                      Balance: {curr === 'USD' ? `${bal.toFixed(2)}` : `${bal.toFixed(8)} ${curr}`}
                    </Text>
                  </View>
                  <Text style={styles.currencyCode}>{curr}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderAmountInput = () => (
    <View style={styles.amountCard}>
      <View style={styles.amountHeader}>
        <Text style={styles.amountLabel}>Amount to Send</Text>
        <TouchableOpacity
          style={styles.currencySelector}
          onPress={() => setShowCurrencyPicker(true)}
        >
          <Image source={{ uri: CURRENCY_INFO[selectedCurrency].icon }} style={styles.currencySelectorIcon} contentFit="contain" />
          <Text style={styles.currencySelectorText}>{selectedCurrency}</Text>
          <ChevronDown size={16} color={Colors.light.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={styles.amountInputWrapper}>
        <Text style={styles.currencySymbol}>{CURRENCY_INFO[selectedCurrency].symbol}</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0.00"
          placeholderTextColor={Colors.light.textMuted}
          value={amount}
          onChangeText={(text) => setAmount(formatAmount(text))}
          keyboardType="decimal-pad"
        />
      </View>
      <View style={styles.balanceRow}>
        <Text style={styles.balanceText}>
          Available: {selectedCurrency === 'USD' ? `${currentBalance.toFixed(2)}` : `${currentBalance.toFixed(8)} ${selectedCurrency}`}
        </Text>
        {insufficientBalance && (
          <View style={styles.insufficientBadge}>
            <AlertTriangle size={12} color={Colors.light.error} />
            <Text style={styles.insufficientText}>Insufficient</Text>
          </View>
        )}
      </View>
      <View style={styles.noteInputWrapper}>
        <TextInput
          style={styles.noteInput}
          placeholder="Add a note (optional)"
          placeholderTextColor={Colors.light.textMuted}
          value={note}
          onChangeText={setNote}
          maxLength={100}
        />
      </View>
    </View>
  );

  const renderNFCContent = () => {
    if (step === 'waiting') {
      return (
        <View style={styles.nfcWaiting}>
          <Animated.View
            style={[
              styles.nfcPulseRing,
              { transform: [{ scale: pulseAnim }], opacity: pulseAnim.interpolate({
                inputRange: [1, 1.3],
                outputRange: [0.6, 0],
              }) },
            ]}
          />
          <View style={styles.nfcIconContainer}>
            <Nfc size={48} color={Colors.light.white} />
          </View>
          <Text style={styles.nfcTitle}>
            {nfcStatus === 'searching' && 'Hold devices together'}
            {nfcStatus === 'found' && 'Device found!'}
            {nfcStatus === 'transferring' && 'Transferring...'}
          </Text>
          <Text style={styles.nfcSubtitle}>
            {nfcStatus === 'searching' && 'Bring the other device close to transfer payment'}
            {nfcStatus === 'found' && 'Establishing secure connection'}
            {nfcStatus === 'transferring' && 'Encrypting and sending payment data'}
          </Text>
          
          {nfcStatus !== 'searching' && (
            <View style={styles.nfcProgress}>
              <View style={styles.nfcProgressBar}>
                <View style={[
                  styles.nfcProgressFill,
                  { width: nfcStatus === 'found' ? '50%' : '100%' }
                ]} />
              </View>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setStep('input');
              setNfcStatus('idle');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.methodContent}>
        {renderAmountInput()}
        
        <View style={styles.nfcInfoCard}>
          <View style={styles.nfcInfoIcon}>
            <Smartphone size={32} color={Colors.light.primary} />
          </View>
          <Text style={styles.nfcInfoTitle}>How NFC Pay Works</Text>
          <Text style={styles.nfcInfoText}>
            Hold your device near the recipient phone. Payment data is securely transferred via NFC.
          </Text>
          {Platform.OS === 'ios' && (
            <View style={styles.iosNote}>
              <AlertCircle size={16} color={Colors.light.warning} />
              <Text style={styles.iosNoteText}>
                iOS has limited NFC support. QR code will be shown as fallback.
              </Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity
          style={[styles.startButton, !amount && styles.startButtonDisabled]}
          onPress={handleStartNFC}
          disabled={!amount}
        >
          <Nfc size={20} color={Colors.light.white} />
          <Text style={styles.startButtonText}>Start NFC Transfer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderNearbyContent = () => {
    if (selectedUser && nearbyConnectionStatus !== 'idle') {
      return (
        <View style={styles.nearbyConnecting}>
          <View style={styles.deviceCard}>
            <View style={styles.deviceAvatar}>
              <User size={24} color={Colors.light.white} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={styles.deviceName}>{selectedUser.name}</Text>
              <Text style={styles.deviceId}>{selectedUser.deviceName}</Text>
            </View>
            <View style={[
              styles.connectionBadge,
              nearbyConnectionStatus === 'waiting' && styles.connectionBadgeWaiting,
              nearbyConnectionStatus === 'accepted' && styles.connectionBadgeConnected,
            ]}>
              {nearbyConnectionStatus === 'sending' && (
                <ActivityIndicator size="small" color={Colors.light.primary} />
              )}
              {nearbyConnectionStatus === 'waiting' && (
                <Clock size={16} color={Colors.light.warning} />
              )}
              {nearbyConnectionStatus === 'accepted' && (
                <Check size={16} color={Colors.light.success} />
              )}
            </View>
          </View>
          
          <View style={styles.connectionStatus}>
            <Text style={styles.connectionStatusText}>
              {nearbyConnectionStatus === 'sending' && 'Sending request...'}
              {nearbyConnectionStatus === 'waiting' && 'Waiting for acceptance...'}
              {nearbyConnectionStatus === 'accepted' && 'Payment accepted!'}
            </Text>
            <View style={styles.nearbyProgressBar}>
              <Animated.View style={[
                styles.nearbyProgressFill,
                { width: nearbyConnectionStatus === 'sending' ? '30%' : nearbyConnectionStatus === 'waiting' ? '60%' : '100%' }
              ]} />
            </View>
          </View>
          
          <View style={styles.paymentSummary}>
            <Text style={styles.paymentSummaryLabel}>Amount</Text>
            <Text style={styles.paymentSummaryAmount}>${amount}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setSelectedUser(null);
              setNearbyConnectionStatus('idle');
              setCurrentRequestId('');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.methodContent}>
        {renderAmountInput()}
        
        <View style={styles.nearbySection}>
          <View style={styles.nearbySectionHeader}>
            <Text style={styles.nearbySectionTitle}>Nearby Users</Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={isScanning ? handleStopNearbyScan : handleStartNearbyScan}
            >
              {isScanning ? (
                <X size={18} color={Colors.light.error} />
              ) : (
                <RefreshCw size={18} color={Colors.light.primary} />
              )}
            </TouchableOpacity>
          </View>
          
          {!isScanning && nearbyUsers.length === 0 && (
            <View style={styles.nearbyEmpty}>
              <Wifi size={48} color={Colors.light.textMuted} />
              <Text style={styles.nearbyEmptyText}>No users found nearby</Text>
              <Text style={styles.nearbyEmptySubtext}>Make sure other users have the app open with Nearby tab selected</Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={handleStartNearbyScan}
              >
                <Bluetooth size={18} color={Colors.light.white} />
                <Text style={styles.scanButtonText}>Start Discovery</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {isScanning && nearbyUsers.length === 0 && (
            <View style={styles.scanning}>
              <Animated.View style={[
                styles.scanRing,
                { transform: [{ rotate: scanAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }) }] }
              ]}>
                <Bluetooth size={24} color={Colors.light.primary} />
              </Animated.View>
              <Text style={styles.scanningText}>Searching for nearby users...</Text>
              <Text style={styles.scanningSubtext}>Other users need to have the app open</Text>
            </View>
          )}
          
          {nearbyUsers.map((nearbyUser) => (
            <TouchableOpacity
              key={nearbyUser.id}
              style={styles.nearbyDevice}
              onPress={() => handleSelectNearbyUser(nearbyUser)}
              disabled={!amount}
            >
              <View style={styles.deviceAvatar}>
                <User size={20} color={Colors.light.white} />
              </View>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{nearbyUser.name}</Text>
                <Text style={styles.deviceId}>{nearbyUser.deviceName}</Text>
              </View>
              <View style={styles.signalBars}>
                {[1, 2, 3].map((bar) => (
                  <View
                    key={bar}
                    style={[
                      styles.signalBar,
                      { height: bar * 6 },
                      nearbyUser.signalStrength > (100 - bar * 30) && styles.signalBarActive,
                    ]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          ))}
          
          {isScanning && nearbyUsers.length > 0 && (
            <View style={styles.scanningIndicator}>
              <ActivityIndicator size="small" color={Colors.light.primary} />
              <Text style={styles.scanningIndicatorText}>Scanning...</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderCodeContent = () => {
    if (step === 'waiting' && !isReceiveMode) {
      return (
        <View style={styles.codeWaiting}>
          <View style={styles.codeDisplay}>
            <View style={styles.codeDigits}>
              {generatedCode.split('').map((digit, index) => (
                <View key={index} style={styles.codeDigitBox}>
                  <Text style={styles.codeDigit}>{digit}</Text>
                </View>
              ))}
            </View>
            <View style={styles.codeTimer}>
              <Clock size={16} color={Colors.light.textSecondary} />
              <Text style={styles.codeTimerText}>Expires in {timeRemaining}</Text>
            </View>
          </View>
          
          <View style={styles.qrContainer}>
            <QRCodeDisplay
              value={JSON.stringify({
                type: 'XJO_PAYMENT',
                code: generatedCode,
                amount,
                sender: user?.fullName,
              })}
              size={180}
            />
          </View>
          
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeActionButton} onPress={handleCopyCode}>
              {codeCopied ? (
                <CheckCircle size={20} color={Colors.light.success} />
              ) : (
                <Copy size={20} color={Colors.light.primary} />
              )}
              <Text style={[styles.codeActionText, codeCopied && { color: Colors.light.success }]}>
                {codeCopied ? 'Copied!' : 'Copy'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.codeActionButton} onPress={handleShareCode}>
              <Share2 size={20} color={Colors.light.primary} />
              <Text style={styles.codeActionText}>Share</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.waitingInfo}>
            <Text style={styles.waitingTitle}>Waiting for recipient...</Text>
            <Text style={styles.waitingText}>
              Share the code above or let them scan the QR code
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setStep('input');
              setGeneratedCode('');
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (isReceiveMode) {
      return (
        <View style={styles.receiveMode}>
          <Text style={styles.receiveModeTitle}>Enter Payment Code</Text>
          <Text style={styles.receiveModeSubtitle}>
            Enter the 6-digit code from the sender
          </Text>
          
          <View style={styles.codeInputContainer}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View key={index} style={styles.codeInputBox}>
                <TextInput
                  ref={(ref) => {
                    if (ref) codeInputRefs.current[index] = ref;
                  }}
                  style={styles.codeInputDigit}
                  value={inputCode[index] || ''}
                  onChangeText={(text) => {
                    const newCode = inputCode.split('');
                    newCode[index] = text.slice(-1);
                    const joined = newCode.join('');
                    setInputCode(joined);
                    if (text && index < 5) {
                      codeInputRefs.current[index + 1]?.focus();
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !inputCode[index] && index > 0) {
                      codeInputRefs.current[index - 1]?.focus();
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={1}
                />
              </View>
            ))}
          </View>
          
          <TouchableOpacity
            style={[styles.verifyButton, inputCode.length !== 6 && styles.verifyButtonDisabled]}
            onPress={handleVerifyCode}
            disabled={inputCode.length !== 6 || verifyCodeMutation.isPending}
          >
            {verifyCodeMutation.isPending ? (
              <ActivityIndicator color={Colors.light.white} />
            ) : (
              <>
                <Check size={20} color={Colors.light.white} />
                <Text style={styles.verifyButtonText}>Verify Code</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => {
              setIsReceiveMode(false);
              setInputCode('');
            }}
          >
            <Text style={styles.switchModeText}>I want to send payment instead</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.methodContent}>
        {renderAmountInput()}
        
        <View style={styles.codeModeSwitch}>
          <TouchableOpacity
            style={[styles.modeButton, !isReceiveMode && styles.modeButtonActive]}
            onPress={() => setIsReceiveMode(false)}
          >
            <Send size={18} color={!isReceiveMode ? Colors.light.white : Colors.light.textSecondary} />
            <Text style={[styles.modeButtonText, !isReceiveMode && styles.modeButtonTextActive]}>
              Send Payment
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, isReceiveMode && styles.modeButtonActive]}
            onPress={() => setIsReceiveMode(true)}
          >
            <QrCode size={18} color={isReceiveMode ? Colors.light.white : Colors.light.textSecondary} />
            <Text style={[styles.modeButtonText, isReceiveMode && styles.modeButtonTextActive]}>
              Receive Payment
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.codeInfoCard}>
          <Hash size={32} color={Colors.light.primary} />
          <Text style={styles.codeInfoTitle}>How Code Pay Works</Text>
          <Text style={styles.codeInfoText}>
            Generate a 6-digit code and share it with the recipient. They enter the code in their app to complete the payment.
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.startButton, !amount && styles.startButtonDisabled]}
          onPress={handleGenerateCode}
          disabled={!amount || generateCodeMutation.isPending}
        >
          {generateCodeMutation.isPending ? (
            <ActivityIndicator color={Colors.light.white} />
          ) : (
            <>
              <Hash size={20} color={Colors.light.white} />
              <Text style={styles.startButtonText}>Generate Code</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderPendingRequestsModal = () => (
    <Modal visible={showPendingModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment Requests</Text>
            <TouchableOpacity onPress={() => setShowPendingModal(false)}>
              <X size={24} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScroll}>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestAvatar}>
                    <User size={20} color={Colors.light.white} />
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestSender}>{request.senderName}</Text>
                    <Text style={styles.requestNote}>{request.note || 'Payment request'}</Text>
                  </View>
                  <Text style={styles.requestAmount}>${request.amount.toFixed(2)}</Text>
                </View>
                
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRespondToRequest(request, false)}
                  >
                    <X size={18} color={Colors.light.error} />
                    <Text style={styles.rejectButtonText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleRespondToRequest(request, true)}
                  >
                    <Check size={18} color={Colors.light.white} />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
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
              transform: [{ scale: successAnim }],
            },
          ]}
        >
          <View style={styles.successIcon}>
            <Check size={48} color={Colors.light.white} />
          </View>
          <Text style={styles.successTitle}>Payment Sent!</Text>
          <Text style={styles.successAmount}>
            {CURRENCY_INFO[selectedCurrency].symbol}{amount} {selectedCurrency}
          </Text>
          <Text style={styles.successMethod}>
            via {selectedMethod === 'nfc' ? 'NFC' : selectedMethod === 'ble' ? 'Nearby' : 'Code'}
          </Text>
          <Text style={styles.transactionId}>
            Transaction: {transactionId}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.light.primaryDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Request</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderMethodTabs()}
          
          {selectedMethod === 'nfc' && renderNFCContent()}
          {selectedMethod === 'ble' && renderNearbyContent()}
          {selectedMethod === 'code' && renderCodeContent()}
        </ScrollView>
        
        {renderCurrencyPicker()}
        {renderPendingRequestsModal()}
        {renderSuccessModal()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  headerPlaceholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  methodTabActive: {
    backgroundColor: Colors.light.primaryDark,
  },
  methodTabDisabled: {
    opacity: 0.5,
  },
  methodTabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  methodTabTextActive: {
    color: Colors.light.white,
  },
  methodTabTextDisabled: {
    color: Colors.light.textMuted,
  },
  webBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.light.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  webBadgeText: {
    fontSize: 8,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  methodContent: {
    gap: 20,
  },
  amountCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  amountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  currencySelectorIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  currencySelectorText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  insufficientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.errorLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  insufficientText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.light.error,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  currencyOptionActive: {
    backgroundColor: 'rgba(157, 193, 131, 0.1)',
    borderRadius: 12,
  },
  currencyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  currencyBalance: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  currencyCode: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.light.textSecondary,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '300' as const,
    color: Colors.light.textMuted,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    padding: 0,
  },
  noteInputWrapper: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  noteInput: {
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
  },
  nfcInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nfcInfoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(157, 193, 131, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  nfcInfoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  nfcInfoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  iosNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 215, 148, 0.2)',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  iosNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  startButton: {
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
  startButtonDisabled: {
    backgroundColor: Colors.light.textMuted,
    shadowOpacity: 0,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  nfcWaiting: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  nfcPulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: Colors.light.primary,
    top: 20,
  },
  nfcIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.light.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  nfcTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  nfcSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  nfcProgress: {
    width: '80%',
    marginBottom: 32,
  },
  nfcProgressBar: {
    height: 6,
    backgroundColor: Colors.light.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  nfcProgressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 3,
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  nearbySection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  nearbySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nearbySectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  nearbyEmptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
    marginTop: 16,
    marginBottom: 4,
  },
  nearbyEmptySubtext: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  scanning: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  scanRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  scanningText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  scanningSubtext: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  nearbyDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  deviceAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  deviceId: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 4,
    backgroundColor: Colors.light.borderLight,
    borderRadius: 2,
  },
  signalBarActive: {
    backgroundColor: Colors.light.success,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    gap: 8,
  },
  scanningIndicatorText: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  nearbyConnecting: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  connectionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionBadgeWaiting: {
    backgroundColor: 'rgba(245, 215, 148, 0.3)',
  },
  connectionBadgeConnected: {
    backgroundColor: 'rgba(184, 212, 168, 0.3)',
  },
  connectionStatus: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  connectionStatusText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  nearbyProgressBar: {
    width: '80%',
    height: 6,
    backgroundColor: Colors.light.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  nearbyProgressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 3,
  },
  paymentSummary: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  paymentSummaryLabel: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginBottom: 4,
  },
  paymentSummaryAmount: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  codeWaiting: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  codeDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  codeDigits: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  codeDigitBox: {
    width: 48,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  codeDigit: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  codeTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeTimerText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  qrContainer: {
    backgroundColor: Colors.light.white,
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  codeActions: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  codeActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  codeActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.primary,
  },
  waitingInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  waitingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  codeModeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: Colors.light.primaryDark,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textSecondary,
  },
  modeButtonTextActive: {
    color: Colors.light.white,
  },
  codeInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  codeInfoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  codeInfoText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  receiveMode: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  receiveModeTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  receiveModeSubtitle: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    marginBottom: 32,
  },
  codeInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  codeInputBox: {
    width: 48,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  codeInputDigit: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primaryDark,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
    gap: 10,
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    backgroundColor: Colors.light.textMuted,
  },
  verifyButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  switchModeButton: {
    paddingVertical: 12,
  },
  switchModeText: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1C2128',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  requestCard: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  requestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestSender: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  requestNote: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  requestAmount: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.light.error,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.error,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.success,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  acceptButtonText: {
    fontSize: 14,
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
  successAmount: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: Colors.light.white,
    marginBottom: 8,
  },
  successMethod: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
  },
  transactionId: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
