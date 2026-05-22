import React from "react";
import { motion } from "motion/react";
import { Zap, Heart, TrendingUp } from "lucide-react";
import { Campaign } from "../types";

interface CauseGridProps {
  campaigns: Campaign[];
  onDonateClick: (campaign: Campaign) => void;
  walletConnected: boolean;
  onConnectWallet: () => void;
}

export default function CauseGrid({ campaigns, onDonateClick, walletConnected, onConnectWallet }: CauseGridProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12" id="campaigns-grid-section">
      <div className="flex flex-col items-center mb-12">
        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans text-center">
          Active UGC-Gas Campaigns
        </h2>
        <p className="text-slate-400 mt-2 text-center text-sm md:text-base max-w-md">
          Select an active campaign to trigger a donation paid in Mock USD (0 ETH gas).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {campaigns.map((camp, index) => {
          const percentRaised = Math.min((camp.currentAmount / camp.targetAmount) * 100, 100);
          
          return (
            <motion.div
              key={camp.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              whileHover={{ y: -6 }}
              className="glass-panel rounded-2xl overflow-hidden glass-panel-hover flex flex-col h-full relative group"
              id={`cause-card-${camp.id}`}
            >
              {/* Highlight background gradient depending on campaign gradient */}
              <div className={`absolute top-0 inset-x-0 h-48 bg-gradient-to-b ${camp.imageGradient} opacity-50 -z-10 transition-opacity duration-300 group-hover:opacity-70`} />

              <div className="p-6 flex-1 flex flex-col">
                {/* Header: Category and icon */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] uppercase tracking-wider font-semibold px-2.5 py-1 rounded-md border ${camp.tagColor}`}>
                    {camp.category}
                  </span>
                  <span className="text-3xl filter drop-shadow-[0_4px_10px_rgba(255,255,255,0.15)] select-none">
                    {camp.icon}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-blue-300 transition-colors">
                  {camp.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-400 font-light leading-relaxed mb-6 flex-1">
                  {camp.description}
                </p>

                {/* Progress metrics */}
                <div className="space-y-3 mt-auto">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Raised Progress</span>
                    <span className="text-blue-400 font-bold font-mono">
                      {percentRaised.toFixed(1)}%
                    </span>
                  </div>

                  {/* High precision styled progress bar */}
                  <div className="relative w-full h-2.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/5 shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentRaised}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full"
                    />
                    {/* Glowing pulse indicator at top level when hover */}
                    <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent shine-progress opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
                    <div>
                      <span className="text-white font-bold">${camp.currentAmount.toLocaleString()}</span>
                      <span className="text-slate-500"> / ${camp.targetAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <TrendingUp className="h-3 w-3 text-indigo-400" />
                      <span>{camp.donorsCount} donors</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button Footer */}
              <div className="p-6 pt-0 border-t border-white/5 mt-4">
                <button
                  onClick={() => onDonateClick(camp)}
                  className="w-full relative flex items-center justify-center gap-2 rounded-xl bg-white/[0.03] hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 border border-white/8 hover:border-transparent text-sm font-semibold text-white py-3 transition-all duration-300 cursor-pointer shadow-md shadow-black/20 hover:shadow-lg hover:shadow-blue-500/10 group-hover:bg-white/[0.05]"
                  id={`donate-btn-${camp.id}`}
                >
                  <Zap className="h-4 w-4 text-emerald-400 fill-emerald-400/20 group-hover:text-white transition-colors" />
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
