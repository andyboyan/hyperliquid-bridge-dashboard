"use client";
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useHyperlaneData, getDiscoveredAssets, getDiscoveredChains } from "../lib/api/hyperlane";

export default function MainSection() {
  const { transactions, stats, isLoading, isError, apiStatus } = useHyperlaneData();
  
  const [chartData, setChartData] = useState([]);
  const [visibleAssets, setVisibleAssets] = useState({});
  const [assets, setAssets] = useState([]);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [selectedChain, setSelectedChain] = useState("all");
  
  // Expanded asset colors mapping
  const assetColors = {
    "USDC": "#2775CA",
    "USDT": "#26A17B",
    "WETH": "#627EEA",
    "ETH": "#627EEA",
    "WBTC": "#F7931A",
    "BTC": "#F7931A",
    "DAI": "#F5AC37",
    "MATIC": "#8247E5",
    "SOL": "#14F195",
    "AVAX": "#E84142",
    "LINK": "#2A5ADA",
    "UNI": "#FF007A",
    "AAVE": "#B6509E",
    "COMP": "#00D395",
    "SNX": "#00D1FF",
    "YFI": "#006AE3",
    "MKR": "#1AAB9B",
    "CRV": "#3a3a3a",
    "SUSHI": "#fa52a0",
    "BAL": "#1E1E1E",
    "GRT": "#6747ED",
    "stETH": "#00A3FF",
    "rETH": "#CC9B00",
    "Unknown": "#A0AEC0",
  };
  
  // Get a deterministic color for any asset not in our map
  const getAssetColor = (asset) => {
    if (assetColors[asset]) return assetColors[asset];
    
    // Generate a pseudo-random but deterministic color based on the asset name
    let hash = 0;
    for (let i = 0; i < asset.length; i++) {
      hash = asset.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 50%)`;
  };
  
  // Debug logging for transaction data
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      console.log("Main section transactions:", transactions.length);
      // Count assets
      const assetCounts = {};
      transactions.forEach(tx => {
        if (!assetCounts[tx.asset]) assetCounts[tx.asset] = 0;
        assetCounts[tx.asset]++;
      });
      console.log("Asset distribution:", assetCounts);
    } else {
      console.log("No transactions available");
    }
    
    if (stats) {
      console.log("Stats available:", 
        stats.totalTransactions, "transactions,", 
        stats.uniqueAssets, "assets,",
        stats.activeChains, "chains"
      );
    } else {
      console.log("No stats available");
    }
  }, [transactions, stats]);
  
  useEffect(() => {
    if (!transactions || transactions.length === 0) return;
    
    // Get all discovered assets
    const discoveredAssets = getDiscoveredAssets();
    setAssets(discoveredAssets);
    
    // Initialize all assets as visible
    const initialVisibility = {};
    discoveredAssets.forEach(asset => {
      initialVisibility[asset] = true;
    });
    setVisibleAssets(initialVisibility);
    
    // Process data for chart
    processChartData();
  }, [transactions]);
  
  const processChartData = () => {
    if (!transactions || transactions.length === 0) return;
    
    // Group transactions by date
    const groupedByDate = {};
    
    transactions.forEach(tx => {
      // Skip if filtering by chain and this transaction doesn't match
      if (selectedChain !== "all" && tx.sourceChain !== selectedChain && tx.destinationChain !== selectedChain) {
        return;
      }
      
      const date = new Date(tx.timestamp).toLocaleDateString();
      const asset = tx.asset || "Unknown";
      const amount = parseFloat(tx.amount) || 0;
      
      if (!groupedByDate[date]) {
        groupedByDate[date] = {};
      }
      
      if (!groupedByDate[date][asset]) {
        groupedByDate[date][asset] = 0;
      }
      
      groupedByDate[date][asset] += amount;
    });
    
    // Convert to chart data format
    const data = Object.keys(groupedByDate)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(date => {
        const entry = { date };
        Object.keys(groupedByDate[date]).forEach(asset => {
          entry[asset] = groupedByDate[date][asset];
        });
        return entry;
      });
    
    setChartData(data);
  };
  
  // Update chart when chain filter changes
  useEffect(() => {
    processChartData();
  }, [selectedChain]);
  
  const toggleAsset = (asset) => {
    setVisibleAssets(prev => ({ ...prev, [asset]: !prev[asset] }));
  };
  
  const calculateTotal = (asset) => {
    if (!stats || !visibleAssets[asset]) return 0;
    
    // Sum values from time series data for this asset
    return stats.timeSeriesData
      .filter(point => point.asset === asset)
      .reduce((sum, point) => sum + point.value, 0);
  };
  
  const totalValue = assets.reduce((sum, asset) => sum + calculateTotal(asset), 0);
  
  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-US", { 
      style: "currency", 
      currency: "USD", 
      maximumFractionDigits: 0 
    }).format(num);
  };
  
  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };
  
  if (isLoading) {
    return <div className="p-4 text-center">Loading bridge data...</div>;
  }
  
  if (isError) {
    return <div className="p-4 text-center text-red-500">Error loading bridge data. Please try again later.</div>;
  }

  // Show placeholder if no data
  if (chartData.length === 0 || assets.length === 0) {
    return (
      <div>
        <div className="p-4 text-center text-gray-500">
          <p>No bridge data available for the selected time period.</p>
          
          {/* Add API status indicator */}
          <div className="mt-4 p-4 border rounded">
            <p className="font-medium mb-2">API Connection Status:</p>
            <div className={`p-2 rounded ${apiStatus?.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {apiStatus?.message || 'Checking API connection...'}
            </div>
            
            <button 
              onClick={toggleDebugInfo}
              className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm"
            >
              {showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
            </button>
            
            {showDebugInfo && (
              <div className="mt-3 text-left text-xs font-mono bg-gray-100 p-3 rounded max-h-60 overflow-auto">
                <p className="font-medium">Environment: {process.env.NODE_ENV}</p>
                <p className="mt-1">Timeframe: {selectedChain}</p>
                <p className="mt-1">transactions: {Array.isArray(transactions) ? transactions.length : 'N/A'}</p>
                <p className="mt-1">isLoading: {isLoading ? 'true' : 'false'}</p>
                <p className="mt-1">isError: {isError ? 'true' : 'false'}</p>
                
                {stats && (
                  <div className="mt-2">
                    <p className="font-medium">Stats:</p>
                    <p>totalTransactions: {stats.totalTransactions}</p>
                    <p>uniqueAssets: {stats.uniqueAssets}</p>
                    <p>activeChains: {stats.activeChains}</p>
                    <p>timeSeriesData: {stats.timeSeriesData?.length || 0} points</p>
                  </div>
                )}
                
                {Array.isArray(transactions) && transactions.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Sample transaction:</p>
                    <pre>{JSON.stringify(transactions[0], null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Detailed Analysis</h2>
        <div className="flex space-x-2">
          <select 
            value={selectedChain} 
            onChange={(e) => setSelectedChain(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="all">All Chains</option>
            {getDiscoveredChains().map(chain => (
              <option key={chain} value={chain}>{chain}</option>
            ))}
          </select>
          <button 
            onClick={toggleDebugInfo} 
            className="px-3 py-1 border rounded-md text-sm hover:bg-gray-100"
          >
            {showDebugInfo ? "Hide Debug" : "Show Debug"}
          </button>
        </div>
      </div>
      
      {showDebugInfo && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg text-sm">
          <h3 className="font-semibold mb-2">API Status</h3>
          <pre className="whitespace-pre-wrap">{JSON.stringify(apiStatus, null, 2)}</pre>
          <h3 className="font-semibold mt-4 mb-2">Discovered Assets</h3>
          <div className="flex flex-wrap gap-2">
            {getDiscoveredAssets().map(asset => (
              <span key={asset} className="px-2 py-1 bg-white rounded border" style={{borderLeftColor: getAssetColor(asset), borderLeftWidth: '4px'}}>
                {asset}
              </span>
            ))}
          </div>
          <h3 className="font-semibold mt-4 mb-2">Discovered Chains</h3>
          <div className="flex flex-wrap gap-2">
            {getDiscoveredChains().map(chain => (
              <span key={chain} className="px-2 py-1 bg-white rounded border">
                {chain}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Asset Volume</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {assets.map(asset => (
            <button
              key={asset}
              onClick={() => toggleAsset(asset)}
              className={`px-3 py-1 rounded-full text-sm ${
                visibleAssets[asset] 
                  ? 'text-white' 
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
              style={visibleAssets[asset] ? { backgroundColor: getAssetColor(asset) } : {}}
            >
              {asset}
            </button>
          ))}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm" style={{ height: '400px' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                {assets
                  .filter(asset => visibleAssets[asset])
                  .map(asset => (
                    <Area
                      key={asset}
                      type="monotone"
                      dataKey={asset}
                      stackId="1"
                      stroke={getAssetColor(asset)}
                      fill={getAssetColor(asset)}
                    />
                  ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">No data available for the selected filters</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Top Assets by Volume</h3>
          <div className="space-y-2">
            {assets
              .filter(asset => calculateTotal(asset) > 0)
              .sort((a, b) => calculateTotal(b) - calculateTotal(a))
              .slice(0, 5)
              .map(asset => (
                <div key={asset} className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: getAssetColor(asset) }}
                  ></div>
                  <span className="flex-1">{asset}</span>
                  <span className="font-medium">${formatNumber(calculateTotal(asset))}</span>
                </div>
              ))}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Chain Activity</h3>
          <div className="space-y-2">
            {getDiscoveredChains().map(chain => {
              const count = transactions.filter(tx => 
                tx.sourceChain === chain || tx.destinationChain === chain
              ).length;
              return (
                <div key={chain} className="flex items-center">
                  <span className="flex-1">{chain}</span>
                  <span className="font-medium">{count} transactions</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
