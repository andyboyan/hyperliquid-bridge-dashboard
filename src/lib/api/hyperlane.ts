import axios from 'axios';
import useSWR from 'swr';
import { BridgeTransaction, BridgeStats, APIResponse } from './types';

const HYPERLANE_API_URL = process.env.NEXT_PUBLIC_HYPERLANE_API_URL;

if (!HYPERLANE_API_URL) {
  console.warn('NEXT_PUBLIC_HYPERLANE_API_URL is not set');
}

const api = axios.create({
  baseURL: HYPERLANE_API_URL,
  timeout: 10000,
});

export async function getHyperlaneTransactions(
  timeframe: string = '24h'
): Promise<APIResponse<BridgeTransaction[]>> {
  try {
    const response = await api.get<BridgeTransaction[]>('/transactions', {
      params: { timeframe },
    });

    return {
      success: true,
      data: response.data.map(tx => ({
        ...tx,
        bridgeProtocol: 'hyperlane',
      })),
    };
  } catch (error) {
    console.error('Error fetching Hyperlane transactions:', error);
    return {
      success: false,
      error: 'Failed to fetch Hyperlane transactions',
    };
  }
}

export async function getHyperlaneStats(
  timeframe: string = '24h'
): Promise<APIResponse<BridgeStats>> {
  try {
    const response = await api.get<BridgeStats>('/stats', {
      params: { timeframe },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error fetching Hyperlane stats:', error);
    return {
      success: false,
      error: 'Failed to fetch Hyperlane statistics',
    };
  }
}

export async function getHyperlaneChainActivity(
  chainId: string,
  timeframe: string = '24h'
): Promise<APIResponse<BridgeTransaction[]>> {
  try {
    const response = await api.get<BridgeTransaction[]>(`/chain/${chainId}/activity`, {
      params: { timeframe },
    });

    return {
      success: true,
      data: response.data.map(tx => ({
        ...tx,
        bridgeProtocol: 'hyperlane',
      })),
    };
  } catch (error) {
    console.error(`Error fetching Hyperlane chain activity for ${chainId}:`, error);
    return {
      success: false,
      error: `Failed to fetch Hyperlane activity for chain ${chainId}`,
    };
  }
}

// Hook for real-time data fetching
export function useHyperlaneData(timeframe: string = '24h') {
  const { data: transactions, error: txError } = useSWR(
    `/hyperlane/transactions?timeframe=${timeframe}`,
    () => getHyperlaneTransactions(timeframe)
  );

  const { data: stats, error: statsError } = useSWR(
    `/hyperlane/stats?timeframe=${timeframe}`,
    () => getHyperlaneStats(timeframe)
  );

  return {
    transactions: transactions?.data || [],
    stats: stats?.data,
    isLoading: !transactions && !txError && !stats && !statsError,
    isError: txError || statsError,
  };
}