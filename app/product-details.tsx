import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Check,
  X,
  Calculator,
  PiggyBank,
  Wallet,
  TrendingUp,
  ShieldCheck,
  GraduationCap,
  Home,
  Briefcase,
  Plane,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { mockProducts } from '@/mocks/products';

const getIcon = (iconName: string, size: number = 32) => {
  const iconProps = { size, color: Colors.light.primary };
  switch (iconName) {
    case 'piggy-bank': return <PiggyBank {...iconProps} />;
    case 'wallet': return <Wallet {...iconProps} />;
    case 'trending-up': return <TrendingUp {...iconProps} />;
    case 'shield-check': return <ShieldCheck {...iconProps} />;
    case 'graduation-cap': return <GraduationCap {...iconProps} />;
    case 'home': return <Home {...iconProps} />;
    case 'briefcase': return <Briefcase {...iconProps} />;
    case 'plane': return <Plane {...iconProps} />;
    default: return <Wallet {...iconProps} />;
  }
};

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const product = mockProducts.find(p => p.id === id) || mockProducts[0];

  
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  
  const [calcAmount, setCalcAmount] = useState('10000');
  const [calcTerm, setCalcTerm] = useState('12');
  const [calcRate, setCalcRate] = useState('5');

  const calculationResult = useMemo(() => {
    const amount = parseFloat(calcAmount) || 0;
    const term = parseFloat(calcTerm) || 1;
    const rate = parseFloat(calcRate) || 0;

    switch (product.calculatorType) {
      case 'savings':
        const savingsReturn = amount * (1 + (rate / 100) * (term / 12));
        return {
          label: 'Estimated Returns',
          value: savingsReturn.toFixed(2),
          profit: (savingsReturn - amount).toFixed(2),
        };
      case 'financing':
        const monthlyPayment = amount / term;
        return {
          label: 'Monthly Payment',
          value: monthlyPayment.toFixed(2),
          total: (monthlyPayment * term).toFixed(2),
        };
      case 'investment':
        const roi = amount * (1 + (rate / 100));
        return {
          label: 'Projected Value',
          value: roi.toFixed(2),
          gain: ((roi - amount) / amount * 100).toFixed(1),
        };
      case 'insurance':
        const premium = amount * (rate / 1000);
        return {
          label: 'Monthly Premium',
          value: premium.toFixed(2),
          annual: (premium * 12).toFixed(2),
        };
      default:
        return { label: 'Result', value: '0', extra: '' };
    }
  }, [calcAmount, calcTerm, calcRate, product.calculatorType]);

  const handleApply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowApplyModal(true);
  };

  const submitApplication = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setApplySuccess(true);
    setTimeout(() => {
      setShowApplyModal(false);
      setApplySuccess(false);
    }, 2000);
  };

  const renderCalculator = () => (
    <View style={styles.calculatorSection}>
      <View style={styles.calculatorHeader}>
        <Calculator size={20} color={Colors.light.primary} />
        <Text style={styles.calculatorTitle}>Calculator</Text>
      </View>

      <View style={styles.calculatorInputs}>
        <View style={styles.calcInputGroup}>
          <Text style={styles.calcInputLabel}>
            {product.calculatorType === 'insurance' ? 'Coverage Amount' : 'Amount ($)'}
          </Text>
          <TextInput
            style={styles.calcInput}
            value={calcAmount}
            onChangeText={setCalcAmount}
            keyboardType="numeric"
            placeholder="10000"
            placeholderTextColor={Colors.light.textMuted}
          />
        </View>

        <View style={styles.calcInputGroup}>
          <Text style={styles.calcInputLabel}>
            {product.calculatorType === 'insurance' ? 'Age' : 'Term (months)'}
          </Text>
          <TextInput
            style={styles.calcInput}
            value={calcTerm}
            onChangeText={setCalcTerm}
            keyboardType="numeric"
            placeholder="12"
            placeholderTextColor={Colors.light.textMuted}
          />
        </View>

        <View style={styles.calcInputGroup}>
          <Text style={styles.calcInputLabel}>
            {product.calculatorType === 'insurance' ? 'Risk Factor' : 'Rate (%)'}
          </Text>
          <TextInput
            style={styles.calcInput}
            value={calcRate}
            onChangeText={setCalcRate}
            keyboardType="numeric"
            placeholder="5"
            placeholderTextColor={Colors.light.textMuted}
          />
        </View>
      </View>

      <View style={styles.calculatorResult}>
        <Text style={styles.resultLabel}>{calculationResult.label}</Text>
        <Text style={styles.resultValue}>${calculationResult.value}</Text>
        {calculationResult.profit && (
          <Text style={styles.resultExtra}>Profit: ${calculationResult.profit}</Text>
        )}
        {calculationResult.gain && (
          <Text style={styles.resultExtra}>Gain: {calculationResult.gain}%</Text>
        )}
        {calculationResult.annual && (
          <Text style={styles.resultExtra}>Annual: ${calculationResult.annual}</Text>
        )}
      </View>
    </View>
  );

  const renderApplyModal = () => (
    <Modal visible={showApplyModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {applySuccess ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Check size={40} color={Colors.light.white} />
              </View>
              <Text style={styles.successTitle}>Application Submitted!</Text>
              <Text style={styles.successText}>
                We will review your application and get back to you soon.
              </Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowApplyModal(false)}
              >
                <X size={20} color={Colors.light.textMuted} />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>Apply for {product.name}</Text>
              <Text style={styles.modalDescription}>
                This is a demo application. No real application will be submitted.
              </Text>

              <View style={styles.applyForm}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Full Name</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="John Doe"
                    placeholderTextColor={Colors.light.textMuted}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="john@example.com"
                    placeholderTextColor={Colors.light.textMuted}
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Phone</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="+1 234 567 8900"
                    placeholderTextColor={Colors.light.textMuted}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={submitApplication}
              >
                <Text style={styles.submitButtonText}>Submit Application</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: product.name,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            {getIcon(product.icon, 40)}
          </View>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productDescription}>{product.fullDescription}</Text>
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>Benefits</Text>
          {product.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <View style={styles.benefitCheck}>
                <Check size={14} color={Colors.light.white} />
              </View>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {renderCalculator()}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApply}
          activeOpacity={0.8}
        >
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {renderApplyModal()}
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
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(157, 193, 131, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  productDescription: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    lineHeight: 20,
  },
  calculatorSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  calculatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  calculatorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  calculatorInputs: {
    gap: 16,
    marginBottom: 20,
  },
  calcInputGroup: {
    gap: 8,
  },
  calcInputLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.light.textSecondary,
  },
  calcInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  calculatorResult: {
    backgroundColor: Colors.light.primaryDark,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.light.white,
    marginBottom: 4,
  },
  resultExtra: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  applyButton: {
    backgroundColor: Colors.light.primaryDark,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.light.primaryDarker,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  applyButtonText: {
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
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 24,
  },
  applyForm: {
    gap: 16,
    marginBottom: 24,
  },
  formGroup: {
    gap: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.light.primary,
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: Colors.light.primaryDark,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.light.white,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.light.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});
