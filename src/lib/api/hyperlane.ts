import axios from 'axios';
import useSWR from 'swr';
import { BridgeTransaction, BridgeStats } from './types';

const API_BASE = process.env.NEXT_PUBLIC_HYPERLANE_API_URL;

export async function getHyperlaneTransactions(timeframe: string = '24h'): Promise<BridgeTransaction[]> {
  try {
    const response = await axios.get(`${API_BASE}/transactions?timeframe=${timeframe}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Hyperlane transactions:', error);
    return [];
  }
}

export async function getHyperlaneStats(timeframe: string = '24h'): Promise<BridgeStats> {
  try {
    const response = await axios.get(`${API_BASE}/stats?timeframe=${timeframe}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching Hyperlane stats:', error);
    throw error;
  }
}

export function useHyperlaneData(timeframe: string = '24h') {
  const { data: transactions, error: txError } = useSWR(
    `hyperlane/transactions/${timeframe}`,
    () => getHyperlaneTransactions(timeframe)
  );

  const { data: stats, error: statsError } = useSWR(
    `hyperlane/stats/${timeframe}`,
    () => getHyperlaneStats(timeframe)
  );

  return {
    transactions: transactions || [],
    stats,
    isLoading: !transactions && !txError && !stats && !statsError,
    isError: txError || statsError
  };
}