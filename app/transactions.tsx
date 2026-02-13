import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Receipt,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWallet } from '@/contexts/WalletContext';
import { mockTransactions } from '@/mocks/transactions';

type FilterType = 'all' | 'sent' | 'received';

export default function TransactionsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { transactions: walletTransactions } = useWallet();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const allTransactions = useMemo(() => {
    const wallet = walletTransactions.map(tx => ({
      id: tx.id,
      type: tx.type === 'exchange' ? 'sent' as const : tx.type,
      amount: tx.amount,
      currency: tx.currency,
      counterparty: tx.counterparty || (tx.type === 'exchange' ? 'Exchange' : 'Unknown'),
      date: tx.date,
      note: tx.note,
      status: tx.status,
      isWallet: true,
    }));

    const mock = mockTransactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      counterparty: tx.type === 'received' ? tx.sender || 'Unknown' : tx.recipient || 'Unknown',
      date: tx.date,
      note: tx.note,
      status: tx.status,
      isWallet: false,
    }));

    if (wallet.length > 0) {
      return wallet;
    }
    return mock;
  }, [walletTransactions]);

  const filteredTransactions = allTransactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const totalSent = allTransactions
    .filter(tx => tx.type === 'sent')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalReceived = allTransactions
    .filter(tx => tx.type === 'received')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const handleViewReceipt = (tx: typeof allTransactions[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/receipt' as any,
      params: {
        txId: tx.id,
        txType: tx.type,
        txAmount: tx.amount.toString(),
        txCurrency: tx.currency,
        txCounterparty: tx.counterparty,
        txMethod: '',
        txNote: tx.note || '',
        txDate: tx.date,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: t('recentActivity'),
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
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(244,166,163,0.12)' : 'rgba(244,166,163,0.15)' }]}>
            <ArrowUpRight size={20} color={colors.error} />
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('sent')}</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>-${totalSent.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(184,212,168,0.12)' : 'rgba(184,212,168,0.2)' }]}>
            <ArrowDownLeft size={20} color={colors.success} />
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t('received')}</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>+${totalReceived.toFixed(2)}</Text>
          </View>
        </View>

        <View style={[styles.filterRow, { backgroundColor: colors.backgroundSecondary }]}>
          {(['all', 'sent', 'received'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(f);
              }}
            >
              <Text style={[styles.filterText, { color: colors.textMuted }, filter === f && { color: '#FFFFFF' }]}>
                {f === 'all' ? 'All' : f === 'sent' ? t('sent') : t('received')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.transactionsList, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Search size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions found</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {filter === 'all' 
                  ? 'Your transaction history will appear here'
                  : `No ${filter} transactions found`}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((tx, index) => (
              <TouchableOpacity 
                key={tx.id} 
                style={[
                  styles.transactionItem,
                  { borderBottomColor: colors.borderLight },
                  index === filteredTransactions.length - 1 && styles.transactionItemLast,
                ]}
                activeOpacity={0.7}
                onPress={() => handleViewReceipt(tx)}
              >
                <View style={[
                  styles.transactionIcon,
                  tx.type === 'received'
                    ? { backgroundColor: isDark ? 'rgba(184,212,168,0.15)' : 'rgba(184,212,168,0.2)' }
                    : { backgroundColor: isDark ? 'rgba(244,166,163,0.12)' : 'rgba(244,166,163,0.15)' },
                ]}>
                  {tx.type === 'received' ? (
                    <ArrowDownLeft size={18} color={colors.success} />
                  ) : (
                    <ArrowUpRight size={18} color={colors.error} />
                  )}
                </View>
                <View style={styles.transactionDetails}>
                  <Text style={[styles.transactionName, { color: colors.text }]}>
                    {tx.counterparty}
                  </Text>
                  <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
                    {new Date(tx.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {tx.note && (
                    <Text style={[styles.transactionNote, { color: colors.textSecondary }]}>{tx.note}</Text>
                  )}
                </View>
                <View style={styles.transactionAmountContainer}>
                  <Text style={[
                    styles.transactionAmount,
                    { color: tx.type === 'received' ? colors.success : colors.textSecondary },
                  ]}>
                    {tx.type === 'received' ? '+' : '-'}
                    {tx.currency === 'USD' ? '$' : ''}{tx.amount.toFixed(tx.currency === 'USD' ? 2 : 8)}
                  </Text>
                  <Text style={[styles.transactionCurrency, { color: colors.textMuted }]}>{tx.currency}</Text>
                </View>
                <View style={[styles.receiptIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Receipt size={14} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            ))
          )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  filterRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  transactionsList: {
    borderRadius: 20,
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
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionNote: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  transactionCurrency: {
    fontSize: 11,
  },
  receiptIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
  bottomSpacer: {
    height: 24,
  },
});
