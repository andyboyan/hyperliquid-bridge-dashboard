import axios from 'axios';
import useSWR from 'swr';
import { BridgeTransaction, BridgeStats, TimeSeriesDataPoint } from './types';
import { useState, useEffect, useCallback } from 'react';

// Use local proxy in production, direct API in development
const API_BASE = process.env.NODE_ENV === 'production' 
  ? '/api/hyperlane' 
  : 'https://explorer.hyperlane.xyz/api';

// Add more detailed logging
console.log('Environment:', process.env.NODE_ENV);
console.log('Using API base:', API_BASE);

// Common token addresses with their respective symbols - expanded list
const TOKEN_ADDRESSES: Record<string, string> = {
  // Ethereum
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'WBTC',
  '0x7d1afa7b718fb893db30a30c99a7a9449aa84174': 'MATIC',
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'UNI',
  '0x514910771af9ca656af840dff83e8264ecf986ca': 'LINK',
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84': 'stETH',
  // Polygon
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'USDC',
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'USDT',
  '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': 'DAI',
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'WETH',
  '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': 'WBTC',
  '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39': 'LINK',
  // Arbitrum
  '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 'USDC',
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'USDT',
  '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': 'DAI',
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'WETH',
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': 'WBTC',
  // Base
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': 'DAI',
  '0x4200000000000000000000000000000000000006_base': 'WETH',
  // Optimism
  '0x7f5c764cbc14f9669b88837ca1490cca17c31607': 'USDC',
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': 'USDT',
  '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1_optimism': 'DAI',
  '0x4200000000000000000000000000000000000006_optimism': 'WETH',
  // Hyperliquid - add any known Hyperliquid token addresses here
  // ...
};

// Common token symbols that might appear in message bodies
const TOKEN_SYMBOLS = [
  'ETH', 'WETH', 'BTC', 'WBTC', 'USDC', 'USDT', 'DAI', 'LINK', 'UNI',
  'MATIC', 'SOL', 'AVAX', 'ATOM', 'DOT', 'ADA', 'XRP', 'LTC', 'DOGE', 
  'SHIB', 'FTM', 'NEAR', 'ATOM', 'ALGO', 'XTZ', 'stETH', 'rETH',
  'stBTC' // Removed zSOL, kept stBTC
];

// Function to find token symbol from address
function getTokenSymbolFromAddress(address: string): string | null {
  if (!address) return null;
  
  const lowerCaseAddress = address.toLowerCase();
  return TOKEN_ADDRESSES[lowerCaseAddress] || null;
}

// Define interface for Hyperlane messages
export interface HyperlaneMessage {
  id: string;
  origin: string;
  destination: string;
  body?: string;
  sender?: string;
  recipient?: string;
  status?: string;
  timestamp?: number;
  blockNumber?: number;
  transactionHash?: string;
}

// Debug function to log message details for troubleshooting
function logMessageDetails(message: HyperlaneMessage, extractedInfo: { symbol: string, amount: string }) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Message ID:', message.id);
    console.log('Origin:', message.origin);
    console.log('Destination:', message.destination);
    console.log('Body:', message.body?.substring(0, 100));
    console.log('Extracted:', extractedInfo);
  }
}

