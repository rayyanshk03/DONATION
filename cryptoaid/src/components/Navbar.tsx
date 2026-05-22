import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HeartHandshake, Wallet, LogOut, ChevronDown, Check, Coins, Zap } from "lucide-react";
import { formatAddress } from "../mockData";

interface NavbarProps {
  walletConnected: boolean;
  walletAddress: string;
  walletBalance: number;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
}

export default function Navbar({
  walletConnected,
  walletAddress,
  walletBalance,
  onConnectWallet,
  onDisconnectWallet,
}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectClick = () => {
    setIsConnecting(true);
    setTimeout(() => {
      onConnectWallet();
      setIsConnecting(false);
    }, 1200);
  };

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="sticky top-4 z-40 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      id="navbar-header"
    >
      <div className="glass-panel relative flex h-16 items-center justify-between rounded-2xl px-6 shadow-2xl overflow-visible backdrop-blur-3xl border-white/8">
        {/* Neon decorative streak behind navbar */}
        <div className="absolute inset-x-12 -bottom-px h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
        <div className="absolute inset-x-24 -bottom-px h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />

        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.08, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 shadow-lg shadow-blue-500/20"
            id="brand-logo-container"
          >
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
              <HeartHandshake className="h-5.5 w-5.5 text-blue-400" />
            </div>
            <div className="absolute -inset-0.5 -z-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 opacity-60 blur-md" />
          </motion.div>

          <div className="flex flex-col">
            <span className="bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text font-sans text-xl font-bold tracking-tight text-transparent">
              CryptoAid
            </span>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                UGF Mainnet V1
              </span>
            </div>
          </div>
        </div>

        {/* Right Nav Options */}
        <div className="flex items-center gap-4">
          {/* Base Sepolia badge */}
          <div className="hidden items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-1.5 text-xs font-medium md:flex">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            <span className="text-slate-300">Base Sepolia</span>
          </div>

          {/* Wallet State Widget */}
          <AnimatePresence mode="wait">
            {!walletConnected ? (
              <motion.button
                key="disconnect-btn"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={handleConnectClick}
                disabled={isConnecting}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="relative flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-xl shadow-blue-500/10 hover:shadow-blue-500/25 border border-white/10 group cursor-pointer"
                id="connect-wallet-btn"
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Securing Link...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 transition-transform group-hover:rotate-12" />
                    <span>Connect Wallet</span>
                    {/* Glowing highlight animation */}
                    <div className="absolute -inset-y-0 -left-full w-12 bg-white/20 skew-x-12 transition-all duration-1000 group-hover:left-full" />
                  </>
                )}
              </motion.button>
            ) : (
              <div className="relative" id="connected-wallet-dropdown">
                <motion.div
                  key="connected-widget"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center gap-1 rounded-xl bg-white/[0.02] border border-white/8 p-1 shadow-lg"
                >
                  {/* Gasless micro badge */}
                  <div className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/10">
                    <Zap className="h-2.5 w-2.5 text-emerald-400 fill-emerald-400/20" />
                    <span>0 ETH GAS</span>
                  </div>

                  {/* Balance Badge */}
                  <div className="flex items-center gap-1 px-2 text-xs font-bold text-blue-400">
                    <Coins className="h-3.5 w-3.5" />
                    <span>{walletBalance.toFixed(2)} UGC</span>
                  </div>

                  {/* Address Pill Button */}
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1 text-xs font-mono font-medium text-slate-100 border border-white/5 transition-colors cursor-pointer"
                    id="wallet-user-dropdown-btn"
                  >
                    <span>{formatAddress(walletAddress)}</span>
                    <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                </motion.div>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <>
                      {/* Overlay to close */}
                      <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setDropdownOpen(false)} />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="glass-panel absolute right-0 mt-2.5 w-48 rounded-xl p-1.5 shadow-2xl border-white/10 z-50 bg-[#0c0c14]/95 text-xs"
                      >
                        <div className="px-2.5 py-1.5 pb-2 border-b border-white/5 mb-1 text-slate-400">
                          <p className="font-mono font-semibold text-[10px] tracking-wider uppercase text-slate-500">Connected Wallet</p>
                          <p className="text-white font-mono mt-0.5 truncate">{walletAddress}</p>
                        </div>
                        
                        <div className="px-2.5 py-1 text-slate-400 mb-1">
                          <p className="font-mono text-[10px] tracking-wider uppercase text-slate-500">Universal Gas Wallet</p>
                          <p className="text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Gas Paid in UGC (0 ETH)
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onDisconnectWallet();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer text-left font-medium"
                          id="wallet-disconnect-btn"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Disconnect Wallet</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
