"use client";
import { useState } from "react";
import TimeSelector from "../components/TimeSelector";
import SummaryStats from "../components/SummaryStats";
import StackedAreaChart from "../components/StackedAreaChart";
import MainSection from "../components/MainSection";

export default function Home() {
  const [timePeriod, setTimePeriod] = useState("1m");
  const summaryStats = [
    { id: "total", label: "Total Value Bridged", value: "$9,000,000", change: "+12.5%" },
    { id: "transfers", label: "Total Transfers", value: "1,250", change: "+8.3%" },
    { id: "assets", label: "Unique Assets", value: "15", change: "+2" },
    { id: "chains", label: "Active Chains", value: "5", change: "+1" }
  ];

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Hyperliquid Bridge Dashboard</h1>
      <p className="mb-6">Monitor assets being bridged to Hyperliquid EVM via multiple bridges</p>
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Overview</h2>
        <SummaryStats stats={summaryStats} />
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Bridge Activity Over Time</h3>
          <TimeSelector selectedPeriod={timePeriod} onSelectPeriod={setTimePeriod} />
        </div>
        <MainSection />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-4">Assets Bridged by Chain</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-blue-600">Ethereum</h3>
            <StackedAreaChart title="Ethereum Bridge Activity" height="250px" showFilters={true} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-green-600">Solana</h3>
            <StackedAreaChart title="Solana Bridge Activity" height="250px" showFilters={true} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-blue-500">Base</h3>
            <StackedAreaChart title="Base Bridge Activity" height="250px" showFilters={true} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-purple-600">Polygon</h3>
            <StackedAreaChart title="Polygon Bridge Activity" height="250px" showFilters={true} />
          </div>
        </div>
      </div>
    </main>
  );
}