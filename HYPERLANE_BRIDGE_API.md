# Hyperlane Bridge API Integration

This document provides an overview of how the Hyperlane Bridge Dashboard interfaces with the Hyperlane Explorer API to track assets bridged across various chains, particularly from Solana to HyperEVM.

## Overview

The dashboard integrates with the Hyperlane Explorer API to track cross-chain message transfers, extracting asset information, and analyzing bridge usage patterns. The system is designed to update hourly and automatically detect new assets and chains that appear in the bridge data.

## Data Collection

### API Endpoints

The system accesses the Hyperlane API through the following endpoints:

- **Primary message endpoint**: `https://explorer.hyperlane.xyz/api/messages`
- **Local proxy endpoint**: `/api/hyperlane/messages`

### Asset Detection and Analysis

The system uses several techniques to identify bridged assets:

1. **Address Matching**: Identifies tokens by matching addresses in message bodies against known token addresses
2. **Symbol Detection**: Scans message bodies for token symbols using robust pattern matching
3. **Chain-specific Defaults**: Applies reasonable defaults for specific bridging pairs (e.g., SOL for Solana → HyperEVM)
4. **Confidence Scoring**: Ranks potential token matches by confidence level

### Automatic Discovery

The system maintains a global registry of discovered assets and chains that is updated with each API request. When new assets or chains are detected, they are:

1. Logged to the console with detailed analytics
2. Added to the global registry
3. Made available through the UI via the `discoveries` property in the data hooks

## Hourly Updates

All data is refreshed hourly to ensure the dashboard stays current with the latest bridge activity:

- The SWR refresh interval is set to 3,600,000ms (1 hour)
- The deduping interval is set to 3,540,000ms (59 minutes) to prevent unnecessary duplicate requests

## Specifically For Solana Assets

For Solana to HyperEVM bridges, the system:

1. Gives higher priority to detecting SOL and USDC assets in message bodies
2. Uses chain-specific heuristics to identify Solana-specific assets (mSOL, BONK, stSOL)
3. Applies realistic amount ranges for each asset type
4. Provides detailed logging of all Solana-related bridge transactions

## Data Analytics

The system generates several types of analytics from the bridge data:

### Chain-to-Chain Analytics
Tracks bridge volume between specific chain pairs, showing:
- Number of transactions
- Total USD volume
- Assets bridged between each chain pair

### Asset Volume Metrics
Tracks the usage of each asset across all chains:
- Number of transactions involving each asset
- Total USD volume by asset
- Which chains each asset has been bridged between

### Time Series Data
Provides historical bridge volume data for visualization:
- Daily totals for each asset
- Chain-specific bridge volumes over time

## Usage in the UI

The data hooks (`useHyperlaneData` and `useChainData`) provide rich interfaces for accessing this data:

```typescript
const { 
  transactions,      // List of bridge transactions
  stats,             // Aggregate bridge statistics
  discoveries,       // Newly discovered assets and chains
  lastUpdateTime,    // Timestamp of the last successful update
  forceRefresh       // Function to manually trigger a data refresh
} = useHyperlaneData('24h');
```

## Next Steps and Recommendations

1. **UI Notifications**: Add notifications when new assets or chains are discovered
2. **Asset Watchlist**: Allow users to subscribe to specific assets for tracking
3. **Bridge Volume Alerts**: Create alerts for unusual bridge volume
4. **Historical Comparison**: Add comparisons of current bridge activity to historical patterns

## Troubleshooting

If bridge data is not appearing correctly:

1. Check the console logs for detailed information about API requests
2. Verify that the timestamps being used are not in the future
3. Confirm that the asset extraction logic is correctly identifying the assets in message bodies
4. Check for new token contracts or chain IDs that might not be recognized

## Fallback Mechanism

If the API is unavailable or returns no data, the system falls back to generating realistic mock data that matches observed bridge patterns. This ensures:

1. The UI always has data to display
2. Testing can be performed without API access
3. Realistic bridge patterns are still represented

### Solana-specific Mock Data

Special attention is given to generating realistic Solana bridge mock data, including:
- Solana-specific assets (SOL, mSOL, BONK, stSOL)
- Realistic Solana transaction hashes and addresses
- Appropriate bridge directions (primarily Solana → HyperEVM) 