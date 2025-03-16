"use client";
import { useState, useEffect } from "react";
import TimeSelector from "../components/TimeSelector";
import SummaryStats from "../components/SummaryStats";
import StackedAreaChart from "../components/StackedAreaChart";
import MainSection from "../components/MainSection";
import { useHyperlaneData } from "../lib/api/hyperlane";

export default function Home() {
  const [timePeriod, setTimePeriod] = useState("24h");
  const { stats, isLoading, isError } = useHyperlaneData(timePeriod);
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
        change: "+2" 
      },
      { 
        id: "chains", 
        label: "Active Chains", 
        value: formatNumber(stats.activeChains), 
        change: "+1" 
      }
    ]);
  }, [stats]);

  const handleTimeChange = (period: string) => {
    setTimePeriod(period);
  };

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Hyperliquid Bridge Dashboard</h1>
      <p className="mb-6">Monitor assets being bridged to Hyperliquid EVM via multiple bridges</p>
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Overview</h2>
          <TimeSelector selectedPeriod={timePeriod} onSelectPeriod={handleTimeChange} />
        </div>
        
        {isLoading ? (
          <div className="p-4 text-center">Loading dashboard data...</div>
        ) : isError ? (
          <div className="p-4 text-center text-red-500">Error loading data. Please try again later.</div>
        ) : (
          <>
            <SummaryStats stats={summaryStats} />
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Bridge Activity</h3>
              <MainSection timeframe={timePeriod} />
            </div>
          </>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Assets Bridged by Chain</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-blue-600">Ethereum</h3>
            <StackedAreaChart 
              title="Ethereum Bridge Activity" 
              chain="Ethereum" 
              height="250px" 
              showFilters={true} 
              timeframe={timePeriod}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-green-600">Solana</h3>
            <StackedAreaChart 
              title="Solana Bridge Activity" 
              chain="Solana" 
              height="250px" 
              showFilters={true} 
              timeframe={timePeriod}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-blue-500">Base</h3>
            <StackedAreaChart 
              title="Base Bridge Activity" 
              chain="Base" 
              height="250px" 
              showFilters={true} 
              timeframe={timePeriod}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-purple-600">Polygon</h3>
            <StackedAreaChart 
              title="Polygon Bridge Activity" 
              chain="Polygon" 
              height="250px" 
              showFilters={true} 
              timeframe={timePeriod}
            />
          </div>
        </div>
      </div>
    </main>
  );
}