// Export types
export * from './types';

// Export Hyperlane functionality
export {
  getHyperlaneTransactions,
  getHyperlaneStats,
  getHyperlaneChainActivity,
  useHyperlaneData,
} from './hyperlane';

// Export deBridge functionality
export {
  getDeBridgeTransactions,
  getDeBridgeStats,
  getDeBridgeChainActivity,
  useDeBridgeData,
} from './debridge';

// Combined hook for fetching data from both bridges
export function useBridgeData(timeframe: string = '24h') {
  const hyperlane = useHyperlaneData(timeframe);
  const debridge = useDeBridgeData(timeframe);

  return {
    transactions: [
      ...(hyperlane.transactions || []),
      ...(debridge.transactions || []),
    ],
    stats: {
      totalValueLocked: (hyperlane.stats?.totalValueLocked || 0) + (debridge.stats?.totalValueLocked || 0),
      totalTransactions: (hyperlane.stats?.totalTransactions || 0) + (debridge.stats?.totalTransactions || 0),
      uniqueAssets: new Set([
        ...(hyperlane.stats?.chainStats.flatMap(chain => chain.activeAssets) || []),
        ...(debridge.stats?.chainStats.flatMap(chain => chain.activeAssets) || []),
      ]).size,
      activeChains: new Set([
        ...(hyperlane.stats?.chainStats.map(chain => chain.chainId) || []),
        ...(debridge.stats?.chainStats.map(chain => chain.chainId) || []),
      ]).size,
      timeSeriesData: [
        ...(hyperlane.stats?.timeSeriesData || []),
        ...(debridge.stats?.timeSeriesData || []),
      ],
      chainStats: [
        ...(hyperlane.stats?.chainStats || []),
        ...(debridge.stats?.chainStats || []),
      ],
    },
    isLoading: hyperlane.isLoading || debridge.isLoading,
    isError: hyperlane.isError || debridge.isError,
  };
}