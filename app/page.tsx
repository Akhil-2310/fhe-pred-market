"use client";

import React, { useState } from "react";
import { 
  TrendingUp, 
  Plus, 
  Activity, 
  ShieldCheck, 
  BarChart3, 
  ArrowRight,
  DollarSign,
  CheckCircle2,
  Wallet
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  Tooltip, 
} from "recharts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// --- WEB3 IMPORTS ---
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

/** * UTILS */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** * MOCK DATA GENERATORS */
const generateChartData = () => {
  return Array.from({ length: 10 }).map((_, i) => ({
    time: `T${i}`,
    yes: 30 + Math.random() * 40, 
    no: 30 + Math.random() * 40, 
  }));
};

const INITIAL_MARKETS = [
  {
    id: 1,
    title: "Will Bitcoin hit $100k by end of 2025?",
    description: "Prediction based on current market trends and halving cycles.",
    yesPrice: 0.65,
    noPrice: 0.35,
    volume: "$1.2M",
    chartData: generateChartData(),
  },
  {
    id: 2,
    title: "Will SpaceX launch Starship to Mars in 2026?",
    description: "Based on Elon Musk's latest press conference timelines.",
    yesPrice: 0.20,
    noPrice: 0.80,
    volume: "$450k",
    chartData: generateChartData(),
  },
];

/** * COMPONENTS */

const Button = ({ children, className, variant = "primary", ...props }: any) => {
  const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2";
  const variants: any = {
    primary: "bg-black text-white hover:bg-zinc-800 border border-transparent",
    outline: "bg-white text-black border border-zinc-200 hover:bg-zinc-50",
    ghost: "bg-transparent hover:bg-zinc-100 text-zinc-600",
  };
  
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
};

