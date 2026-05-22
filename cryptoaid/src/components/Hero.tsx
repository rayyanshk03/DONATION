import React from "react";
import { motion } from "motion/react";
import { ArrowRight, Zap, ShieldCheck, Coins } from "lucide-react";
import SplineGlobe from "./SplineGlobe";

interface HeroProps {
  totalDonated: number;
  totalDonors: number;
  avgGift: number;
  onConnectWallet: () => void;
  walletConnected: boolean;
  onViewProtocol?: () => void;
}

const FEATURES = [
  { icon: Zap,          label: "Zero gas fees",      color: "text-emerald-400" },
  { icon: Coins,        label: "No ETH required",    color: "text-blue-400"    },
  { icon: ShieldCheck,  label: "Permit-based trust", color: "text-violet-400"  },
];

export default function Hero({
  totalDonated,
  totalDonors,
  avgGift,
  onConnectWallet,
  walletConnected,
  onViewProtocol,
}: HeroProps) {
  return (
    <section
      id="hero-section"
      className="relative w-full overflow-hidden"
      style={{ minHeight: "calc(100vh - 62px)" }}
    >
      {/* ── Subtle background noise / grain ─────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsdGVyPSJ1cmwoI25vaXNlKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')] -z-10" />

      {/* ── Very soft ambient glow — not distracting ─────────────────────── */}
      <div className="pointer-events-none absolute top-[-20%] right-[5%] h-[600px] w-[600px] rounded-full bg-blue-600/[0.07] blur-[120px] -z-10" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[5%] h-[400px] w-[400px] rounded-full bg-indigo-500/[0.05] blur-[100px] -z-10" />

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1440px] px-6 lg:px-16 h-full">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 py-16 lg:py-0 lg:min-h-[calc(100vh-62px)]">

          {/* ──────────── LEFT COLUMN — Content ─────────────────────────── */}
          <div className="flex-1 max-w-[560px] flex flex-col justify-center">

            {/* Eyebrow label */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2"
            >
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <span className="h-px w-6 bg-slate-600" />
                UGF Protocol · Base Sepolia
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="text-[42px] sm:text-[52px] lg:text-[58px] font-bold leading-[1.08] tracking-[-0.03em] text-white mb-5"
            >
              Give globally.<br />
              <span className="text-slate-400">Pay zero gas.</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.14 }}
              className="text-[15px] leading-[1.75] text-slate-500 mb-8 max-w-[460px]"
            >
              The first frictionless gasless donation platform on Base. No ETH needed,
              no bridges, no complexity — just sign and give.
            </motion.p>

            {/* Feature list */}
            <motion.ul
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col gap-2.5 mb-10"
            >
              {FEATURES.map(({ icon: Icon, label, color }) => (
                <li key={label} className="flex items-center gap-3 text-[13px] text-slate-400">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.04] border border-white/[0.07] ${color}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  {label}
                </li>
              ))}
            </motion.ul>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.26 }}
              className="flex items-center gap-3 flex-wrap"
            >
              {!walletConnected ? (
                <button
                  onClick={onConnectWallet}
                  id="hero-connect-wallet-btn"
                  className="
                    inline-flex items-center gap-2 rounded-lg
                    bg-white text-[#050508]
                    px-5 py-2.5 text-[13px] font-semibold
                    hover:bg-slate-100 active:scale-[0.98]
                    transition-all duration-150 cursor-pointer
                    shadow-[0_2px_20px_rgba(0,0,0,0.5)]
                  "
                >
                  Connect Wallet
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <a
                  href="#campaigns-grid-section"
                  className="
                    inline-flex items-center gap-2 rounded-lg
                    bg-white text-[#050508]
                    px-5 py-2.5 text-[13px] font-semibold
                    hover:bg-slate-100 active:scale-[0.98]
                    transition-all duration-150
                    shadow-[0_2px_20px_rgba(0,0,0,0.5)]
                  "
                >
                  Browse Campaigns
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onViewProtocol?.();
                }}
                className="
                  inline-flex items-center gap-2 rounded-lg
                  border border-white/[0.09] bg-white/[0.03]
                  px-5 py-2.5 text-[13px] font-medium text-slate-300
                  hover:bg-white/[0.06] hover:border-white/[0.14]
                  transition-all duration-150 cursor-pointer
                "
              >
                How it works
              </button>
            </motion.div>

            {/* ── Stats bar ─────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-12 pt-8 border-t border-white/[0.06] grid grid-cols-3 gap-6"
            >
              {[
                { value: `$${totalDonated.toLocaleString()}`, label: "Total donated",  sub: "$0 gas" },
                { value: totalDonors.toString(),               label: "Unique donors",  sub: "On Base Sepolia" },
                { value: `$${avgGift.toFixed(1)}`,             label: "Avg. gift size", sub: "Direct to cause" },
              ].map(({ value, label, sub }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-[22px] font-bold tracking-tight text-white">{value}</span>
                  <span className="text-[11px] text-slate-500 font-medium">{label}</span>
                  <span className="text-[10px] text-emerald-500 font-medium">{sub}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ──────────── RIGHT COLUMN — Globe ──────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex-shrink-0 w-full max-w-[520px] lg:max-w-[580px]"
            style={{ aspectRatio: "1 / 1" }}
          >
            {/* Outer ring glow */}
            <div className="relative w-full h-full">
              <div className="absolute inset-[6%] rounded-full bg-blue-500/[0.06] blur-[40px]" />
              <SplineGlobe />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
