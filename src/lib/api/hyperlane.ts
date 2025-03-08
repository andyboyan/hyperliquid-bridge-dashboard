import axios from 'axios';
import useSWR from 'swr';
import { BridgeTransaction, BridgeStats } from './types';

const API_BASE = 'https://explorer.hyperlane.xyz/api';

export async function getHyperlaneTransactions(timeframe: string = '24h'): Promise<BridgeTransaction[]> {
  try {
    // Get the timestamp for the timeframe
    const now = Date.now();
    const timeframeMs = timeframe === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const fromTimestamp = now - timeframeMs;

    const response = await axios.get(`${API_BASE}/messages`, {
      params: {
        fromTimestamp,
        status: 'delivered',
        limit: 100,
        orderBy: 'timestamp',
        order: 'desc'
      }
    });

    // Transform the response to match our BridgeTransaction interface
    return response.data.messages.map((msg: any) => ({
      id: msg.id,
      timestamp: new Date(msg.timestamp).getTime(),
      sourceChain: msg.origin,
      destinationChain: msg.destination,
      asset: msg.body?.substring(0, 10) || 'Unknown', // Simplified for now
      amount: '0', // Would need to decode the message body
      usdValue: 0, // Would need price data
      status: msg.status,
      txHash: msg.originTransactionHash,
      bridgeProtocol: 'hyperlane'
    }));
  } catch (error) {
    console.error('Error fetching Hyperlane transactions:', error);
    return [];
  }
}

export async function getHyperlaneStats(timeframe: string = '24h'): Promise<BridgeStats> {
  try {
    // Get chain metrics
    const response = await axios.get(`${API_BASE}/metrics/chains`);
    const chainMetrics = response.data;

    // Calculate totals
    const chainStats = Object.entries(chainMetrics).map(([chainId, metrics]: [string, any]) => ({
      chainId,
      chainName: chainId.charAt(0).toUpperCase() + chainId.slice(1),
      totalTransactions: metrics.messages || 0,
      totalValue: 0, // Would need price data
      activeAssets: [] // Would need to aggregate from messages
    }));

    const totalTransactions = chainStats.reduce((sum, chain) => sum + chain.totalTransactions, 0);

    return {
      totalValueLocked: 0, // Would need contract data
      totalTransactions,
      uniqueAssets: 0, // Would need to aggregate from messages
      activeChains: chainStats.length,
      timeSeriesData: [], // Would need historical data
      chainStats
    };
  } catch (error) {
    console.error('Error fetching Hyperlane stats:', error);
    throw error;
  }
}

export function useHyperlaneData(timeframe: string = '24h') {
  const { data: transactions, error: txError } = useSWR(
    `hyperlane/transactions/${timeframe}`,
    () => getHyperlaneTransactions(timeframe),
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const { data: stats, error: statsError } = useSWR(
    `hyperlane/stats/${timeframe}`,
    () => getHyperlaneStats(timeframe),
    { refreshInterval: 60000 } // Refresh every minute
  );

  return {
    transactions: transactions || [],
    stats,
    isLoading: !transactions && !txError && !stats && !statsError,
    isError: txError || statsError
  };
}