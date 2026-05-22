import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Trophy, Users, Heart, ArrowUpRight, ShieldCheck, Activity } from "lucide-react";
import { Donation, Leader } from "../types";
import { formatAddress } from "../mockData";

interface ActivityLeaderboardProps {
  donations: Donation[];
  leaders: Leader[];
  onDonorClick?: (address: string) => void;
}

export default function ActivityLeaderboard({ donations, leaders, onDonorClick }: ActivityLeaderboardProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 pb-20" id="activity-leaderboard-section">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Real-Time Live Feed */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-blue-400" />
                <span>Live Transaction Stream</span>
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/10">
              REAL-TIME
            </span>
          </div>

          <div className="glass-panel rounded-2xl p-4.5 max-h-[460px] overflow-y-auto space-y-3 relative" id="activity-feed-container">
            {/* Soft decorative background spotlight */}
            <div className="absolute bottom-4 right-4 h-32 w-32 rounded-full bg-emerald-500/[0.03] blur-2xl -z-10" />

            <AnimatePresence initial={false}>
              {donations.map((tx, idx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -30, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: 30, height: 0 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="rounded-xl border border-white/5 bg-white/[0.01] p-3.5 flex items-center justify-between hover:bg-white/[0.03] transition-colors gap-3 overflow-hidden text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-mono font-bold text-[10px] text-blue-400 shrink-0">
                      tx
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-slate-100 flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-blue-400 cursor-pointer hover:underline" onClick={() => onDonorClick?.(tx.donor)}>
                          {formatAddress(tx.donor)}
                        </span>
                        <span className="text-slate-400 font-sans">donated</span>
                        <span className="font-bold text-white font-sans">${tx.amount} UGC</span>
                      </p>
                      
                      <p className="text-[10.5px] text-slate-400 truncate mt-0.5 font-light">
                        For <span className="text-indigo-300 font-medium">{tx.campaignTitle}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-rose-400 font-semibold font-mono bg-rose-500/10 px-2 py-0.5 rounded flex items-center gap-0.5 border border-rose-500/10 justify-end mb-1">
                      ⛽ -0.0025 UGC Gas
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono block mt-1">
                      0 ETH gas · {tx.timestamp}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {donations.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                No transactions recorded yet. Be the first to initiate!
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Top Donor Leaderboard */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-lg font-bold text-white font-sans flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-amber-400" />
              <span>Top Donors Leaderboard</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              ALL-TIME CONTRIBUTION
            </span>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-4 relative" id="leaderboard-cards-container">
            {/* Background radial soft light */}
            <div className="absolute top-4 left-4 h-32 w-32 rounded-full bg-blue-500/[0.03] blur-2xl -z-10" />

            <div className="space-y-3">
              {leaders.map((leader, idx) => {
                const isTop1 = leader.rank === 1;
                const isTop2 = leader.rank === 2;
                const isTop3 = leader.rank === 3;

                // Color configuration for ranks
                let ringColor = "border-white/5 bg-white/[0.01]";
                let medalBadge = "bg-slate-900 border-white/10 text-slate-400";
                let namePrefix = "";
                
                if (isTop1) {
                  ringColor = "border-amber-500/25 bg-amber-500/[0.02] shadow-lg shadow-amber-500/[0.03]";
                  medalBadge = "bg-amber-500/10 border-amber-500/30 text-amber-400";
                  namePrefix = "🥇";
                } else if (isTop2) {
                  ringColor = "border-slate-300/25 bg-slate-200/[0.02]";
                  medalBadge = "bg-slate-200/10 border-slate-300/30 text-slate-300";
                  namePrefix = "🥈";
                } else if (isTop3) {
                  ringColor = "border-amber-700/25 bg-amber-700/[0.02]";
                  medalBadge = "bg-amber-700/10 border-amber-700/30 text-amber-500";
                  namePrefix = "🥉";
                }

                return (
                  <motion.div
                    key={leader.address}
                    layoutId={`leader-${leader.address}`}
                    className={`flex items-center justify-between rounded-xl border p-3.5 transition-all outline-none ${ringColor}`}
                    id={`leaderboard-row-${leader.rank}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Medal Rank or numeric index */}
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold font-mono ${medalBadge}`}>
                        {leader.rank}
                      </div>

                      {/* Donor Profile Avatar Identity */}
                      <div className="h-8.5 w-8.5 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-mono font-bold text-slate-300 shrink-0 relative overflow-hidden">
                        {/* Custom vector pattern behind initials */}
                        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-blue-500 to-purple-600 opacity-60" />
                        A{leader.avatarSeed}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs font-semibold text-white truncate max-w-[120px] sm:max-w-none">
                            {leader.address}
                          </span>
                          <span className="text-xs shrink-0 select-none">{namePrefix}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {leader.donationsCount} transactions (UGC Gas)
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold text-blue-400 font-mono">
                        ${leader.amount.toLocaleString()} <span className="text-[10px] font-semibold text-slate-500">UGC</span>
                      </p>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                        Avg: ${(leader.amount / leader.donationsCount).toFixed(0)} / tx
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
