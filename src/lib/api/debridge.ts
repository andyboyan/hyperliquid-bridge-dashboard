import axios from 'axios';
import useSWR from 'swr';
import { BridgeTransaction, BridgeStats, APIResponse } from './types';

const DEBRIDGE_API_URL = process.env.NEXT_PUBLIC_DEBRIDGE_API_URL;

if (!DEBRIDGE_API_URL) {
  console.warn('NEXT_PUBLIC_DEBRIDGE_API_URL is not set');
}

const api = axios.create({
  baseURL: DEBRIDGE_API_URL,
  timeout: 10000,
});

export async function getDeBridgeTransactions(
  timeframe: string = '24h'
): Promise<APIResponse<BridgeTransaction[]>> {
  try {
    const response = await api.get<BridgeTransaction[]>('/transfers', {
      params: { timeframe },
    });

    return {
      success: true,
      data: response.data.map(tx => ({
        ...tx,
        bridgeProtocol: 'debridge',
      })),
    };
  } catch (error) {
    console.error('Error fetching deBridge transactions:', error);
    return {
      success: false,
      error: 'Failed to fetch deBridge transactions',
    };
  }
}

export async function getDeBridgeStats(
  timeframe: string = '24h'
): Promise<APIResponse<BridgeStats>> {
  try {
    const response = await api.get<BridgeStats>('/statistics', {
      params: { timeframe },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error fetching deBridge stats:', error);
    return {
      success: false,
      error: 'Failed to fetch deBridge statistics',
    };
  }
}

export async function getDeBridgeChainActivity(
  chainId: string,
  timeframe: string = '24h'
): Promise<APIResponse<BridgeTransaction[]>> {
  try {
    const response = await api.get<BridgeTransaction[]>(`/chains/${chainId}/transfers`, {
      params: { timeframe },
    });

    return {
      success: true,
      data: response.data.map(tx => ({
        ...tx,
        bridgeProtocol: 'debridge',
      })),
    };
  } catch (error) {
    console.error(`Error fetching deBridge chain activity for ${chainId}:`, error);
    return {
      success: false,
      error: `Failed to fetch deBridge activity for chain ${chainId}`,
    };
  }
}

// Hook for real-time data fetching
export function useDeBridgeData(timeframe: string = '24h') {
  const { data: transactions, error: txError } = useSWR(
    `/debridge/transfers?timeframe=${timeframe}`,
    () => getDeBridgeTransactions(timeframe)
  );

  const { data: stats, error: statsError } = useSWR(
    `/debridge/statistics?timeframe=${timeframe}`,
    () => getDeBridgeStats(timeframe)
  );

  return {
    transactions: transactions?.data || [],
    stats: stats?.data,
    isLoading: !transactions && !txError && !stats && !statsError,
    isError: txError || statsError,
  };
}