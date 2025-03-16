"use client";
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useHyperlaneData } from "../lib/api/hyperlane";

export default function MainSection({ timeframe = "24h" }) {
  const { transactions, stats, isLoading, isError } = useHyperlaneData(timeframe);
  
  const [chartData, setChartData] = useState([]);
  const [visibleAssets, setVisibleAssets] = useState({});
  const [assets, setAssets] = useState([]);
  
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
  
  // Process transaction data for the chart
  useEffect(() => {
    if (!stats || !transactions || transactions.length === 0) return;
    
    // Extract unique assets and initialize visibility
    const uniqueAssets = new Set();
    transactions.forEach(tx => uniqueAssets.add(tx.asset));
    
    const assetList = Array.from(uniqueAssets);
    console.log("Setting assets in MainSection:", assetList);
    setAssets(assetList);
    
    // Initialize visible assets if not already set
    const currentAssetKeys = Object.keys(visibleAssets);
    if (currentAssetKeys.length === 0 || !assetList.every(asset => currentAssetKeys.includes(asset))) {
      const initialVisibility = {};
      assetList.forEach(asset => {
        // Keep existing visibility preferences or set to true for new assets
        initialVisibility[asset] = visibleAssets[asset] !== undefined ? visibleAssets[asset] : true;
      });
      setVisibleAssets(initialVisibility);
    }
    
    // Process time series data for the chart
    if (stats.timeSeriesData && stats.timeSeriesData.length > 0) {
      // Group by date
      const dateMap = {};
      stats.timeSeriesData.forEach(point => {
        const date = new Date(point.timestamp).toISOString().split('T')[0];
        if (!dateMap[date]) {
          dateMap[date] = {};
        }
        dateMap[date][point.asset] = (dateMap[date][point.asset] || 0) + point.value;
      });
      
      // Convert to chart format
      const formattedData = Object.entries(dateMap).map(([date, assets]) => {
        const entry = { date: new Date(date).toLocaleDateString() };
        Object.entries(assets).forEach(([asset, value]) => {
          entry[asset] = value;
        });
        return entry;
      });
      
      // Sort by date
      formattedData.sort((a, b) => new Date(a.date) - new Date(b.date));
      console.log("Setting chartData in MainSection:", formattedData.length, "data points");
      setChartData(formattedData);
    }
  }, [stats, transactions, visibleAssets]);
  
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
  
  if (isLoading) {
    return <div className="p-4 text-center">Loading bridge data...</div>;
  }
  
  if (isError) {
    return <div className="p-4 text-center text-red-500">Error loading bridge data. Please try again later.</div>;
  }

  // Show placeholder if no data
  if (chartData.length === 0 || assets.length === 0) {
    return <div className="p-4 text-center text-gray-500">No bridge data available for the selected time period.</div>;
  }
  
  return (
    <div>
      <div className="mb-4">
        <p className="font-medium mb-2">Filter by asset:</p>
        <div className="flex flex-wrap">
          {assets.map(asset => (
            <button 
              key={asset} 
              onClick={() => toggleAsset(asset)} 
              className={`mr-2 mb-2 px-3 py-1 rounded-full text-sm ${
                visibleAssets[asset] ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-800"
              }`}
            >
              <span 
                className="inline-block w-2 h-2 rounded-full mr-1" 
                style={{backgroundColor: getAssetColor(asset)}}
              ></span>
              {asset}
            </button>
          ))}
        </div>
      </div>
      
      <div className="border rounded shadow-sm p-4 bg-white mb-4">
        <h3 className="text-sm text-gray-500">Total Value Bridged</h3>
        <p className="text-2xl font-bold">{formatNumber(totalValue)}</p>
        <div className="flex flex-wrap mt-2">
          {assets.map(asset => (
            <div key={asset} className={`mr-4 mb-2 ${!visibleAssets[asset] ? "opacity-50" : ""}`}>
              <span 
                className="inline-block w-3 h-3 rounded-full mr-1" 
                style={{backgroundColor: getAssetColor(asset)}}
              ></span>
              {asset}: {formatNumber(calculateTotal(asset))}
            </div>
          ))}
        </div>
      </div>
      
      <div className="border rounded shadow-sm p-4 mb-8" style={{ height: "400px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              formatter={(value) => formatNumber(value)} 
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            {assets.map(asset => (
              visibleAssets[asset] && (
                <Area 
                  key={asset} 
                  type="monotone" 
                  dataKey={asset} 
                  stackId="1" 
                  stroke={getAssetColor(asset)} 
                  fill={getAssetColor(asset)} 
                  name={asset}
                />
              )
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
