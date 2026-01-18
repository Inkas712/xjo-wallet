const CRYPTOCOMPARE_API_KEY = process.env.EXPO_PUBLIC_CRYPTOCOMPARE_API_KEY;
const ETHERSCAN_API_KEY = process.env.EXPO_PUBLIC_ETHERSCAN_API_KEY;
const ALCHEMY_API_KEY = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;

export interface CoinPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  imageUrl: string;
}

export interface HistoricalDataPoint {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface GasPrice {
  safe: string;
  standard: string;
  fast: string;
}

export const CryptoCompareAPI = {
  baseUrl: 'https://min-api.cryptocompare.com/data',

  getHeaders: () => ({
    Authorization: `Apikey ${CRYPTOCOMPARE_API_KEY}`,
  }),

  getPrices: async (coins: string[] = ['BTC', 'ETH', 'USDT', 'SOL', 'BNB'], currency = 'USD'): Promise<CoinPrice[]> => {
    try {
      const coinsParam = coins.join(',');
      const response = await fetch(
        `${CryptoCompareAPI.baseUrl}/pricemultifull?fsyms=${coinsParam}&tsyms=${currency}`,
        { headers: CryptoCompareAPI.getHeaders() }
      );
      const data = await response.json();

      if (data.Response === 'Error') {
        console.log('CryptoCompare API Error:', data.Message);
        throw new Error(data.Message);
      }

      return coins.map((coin) => ({
        symbol: coin,
        name: data.RAW[coin]?.[currency]?.FROMSYMBOL || coin,
        price: data.RAW[coin]?.[currency]?.PRICE || 0,
        change24h: data.RAW[coin]?.[currency]?.CHANGEPCT24HOUR || 0,
        marketCap: data.RAW[coin]?.[currency]?.MKTCAP || 0,
        volume24h: data.RAW[coin]?.[currency]?.VOLUME24HOUR || 0,
        high24h: data.RAW[coin]?.[currency]?.HIGH24HOUR || 0,
        low24h: data.RAW[coin]?.[currency]?.LOW24HOUR || 0,
        imageUrl: `https://www.cryptocompare.com${data.RAW[coin]?.[currency]?.IMAGEURL || ''}`,
      }));
    } catch (error) {
      console.log('CryptoCompare prices error:', error);
      return [];
    }
  },

  getCoinPrice: async (coin: string, currency = 'USD'): Promise<CoinPrice | null> => {
    try {
      const response = await fetch(
        `${CryptoCompareAPI.baseUrl}/pricemultifull?fsyms=${coin}&tsyms=${currency}`,
        { headers: CryptoCompareAPI.getHeaders() }
      );
      const data = await response.json();

      if (data.RAW && data.RAW[coin]) {
        const coinData = data.RAW[coin][currency];
        return {
          symbol: coin,
          name: coinData.FROMSYMBOL,
          price: coinData.PRICE,
          change24h: coinData.CHANGEPCT24HOUR,
          high24h: coinData.HIGH24HOUR,
          low24h: coinData.LOW24HOUR,
          volume24h: coinData.VOLUME24HOUR,
          marketCap: coinData.MKTCAP,
          imageUrl: `https://www.cryptocompare.com${coinData.IMAGEURL || ''}`,
        };
      }
      return null;
    } catch (error) {
      console.log('CryptoCompare coin price error:', error);
      return null;
    }
  },

  getHistoricalDaily: async (coin: string, currency = 'USD', days = 30): Promise<HistoricalDataPoint[]> => {
    try {
      const response = await fetch(
        `${CryptoCompareAPI.baseUrl}/v2/histoday?fsym=${coin}&tsym=${currency}&limit=${days}`,
        { headers: CryptoCompareAPI.getHeaders() }
      );
      const data = await response.json();

      if (data.Response === 'Success' && data.Data?.Data) {
        return data.Data.Data.map((point: { time: number; open: number; high: number; low: number; close: number; volumefrom: number }) => ({
          time: new Date(point.time * 1000),
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: point.volumefrom,
        }));
      }
      return [];
    } catch (error) {
      console.log('CryptoCompare historical error:', error);
      return [];
    }
  },

  getHistoricalHourly: async (coin: string, currency = 'USD', hours = 24): Promise<HistoricalDataPoint[]> => {
    try {
      const response = await fetch(
        `${CryptoCompareAPI.baseUrl}/v2/histohour?fsym=${coin}&tsym=${currency}&limit=${hours}`,
        { headers: CryptoCompareAPI.getHeaders() }
      );
      const data = await response.json();

      if (data.Response === 'Success' && data.Data?.Data) {
        return data.Data.Data.map((point: { time: number; open: number; high: number; low: number; close: number; volumefrom: number }) => ({
          time: new Date(point.time * 1000),
          open: point.open,
          high: point.high,
          low: point.low,
          close: point.close,
          volume: point.volumefrom,
        }));
      }
      return [];
    } catch (error) {
      console.log('CryptoCompare hourly error:', error);
      return [];
    }
  },

  getTopCoins: async (limit = 10, currency = 'USD'): Promise<CoinPrice[]> => {
    try {
      const response = await fetch(
        `${CryptoCompareAPI.baseUrl}/top/mktcapfull?limit=${limit}&tsym=${currency}`,
        { headers: CryptoCompareAPI.getHeaders() }
      );
      const data = await response.json();

      if (data.Data) {
        return data.Data.map((item: { CoinInfo: { Name: string; FullName: string; ImageUrl: string }; RAW?: { [key: string]: { PRICE: number; CHANGEPCT24HOUR: number; MKTCAP: number; VOLUME24HOUR: number; HIGH24HOUR: number; LOW24HOUR: number } } }) => ({
          symbol: item.CoinInfo.Name,
          name: item.CoinInfo.FullName,
          price: item.RAW?.[currency]?.PRICE || 0,
          change24h: item.RAW?.[currency]?.CHANGEPCT24HOUR || 0,
          marketCap: item.RAW?.[currency]?.MKTCAP || 0,
          volume24h: item.RAW?.[currency]?.VOLUME24HOUR || 0,
          high24h: item.RAW?.[currency]?.HIGH24HOUR || 0,
          low24h: item.RAW?.[currency]?.LOW24HOUR || 0,
          imageUrl: `https://www.cryptocompare.com${item.CoinInfo.ImageUrl}`,
        }));
      }
      return [];
    } catch (error) {
      console.log('CryptoCompare top coins error:', error);
      return [];
    }
  },
};

export const EtherscanAPI = {
  baseUrl: 'https://api.etherscan.io/api',

  getBalance: async (address: string): Promise<number | null> => {
    try {
      const response = await fetch(
        `${EtherscanAPI.baseUrl}?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`
      );
      const data = await response.json();

      if (data.status === '1') {
        const balanceInEth = parseFloat(data.result) / 1e18;
        return balanceInEth;
      }
      console.log('Etherscan balance error:', data.message);
      return null;
    } catch (error) {
      console.log('Etherscan balance error:', error);
      return null;
    }
  },

  getGasPrice: async (): Promise<GasPrice | null> => {
    try {
      const response = await fetch(
        `${EtherscanAPI.baseUrl}?module=gastracker&action=gasoracle&apikey=${ETHERSCAN_API_KEY}`
      );
      const data = await response.json();

      if (data.status === '1') {
        return {
          safe: data.result.SafeGasPrice,
          standard: data.result.ProposeGasPrice,
          fast: data.result.FastGasPrice,
        };
      }
      return null;
    } catch (error) {
      console.log('Etherscan gas price error:', error);
      return null;
    }
  },
};

export const AlchemyAPI = {
  getNetworkUrl: (network = 'mainnet') => {
    const networkMap: { [key: string]: string } = {
      mainnet: 'eth-mainnet',
      goerli: 'eth-goerli',
      sepolia: 'eth-sepolia',
      polygon: 'polygon-mainnet',
      arbitrum: 'arb-mainnet',
      optimism: 'opt-mainnet',
    };
    const alchemyNetwork = networkMap[network] || 'eth-mainnet';
    return `https://${alchemyNetwork}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  },

  rpcCall: async (method: string, params: unknown[] = [], network = 'mainnet'): Promise<unknown> => {
    try {
      const response = await fetch(AlchemyAPI.getNetworkUrl(network), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.log('Alchemy RPC error:', data.error.message);
        return null;
      }

      return data.result;
    } catch (error) {
      console.log('Alchemy RPC error:', error);
      return null;
    }
  },

  getBalance: async (address: string, network = 'mainnet'): Promise<number | null> => {
    const balanceHex = await AlchemyAPI.rpcCall('eth_getBalance', [address, 'latest'], network);

    if (balanceHex && typeof balanceHex === 'string') {
      const balanceWei = parseInt(balanceHex, 16);
      return balanceWei / 1e18;
    }
    return null;
  },

  getGasPrice: async (network = 'mainnet'): Promise<number | null> => {
    const gasPriceHex = await AlchemyAPI.rpcCall('eth_gasPrice', [], network);

    if (gasPriceHex && typeof gasPriceHex === 'string') {
      const gasPriceWei = parseInt(gasPriceHex, 16);
      return gasPriceWei / 1e9;
    }
    return null;
  },

  getBlockNumber: async (network = 'mainnet'): Promise<number | null> => {
    const blockHex = await AlchemyAPI.rpcCall('eth_blockNumber', [], network);

    if (blockHex && typeof blockHex === 'string') {
      return parseInt(blockHex, 16);
    }
    return null;
  },
};
