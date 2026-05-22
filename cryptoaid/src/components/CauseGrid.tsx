import React from "react";
import { motion } from "motion/react";
import { Zap, Leaf, Droplets, GraduationCap, Globe } from "lucide-react";
import { Campaign } from "../types";

interface CauseGridProps {
  campaigns: Campaign[];
  onDonateClick: (campaign: Campaign) => void;
  walletConnected: boolean;
  onConnectWallet: () => void;
}

export default function CauseGrid({ campaigns, onDonateClick, walletConnected, onConnectWallet }: CauseGridProps) {
  
  const getCategoryDetails = (category: string) => {
    switch (category) {
      case "Environmental":
        return {
          icon: <Leaf className="h-4 w-4 text-emerald-400" />,
          colorClass: "text-emerald-400 bg-emerald-500/[0.05] border-emerald-500/20",
          barGradient: "from-emerald-500 via-emerald-400 to-teal-500",
          glowColor: "rgba(16, 185, 129, 0.14)"
        };
      case "Humanitarian":
        return {
          icon: <Droplets className="h-4 w-4 text-blue-400" />,
          colorClass: "text-blue-400 bg-blue-500/[0.05] border-blue-500/20",
          barGradient: "from-blue-500 via-blue-400 to-indigo-500",
          glowColor: "rgba(59, 130, 246, 0.14)"
        };
      case "Education":
        return {
          icon: <GraduationCap className="h-4 w-4 text-purple-400" />,
          colorClass: "text-purple-400 bg-purple-500/[0.05] border-purple-500/20",
          barGradient: "from-purple-500 via-purple-400 to-fuchsia-500",
          glowColor: "rgba(168, 85, 247, 0.14)"
        };
      default:
        return {
          icon: <Globe className="h-4 w-4 text-slate-400" />,
          colorClass: "text-slate-400 bg-slate-500/[0.05] border-slate-500/20",
          barGradient: "from-slate-500 via-slate-450 to-slate-700",
          glowColor: "rgba(148, 163, 184, 0.14)"
        };
    }
  };

  const renderAvatarStack = (seed: string, count: number) => {
    if (count <= 0) return null;

    const donorPools = [
      { initials: "JD", gradient: "from-blue-600/35 to-indigo-600/35 border-blue-500/20 text-blue-300 shadow-[0_0_8px_rgba(59,130,246,0.15)]" },
      { initials: "MK", gradient: "from-emerald-600/35 to-teal-600/35 border-emerald-500/20 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.15)]" },
      { initials: "SR", gradient: "from-purple-600/35 to-fuchsia-600/35 border-purple-500/20 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.15)]" },
      { initials: "TL", gradient: "from-rose-600/35 to-pink-600/35 border-rose-500/20 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.15)]" },
      { initials: "HB", gradient: "from-amber-600/35 to-orange-600/35 border-amber-500/20 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.15)]" },
      { initials: "WY", gradient: "from-cyan-600/35 to-sky-600/35 border-cyan-500/20 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]" },
      { initials: "OP", gradient: "from-violet-600/35 to-purple-600/35 border-violet-500/20 text-violet-300 shadow-[0_0_8px_rgba(139,92,246,0.15)]" },
      { initials: "EF", gradient: "from-teal-600/35 to-emerald-600/35 border-teal-500/20 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.15)]" },
      { initials: "AL", gradient: "from-indigo-600/35 to-blue-600/35 border-indigo-500/20 text-indigo-300 shadow-[0_0_8px_rgba(79,70,229,0.15)]" },
      { initials: "CN", gradient: "from-fuchsia-600/35 to-pink-600/35 border-fuchsia-500/20 text-fuchsia-300 shadow-[0_0_8px_rgba(217,70,239,0.15)]" },
    ];

    const getDonor = (offset: number) => {
      const charVal = seed.length > 0 ? seed.charCodeAt(offset % seed.length) : 0;
      const idx = (charVal + offset) % donorPools.length;
      return donorPools[idx];
    };

    const displayCount = Math.min(count, 3);
    const avatars = [];
    for (let i = 0; i < displayCount; i++) {
      avatars.push(getDonor(i));
    }

    return (
      <div className="flex -space-x-1.5 items-center mr-1">
        {avatars.map((d, index) => (
          <div
            key={index}
            className={`flex h-5 w-5 items-center justify-center rounded-full border bg-gradient-to-b backdrop-blur-md text-[8px] font-extrabold tracking-tight select-none ${d.gradient}`}
            style={{ zIndex: 3 - index }}
          >
            {d.initials}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-12" id="campaigns-grid-section">
      <div className="flex flex-col items-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-white font-sans text-center">
          Active UGC-Gas Campaigns
        </h2>
        <p className="text-slate-400 mt-2 text-center text-sm md:text-base max-w-md font-light">
          Select an active campaign to trigger an ETH-free EIP-2612 donation where gas is paid in Mock USD (UGC).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {campaigns.map((camp, index) => {
          const percentRaised = Math.min((camp.currentAmount / camp.targetAmount) * 100, 100);
          const details = getCategoryDetails(camp.category);
          
          return (
            <motion.div
              key={camp.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.12 }}
              whileHover={{ y: -6 }}
              className="bg-[#0b0b12] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col h-full relative group shadow-[inset_0_1px_1px_rgba(255,255,255,0.04),0_12px_24px_-10px_rgba(0,0,0,0.6)] hover:border-white/[0.12] transition-all duration-300"
              id={`cause-card-${camp.id}`}
            >
              {/* Dynamic ambient hover glow */}
              <div 
                className="absolute -top-[10%] -left-[10%] w-[120%] h-[50%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[40px] pointer-events-none -z-10"
                style={{
                  background: `radial-gradient(circle, ${details.glowColor} 0%, transparent 70%)`
                }}
              />

              {/* Top ambient highlight line */}
              <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-${camp.category === "Environmental" ? "emerald-500" : camp.category === "Humanitarian" ? "blue-500" : "purple-500"}/20 to-transparent`} />

              <div className="p-6 flex-1 flex flex-col">
                {/* Header: Category tag and glass category icon */}
                <div className="flex items-center justify-between mb-5">
                  <span className={`inline-flex items-center gap-1.5 text-[9px] tracking-widest uppercase font-extrabold px-2.5 py-1 rounded-full border ${details.colorClass} font-mono shadow-sm`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    {camp.category}
                  </span>
                  
                  {/* Category icon inside glass container */}
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] shadow-[0_4px_12px_-2px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.03)] flex items-center justify-center">
                    {details.icon}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-[18px] font-semibold text-slate-100 mb-2 tracking-tight group-hover:text-white transition-colors leading-snug">
                  {camp.title}
                </h3>

                {/* Description */}
                <p className="text-[13px] text-slate-400/90 leading-relaxed font-light mb-6 flex-1">
                  {camp.description}
                </p>

                {/* Metrics */}
                <div className="space-y-4 mt-auto">
                  {/* Progress info */}
                  <div className="flex items-end justify-between mb-1.5">
                    <div>
                      <p className="text-[10px] font-mono tracking-widest uppercase text-slate-500 font-bold mb-1">Raised so far</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold tracking-tight text-white">
                          ${camp.currentAmount.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          / ${camp.targetAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold font-mono px-2.5 py-0.5 rounded-full border ${
                        camp.category === "Environmental" ? "text-emerald-400 bg-emerald-500/[0.06] border-emerald-500/25" :
                        camp.category === "Humanitarian" ? "text-blue-400 bg-blue-500/[0.06] border-blue-500/25" : 
                        "text-purple-400 bg-purple-500/[0.06] border-purple-500/25"
                      }`}>
                        {percentRaised.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Sleek progress bar */}
                  <div className="relative w-full h-2.5 bg-[#08080d] rounded-full overflow-hidden border border-white/[0.03] shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.8)]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentRaised}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className={`absolute top-0 left-0 h-full bg-gradient-to-r ${details.barGradient} rounded-full shadow-[0_0_12px_rgba(255,255,255,0.1)]`}
                    />
                  </div>

                  {/* Supporters info & status */}
                  <div className="flex items-center justify-between text-[12px] text-slate-400 pt-4 border-t border-white/[0.05]">
                    <div className="flex items-center gap-1.5">
                      {renderAvatarStack(camp.id, camp.donorsCount)}
                      <span className="font-medium text-slate-300/90 text-[11px] font-sans">
                        {camp.donorsCount === 0 ? (
                          "Be the first supporter"
                        ) : (
                          `${camp.donorsCount} ${camp.donorsCount === 1 ? "supporter" : "supporters"}`
                        )}
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/[0.08] text-emerald-400 border border-emerald-500/20 text-[9px] font-bold font-mono tracking-wider uppercase shadow-sm">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                      <span>UGC Gas</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button Footer */}
              <div className="p-5 pt-0 mt-5">
                <button
                  onClick={() => onDonateClick(camp)}
                  className="w-full relative flex items-center justify-center gap-2 rounded-xl bg-white/[0.02] hover:bg-white text-slate-300 hover:text-slate-950 border border-white/[0.06] hover:border-transparent text-[12px] font-bold py-3 uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-sm shadow-black/40 hover:scale-[1.01]"
                  id={`donate-btn-${camp.id}`}
                >
                  <Zap className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/10 group-hover:text-slate-950 transition-colors" />
                  <span>Donate (UGC Gas)</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