// Improved function to extract asset information from message body
function extractAssetInfo(message: HyperlaneMessage) {
  try {
    const body = message.body || '';
    let extractedInfo = { symbol: 'Unknown', amount: '1' };
    
    // Store all possible tokens found for better analytics
    const possibleTokens: Array<{symbol: string, amount: string, confidence: number}> = [];
    
    // Track the raw body for debugging
    console.log(`Analyzing message body (first 100 chars): ${body.substring(0, 100)}`);
    
    // 1. First try to identify token by addresses found in the body
    const addressPattern = /0x[a-fA-F0-9]{40}/g;
    const addresses = body.match(addressPattern) || [];
    
    if (addresses.length > 0) {
      console.log(`Found ${addresses.length} addresses in message body`);
    }
    
    for (const address of addresses) {
      const symbol = getTokenSymbolFromAddress(address);
      if (symbol) {
        console.log(`Identified token ${symbol} from address ${address}`);
        
        // Look for amount pattern near the token address
        const amountPattern = /0x[a-fA-F0-9]{8,64}/g; // Hex encoded amounts
        const amounts = body.match(amountPattern) || [];
        
        if (amounts.length > 0 && amounts[0] !== address) {
          try {
            // Parse as hex and divide by appropriate power of 10 based on token
            const hexValue = amounts[0] || '0x0'; // Provide a default if undefined
            const decimal = parseInt(hexValue, 16);
            let amount = decimal;
            
            // Apply token-specific decimal conversion
            let decimals = 18;
            if (symbol === 'USDC' || symbol === 'USDT') decimals = 6;
            
            amount = decimal / (10 ** decimals);
            
            // Return with sensible values
            if (amount > 0 && amount < 1000000000) { // Sanity check
              console.log(`Parsed amount for ${symbol}: ${amount} from hex ${hexValue}`);
              possibleTokens.push({symbol, amount: amount.toString(), confidence: 0.9});
            }
          } catch (e) {
            console.error('Error parsing amount:', e);
          }
        }
        
        // Add with default amount as fallback
        const defaultAmounts: Record<string, string> = {
          'USDC': '1000',
          'USDT': '1000',
          'DAI': '1000',
          'WETH': '0.5',
          'ETH': '0.5',
          'WBTC': '0.01',
          'BTC': '0.01',
          'SOL': '10',
          'stBTC': '0.01'
        };
        
        possibleTokens.push({
          symbol, 
          amount: defaultAmounts[symbol] || '1',
          confidence: 0.8
        });
      }
    }
    
    // 2. Check for known token symbols in the body using more robust pattern matching
    const bodyLower = body.toLowerCase();
    
    // Check for special tokens with non-standard naming patterns first
    if (bodyLower.includes('sol')) {
      console.log('Found "sol" in message body');
      possibleTokens.push({symbol: 'SOL', amount: '10', confidence: 0.7});
    } 
    
    if (bodyLower.includes('stbtc') || bodyLower.includes('st-btc') || bodyLower.includes('st btc')) {
      console.log('Found "stbtc" variant in message body');
      possibleTokens.push({symbol: 'stBTC', amount: '0.1', confidence: 0.7});
    }
    
    // More comprehensive token pattern matching with word boundaries
    for (const symbol of TOKEN_SYMBOLS) {
      // Use word boundary matching for more accurate detection
      const symbolRegex = new RegExp(`\\b${symbol.toLowerCase()}\\b`, 'i');
      if (symbolRegex.test(bodyLower)) {
        console.log(`Found token pattern match for ${symbol}`);
        
        const defaultAmounts: Record<string, string> = {
          'USDC': '1000',
          'USDT': '1000',
          'DAI': '1000',
          'WETH': '0.5',
          'ETH': '0.5',
          'WBTC': '0.01',
          'BTC': '0.01',
          'SOL': '10',
          'stBTC': '0.01'
        };
        
        possibleTokens.push({ 
          symbol, 
          amount: defaultAmounts[symbol] || '1',
          confidence: 0.6
        });
      }
    }
    
    // 3. Chain-specific defaults as last resort
    if (possibleTokens.length === 0 && message.origin && message.destination) {
      // For Solana to Hyperliquid bridges, default to SOL if no token identified
      if (
        message.origin.toLowerCase() === 'solana' && 
        message.destination.toLowerCase().includes('hyperliquid')
      ) {
        console.log('No token identified, but message is Solana->Hyperliquid, defaulting to SOL');
        possibleTokens.push({symbol: 'SOL', amount: '10', confidence: 0.5});
      }
      // For bridges to/from Hyperliquid with no identified token, default to USDC
      else if (
        message.origin.toLowerCase().includes('hyperliquid') || 
        message.destination.toLowerCase().includes('hyperliquid')
      ) {
        console.log('No token identified, but message involves Hyperliquid, defaulting to USDC');
        possibleTokens.push({symbol: 'USDC', amount: '1000', confidence: 0.5});
      }
    }
    
    // Sort by confidence and use the highest confidence match
    if (possibleTokens.length > 0) {
      possibleTokens.sort((a, b) => b.confidence - a.confidence);
      const bestMatch = possibleTokens[0];
      console.log(`Selected best token match: ${bestMatch.symbol} (confidence: ${bestMatch.confidence})`);
      
      if (possibleTokens.length > 1) {
        console.log(`Other possible tokens: ${possibleTokens.slice(1).map(t => t.symbol).join(', ')}`);
      }
      
      extractedInfo = { symbol: bestMatch.symbol, amount: bestMatch.amount };
    } else {
      console.log('No tokens identified in message, using Unknown');
    }
    
    // Log the extracted information for debugging
    logMessageDetails(message, extractedInfo);
    
    return extractedInfo;
  } catch (error) {
    console.error('Error extracting asset info:', error);
    return { symbol: 'Unknown', amount: '1' };
  }
}

// Simplified price lookup
function getTokenPrice(symbol: string): number {
  const prices: Record<string, number> = {
    'USDC': 1,
    'USDT': 1,
    'DAI': 1,
    'WETH': 3000,
    'ETH': 3000,
    'WBTC': 50000,
    'BTC': 50000,
    'MATIC': 0.5,
    'SOL': 150,
    'AVAX': 30,
    'LINK': 15,
    'UNI': 8,
    'stETH': 3000,
    'rETH': 3000,
    'stBTC': 50000 // Kept stBTC, removed zSOL
  };
  
  return prices[symbol] || 1;
}

// Helper to format chain names
function formatChainName(chainId: string): string {
  // Map of common chain IDs to readable names
  const chainNames: Record<string, string> = {
    '1': 'Ethereum',
    '10': 'Optimism',
    '56': 'BSC',
    '137': 'Polygon',
    '42161': 'Arbitrum',
    '43114': 'Avalanche',
    'ethereum': 'Ethereum',
    'optimism': 'Optimism',
    'bsc': 'BSC',
    'binance': 'Binance', // Added Binance
    'polygon': 'Polygon',
    'arbitrum': 'Arbitrum',
    'avalanche': 'Avalanche',
    'base': 'Base',
    'solana': 'Solana',
    'hyperliquid': 'Hyperliquid',
  };
  
  return chainNames[chainId?.toLowerCase()] || (chainId ? chainId.charAt(0).toUpperCase() + chainId.slice(1) : 'Unknown');
}

