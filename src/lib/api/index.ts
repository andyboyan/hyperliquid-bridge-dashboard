export * from './types';
export { useHyperlaneData, getHyperlaneTransactions, getHyperlaneStats } from './hyperlane';
export { useDeBridgeData, getDeBridgeTransactions, getDeBridgeStats } from './debridge';

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