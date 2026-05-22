import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Donation, Leader } from "../types";
import { formatAddress } from "../mockData";

interface ActivityLeaderboardProps {
  donations: Donation[];
  leaders: Leader[];
  onDonorClick?: (address: string) => void;
}

// Deterministic color assignment based on the wallet address hash
function getAvatarStyle(address: string) {
  if (!address) {
    return {
      gradient: "from-slate-800 to-slate-900",
      text: "text-slate-400 border-white/[0.06] shadow-sm"
    };
  }

  // Generate a simple hash from the address string
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }

  const schemes = [
    {
      gradient: "from-indigo-650/20 via-indigo-500/10 to-transparent",
      text: "text-indigo-400 border-indigo-500/25 shadow-[0_0_12px_rgba(99,102,241,0.12)]"
    },
    {
      gradient: "from-emerald-650/20 via-emerald-500/10 to-transparent",
      text: "text-emerald-400 border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
    },
    {
      gradient: "from-purple-650/20 via-fuchsia-500/10 to-transparent",
      text: "text-purple-400 border-purple-500/25 shadow-[0_0_12px_rgba(168,85,247,0.12)]"
    },
    {
      gradient: "from-amber-650/20 via-orange-500/10 to-transparent",
      text: "text-amber-400 border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.12)]"
    },
    {
      gradient: "from-rose-650/20 via-pink-500/10 to-transparent",
      text: "text-rose-400 border-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.12)]"
    },
    {
      gradient: "from-cyan-650/20 via-sky-500/10 to-transparent",
      text: "text-cyan-400 border-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.12)]"
    },
  ];

  const index = Math.abs(hash) % schemes.length;
  return schemes[index];
}

const renderRankBadge = (rank: number) => {
  if (rank === 1) {
    return (
      <span className="flex items-center justify-center w-8 h-5 text-[9px] font-bold font-mono rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)] select-none">
        1st
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex items-center justify-center w-8 h-5 text-[9px] font-bold font-mono rounded bg-slate-300/10 text-slate-300 border border-slate-300/30 select-none">
        2nd
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex items-center justify-center w-8 h-5 text-[9px] font-bold font-mono rounded bg-amber-700/15 text-orange-400 border border-amber-700/30 select-none">
        3rd
      </span>
    );
  }
  return (
    <span className="flex items-center justify-center w-8 h-5 text-[10px] font-mono text-slate-655 tabular-nums select-none">
      #{rank.toString().padStart(2, "0")}
    </span>
  );
};

