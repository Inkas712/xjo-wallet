export type AssetType = 'real_estate' | 'stocks' | 'gold' | 'crypto';

export interface TokenizedAsset {
  id: string;
  type: AssetType;
  name: string;
  description: string;
  totalSupply: number;
  pricePerToken: number;
  currency: 'USD';
  apy?: number;
  images: string[];
  solanaAddress: string;
  createdAt: string;
  fundedPercentage: number;
  minInvestment: number;
  lockupPeriod?: string;
  holdersCount: number;
  verified: boolean;

  location?: string;
  propertyType?: string;
  rentalYield?: number;

  ticker?: string;
  exchange?: string;
  dividendYield?: number;

  metalType?: 'gold' | 'silver' | 'platinum';
  gramsPerToken?: number;
  vaultLocation?: string;
  spotPrice?: number;

  underlyingAsset?: 'BTC' | 'ETH' | 'SOL' | 'USDC';
  backingRatio?: number;
}

export interface UserHolding {
  assetId: string;
  tokensOwned: number;
  averageBuyPrice: number;
  currentValue: number;
  pnl: number;
  pnlPercentage: number;
}

export interface TokenTransaction {
  id: string;
  type: 'buy' | 'sell' | 'mint' | 'income';
  assetId: string;
  assetName: string;
  tokens: number;
  pricePerToken: number;
  totalAmount: number;
  txHash: string;
  status: 'confirmed' | 'pending' | 'failed';
  timestamp: string;
}

export interface TokenMintResult {
  tokenAddress: string;
  txHash: string;
  network: string;
  timestamp: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  pendingIncome: number;
  allocationByType: Record<AssetType, number>;
}

export interface PricePoint {
  timestamp: number;
  value: number;
}
