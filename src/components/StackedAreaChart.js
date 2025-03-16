"use client";
import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useChainData } from "../lib/api/hyperlane";

export default function StackedAreaChart({ title, chain, height = "300px", showFilters = false, timeframe = "24h" }) {
  const { timeSeriesData, isLoading, isError } = useChainData(chain, timeframe);
  const [chartData, setChartData] = useState([]);
  const [visibleAssets, setVisibleAssets] = useState({});
  const [assets, setAssets] = useState([]);
  
  // Asset colors mapping with more options
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
    "Unknown": "#A0AEC0"
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

  // Debug logging
  useEffect(() => {
    if (timeSeriesData && timeSeriesData.length > 0) {
      console.log(`${chain} timeSeriesData:`, timeSeriesData.length, 'data points');
      
      // Log unique assets in the data
      const uniqueAssetsInData = new Set(timeSeriesData.map(point => point.asset));
      console.log(`${chain} unique assets in data:`, Array.from(uniqueAssetsInData));
    } else {
      console.log(`${chain} has no timeSeriesData`);
    }
  }, [timeSeriesData, chain]);
  
  // Process time series data for the chart
  useEffect(() => {
    if (!timeSeriesData || timeSeriesData.length === 0) return;
    
    // Extract unique assets
    const uniqueAssets = new Set();
    timeSeriesData.forEach(point => uniqueAssets.add(point.asset));
    
    const assetList = Array.from(uniqueAssets);
    console.log(`Setting assets for ${chain}:`, assetList);
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
    
    // Group by date
    const dateMap = {};
    timeSeriesData.forEach(point => {
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
    console.log(`Setting chartData for ${chain}:`, formattedData.length, 'data points');
    setChartData(formattedData);
  }, [timeSeriesData, chain]);
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", { 
      style: "currency", 
      currency: "USD", 
      maximumFractionDigits: 0 
    }).format(value);
  };
  
  const toggleAsset = (asset) => {
    setVisibleAssets(prev => ({ ...prev, [asset]: !prev[asset] }));
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="border rounded p-4">
        <div className="flex justify-between items-center mb-2">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
        </div>
        <div style={{ height }} className="flex items-center justify-center">
          <p>Loading chart data...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (isError) {
    return (
      <div className="border rounded p-4">
        <div className="flex justify-between items-center mb-2">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
        </div>
        <div style={{ height }} className="flex items-center justify-center text-red-500">
          <p>Error loading chart data</p>
        </div>
      </div>
    );
  }
  
  // Show placeholder if no data
  if (chartData.length === 0 || assets.length === 0) {
    return (
      <div className="border rounded p-4">
        <div className="flex justify-between items-center mb-2">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
        </div>
        <div style={{ height }} className="flex items-center justify-center text-gray-500">
          <p>No data available for this chain</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border rounded p-4">
      <div className="flex justify-between items-center mb-2">
        {title && <h3 className="text-lg font-semibold">{title}</h3>}
        {showFilters && assets.length > 0 && (
          <div className="flex flex-wrap space-x-2">
            {assets.map(asset => (
              <button 
                key={asset} 
                onClick={() => toggleAsset(asset)} 
                className={`px-2 py-1 mb-1 rounded-full text-xs ${
                  visibleAssets[asset] ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-800"
                }`}
              >
                <span 
                  className="inline-block w-2 h-2 rounded-full mr-1" 
                  style={{ backgroundColor: getAssetColor(asset) }}
                ></span>
                {asset}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Asset value summary */}
      <div className="mb-3 text-sm">
        <p className="text-gray-500 mb-1">Assets in this chain:</p>
        <div className="flex flex-wrap">
          {assets.map(asset => (
            <div key={asset} className={`mr-3 mb-1 ${!visibleAssets[asset] ? "opacity-50" : ""}`}>
              <span 
                className="inline-block w-2 h-2 rounded-full mr-1" 
                style={{ backgroundColor: getAssetColor(asset) }}
              ></span>
              {asset}
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
            <Tooltip 
              formatter={(value) => formatCurrency(value)} 
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