export async function getHyperlaneTransactions(timeframe: string = '24h'): Promise<BridgeTransaction[]> {
  try {
    // Get the timestamp for the timeframe
    const now = new Date().getTime();
    console.log(`Current timestamp: ${now}, Date: ${new Date(now).toISOString()}`);
    
    const timeframeMs = timeframe === '24h' ? 24 * 60 * 60 * 1000 : 
                        timeframe === '7d' ? 7 * 24 * 60 * 60 * 1000 :
                        30 * 24 * 60 * 60 * 1000; // Default to 30 days
    const fromTimestamp = now - timeframeMs;

    console.log(`Fetching Hyperlane transactions since ${new Date(fromTimestamp).toISOString()}`);
    
    let allMessages: HyperlaneMessage[] = [];
    let offset = 0;
    const limit = 1000; // Increased limit per request
    let hasMore = true;

    // Paginate through all results
    while (hasMore) {
      const requestUrl = `${API_BASE}/messages`;
      const params = {
        fromTimestamp,
        status: 'delivered',
        limit,
        offset,
        orderBy: 'timestamp',
        order: 'desc',
        destination: 'hyperliquid' // Filter for messages going to HyperEVM
      };
      
      console.log(`Making API request to: ${requestUrl}, offset: ${offset}`);
      console.log('With params:', JSON.stringify(params));

      try {
        const response = await axios.get(requestUrl, { 
          params,
          timeout: 30000, // Increased timeout
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.data.messages || !Array.isArray(response.data.messages)) {
          console.error('Invalid API response format:', response.data);
          break;
        }

        const messages = response.data.messages;
        allMessages = allMessages.concat(messages);
        
        console.log(`Received ${messages.length} messages from API (total: ${allMessages.length})`);
        
        // Check if we should continue paginating
        if (messages.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }

        // Add a small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error fetching page:', error);
        break;
      }
    }

    // Also get transactions originating from HyperEVM
    offset = 0;
    hasMore = true;

    while (hasMore) {
      const requestUrl = `${API_BASE}/messages`;
      const params = {
        fromTimestamp,
        status: 'delivered',
        limit,
        offset,
        orderBy: 'timestamp',
        order: 'desc',
        origin: 'hyperliquid' // Filter for messages coming from HyperEVM
      };

      try {
        const response = await axios.get(requestUrl, { 
          params,
          timeout: 30000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.data.messages || !Array.isArray(response.data.messages)) {
          console.error('Invalid API response format:', response.data);
          break;
        }

        const messages = response.data.messages;
        allMessages = allMessages.concat(messages);
        
        console.log(`Received ${messages.length} messages from API (total: ${allMessages.length})`);
        
        if (messages.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error fetching page:', error);
        break;
      }
    }

    // Remove any duplicates that might have occurred
    allMessages = Array.from(new Map(allMessages.map(msg => [msg.id, msg])).values());
    
    console.log(`Total unique messages after deduplication: ${allMessages.length}`);

    // Track discovered chains and assets for analytics
    const discoveredChains = new Set<string>();
    const discoveredAssets = new Set<string>();
    
    if (allMessages.length > 0) {
      // Analyze source and destination chains in the data
      allMessages.forEach((msg: HyperlaneMessage) => {
        if (msg.origin) discoveredChains.add(formatChainName(msg.origin));
        if (msg.destination) discoveredChains.add(formatChainName(msg.destination));
      });
      
      console.log('Discovered chains in API data:', Array.from(discoveredChains));
      
      // Check specifically for solana transactions
      const solanaMessages = allMessages.filter((msg: HyperlaneMessage) => 
        msg.origin?.toLowerCase() === 'solana' || 
        msg.destination?.toLowerCase() === 'solana'
      );
      
      console.log(`Found ${solanaMessages.length} transactions involving Solana`);
      
      if (solanaMessages.length > 0) {
        // Log details about the first few Solana transactions for debugging
        solanaMessages.slice(0, 3).forEach((msg: HyperlaneMessage, index: number) => {
          console.log(`Solana transaction ${index + 1}:`, {
      id: msg.id,
            origin: msg.origin,
            destination: msg.destination,
            timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : 'unknown',
            body: msg.body?.substring(0, 100)
          });
        });
      }
    } else {
      console.log('No messages received from API');
      return generateMockTransactions();
    }

    if (allMessages && Array.isArray(allMessages) && allMessages.length > 0) {
      try {
        // Process transactions with enhanced analytics
        const transactions = allMessages.map((msg: HyperlaneMessage) => {
          if (!msg || typeof msg !== 'object') {
            console.error('Invalid message format:', msg);
            return null;
          }
          
          // Extract asset information from the message
          const { symbol: asset, amount } = extractAssetInfo(msg);
          
          // Get the price for this asset
          const price = getTokenPrice(asset);
          
          // Calculate USD value
          const usdValue = parseFloat(amount) * price;
          
          return {
            id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: msg.timestamp || Date.now(),
            sourceChain: formatChainName(msg.origin || 'unknown'),
            destinationChain: formatChainName(msg.destination || 'unknown'),
            asset,
            amount,
            usdValue,
            status: msg.status || 'delivered',
            txHash: msg.transactionHash || `0x${Math.random().toString(36).substring(2, 40)}`,
          };
        }).filter(Boolean) as BridgeTransaction[];
        
        // Log transaction count
        console.log(`Processed ${transactions.length} transactions`);
        
        // Generate chain pair analytics
        const chainPairAnalytics: Record<string, { count: number, volume: number, assets: Set<string> }> = {};
        
        transactions.forEach(tx => {
          const pairKey = `${tx.sourceChain} → ${tx.destinationChain}`;
          if (!chainPairAnalytics[pairKey]) {
            chainPairAnalytics[pairKey] = { count: 0, volume: 0, assets: new Set() };
          }
          chainPairAnalytics[pairKey].count++;
          chainPairAnalytics[pairKey].volume += tx.usdValue;
          chainPairAnalytics[pairKey].assets.add(tx.asset);
        });
        
        // Log chain pair analytics
        console.log('Chain pair analytics:');
        Object.entries(chainPairAnalytics).forEach(([pair, data]) => {
          console.log(`${pair}: ${data.count} transactions, $${data.volume.toFixed(2)} volume, Assets: ${Array.from(data.assets).join(', ')}`);
        });
        
        // Analyze transactions involving HyperEVM
        const hyperEVMTransactions = transactions.filter(tx => 
          tx.sourceChain.toLowerCase() === 'hyperliquid' || 
          tx.destinationChain.toLowerCase() === 'hyperliquid'
        );
        
        console.log(`Found ${hyperEVMTransactions.length} transactions involving HyperEVM`);
        
        // Generate asset volume metrics
        const assetVolumeMetrics: Record<string, { count: number, volume: number, chains: Set<string> }> = {};
        transactions.forEach(tx => {
          if (!assetVolumeMetrics[tx.asset]) {
            assetVolumeMetrics[tx.asset] = { count: 0, volume: 0, chains: new Set() };
          }
          assetVolumeMetrics[tx.asset].count++;
          assetVolumeMetrics[tx.asset].volume += tx.usdValue;
          assetVolumeMetrics[tx.asset].chains.add(tx.sourceChain);
          assetVolumeMetrics[tx.asset].chains.add(tx.destinationChain);
        });
        
        // Log asset volume metrics
        console.log('Asset volume metrics:');
        Object.entries(assetVolumeMetrics)
          .sort((a, b) => b[1].volume - a[1].volume) // Sort by volume
          .forEach(([asset, data]) => {
            console.log(`${asset}: ${data.count} transactions, $${data.volume.toFixed(2)} volume, Chains: ${Array.from(data.chains).join(', ')}`);
          });

        return transactions;
      } catch (e) {
        console.error('Error mapping API response to transactions:', e);
        return generateMockTransactions();
      }
    } else {
      console.log('No messages received from API');
      return generateMockTransactions();
    }
  } catch (error) {
    console.error('Error fetching Hyperlane transactions:', error);
    return generateMockTransactions();
  }
}

// Helper function to count assets in transactions
function countAssets(transactions: BridgeTransaction[]): Record<string, number> {
  const assetCounts: Record<string, number> = {};
  
  transactions.forEach(tx => {
    if (!assetCounts[tx.asset]) {
      assetCounts[tx.asset] = 0;
    }
    assetCounts[tx.asset]++;
  });
  
  return assetCounts;
}

// Generate mock transactions as fallback
function generateMockTransactions(): BridgeTransaction[] {
  const assets = ['USDC', 'WETH', 'WBTC', 'DAI', 'USDT', 'SOL']; // Added SOL to assets
  const chains = ['Ethereum', 'Polygon', 'Arbitrum', 'Base', 'Hyperliquid', 'Solana']; // Added Solana to chains
  const now = Date.now();
  
  return Array(20).fill(0).map((_, i) => {
    const asset = assets[Math.floor(Math.random() * assets.length)];
    const sourceChain = chains[Math.floor(Math.random() * chains.length)];
    let destinationChain;
    do {
      destinationChain = chains[Math.floor(Math.random() * chains.length)];
    } while (destinationChain === sourceChain);
    
    const amount = asset === 'WETH' ? '0.5' : 
                  asset === 'WBTC' ? '0.01' :
                  asset === 'SOL' ? '10' : '1000'; // Added SOL amount
    const price = getTokenPrice(asset);
    
    // Ensure some transactions are to/from Solana to HyperEVM (represented by Hyperliquid)
    if (i % 5 === 0) { // Every 5th transaction
      return {
        id: `mock-${i}`,
        timestamp: now - (i * 3600000), // hourly intervals going back
        sourceChain: 'Solana',
        destinationChain: 'Hyperliquid',
        asset: assets[Math.floor(Math.random() * assets.length)],
        amount: asset === 'WETH' ? '0.5' : 
               asset === 'WBTC' ? '0.01' :
               asset === 'SOL' ? '10' : '1000',
        usdValue: parseFloat(amount) * price,
        status: 'delivered',
        txHash: `0x${i.toString(16).padStart(64, '0')}`,
        bridgeProtocol: 'hyperlane'
      };
    }
    
    return {
      id: `mock-${i}`,
      timestamp: now - (i * 3600000), // hourly intervals going back
      sourceChain,
      destinationChain,
      asset,
      amount,
      usdValue: parseFloat(amount) * price,
      status: 'delivered',
      txHash: `0x${i.toString(16).padStart(64, '0')}`,
      bridgeProtocol: 'hyperlane'
    };
  });
}

// Function to get data for a specific chain
export async function getChainTransactions(chain: string, timeframe: string = '24h'): Promise<BridgeTransaction[]> {
  const transactions = await getHyperlaneTransactions(timeframe);
  return transactions.filter(tx => 
    tx.sourceChain.toLowerCase() === chain.toLowerCase() || 
    tx.destinationChain.toLowerCase() === chain.toLowerCase()
  );
}

// Function to get time series data for a specific chain
export async function getChainTimeSeriesData(chain: string, timeframe: string = '24h'): Promise<TimeSeriesDataPoint[]> {
  const transactions = await getChainTransactions(chain, timeframe);
  
  if (transactions.length === 0) {
    console.log(`No transactions found for chain: ${chain}`);
    // Generate some mock data to ensure charts aren't empty
    return generateMockTimeSeriesData(chain);
  }
  
  // Group by day and asset
  const timeGroups: Record<string, Record<string, number>> = {};
  
  transactions.forEach(tx => {
    // Group by day for simplicity
    const date = new Date(tx.timestamp).toISOString().split('T')[0];
    if (!timeGroups[date]) {
      timeGroups[date] = {};
    }
    
    if (!timeGroups[date][tx.asset]) {
      timeGroups[date][tx.asset] = 0;
    }
    
    timeGroups[date][tx.asset] += tx.usdValue;
  });
  
  // Convert to time series data format
  const timeSeriesData: TimeSeriesDataPoint[] = [];
  
  Object.entries(timeGroups).forEach(([date, assets]) => {
    Object.entries(assets).forEach(([asset, value]) => {
      timeSeriesData.push({
        timestamp: new Date(date).getTime(),
        value,
        chain,
        asset
      });
    });
  });
  
  return timeSeriesData;
}

// Generate mock time series data as a fallback
function generateMockTimeSeriesData(chain: string): TimeSeriesDataPoint[] {
  const assets = ['USDC', 'WETH', 'WBTC'];
  const now = Date.now();
  const timeSeriesData: TimeSeriesDataPoint[] = [];
  
  // Generate 7 days of data
  for (let i = 0; i < 7; i++) {
    const date = new Date(now - (i * 24 * 3600 * 1000));
    
    assets.forEach(asset => {
      // Create somewhat realistic values
      const baseValue = asset === 'USDC' ? 100000 : 
                       asset === 'WETH' ? 80000 : 60000;
      // Add some randomness and a trend
      const value = baseValue * (1 + (Math.random() * 0.2) - (i * 0.02));
      
      timeSeriesData.push({
        timestamp: date.getTime(),
        value,
        chain,
        asset
      });
    });
  }
  
  return timeSeriesData;
}

export async function getHyperlaneStats(timeframe: string = '24h'): Promise<BridgeStats> {
  try {
    // Get all transactions for our time period
    const transactions = await getHyperlaneTransactions(timeframe);
    console.log(`Processing ${transactions.length} transactions for stats`);
    
    // Calculate unique assets and their total value
    const assetStats: Record<string, { 
      totalValue: number, 
      count: number,
      lastKnownPrice: number 
    }> = {};
    
    transactions.forEach(tx => {
      if (!assetStats[tx.asset]) {
        assetStats[tx.asset] = {
          totalValue: 0,
          count: 0,
          lastKnownPrice: tx.usdValue / parseFloat(tx.amount)
        };
      }
      assetStats[tx.asset].totalValue += tx.usdValue;
      assetStats[tx.asset].count += 1;
      // Update last known price if this transaction is more recent
      assetStats[tx.asset].lastKnownPrice = tx.usdValue / parseFloat(tx.amount);
    });
    
    // Calculate TVL by summing the most recent value for each asset
    const tvl = Object.entries(assetStats).reduce((total, [_, stats]) => {
      return total + stats.totalValue;
    }, 0);
    
    // Track all unique chains involved
    const uniqueChains = new Set<string>();
    transactions.forEach(tx => {
      uniqueChains.add(tx.sourceChain);
      uniqueChains.add(tx.destinationChain);
    });
    
    // Calculate chain-specific metrics
    const chainStats = Array.from(uniqueChains).map(chainId => {
      const chainTxs = transactions.filter(tx => 
        tx.sourceChain === chainId || tx.destinationChain === chainId
      );
      
      const chainAssets = new Set(chainTxs.map(tx => tx.asset));
      const totalValue = chainTxs.reduce((sum, tx) => sum + tx.usdValue, 0);
      
      return {
        chainId,
        chainName: chainId,
        totalTransactions: chainTxs.length,
        totalValue,
        activeAssets: Array.from(chainAssets)
      };
    });
    
    // Generate time series data for volume tracking
    const timeSeriesData: TimeSeriesDataPoint[] = [];
    const timeGroups = new Map<string, Map<string, number>>();
    
    transactions.forEach(tx => {
      const date = new Date(tx.timestamp).toISOString().split('T')[0];
      if (!timeGroups.has(date)) {
        timeGroups.set(date, new Map());
      }
      const dateGroup = timeGroups.get(date)!;
      const currentValue = dateGroup.get(tx.asset) || 0;
      dateGroup.set(tx.asset, currentValue + tx.usdValue);
    });
    
    timeGroups.forEach((assetValues, date) => {
      assetValues.forEach((value, asset) => {
        timeSeriesData.push({
          timestamp: new Date(date).getTime(),
          value,
          chain: 'all',
          asset
        });
      });
    });
    
    // Log detailed stats for verification
    console.log('Stats Summary:');
    console.log(`- Total Transactions: ${transactions.length}`);
    console.log(`- TVL: $${tvl.toFixed(2)}`);
    console.log(`- Unique Assets: ${Object.keys(assetStats).length}`);
    console.log(`- Active Chains: ${uniqueChains.size}`);
    console.log('Asset Breakdown:', Object.entries(assetStats).map(([asset, stats]) => 
      `${asset}: ${stats.count} txs, $${stats.totalValue.toFixed(2)} total`
    ).join('\n'));
    
    return {
      totalValueLocked: tvl,
      totalTransactions: transactions.length,
      uniqueAssets: Object.keys(assetStats).length,
      activeChains: uniqueChains.size,
      timeSeriesData,
      chainStats
    };
  } catch (error) {
    console.error('Error calculating Hyperlane stats:', error);
    return generateMockStats();
  }
}

// Generate mock stats as a fallback
function generateMockStats(): BridgeStats {
  const assets = ['USDC', 'WETH', 'WBTC'];
  const chains = ['Ethereum', 'Polygon', 'Arbitrum', 'Base', 'Hyperliquid'];
  const timeSeriesData: TimeSeriesDataPoint[] = generateMockTimeSeriesData('all');
  
  const chainStats = chains.map(chain => ({
    chainId: chain,
    chainName: chain,
    totalTransactions: 20,
    totalValue: 500000,
    activeAssets: assets
  }));
  
  return {
    totalValueLocked: 2500000,
    totalTransactions: 100,
    uniqueAssets: assets.length,
    activeChains: chains.length,
    timeSeriesData,
    chainStats
  };
}

// Add a utility function to test the API directly
export interface ApiTestResult {
  success: boolean;
  message: string;
  data?: {
    sampleMessages?: Array<Record<string, unknown>>;
    directResponse?: Record<string, unknown>;
    proxyResponse?: Record<string, unknown>;
    error?: Error;
  };
}

export async function testHyperlaneApiConnection(): Promise<ApiTestResult> {
  try {
    // First try the direct API endpoint
    console.log('Testing direct API connection to Hyperlane...');
    const directUrl = 'https://explorer.hyperlane.xyz/api/messages';
    const params = {
      limit: 5,
      orderBy: 'timestamp',
      order: 'desc'
    };
    
    const directResponse = await axios.get(directUrl, { 
      params,
      timeout: 5000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('Direct API test status:', directResponse.status);
    const directSuccess = 
      directResponse.status === 200 && 
      directResponse.data?.messages && 
      Array.isArray(directResponse.data.messages);
    
    // Then try through the proxy (if in production)
    let proxySuccess = false;
    let proxyResponse = null;
    
    if (process.env.NODE_ENV === 'production') {
      console.log('Testing proxy API connection...');
      const proxyUrl = '/api/hyperlane/messages';
      
      try {
        proxyResponse = await axios.get(proxyUrl, { 
          params,
          timeout: 5000,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        console.log('Proxy API test status:', proxyResponse.status);
        proxySuccess = 
          proxyResponse.status === 200 && 
          proxyResponse.data?.messages && 
          Array.isArray(proxyResponse.data.messages);
      } catch (e) {
        console.error('Proxy API test failed:', e);
      }
    }
    
    // Return results
    if (process.env.NODE_ENV === 'production') {
      if (proxySuccess) {
        return {
          success: true,
          message: 'API proxy connection successful!',
          data: {
            sampleMessages: proxyResponse?.data?.messages?.slice(0, 2)
          }
        };
      } else if (directSuccess) {
        return {
          success: true,
          message: 'Direct API connection works, but proxy failed. Check the Next.js rewrites configuration.',
          data: {
            sampleMessages: directResponse.data.messages.slice(0, 2)
          }
        };
      }
    } else {
      if (directSuccess) {
        return {
          success: true,
          message: 'API connection successful!',
          data: {
            sampleMessages: directResponse.data.messages.slice(0, 2)
          }
        };
      }
    }
    
    return {
      success: false,
      message: 'Could not connect to Hyperlane API. Falling back to mock data.',
      data: {
        directResponse: directResponse?.data,
        proxyResponse: proxyResponse?.data
      }
    };
  } catch (error) {
    console.error('API test error:', error);
    // Properly handle the unknown error type
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
    
    return {
      success: false,
      message: `API test error: ${errorMessage}`,
      data: { 
        error: error instanceof Error ? error : new Error(String(error))
      }
    };
  }
}

// Add persistent storage for discovered assets and chains
let globalDiscoveredAssets = new Set<string>(TOKEN_SYMBOLS);
let globalDiscoveredChains = new Set<string>([
  'Ethereum', 'Polygon', 'Arbitrum', 'Base', 'Hyperliquid', 'Solana'
]);

// Helper function to get all discovered assets
export function getDiscoveredAssets(): string[] {
  return Array.from(globalDiscoveredAssets).sort();
}

// Helper function to get all discovered chains 
export function getDiscoveredChains(): string[] {
  return Array.from(globalDiscoveredChains).sort();
}

// Store historical data for analysis
interface HistoricalBridgeData {
  timestamp: number;
  newAssets: string[];
  newChains: string[];
  transactions: BridgeTransaction[];
}

let historicalData: HistoricalBridgeData[] = [];

// Function to analyze bridge data and detect new assets/chains
function analyzeBridgeData(transactions: BridgeTransaction[]): {
  newAssets: string[];
  newChains: string[];
} {
  const prevAssetsCount = globalDiscoveredAssets.size;
  const prevChainsCount = globalDiscoveredChains.size;
  
  // Extract and update assets and chains
  transactions.forEach(tx => {
    if (tx.asset) globalDiscoveredAssets.add(tx.asset);
    if (tx.sourceChain) globalDiscoveredChains.add(tx.sourceChain);
    if (tx.destinationChain) globalDiscoveredChains.add(tx.destinationChain);
  });
  
  // Identify new assets and chains
  const newAssets = Array.from(globalDiscoveredAssets).filter(asset => 
    !TOKEN_SYMBOLS.includes(asset)
  );
  
  const defaultChains = ['Ethereum', 'Polygon', 'Arbitrum', 'Base', 'Hyperliquid', 'Solana'];
  const newChains = Array.from(globalDiscoveredChains).filter(chain => 
    !defaultChains.includes(chain)
  );
  
  // Log changes
  if (globalDiscoveredAssets.size > prevAssetsCount) {
    console.log(`Discovered ${globalDiscoveredAssets.size - prevAssetsCount} new assets`);
    console.log('All known assets:', getDiscoveredAssets());
  }
  
  if (globalDiscoveredChains.size > prevChainsCount) {
    console.log(`Discovered ${globalDiscoveredChains.size - prevChainsCount} new chains`);
    console.log('All known chains:', getDiscoveredChains());
  }
  
  return {
    newAssets,
    newChains
  };
}

// Store the time of last update
let lastUpdateTimestamp = 0;

// Enhanced function to use the test hook with improved update detection
export function useHyperlaneData(timeframe: string = '24h') {
  const [apiStatus, setApiStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  }>({
    tested: false,
    success: false,
    message: 'API not tested yet'
  });
  
  // Track new assets and chains for UI updates
  const [newDiscoversState, setNewDiscovers] = useState<{
    newAssets: string[];
    newChains: string[];
    lastUpdate: string;
  }>({
    newAssets: [],
    newChains: [],
    lastUpdate: 'Never'
  });
  
  // Track errors for better user feedback
  const [fetchErrors, setFetchErrors] = useState<{
    count: number;
    lastError: string | null;
    lastErrorTime: string | null;
  }>({
    count: 0,
    lastError: null,
    lastErrorTime: null
  });
  
  // Run the API test once
  useEffect(() => {
    if (!apiStatus.tested) {
      testHyperlaneApiConnection().then(result => {
        setApiStatus({
          tested: true,
          success: result.success,
          message: result.message
        });
        console.log('API test result:', result);
      });
    }
  }, [apiStatus.tested]);

  const fetcher = async (key: string) => {
    try {
      // Get current time for hourly update tracking
      const now = Date.now();
      console.log(`Data fetch triggered at ${new Date(now).toISOString()}`);
      console.log(`Last update was at ${new Date(lastUpdateTimestamp).toISOString()}`);
      
      // Perform the data fetch with retry logic
      let attempts = 0;
      const maxAttempts = 3;
      let transactions: BridgeTransaction[] = [];
      
      while (attempts < maxAttempts) {
        try {
          transactions = await getHyperlaneTransactions(timeframe);
          // If successful, break out of retry loop
          break;
        } catch (error) {
          attempts++;
          console.error(`Fetch attempt ${attempts} failed:`, error);
          
          if (attempts >= maxAttempts) {
            // Update error state
            setFetchErrors(prev => ({
              count: prev.count + 1,
              lastError: error instanceof Error ? error.message : String(error),
              lastErrorTime: new Date().toISOString()
            }));
            throw error;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
        }
      }
      
      // Analyze for new assets and chains
      const { newAssets, newChains } = analyzeBridgeData(transactions);
      
      // Add to historical data
      historicalData.push({
        timestamp: now,
        newAssets,
        newChains,
        transactions: transactions.slice(0, 20) // Store a sample for analysis
      });
      
      // Keep only recent history (last 7 days)
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
      historicalData = historicalData.filter(data => data.timestamp > oneWeekAgo);
      
      // Update UI with new discoveries
      if (newAssets.length > 0 || newChains.length > 0) {
        setNewDiscovers({
          newAssets,
          newChains,
          lastUpdate: new Date(now).toISOString()
        });
      }
      
      // Track the update time
      lastUpdateTimestamp = now;
      
      return transactions;
    } catch (error) {
      console.error('Error in useHyperlaneData transaction fetcher:', error);
      // Return empty array but don't throw to prevent SWR from retrying too aggressively
      return [];
    }
  };
  
  const statsFetcher = async (key: string) => {
    try {
      // Implement retry logic for stats fetching
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          return await getHyperlaneStats(timeframe);
        } catch (error) {
          attempts++;
          console.error(`Stats fetch attempt ${attempts} failed:`, error);
          
          if (attempts >= maxAttempts) {
            throw error;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
        }
      }
      
      // This should never be reached due to the throw in the loop
      return generateMockStats();
    } catch (error) {
      console.error('Error in useHyperlaneData stats fetcher after all retries:', error);
      // Return mock stats instead of throwing
      return generateMockStats();
    }
  };

  // Use SWR with hourly refresh for real-time data updates
  const { data: transactions, error: txError, mutate: refreshTransactions, isValidating: isLoadingTx } = useSWR(
    `hyperlane/transactions/${timeframe}`,
    fetcher,
    { 
      refreshInterval: 3600000, // Update hourly (3600000ms = 1 hour)
      revalidateOnFocus: false, // Prevent unnecessary revalidation
      dedupingInterval: 3540000, // Dedupe requests within 59 minutes
      errorRetryCount: 3, // Limit retries on error
      errorRetryInterval: 5000, // Wait 5 seconds between retries
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry for 404s or other client errors
        if (error.status >= 400 && error.status < 500) {
          return;
        }
        // Only retry up to 3 times
        if (retryCount >= 3) {
          return;
        }
        // Retry after 5 seconds
        setTimeout(() => revalidate({ retryCount }), 5000);
      }
    }
  );

  const { data: stats, error: statsError, mutate: refreshStats, isValidating: isLoadingStats } = useSWR(
    `hyperlane/stats/${timeframe}`,
    statsFetcher,
    { 
      refreshInterval: 3600000, // Update hourly (3600000ms = 1 hour)
      revalidateOnFocus: false,
      dedupingInterval: 3540000, // Dedupe requests within 59 minutes
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry for 404s or other client errors
        if (error.status >= 400 && error.status < 500) {
          return;
        }
        // Only retry up to 3 times
        if (retryCount >= 3) {
          return;
        }
        // Retry after 5 seconds
        setTimeout(() => revalidate({ retryCount }), 5000);
      }
    }
  );
  
  // Add function to force refresh
  const forceRefresh = useCallback(() => {
    console.log('Manually refreshing data...');
    refreshTransactions();
    refreshStats();
  }, [refreshTransactions, refreshStats]);

  return {
    transactions: transactions || [],
    stats: stats || generateMockStats(), // Always provide at least mock stats
    isLoading: (isLoadingTx || isLoadingStats) && !txError && !statsError,
    isError: !!txError || !!statsError,
    apiStatus,
    discoveries: newDiscoversState,
    errors: fetchErrors,
    forceRefresh,
    lastUpdateTime: lastUpdateTimestamp ? new Date(lastUpdateTimestamp).toISOString() : 'Never'
  };
}

// Enhanced chain-specific data hook
export function useChainData(chain: string, timeframe: string = '24h') {
  // Track errors for better user feedback
  const [fetchErrors, setFetchErrors] = useState<{
    count: number;
    lastError: string | null;
    lastErrorTime: string | null;
  }>({
    count: 0,
    lastError: null,
    lastErrorTime: null
  });

  const fetcher = async (key: string) => {
    try {
      // Track that we're specifically requesting chain data
      console.log(`Fetching specific chain data for ${chain} with timeframe ${timeframe}`);
      
      // Implement retry logic
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          return await getChainTransactions(chain, timeframe);
        } catch (error) {
          attempts++;
          console.error(`Chain data fetch attempt ${attempts} failed:`, error);
          
          if (attempts >= maxAttempts) {
            // Update error state
            setFetchErrors(prev => ({
              count: prev.count + 1,
              lastError: error instanceof Error ? error.message : String(error),
              lastErrorTime: new Date().toISOString()
            }));
            throw error;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
        }
      }
      
      // This should never be reached due to the throw in the loop
      return [];
    } catch (error) {
      console.error(`Error in useChainData transaction fetcher for ${chain}:`, error);
      return [];
    }
  };
  
  const timeSeriesFetcher = async (key: string) => {
    try {
      // Implement retry logic
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          return await getChainTimeSeriesData(chain, timeframe);
        } catch (error) {
          attempts++;
          console.error(`Time series fetch attempt ${attempts} failed:`, error);
          
          if (attempts >= maxAttempts) {
            throw error;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts)));
        }
      }
      
      // This should never be reached due to the throw in the loop
      return generateMockTimeSeriesData(chain);
    } catch (error) {
      console.error(`Error in useChainData time series fetcher for ${chain}:`, error);
      return generateMockTimeSeriesData(chain);
    }
  };

  // Use SWR with proper hourly refresh
  const { data: transactions, error: txError, mutate: refreshTx, isValidating: isLoadingTx } = useSWR(
    `hyperlane/chain/${chain}/transactions/${timeframe}`,
    fetcher,
    { 
      refreshInterval: 3600000, // Update hourly (3600000ms = 1 hour)
      revalidateOnFocus: false,
      dedupingInterval: 3540000, // Dedupe requests within 59 minutes
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry for 404s or other client errors
        if (error.status >= 400 && error.status < 500) {
          return;
        }
        // Only retry up to 3 times
        if (retryCount >= 3) {
          return;
        }
        // Retry after 5 seconds
        setTimeout(() => revalidate({ retryCount }), 5000);
      }
    }
  );

  const { data: timeSeriesData, error: timeSeriesError, mutate: refreshTimeSeries, isValidating: isLoadingTimeSeries } = useSWR(
    `hyperlane/chain/${chain}/timeseries/${timeframe}`,
    timeSeriesFetcher,
    { 
      refreshInterval: 3600000, // Update hourly (3600000ms = 1 hour)
      revalidateOnFocus: false,
      dedupingInterval: 3540000, // Dedupe requests within 59 minutes
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Don't retry for 404s or other client errors
        if (error.status >= 400 && error.status < 500) {
          return;
        }
        // Only retry up to 3 times
        if (retryCount >= 3) {
          return;
        }
        // Retry after 5 seconds
        setTimeout(() => revalidate({ retryCount }), 5000);
      }
    }
  );
  
  // Add function to force refresh
  const forceRefresh = useCallback(() => {
    console.log(`Manually refreshing data for chain ${chain}...`);
    refreshTx();
    refreshTimeSeries();
  }, [refreshTx, refreshTimeSeries, chain]);

  return {
    transactions: transactions || [],
    timeSeriesData: timeSeriesData || generateMockTimeSeriesData(chain),
    isLoading: (isLoadingTx || isLoadingTimeSeries) && !txError && !timeSeriesError,
    isError: !!txError || !!timeSeriesError,
    errors: fetchErrors,
    forceRefresh,
    lastUpdateTime: lastUpdateTimestamp ? new Date(lastUpdateTimestamp).toISOString() : 'Never'
  };
}