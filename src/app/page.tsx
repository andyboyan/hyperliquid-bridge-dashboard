"use client";
import { useState, useEffect } from "react";
import TimeSelector from "../components/TimeSelector";
import SummaryStats from "../components/SummaryStats";
import StackedAreaChart from "../components/StackedAreaChart";
import MainSection from "../components/MainSection";
import { useHyperlaneData, getDiscoveredAssets, getDiscoveredChains } from "../lib/api/hyperlane";

export default function Home() {
  const [timePeriod, setTimePeriod] = useState("30d");
  const { stats, isLoading, isError, forceRefresh } = useHyperlaneData(timePeriod);
  const [summaryStats, setSummaryStats] = useState([
    { id: "total", label: "Total Value Bridged", value: "$0", change: "0%" },
    { id: "transfers", label: "Total Transfers", value: "0", change: "0%" },
    { id: "assets", label: "Unique Assets", value: "0", change: "0" },
    { id: "chains", label: "Active Chains", value: "0", change: "0" }
  ]);

  // Update summary stats when API data changes
  useEffect(() => {
    if (!stats) return;

    // Format currency with commas
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(value);
    };

    // Format number with commas
    const formatNumber = (value: number) => {
      return new Intl.NumberFormat('en-US').format(value);
    };

    // For now using placeholder change percentages
    // In a real app, we would compare with previous period
    setSummaryStats([
      { 
        id: "total", 
        label: "Total Value Bridged", 
        value: formatCurrency(stats.totalValueLocked), 
        change: "+12.5%" 
      },
      { 
        id: "transfers", 
        label: "Total Transfers", 
        value: formatNumber(stats.totalTransactions), 
        change: "+8.3%" 
      },
      { 
        id: "assets", 
        label: "Unique Assets", 
        value: formatNumber(stats.uniqueAssets), 
        change: `+${stats.uniqueAssets > 0 ? Math.floor(stats.uniqueAssets / 3) : 0}` 
      },
      { 
        id: "chains", 
        label: "Active Chains", 
        value: formatNumber(stats.activeChains), 
        change: `+${stats.activeChains > 0 ? Math.floor(stats.activeChains / 2) : 0}` 
      }
    ]);
  }, [stats]);

  const handleTimeChange = (period: string) => {
    setTimePeriod(period);
  };

  // Add a function to manually refresh data
  const handleRefresh = () => {
    if (forceRefresh) {
      forceRefresh();
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Hyperliquid Bridge Dashboard</h1>
      <p className="text-gray-600 mb-6">Monitor assets being bridged to Hyperliquid EVM via multiple bridges</p>
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <div className="flex items-center space-x-4">
          <TimeSelector selectedPeriod={timePeriod} onSelectPeriod={handleTimeChange} />
          <button 
            onClick={handleRefresh}
            className="px-3 py-1 rounded-md text-sm bg-blue-500 text-white hover:bg-blue-600 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      <SummaryStats stats={summaryStats} isLoading={isLoading} />
      
      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-6">Bridge Activity</h2>
        <div className="mb-4">
          <p className="text-gray-600 mb-2">Filter by asset:</p>
          {/* Asset filter buttons would go here */}
        </div>
        
        {isLoading ? (
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-gray-500">Loading data...</p>
          </div>
        ) : isError ? (
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
            <p className="text-red-500">Error loading data. Please try again.</p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <StackedAreaChart data={stats?.timeSeriesData || []} />
          </div>
        )}
      </div>
      
      <MainSection />
    </main>
  );
}