import React from "react";
import { motion } from "motion/react";
import { Sparkles, Trophy, Users, Heart, Zap, ArrowRight, ShieldCheck, Coins } from "lucide-react";

interface HeroProps {
  totalDonated: number;
  totalDonors: number;
  avgGift: number;
  onConnectWallet: () => void;
  walletConnected: boolean;
}

export default function Hero({ totalDonated, totalDonors, avgGift, onConnectWallet, walletConnected }: HeroProps) {
  return (
    <section className="relative overflow-hidden py-12 md:py-20 lg:py-24" id="hero-section">
      {/* Dynamic background glow spots */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-blue-600/10 blur-[100px] animate-pulse-glow" />
      <div className="absolute top-1/3 right-1/4 -z-10 h-72 w-72 rounded-full bg-purple-600/10 blur-[100px] animate-pulse-glow" style={{ animationDelay: "-3s" }} />

      {/* Embedded 3D Spline Interactive Canvas */}
      <div className="absolute inset-0 -z-20 w-full h-full flex items-center justify-center opacity-65 pointer-events-none md:scale-110 lg:scale-130 select-none">
        <div className="w-full h-full max-w-5xl max-h-5xl flex items-center justify-center relative">
          {/* @ts-ignore */}
          <spline-viewer
            url="https://prod.spline.design/rGWRvwzQMFkkucaL/scene.splinecode"
            style={{ width: "100%", height: "100%" }}
            loading-type="eager"
          />
          {/* High-fidelity Radial Fog/Glow Overlay to naturally mask Spline boundaries */}
          <div className="absolute inset-0 bg-radial-[circle_at_center,transparent_45%,#0a0a0f_100%] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]/60 pointer-events-none" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Animated Feature Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-300 shadow-lg shadow-blue-500/5 mb-6"
        >
          <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-sparkle" />
          <span>UGF Protocol Powered on Base Sepolia</span>
        </motion.div>

        {/* Cinematic Header Text */}
        <div className="max-w-4xl mx-auto mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-none font-sans"
          >
            Give Globally. <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent glow-text-blue">
              Pay Zero Gas.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg md:text-xl text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto"
          >
            The world's first frictionless, gasless donation platform. No gas fees, no ETH requirements, no complex bridges. Make your full impact felt with Universal Gas Facilitation (UGF).
          </motion.p>
        </div>

        {/* High visibility tech badges */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-4 text-xs font-mono tracking-wider uppercase mb-14"
        >
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/5 px-4 py-2.5 text-slate-300">
            <Zap className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/20" />
            <span>Zero Gas Fees</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/5 px-4 py-2.5 text-slate-300">
            <Coins className="h-3.5 w-3.5 text-blue-400" />
            <span>Zero ETH Needed</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/5 px-4 py-2.5 text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
            <span>Permit-based Trust</span>
          </div>
        </motion.div>

        {/* Live Metrics Ticker Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
          className="mx-auto max-w-3xl rounded-2xl glass-panel border-white/10 p-6 md:p-8 shadow-2xl relative"
          id="metrics-ticker"
        >
          {/* subtle decoration to enhance depth */}
          <div className="absolute inset-y-0 left-0 w-[4px] bg-gradient-to-b from-blue-500 to-purple-600 rounded-l-2xl" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-white/5">
            {/* Stat 1 */}
            <div className="flex flex-col items-center justify-center pb-4 md:pb-0">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                <Heart className="h-4 w-4 text-rose-500 fill-rose-500/10" />
                <span>Total Sponsored</span>
              </div>
              <motion.div
                key={totalDonated}
                initial={{ scale: 0.95, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent font-sans"
              >
                ${totalDonated.toLocaleString()}
              </motion.div>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono mt-0.5">
                $0.00 Gas Spent
              </span>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col items-center justify-center py-4 md:py-0 md:px-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                <Users className="h-4 w-4 text-blue-400" />
                <span>Unique Donors</span>
              </div>
              <motion.div
                key={totalDonors}
                initial={{ scale: 0.95, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent font-sans"
              >
                {totalDonors}
              </motion.div>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                Active on Base Sepolia
              </span>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col items-center justify-center pt-4 md:pt-0 md:pl-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span>Average Gift</span>
              </div>
              <motion.div
                key={avgGift}
                initial={{ scale: 0.95, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent font-sans"
              >
                ${avgGift.toFixed(1)}
              </motion.div>
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                Full Value Direct to Cause
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
