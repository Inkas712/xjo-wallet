import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CurrencyCode, WalletBalance, WalletTransaction } from '@/types';
import { CryptoCompareAPI } from '@/services/crypto';
import { useAuth } from '@/contexts/AuthContext';

const WALLET_STORAGE_KEY = 'fintech_wallet';

const DEFAULT_BALANCES: WalletBalance[] = [
  { currency: 'USD', amount: 100 },
  { currency: 'BTC', amount: 0 },
  { currency: 'ETH', amount: 0 },
  { currency: 'SOL', amount: 0 },
  { currency: 'USDT', amount: 0 },
  { currency: 'BNB', amount: 0 },
];

const CURRENCY_INFO: Record<CurrencyCode, { name: string; symbol: string; icon: string; type: 'fiat' | 'crypto' }> = {
  USD: { name: 'US Dollar', symbol: '$', icon: 'https://flagcdn.com/w80/us.png', type: 'fiat' },
  BTC: { name: 'Bitcoin', symbol: '₿', icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', type: 'crypto' },
  ETH: { name: 'Ethereum', symbol: 'Ξ', icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', type: 'crypto' },
  SOL: { name: 'Solana', symbol: 'SOL', icon: 'https://cryptologos.cc/logos/solana-sol-logo.png', type: 'crypto' },
  USDT: { name: 'Tether', symbol: '₮', icon: 'https://cryptologos.cc/logos/tether-usdt-logo.png', type: 'crypto' },
  BNB: { name: 'BNB', symbol: 'BNB', icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png', type: 'crypto' },
};

export { CURRENCY_INFO };

export const [WalletProvider, useWallet] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [balances, setBalances] = useState<WalletBalance[]>(DEFAULT_BALANCES);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const storageKey = user ? `${WALLET_STORAGE_KEY}_${user.id}` : WALLET_STORAGE_KEY;

  const walletQuery = useQuery({
    queryKey: ['wallet', user?.id, storageKey],
    queryFn: async () => {
      console.log('Loading wallet for user:', user?.id);
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('Loaded wallet:', parsed);
        return parsed as { balances: WalletBalance[]; transactions: WalletTransaction[] };
      }
      console.log('No wallet found, using defaults with $100 USD');
      return { balances: DEFAULT_BALANCES, transactions: [] };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (walletQuery.data) {
      const existingCurrencies = walletQuery.data.balances.map(b => b.currency);
      const merged = [...walletQuery.data.balances];
      for (const def of DEFAULT_BALANCES) {
        if (!existingCurrencies.includes(def.currency)) {
          merged.push(def);
        }
      }
      setBalances(merged);
      setTransactions(walletQuery.data.transactions || []);
      setIsInitialized(true);
    }
  }, [walletQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: { balances: WalletBalance[]; transactions: WalletTransaction[] }) => {
      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      return data;
    },
  });

  const { mutate: saveToStorage } = saveMutation;

  const saveWallet = useCallback((newBalances: WalletBalance[], newTransactions: WalletTransaction[]) => {
    setBalances(newBalances);
    setTransactions(newTransactions);
    saveToStorage({ balances: newBalances, transactions: newTransactions });
  }, [saveToStorage]);

  const getBalance = useCallback((currency: CurrencyCode): number => {
    const bal = balances.find(b => b.currency === currency);
    return bal?.amount ?? 0;
  }, [balances]);

  const hasEnoughBalance = useCallback((currency: CurrencyCode, amount: number): boolean => {
    return getBalance(currency) >= amount;
  }, [getBalance]);

  const pricesQuery = useQuery({
    queryKey: ['walletPrices'],
    queryFn: () => CryptoCompareAPI.getPrices(['BTC', 'ETH', 'SOL', 'USDT', 'BNB']),
    staleTime: 10000,
    refetchInterval: 10000,
  });

  const getUsdRate = useCallback((currency: CurrencyCode): number => {
    if (currency === 'USD') return 1;
    if (currency === 'USDT') return 1;
    const prices = pricesQuery.data || [];
    const coin = prices.find(p => p.symbol === currency);
    return coin?.price ?? 0;
  }, [pricesQuery.data]);

  const convertAmount = useCallback((amount: number, from: CurrencyCode, to: CurrencyCode): number => {
    if (from === to) return amount;
    const fromUsd = amount * getUsdRate(from);
    const toRate = getUsdRate(to);
    if (toRate === 0) return 0;
    return fromUsd / toRate;
  }, [getUsdRate]);

  const totalBalanceUsd = useMemo(() => {
    return balances.reduce((total, bal) => {
      return total + bal.amount * getUsdRate(bal.currency);
    }, 0);
  }, [balances, getUsdRate]);

  const deductBalance = useCallback((currency: CurrencyCode, amount: number): boolean => {
    const currentBalance = getBalance(currency);
    if (currentBalance < amount) {
      console.log(`Insufficient ${currency} balance: have ${currentBalance}, need ${amount}`);
      return false;
    }

    const newBalances = balances.map(b =>
      b.currency === currency ? { ...b, amount: b.amount - amount } : b
    );

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'sent',
      amount,
      currency,
      date: new Date().toISOString(),
      status: 'completed',
    };

    const newTx = [tx, ...transactions];
    saveWallet(newBalances, newTx);
    return true;
  }, [balances, transactions, getBalance, saveWallet]);

  const addBalance = useCallback((currency: CurrencyCode, amount: number, counterparty?: string, note?: string) => {
    const newBalances = balances.map(b =>
      b.currency === currency ? { ...b, amount: b.amount + amount } : b
    );

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'received',
      amount,
      currency,
      counterparty,
      date: new Date().toISOString(),
      status: 'completed',
      note,
    };

    const newTx = [tx, ...transactions];
    saveWallet(newBalances, newTx);
  }, [balances, transactions, saveWallet]);

  const sendPayment = useCallback((currency: CurrencyCode, amount: number, recipientName: string, note?: string): boolean => {
    const currentBalance = getBalance(currency);
    if (currentBalance < amount) {
      console.log(`Payment failed: insufficient ${currency}. Have: ${currentBalance}, Need: ${amount}`);
      return false;
    }

    const newBalances = balances.map(b =>
      b.currency === currency ? { ...b, amount: b.amount - amount } : b
    );

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'sent',
      amount,
      currency,
      counterparty: recipientName,
      date: new Date().toISOString(),
      status: 'completed',
      note,
    };

    const newTx = [tx, ...transactions];
    saveWallet(newBalances, newTx);
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    console.log(`Sent ${amount} ${currency} to ${recipientName}`);
    return true;
  }, [balances, transactions, getBalance, saveWallet, queryClient]);

  const receivePayment = useCallback((currency: CurrencyCode, amount: number, senderName: string, note?: string) => {
    const newBalances = balances.map(b =>
      b.currency === currency ? { ...b, amount: b.amount + amount } : b
    );

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'received',
      amount,
      currency,
      counterparty: senderName,
      date: new Date().toISOString(),
      status: 'completed',
      note,
    };

    const newTx = [tx, ...transactions];
    saveWallet(newBalances, newTx);
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    console.log(`Received ${amount} ${currency} from ${senderName}`);
  }, [balances, transactions, saveWallet, queryClient]);

  const exchangeCurrency = useCallback((fromCurrency: CurrencyCode, toCurrency: CurrencyCode, fromAmount: number): boolean => {
    if (!hasEnoughBalance(fromCurrency, fromAmount)) {
      console.log(`Exchange failed: insufficient ${fromCurrency}`);
      return false;
    }

    const toAmount = convertAmount(fromAmount, fromCurrency, toCurrency);
    if (toAmount <= 0) {
      console.log('Exchange failed: conversion rate unavailable');
      return false;
    }

    const newBalances = balances.map(b => {
      if (b.currency === fromCurrency) return { ...b, amount: b.amount - fromAmount };
      if (b.currency === toCurrency) return { ...b, amount: b.amount + toAmount };
      return b;
    });

    const tx: WalletTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'exchange',
      amount: fromAmount,
      currency: fromCurrency,
      note: `Exchanged to ${toAmount.toFixed(8)} ${toCurrency}`,
      date: new Date().toISOString(),
      status: 'completed',
    };

    const newTx = [tx, ...transactions];
    saveWallet(newBalances, newTx);
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
    console.log(`Exchanged ${fromAmount} ${fromCurrency} → ${toAmount} ${toCurrency}`);
    return true;
  }, [balances, transactions, hasEnoughBalance, convertAmount, saveWallet, queryClient]);

  return {
    balances,
    transactions,
    totalBalanceUsd,
    isInitialized,
    getBalance,
    hasEnoughBalance,
    getUsdRate,
    convertAmount,
    deductBalance,
    addBalance,
    sendPayment,
    receivePayment,
    exchangeCurrency,
    pricesLoading: pricesQuery.isLoading,
  };
});

export function useBalanceForCurrency(currency: CurrencyCode) {
  const { getBalance, getUsdRate } = useWallet();
  return useMemo(() => ({
    amount: getBalance(currency),
    usdValue: getBalance(currency) * getUsdRate(currency),
    rate: getUsdRate(currency),
  }), [currency, getBalance, getUsdRate]);
}
