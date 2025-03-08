import axios from 'axios';
import useSWR from 'swr';
import { BridgeTransaction, BridgeStats } from './types';

const API_BASE = process.env.NEXT_PUBLIC_DEBRIDGE_API_URL;

export async function getDeBridgeTransactions(timeframe: string = '24h'): Promise<BridgeTransaction[]> {
  try {
    const response = await axios.get(`${API_BASE}/transfers?timeframe=${timeframe}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching deBridge transactions:', error);
    return [];
  }
}

export async function getDeBridgeStats(timeframe: string = '24h'): Promise<BridgeStats> {
  try {
    const response = await axios.get(`${API_BASE}/statistics?timeframe=${timeframe}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching deBridge stats:', error);
    throw error;
  }
}

export function useDeBridgeData(timeframe: string = '24h') {
  const { data: transactions, error: txError } = useSWR(
    `debridge/transfers/${timeframe}`,
    () => getDeBridgeTransactions(timeframe)
  );

  const { data: stats, error: statsError } = useSWR(
    `debridge/stats/${timeframe}`,
    () => getDeBridgeStats(timeframe)
  );

  return {
    transactions: transactions || [],
    stats,
    isLoading: !transactions && !txError && !stats && !statsError,
    isError: txError || statsError
  };
}