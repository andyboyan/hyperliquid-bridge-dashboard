export interface BridgeTransaction {
    id: string;
    timestamp: number;
    sourceChain: string;
    destinationChain: string;
    asset: string;
    amount: string;
    usdValue: number;
    status: 'completed' | 'pending' | 'failed';
    txHash: string;
    bridgeProtocol: 'hyperlane' | 'debridge';
  }
  
  export interface ChainStats {
    chainId: string;
    chainName: string;
    totalTransactions: number;
    totalValue: number;
    activeAssets: string[];
  }
  
  export interface TimeSeriesDataPoint {
    timestamp: number;
    value: number;
    chain: string;
    asset: string;
  }
  
  export interface BridgeStats {
    totalValueLocked: number;
    totalTransactions: number;
    uniqueAssets: number;
    activeChains: number;
    timeSeriesData: TimeSeriesDataPoint[];
    chainStats: ChainStats[];
  }
  
  export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
  }