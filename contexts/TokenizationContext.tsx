import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  TokenizedAsset,
  UserHolding,
  TokenTransaction,
  PortfolioSummary,
  AssetType,
} from '@/types/tokenization';
import {
  mockTokenizedAssets,
  mockUserHoldings,
  mockTokenTransactions,
} from '@/mocks/tokenizedAssets';
import { mockSolanaService, generateMockTxHash } from '@/services/solana';
import { useWallet } from '@/contexts/WalletContext';

const HOLDINGS_KEY = 'fintech_token_holdings';
const TRANSACTIONS_KEY = 'fintech_token_transactions';
const CUSTOM_ASSETS_KEY = 'fintech_custom_assets';

export const [TokenizationProvider, useTokenization] = createContextHook(() => {
  const { deductBalance, addBalance } = useWallet();
  const [holdings, setHoldings] = useState<UserHolding[]>([]);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [customAssets, setCustomAssets] = useState<TokenizedAsset[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const holdingsQuery = useQuery({
    queryKey: ['tokenHoldings'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(HOLDINGS_KEY);
      if (stored) return JSON.parse(stored) as UserHolding[];
      return mockUserHoldings;
    },
  });

  const transactionsQuery = useQuery({
    queryKey: ['tokenTransactions'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(TRANSACTIONS_KEY);
      if (stored) return JSON.parse(stored) as TokenTransaction[];
      return mockTokenTransactions;
    },
  });

  const customAssetsQuery = useQuery({
    queryKey: ['customAssets'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(CUSTOM_ASSETS_KEY);
      if (stored) return JSON.parse(stored) as TokenizedAsset[];
      return [] as TokenizedAsset[];
    },
  });

  useEffect(() => {
    if (holdingsQuery.data) setHoldings(holdingsQuery.data);
  }, [holdingsQuery.data]);

  useEffect(() => {
    if (transactionsQuery.data) setTransactions(transactionsQuery.data);
  }, [transactionsQuery.data]);

  useEffect(() => {
    if (customAssetsQuery.data) {
      setCustomAssets(customAssetsQuery.data);
      setIsInitialized(true);
    }
  }, [customAssetsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (data: {
      holdings: UserHolding[];
      transactions: TokenTransaction[];
      customAssets?: TokenizedAsset[];
    }) => {
      await AsyncStorage.setItem(HOLDINGS_KEY, JSON.stringify(data.holdings));
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(data.transactions));
      if (data.customAssets) {
        await AsyncStorage.setItem(CUSTOM_ASSETS_KEY, JSON.stringify(data.customAssets));
      }
    },
  });

  const allAssets = useMemo(() => {
    return [...mockTokenizedAssets, ...customAssets];
  }, [customAssets]);

  const getAssetById = useCallback((id: string): TokenizedAsset | undefined => {
    return allAssets.find(a => a.id === id);
  }, [allAssets]);

  const getHoldingForAsset = useCallback((assetId: string): UserHolding | undefined => {
    return holdings.find(h => h.assetId === assetId);
  }, [holdings]);

  const portfolioSummary = useMemo((): PortfolioSummary => {
    let totalValue = 0;
    let totalCost = 0;
    let pendingIncome = 0;
    const allocationByType: Record<AssetType, number> = {
      real_estate: 0,
      stocks: 0,
      gold: 0,
      crypto: 0,
    };

    for (const holding of holdings) {
      const asset = getAssetById(holding.assetId);
      if (!asset) continue;
      const value = holding.tokensOwned * asset.pricePerToken;
      totalValue += value;
      totalCost += holding.tokensOwned * holding.averageBuyPrice;
      allocationByType[asset.type] += value;
      if (asset.apy) {
        pendingIncome += (value * (asset.apy / 100)) / 12;
      }
    }

    const totalPnl = totalValue - totalCost;
    const totalPnlPercentage = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return { totalValue, totalPnl, totalPnlPercentage, pendingIncome, allocationByType };
  }, [holdings, getAssetById]);

  const { mutate: saveData } = saveMutation;

  const buyTokens = useCallback((assetId: string, tokenCount: number): boolean => {
    const asset = getAssetById(assetId);
    if (!asset) {
      console.log('[Tokenization] Asset not found:', assetId);
      return false;
    }

    const totalCost = tokenCount * asset.pricePerToken;
    const success = deductBalance('USD', totalCost);
    if (!success) {
      console.log('[Tokenization] Insufficient balance for purchase');
      return false;
    }

    const existingIdx = holdings.findIndex(h => h.assetId === assetId);
    let newHoldings: UserHolding[];

    if (existingIdx >= 0) {
      const existing = holdings[existingIdx];
      const totalTokens = existing.tokensOwned + tokenCount;
      const totalSpent = existing.tokensOwned * existing.averageBuyPrice + totalCost;
      const avgPrice = totalSpent / totalTokens;
      newHoldings = [...holdings];
      newHoldings[existingIdx] = {
        ...existing,
        tokensOwned: totalTokens,
        averageBuyPrice: avgPrice,
        currentValue: totalTokens * asset.pricePerToken,
        pnl: totalTokens * asset.pricePerToken - totalSpent,
        pnlPercentage: ((asset.pricePerToken - avgPrice) / avgPrice) * 100,
      };
    } else {
      newHoldings = [...holdings, {
        assetId,
        tokensOwned: tokenCount,
        averageBuyPrice: asset.pricePerToken,
        currentValue: totalCost,
        pnl: 0,
        pnlPercentage: 0,
      }];
    }

    const tx: TokenTransaction = {
      id: `ttx_${Date.now()}`,
      type: 'buy',
      assetId,
      assetName: asset.name,
      tokens: tokenCount,
      pricePerToken: asset.pricePerToken,
      totalAmount: totalCost,
      txHash: generateMockTxHash(),
      status: 'confirmed',
      timestamp: new Date().toISOString(),
    };

    const newTxs = [tx, ...transactions];
    setHoldings(newHoldings);
    setTransactions(newTxs);
    saveData({ holdings: newHoldings, transactions: newTxs });
    console.log(`[Tokenization] Bought ${tokenCount} tokens of ${asset.name} for ${totalCost}`);
    return true;
  }, [holdings, transactions, getAssetById, deductBalance, saveData]);

  const sellTokens = useCallback((assetId: string, tokenCount: number): boolean => {
    const asset = getAssetById(assetId);
    if (!asset) return false;

    const holdingIdx = holdings.findIndex(h => h.assetId === assetId);
    if (holdingIdx < 0 || holdings[holdingIdx].tokensOwned < tokenCount) {
      console.log('[Tokenization] Insufficient tokens to sell');
      return false;
    }

    const totalValue = tokenCount * asset.pricePerToken;
    addBalance('USD', totalValue, 'Token Sale', `Sold ${tokenCount} ${asset.name} tokens`);

    const existing = holdings[holdingIdx];
    const remainingTokens = existing.tokensOwned - tokenCount;
    let newHoldings: UserHolding[];

    if (remainingTokens <= 0) {
      newHoldings = holdings.filter((_, i) => i !== holdingIdx);
    } else {
      newHoldings = [...holdings];
      newHoldings[holdingIdx] = {
        ...existing,
        tokensOwned: remainingTokens,
        currentValue: remainingTokens * asset.pricePerToken,
        pnl: remainingTokens * (asset.pricePerToken - existing.averageBuyPrice),
        pnlPercentage: ((asset.pricePerToken - existing.averageBuyPrice) / existing.averageBuyPrice) * 100,
      };
    }

    const tx: TokenTransaction = {
      id: `ttx_${Date.now()}`,
      type: 'sell',
      assetId,
      assetName: asset.name,
      tokens: tokenCount,
      pricePerToken: asset.pricePerToken,
      totalAmount: totalValue,
      txHash: generateMockTxHash(),
      status: 'confirmed',
      timestamp: new Date().toISOString(),
    };

    const newTxs = [tx, ...transactions];
    setHoldings(newHoldings);
    setTransactions(newTxs);
    saveData({ holdings: newHoldings, transactions: newTxs });
    console.log(`[Tokenization] Sold ${tokenCount} tokens of ${asset.name} for ${totalValue}`);
    return true;
  }, [holdings, transactions, getAssetById, addBalance, saveData]);

  const tokenizeAsset = useCallback(async (asset: Omit<TokenizedAsset, 'id' | 'solanaAddress' | 'createdAt'>): Promise<TokenizedAsset | null> => {
    try {
      console.log('[Tokenization] Minting new asset:', asset.name);
      const result = await mockSolanaService.mintToken(asset.name);

      const newAsset: TokenizedAsset = {
        ...asset,
        id: `ta_custom_${Date.now()}`,
        solanaAddress: result.tokenAddress,
        createdAt: new Date().toISOString(),
      };

      const newCustomAssets = [...customAssets, newAsset];
      setCustomAssets(newCustomAssets);
      saveData({ holdings, transactions, customAssets: newCustomAssets });
      console.log('[Tokenization] Asset tokenized:', newAsset.id);
      return newAsset;
    } catch (error) {
      console.error('[Tokenization] Error tokenizing asset:', error);
      return null;
    }
  }, [customAssets, holdings, transactions, saveData]);

  const claimIncome = useCallback(() => {
    const income = portfolioSummary.pendingIncome;
    if (income <= 0) return false;

    addBalance('USD', income, 'Token Income', 'Monthly dividend/rental income');

    const tx: TokenTransaction = {
      id: `ttx_${Date.now()}`,
      type: 'income',
      assetId: 'portfolio',
      assetName: 'Portfolio Income',
      tokens: 0,
      pricePerToken: 0,
      totalAmount: income,
      txHash: generateMockTxHash(),
      status: 'confirmed',
      timestamp: new Date().toISOString(),
    };

    const newTxs = [tx, ...transactions];
    setTransactions(newTxs);
    saveData({ holdings, transactions: newTxs });
    console.log(`[Tokenization] Claimed ${income.toFixed(2)} income`);
    return true;
  }, [portfolioSummary.pendingIncome, addBalance, holdings, transactions, saveData]);

  return {
    allAssets,
    holdings,
    transactions,
    portfolioSummary,
    isInitialized,
    getAssetById,
    getHoldingForAsset,
    buyTokens,
    sellTokens,
    tokenizeAsset,
    claimIncome,
  };
});
