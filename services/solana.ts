import { TokenMintResult } from '@/types/tokenization';

function generateMockAddress(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateMockTxHash(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 88; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function shortenTxHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

interface SolanaService {
  mintToken(assetName: string): Promise<TokenMintResult>;
  transferToken(from: string, to: string, amount: number): Promise<{ txHash: string; fee: number }>;
  getBalance(wallet: string): Promise<number>;
}

const mockSolanaService: SolanaService = {
  mintToken: async (assetName: string) => {
    console.log(`[Solana] Minting token for: ${assetName}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      tokenAddress: generateMockAddress(),
      txHash: generateMockTxHash(),
      network: 'solana-devnet',
      timestamp: Date.now(),
    };
  },

  transferToken: async (_from: string, _to: string, _amount: number) => {
    console.log(`[Solana] Transferring tokens`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      txHash: generateMockTxHash(),
      fee: 0.000005,
    };
  },

  getBalance: async (_wallet: string) => {
    return Math.random() * 100;
  },
};

export { mockSolanaService, generateMockAddress, generateMockTxHash, shortenAddress, shortenTxHash };
