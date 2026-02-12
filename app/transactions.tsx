import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { mockTransactions } from '@/mocks/transactions';

type FilterType = 'all' | 'sent' | 'received';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const filteredTransactions = mockTransactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const totalSent = mockTransactions
    .filter(tx => tx.type === 'sent')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalReceived = mockTransactions
    .filter(tx => tx.type === 'received')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Transactions',
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
          <View style={[styles.summaryCard, styles.sentCard]}>
            <ArrowUpRight size={20} color={Colors.light.error} />
            <Text style={styles.summaryLabel}>Total Sent</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>-${totalSent.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryCard, styles.receivedCard]}>
            <ArrowDownLeft size={20} color={Colors.light.success} />
            <Text style={styles.summaryLabel}>Total Received</Text>
            <Text style={[styles.summaryValue, styles.receivedValue]}>+${totalReceived.toFixed(2)}</Text>
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
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.transactionsList, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Search size={48} color={Colors.light.textMuted} />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptyText}>
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
                  index === filteredTransactions.length - 1 && styles.transactionItemLast,
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
                  <Text style={[styles.transactionName, { color: colors.text }]}>
                    {tx.type === 'received' ? tx.sender : tx.recipient}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(tx.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  {tx.note && (
                    <Text style={styles.transactionNote}>{tx.note}</Text>
                  )}
                </View>
                <View style={styles.transactionAmountContainer}>
                  <Text style={[
                    styles.transactionAmount,
                    tx.type === 'received' ? styles.amountReceived : styles.amountSent,
                  ]}>
                    {tx.type === 'received' ? '+' : '-'}${tx.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.transactionCurrency}>{tx.currency}</Text>
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
  sentCard: {
    backgroundColor: 'rgba(244, 166, 163, 0.15)',
  },
  receivedCard: {
    backgroundColor: 'rgba(184, 212, 168, 0.2)',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  receivedValue: {
    color: Colors.light.success,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundSecondary,
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
  filterButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.light.textMuted,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  transactionsList: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  transactionNote: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  amountReceived: {
    color: Colors.light.success,
  },
  amountSent: {
    color: 'rgba(255,255,255,0.7)',
  },
  transactionCurrency: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 24,
  },
});
