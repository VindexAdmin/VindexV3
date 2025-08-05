"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, Shield, Award, Wallet, DollarSign } from "lucide-react";
import { useAuth } from "../../../lib/auth-context";
import Navigation from "../../components/ui/Navigation";

interface Validator {
  id: string;
  name: string;
  address: string;
  commission: number;
  stake: number;
  uptime: number;
  apy: number;
  status: "active" | "inactive" | "jailed";
  blocksProduced: number;
}

interface StakingPosition {
  id: string;
  validatorId: string;
  validatorName: string;
  amount: number;
  rewards: number;
  startDate: string;
  status: "active" | "pending" | "unstaking";
  apy: number;
}

export default function StakingV2() {
  const { user, wallets, api, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stakeAmount, setStakeAmount] = useState("");
  const [selectedValidator, setSelectedValidator] = useState("");
  const [validators, setValidators] = useState<Validator[]>([]);
  const [stakingPositions, setStakingPositions] = useState<StakingPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Demo/mock data
  useEffect(() => {
    setValidators([
      {
        id: "validator_1",
        name: "Vindex Genesis Validator",
        address: "VDX1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        commission: 5,
        stake: 45000000,
        uptime: 99.8,
        apy: 8.2,
        status: "active",
        blocksProduced: 1247,
      },
      {
        id: "validator_2",
        name: "Secure Stake Validator",
        address: "VDX2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1",
        commission: 7,
        stake: 42000000,
        uptime: 99.5,
        apy: 7.8,
        status: "active",
        blocksProduced: 1198,
      },
      {
        id: "validator_3",
        name: "DeFi Pro Validator",
        address: "VDX3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
        commission: 6,
        stake: 38000000,
        uptime: 99.2,
        apy: 8.0,
        status: "active",
        blocksProduced: 1089,
      },
    ]);
    if (isAuthenticated) {
      setStakingPositions([
        {
          id: "1",
          validatorId: "validator_1",
          validatorName: "Vindex Genesis Validator",
          amount: 3000,
          rewards: 76.5,
          startDate: "2024-12-01",
          status: "active",
          apy: 8.2,
        },
        {
          id: "2",
          validatorId: "validator_3",
          validatorName: "DeFi Pro Validator",
          amount: 2000,
          rewards: 51.0,
          startDate: "2024-12-15",
          status: "active",
          apy: 8.0,
        },
      ]);
    }
  }, [isAuthenticated]);

  const totalStaked = stakingPositions.reduce((sum, pos) => sum + pos.amount, 0);
  const totalRewards = stakingPositions.reduce((sum, pos) => sum + pos.rewards, 0);

  const formatNumber = (num: number) => new Intl.NumberFormat().format(num);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "unstaking":
        return "text-orange-600 bg-orange-100";
      case "jailed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // Modern staking page layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
        <Navigation />
      </div>
      <header className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-16 flex flex-col items-center justify-center shadow-lg">
        <div className="max-w-2xl w-full px-4 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 drop-shadow-lg">Stake VDX (v2)</h1>
          <p className="text-xl text-red-100 mb-6">A new, modern staking experience for the Vindex ecosystem.</p>
        </div>
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-10">
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {[
            { id: "overview", label: "Overview", icon: TrendingUp },
            { id: "stake", label: "Stake", icon: Award },
            { id: "positions", label: "My Stakes", icon: Wallet },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-semibold text-base transition border-2 shadow-sm ${
                  activeTab === tab.id
                    ? "bg-red-600 text-white border-red-600 shadow-lg"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <section className="w-full">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
                <Shield className="h-8 w-8 text-red-600 mb-2" />
                <div className="text-center">
                  <div className="text-sm text-gray-500">Total Staked</div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(125000000)} VDX</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
                <Award className="h-8 w-8 text-green-600 mb-2" />
                <div className="text-center">
                  <div className="text-sm text-gray-500">Your Total Staked</div>
                  <div className="text-2xl font-bold text-gray-900">{formatNumber(totalStaked)} VDX</div>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow p-6 flex flex-col items-center">
                <DollarSign className="h-8 w-8 text-blue-600 mb-2" />
                <div className="text-center">
                  <div className="text-sm text-gray-500">Total Rewards</div>
                  <div className="text-2xl font-bold text-green-600">{totalRewards.toFixed(2)} VDX</div>
                </div>
              </div>
            </div>
          )}
          {activeTab === "stake" && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg border p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Stake Your VDX Tokens</h3>
                {/* ...reuse the modern stake form from v1 here if needed... */}
              </div>
            </div>
          )}
          {activeTab === "positions" && (
            <div className="space-y-6">
              {/* ...reuse the modern positions code from v1 here if needed... */}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
