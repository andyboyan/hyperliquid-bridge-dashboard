import { http, HttpResponse } from 'msw';
import { BridgeTransaction, BridgeStats } from '../lib/api/types';

// Mock data
const mockTransactions: BridgeTransaction[] = [
  {
    id: '1',
    timestamp: Date.now() - 3600000, // 1 hour ago
    sourceChain: 'ethereum',
    destinationChain: 'hyperliquid',
    asset: 'USDC',
    amount: '1000.00',
    usdValue: 1000,
    status: 'completed',
    txHash: '0x123...',
    bridgeProtocol: 'hyperlane',
  },
  {
    id: '2',
    timestamp: Date.now() - 7200000, // 2 hours ago
    sourceChain: 'solana',
    destinationChain: 'hyperliquid',
    asset: 'SOL',
    amount: '10.5',
    usdValue: 2000,
    status: 'completed',
    txHash: '0x456...',
    bridgeProtocol: 'debridge',
  },
];

const mockStats: BridgeStats = {
  totalValueLocked: 5000000,
  totalTransactions: 1250,
  uniqueAssets: 15,
  activeChains: 5,
  timeSeriesData: [
    {
      timestamp: Date.now() - 86400000, // 24 hours ago
      value: 1000000,
      chain: 'ethereum',
      asset: 'USDC',
    },
    {
      timestamp: Date.now() - 43200000, // 12 hours ago
      value: 2000000,
      chain: 'solana',
      asset: 'SOL',
    },
  ],
  chainStats: [
    {
      chainId: 'ethereum',
      chainName: 'Ethereum',
      totalTransactions: 750,
      totalValue: 3000000,
      activeAssets: ['USDC', 'ETH', 'WBTC'],
    },
    {
      chainId: 'solana',
      chainName: 'Solana',
      totalTransactions: 500,
      totalValue: 2000000,
      activeAssets: ['SOL', 'USDC'],
    },
  ],
};

// Handlers
export const handlers = [
  // Hyperlane handlers
  http.get('*/hyperlane/transactions', () => {
    return HttpResponse.json(mockTransactions.filter(tx => tx.bridgeProtocol === 'hyperlane'));
  }),

  http.get('*/hyperlane/stats', () => {
    return HttpResponse.json(mockStats);
  }),

  // deBridge handlers
  http.get('*/debridge/transfers', () => {
    return HttpResponse.json(mockTransactions.filter(tx => tx.bridgeProtocol === 'debridge'));
  }),

  http.get('*/debridge/statistics', () => {
    return HttpResponse.json(mockStats);
  }),
];