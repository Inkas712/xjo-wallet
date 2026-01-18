export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  walletAddress?: string;
  provider?: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  balance: number;
  usdValue: number;
  change24h: number;
  logoUrl: string;
  type: 'crypto' | 'stock' | 'fiat';
}

export interface Card {
  id: string;
  type: 'virtual' | 'physical';
  lastFour: string;
  cardholderName: string;
  expiryDate: string;
  isFrozen: boolean;
  color: string;
}

export interface Transaction {
  id: string;
  type: 'sent' | 'received';
  amount: number;
  currency: string;
  recipient?: string;
  sender?: string;
  date: string;
  note?: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface Product {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  icon: string;
  benefits: string[];
  calculatorType: 'savings' | 'financing' | 'investment' | 'insurance';
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
}
