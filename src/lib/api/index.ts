// Import hooks for bridge data
import { useHyperlaneData } from './hyperlane';
import { useDeBridgeData } from './debridge';

// Export all types and functions
export * from './types';
export * from './hyperlane';
export * from './debridge';

// Combined hook for fetching data from both bridges
export function useBridgeData(timeframe: string = '24h') {
  const hyperlane = useHyperlaneData(timeframe);
  const debridge = useDeBridgeData(timeframe);

  return {
    transactions: [...(hyperlane.transactions || []), ...(debridge.transactions || [])],
    stats: {
      ...(hyperlane.stats || {}),
      ...(debridge.stats || {}),
      chainStats: [
        ...(hyperlane.stats?.chainStats || []),
        ...(debridge.stats?.chainStats || []),
      ],
    },
    isLoading: hyperlane.isLoading || debridge.isLoading,
    isError: hyperlane.isError || debridge.isError,
  };
}