export default function ActivityLeaderboard({ donations, leaders, onDonorClick }: ActivityLeaderboardProps) {
  return (
    <section
      id="activity-leaderboard-section"
      className="mx-auto max-w-[1440px] px-6 lg:px-16 py-20 pb-24"
    >
      {/* Section header */}
      <div className="mb-10">
        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-3 flex items-center gap-2">
          <span className="h-px w-6 bg-slate-700" />
          Live activity
        </p>
        <h2 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] text-white">
          Donations in real time.
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── Left: Live transaction feed ─────────────────────────── */}
        <div className="lg:col-span-5">
          {/* Column header */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2 text-[13px] font-medium text-white">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Transaction feed
            </div>
            <span className="text-[11px] font-mono tracking-wider text-slate-500 uppercase">Live Stream</span>
          </div>

          {/* Feed list */}
          <div
            id="activity-feed-container"
            className="rounded-xl border border-white/[0.06] bg-[#0b0b12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] overflow-hidden max-h-[440px] overflow-y-auto pr-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/[0.08] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/[0.16]"
          >
            <div className="divide-y divide-white/[0.04]">
              <AnimatePresence initial={false}>
                {donations.map((tx) => {
                  const avatar = getAvatarStyle(tx.donor);
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar with deterministic gradient */}
                        <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${avatar.gradient} border ${avatar.text} flex items-center justify-center text-[10px] font-bold font-mono shrink-0 select-none`}>
                          {tx.donor.slice(2, 4).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[12px]">
                            <button
                              onClick={() => onDonorClick?.(tx.donor)}
                              className="font-mono font-medium text-white hover:text-emerald-400 transition-colors truncate max-w-[95px]"
                              title={tx.donor}
                            >
                              {formatAddress(tx.donor)}
                            </button>
                            <span className="text-slate-650 font-mono">·</span>
                            <span className="text-slate-400 truncate text-[11.5px]" title={tx.campaignTitle}>
                              {tx.campaignTitle}
                            </span>
                          </div>

                          {/* Explorer verification & timestamp */}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500">{tx.timestamp}</span>
                            {tx.hash && (
                              <>
                                <span className="text-slate-750 font-mono text-[9px] select-none">|</span>
                                <a
                                  href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-0.5 transition-colors group/link"
                                  title="Verify on Block Explorer"
                                >
                                  <span>{tx.hash.substring(0, 8)}...</span>
                                  <ArrowUpRight className="h-2.5 w-2.5 opacity-60 group-hover/link:opacity-100 transition-opacity" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <p className="text-[13px] font-bold font-mono text-white">${tx.amount.toLocaleString()}</p>
                        {/* High-fidelity gasless relayer badge */}
                        <div className="flex items-center gap-0.5 justify-end mt-1">
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-500/[0.06] text-emerald-400 border border-emerald-500/15 text-[8px] font-bold font-mono uppercase tracking-wider select-none">
                            <svg className="h-2 w-2 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Gasless
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {donations.length === 0 && (
              <div className="px-4 py-14 text-center text-[13px] text-slate-650 font-mono">
                No transactions yet. Be the first to donate.
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Leaderboard ──────────────────────────────────── */}
        <div className="lg:col-span-7">
          {/* Column header */}
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-[13px] font-medium text-white">Top donors</span>
            <span className="text-[11px] font-mono tracking-wider text-slate-500 uppercase">All time</span>
          </div>

          {/* Table */}
          <div
            id="leaderboard-cards-container"
            className="rounded-xl border border-white/[0.06] bg-[#0b0b12] shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)] overflow-hidden"
          >
            {/* Table head */}
            <div className="grid grid-cols-[38px_1fr_auto] gap-4 items-center px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.04]">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Rank</span>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Donor</span>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider text-right">Total Donated</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {leaders.map((leader) => {
                const avatar = getAvatarStyle(leader.address);
                const isTopThree = leader.rank <= 3;
                return (
                  <motion.div
                    key={leader.address}
                    layoutId={`leader-${leader.address}`}
                    id={`leaderboard-row-${leader.rank}`}
                    className={`grid grid-cols-[38px_1fr_auto] gap-4 items-center px-4 py-3.5 hover:bg-white/[0.02] transition-colors ${
                      isTopThree ? "bg-white/[0.005]" : "bg-transparent"
                    }`}
                  >
                    {/* Rank glass capsule badge */}
                    <div className="flex justify-start">
                      {renderRankBadge(leader.rank)}
                    </div>

                    {/* Donor info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${avatar.gradient} border ${avatar.text} flex items-center justify-center text-[10px] font-bold font-mono shrink-0 select-none`}>
                        {leader.address.slice(2, 4).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <button
                          onClick={() => onDonorClick?.(leader.address)}
                          className="text-[12px] font-mono font-medium text-white hover:text-emerald-400 transition-colors truncate max-w-[120px] text-left block"
                          title={leader.address}
                        >
                          {formatAddress(leader.address)}
                        </button>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          {leader.donationsCount} {leader.donationsCount === 1 ? "donation" : "donations"}
                        </p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-[13px] font-bold font-mono text-white tabular-nums">
                        ${leader.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono tabular-nums">
                        ~${(leader.amount / Math.max(leader.donationsCount, 1)).toFixed(0)} avg
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {leaders.length === 0 && (
              <div className="px-4 py-14 text-center text-[13px] text-slate-655 font-mono">
                No donors yet. Be the first.
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