const Card = ({ children, className }: any) => (
  <div className={cn("bg-white border border-zinc-200 rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

// 2. NAV BAR - Updated to use RainbowKit
const Navbar = () => (
  <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
        <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center">
          <TrendingUp size={18} />
        </div>
        Oracle<span className="text-zinc-400">Market</span>
      </div>

      <div className="flex items-center gap-4">
        {/* RainbowKit handles Connect/Disconnect/Account View automatically */}
        <ConnectButton 
            showBalance={false}
            accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
            }}
        />
      </div>
    </div>
  </nav>
);

// 3. CHART COMPONENT
const MarketChart = ({ data }: { data: any[] }) => (
  <div className="h-32 w-full mt-4">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Tooltip 
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          itemStyle={{ fontSize: '12px' }}
        />
        <Line type="monotone" dataKey="yes" stroke="#10b981" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="no" stroke="#ef4444" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// 4. MAIN PAGE
export default function PredictionMarket() {
  // WEB3 HOOK
  // We use this to check if the user is connected before letting them bet
  const { isConnected, address } = useAccount();

  // STATE
  const [activeTab, setActiveTab] = useState("all"); 
  const [markets, setMarkets] = useState(INITIAL_MARKETS);
  const [userBets, setUserBets] = useState<any[]>([]);
  
  // Create Market Form State
  const [newMarket, setNewMarket] = useState({ title: "", description: "" });

  const handleCreateMarket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarket.title) return;

    const market = {
      id: Date.now(),
      title: newMarket.title,
      description: newMarket.description,
      yesPrice: 0.5,
      noPrice: 0.5,
      volume: "$0",
      chartData: generateChartData(),
    };
    
    setMarkets([market, ...markets]);
    setNewMarket({ title: "", description: "" });
    setActiveTab("all");
  };

  const placeBet = (marketId: number, type: 'YES' | 'NO') => {
    if (!isConnected) {
      // You could also open the connect modal programmatically here, 
      // but alerting is a simple fallback for now.
      alert("Please connect your wallet first to place a bet.");
      return;
    }

    const market = markets.find(m => m.id === marketId);
    if (!market) return;

    // Check if already bet
    const existingBet = userBets.find(b => b.marketId === marketId && b.type === type);
    
    if (existingBet) {
      const updatedBets = userBets.map(b => 
        (b.marketId === marketId && b.type === type) 
          ? { ...b, amount: b.amount + 10 } 
          : b
      );
      setUserBets(updatedBets);
    } else {
      setUserBets([...userBets, { 
        marketId, 
        marketTitle: market.title, 
        type, 
        amount: 10,
        priceBought: type === 'YES' ? market.yesPrice : market.noPrice 
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-200">
      
      <Navbar />

      {/* HERO SECTION */}
      <section className="bg-white border-b border-zinc-200 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6 text-zinc-900">
            Trade on the outcome of <br/> 
            <span className="text-zinc-400">future events.</span>
          </h1>
          <p className="text-xl text-zinc-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            The world's most transparent prediction market. Buy shares in outcome YES or NO. 
            Profit if you're right. No gradients, just data.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button className="h-12 px-8 text-lg" onClick={() => setActiveTab('all')}>
              Start Trading <ArrowRight size={18} />
            </Button>
            <Button variant="outline" className="h-12 px-8 text-lg" onClick={() => setActiveTab('create')}>
              Create Market
            </Button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-12 border-b border-zinc-200 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: ShieldCheck, title: "Secure Contracts", desc: "Audited smart contracts ensure your funds are safe." },
            { icon: Activity, title: "Real-time Odds", desc: "Prices update instantly based on global market activity." },
            { icon: DollarSign, title: "Instant Payouts", desc: "Winners are paid out automatically via smart contract." },
          ].map((f, i) => (
            <div key={i} className="flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 bg-white border border-zinc-200 rounded-xl flex items-center justify-center mb-4 text-zinc-800 shadow-sm">
                <f.icon size={24} />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DASHBOARD AREA */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* TABS */}
        <div className="flex items-center gap-2 mb-8 border-b border-zinc-200 pb-1">
          {[
            { id: 'all', label: 'All Markets' },
            { id: 'portfolio', label: 'My Positions' },
            { id: 'create', label: 'Create Market' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-6 py-3 font-medium text-sm transition-colors border-b-2",
                activeTab === tab.id 
                  ? "border-black text-black" 
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. ALL MARKETS VIEW */}
        {activeTab === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {markets.map((market) => (
              <Card key={market.id} className="hover:shadow-lg transition-shadow duration-300">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2">
                       <span className="bg-zinc-100 text-zinc-600 text-xs px-2 py-1 rounded font-mono uppercase">
                         Crypto
                       </span>
                    </div>
                    <span className="text-zinc-400 text-sm flex items-center gap-1">
                      <BarChart3 size={14} /> {market.volume} Vol
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold leading-tight mb-2 h-14 line-clamp-2">
                    {market.title}
                  </h3>
                  <p className="text-zinc-500 text-sm mb-6 h-10 line-clamp-2">
                    {market.description}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button 
                      onClick={() => placeBet(market.id, 'YES')}
                      className="group flex flex-col items-center justify-center p-3 rounded-lg border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-100 transition-colors"
                    >
                      <span className="text-emerald-700 font-bold text-lg">Yes</span>
                      <span className="text-emerald-600 text-sm">{Math.floor(market.yesPrice * 100)}%</span>
                    </button>
                    <button 
                      onClick={() => placeBet(market.id, 'NO')}
                      className="group flex flex-col items-center justify-center p-3 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-100 transition-colors"
                    >
                      <span className="text-red-700 font-bold text-lg">No</span>
                      <span className="text-red-600 text-sm">{Math.floor(market.noPrice * 100)}%</span>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-zinc-100">
                    <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wider font-bold">Price History</p>
                    <MarketChart data={market.chartData} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 2. CREATE MARKET VIEW */}
        {activeTab === 'create' && (
          <div className="max-w-2xl mx-auto">
            <Card className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Create New Market</h2>
                <p className="text-zinc-500">Set the terms for a new prediction market.</p>
              </div>
              <form onSubmit={handleCreateMarket} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Market Question</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Will ETH pass $5k in 2024?"
                    className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    value={newMarket.title}
                    onChange={(e) => setNewMarket({...newMarket, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Description / Resolution Source</label>
                  <textarea 
                    rows={4}
                    placeholder="Define exact rules for how this market resolves..."
                    className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                    value={newMarket.description}
                    onChange={(e) => setNewMarket({...newMarket, description: e.target.value})}
                  />
                </div>
                <Button type="submit" className="w-full py-3 text-lg">
                  <Plus size={20} /> Publish Market
                </Button>
              </form>
            </Card>
          </div>
        )}

        {/* 3. PORTFOLIO VIEW */}
        {activeTab === 'portfolio' && (
          <div className="max-w-4xl mx-auto">
            {!isConnected ? (
              <div className="text-center py-20 bg-white border border-dashed border-zinc-300 rounded-xl">
                <Wallet className="mx-auto h-12 w-12 text-zinc-300 mb-4" />
                <h3 className="text-lg font-medium text-zinc-900">Wallet not connected</h3>
                <p className="text-zinc-500 mb-6">Connect your wallet to view your active positions.</p>
                {/* We can render the Connect Button here too */}
                <div className="flex justify-center">
                   <ConnectButton />
                </div>
              </div>
            ) : userBets.length === 0 ? (
              <div className="text-center py-20 bg-white border border-dashed border-zinc-300 rounded-xl">
                 <h3 className="text-lg font-medium text-zinc-900">No active positions</h3>
                 <p className="text-zinc-500">Go to the markets tab and start predicting.</p>
              </div>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Market</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Position</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Price Paid</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Invested</th>
                        <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {userBets.map((bet, i) => (
                        <tr key={i} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-zinc-900 max-w-xs truncate">
                            {bet.marketTitle}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-bold",
                              bet.type === 'YES' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            )}>
                              {bet.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-500">
                            {bet.priceBought}
                          </td>
                          <td className="px-6 py-4 font-mono text-zinc-700">
                            ${bet.amount}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                              <CheckCircle2 size={14} /> Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-zinc-200 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-6 h-6 bg-black text-white rounded flex items-center justify-center">
              <TrendingUp size={14} />
            </div>
            OracleMarket
          </div>
          <div className="text-zinc-500 text-sm">
            © 2024 Oracle Prediction Markets. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm font-medium text-zinc-600">
            <a href="#" className="hover:text-black">Terms</a>
            <a href="#" className="hover:text-black">Privacy</a>
            <a href="#" className="hover:text-black">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}