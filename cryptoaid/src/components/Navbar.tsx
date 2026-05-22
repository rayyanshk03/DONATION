import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, LogOut, ChevronDown, Coins, Zap, Globe, LayoutGrid, Activity, Home } from "lucide-react";
import { formatAddress } from "../mockData";

interface NavbarProps {
  walletConnected: boolean;
  walletAddress: string;
  walletBalance: number;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onNavigate?: (view: "home" | "protocol" | "creator") => void;
  currentView: "home" | "protocol" | "creator";
}

const NAV_LINKS = [
  { label: "Home", href: "#", icon: Home },
  { label: "Campaigns", href: "#campaigns-grid-section", icon: LayoutGrid },
  { label: "How it works",  href: "#", icon: Globe },
  { label: "Activity",  href: "#activity-leaderboard-section", icon: Activity },
];

export default function Navbar({
  walletConnected,
  walletAddress,
  walletBalance,
  onConnectWallet,
  onDisconnectWallet,
  onNavigate,
  currentView,
}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeLink, setActiveLink] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (currentView === "home") {
      setActiveLink("Home");
    } else if (currentView === "protocol") {
      setActiveLink("How it works");
    } else if (currentView === "creator") {
      setActiveLink(""); // Clear active state for center links in Creator view
    }
  }, [currentView]);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      id="navbar-header"
      className="sticky top-0 z-50 w-full"
    >
      {/* Backdrop blur surface */}
      <div
        className={`
          absolute inset-0 transition-all duration-500
          ${scrolled
            ? "bg-[#050508]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.6)]"
            : "bg-transparent border-b border-transparent"}
        `}
      />

      <div className="relative mx-auto flex h-[62px] max-w-[1440px] items-center justify-between px-6 lg:px-16">

        {/* ── Logo ─────────────────────────────────────────────────── */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavigate?.("home");
          }}
          className="flex items-center gap-3 group"
          aria-label="CryptoAid home"
        >
          {/* Icon mark */}
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.1] shadow-lg backdrop-blur-sm overflow-hidden group">
            {/* Ambient hover glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <svg
              viewBox="0 0 32 32"
              fill="none"
              className="relative h-[22px] w-[22px] z-10"
            >
              <defs>
                <linearGradient id="logo-hex-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="50%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#EC4899" />
                </linearGradient>
                <linearGradient id="logo-heart-grad" x1="8" y1="8" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#EC4899" />
                  <stop offset="100%" stopColor="#F43F5E" />
                </linearGradient>
              </defs>

              {/* Hexagonal Shield */}
              <path
                d="M16 3 L28.5 10.2 V24.8 L16 29 L3.5 24.8 V10.2 Z"
                stroke="url(#logo-hex-grad)"
                strokeWidth="2.2"
                strokeLinejoin="round"
                fill="rgba(5, 5, 8, 0.4)"
              />

              {/* Glowing Heart */}
              <path
                d="M16 12 C14.7 10 11.5 10 10.2 11.5 C8.8 13 8.8 15.8 11 18 L16 22.5 L21 18 C23.2 15.8 23.2 13 21.8 11.5 C20.5 10 17.3 10 16 12 Z"
                fill="url(#logo-heart-grad)"
              />

              {/* Network nodes */}
              <circle cx="16" cy="3" r="1.5" fill="#3B82F6" />
              <circle cx="28.5" cy="10.2" r="1.5" fill="#6366F1" />
              <circle cx="28.5" cy="24.8" r="1.5" fill="#EC4899" />
              <circle cx="16" cy="29" r="1.5" fill="#F43F5E" />
              <circle cx="3.5" cy="24.8" r="1.5" fill="#EC4899" />
              <circle cx="3.5" cy="10.2" r="1.5" fill="#3B82F6" />
            </svg>
          </div>

          {/* Wordmark */}
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">
            CryptoAid
          </span>

          {/* Network pill */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-slate-400 ml-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Base Sepolia
          </div>
        </a>

        {/* ── Center Nav Links ──────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV_LINKS.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              onClick={(e) => {
                setActiveLink(label);
                if (label === "Home" && onNavigate) {
                  e.preventDefault();
                  onNavigate("home");
                } else if (label === "How it works" && onNavigate) {
                  e.preventDefault();
                  onNavigate("protocol");
                } else if ((label === "Campaigns" || label === "Activity") && onNavigate) {
                  if (currentView !== "home") {
                    e.preventDefault();
                    onNavigate("home");
                    setTimeout(() => {
                      const id = href.substring(1);
                      const el = document.getElementById(id);
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }
                }
              }}
              className={`
                relative flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium
                transition-colors duration-200 group
                ${activeLink === label
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"}
              `}
            >
              {/* hover bg */}
              <span className="absolute inset-0 rounded-lg bg-white/0 group-hover:bg-white/[0.05] transition-colors duration-200" />
              <Icon className="relative h-3.5 w-3.5 opacity-70" />
              <span className="relative">{label}</span>
              {/* active underline dot */}
              {activeLink === label && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full bg-blue-400"
                />
              )}
            </a>
          ))}
        </nav>

        {/* ── Right Side ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Segmented Control */}
          <div className="flex rounded-lg bg-white/[0.02] border border-white/[0.06] p-0.5 relative overflow-hidden backdrop-blur-sm">
            <button
              onClick={() => onNavigate?.("home")}
              className={`
                relative px-3 py-1 text-[11px] font-semibold tracking-wide rounded-md transition-all duration-200 cursor-pointer select-none
                ${(currentView === "home" || currentView === "protocol") ? "text-white font-bold" : "text-slate-400 hover:text-slate-200"}
              `}
            >
              {(currentView === "home" || currentView === "protocol") && (
                <motion.span
                  layoutId="role-pill"
                  className="absolute inset-0 rounded bg-white/[0.08] border border-white/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative flex items-center gap-1">
                <Globe className="h-3 w-3 opacity-80" />
                Donor
              </span>
            </button>
            <button
              onClick={() => onNavigate?.("creator")}
              className={`
                relative px-3 py-1 text-[11px] font-semibold tracking-wide rounded-md transition-all duration-200 cursor-pointer select-none
                ${currentView === "creator" ? "text-white font-bold" : "text-slate-400 hover:text-slate-200"}
              `}
            >
              {currentView === "creator" && (
                <motion.span
                  layoutId="role-pill"
                  className="absolute inset-0 rounded bg-white/[0.08] border border-white/[0.04] shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative flex items-center gap-1">
                <Zap className="h-3 w-3 opacity-80" />
                Creator
              </span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {!walletConnected ? (
              /* ── Connect Button ── */
              <motion.button
                key="connect"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                onClick={onConnectWallet}
                id="connect-wallet-btn"
                className="
                  relative flex items-center gap-2 overflow-hidden
                  rounded-lg bg-white text-[#050508]
                  px-4 py-[7px] text-[13px] font-semibold
                  hover:bg-slate-100 active:scale-[0.98]
                  transition-all duration-150 cursor-pointer
                  shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_2px_16px_rgba(0,0,0,0.4)]
                "
              >
                <Wallet className="h-3.5 w-3.5" />
                <span>Connect Wallet</span>
              </motion.button>
            ) : (
              /* ── Wallet Connected State ── */
              <motion.div
                key="connected"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative flex items-center gap-2"
                id="connected-wallet-dropdown"
              >
                {/* Balance chip */}
                <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-[6px] text-[12px] font-medium text-slate-300">
                  <Coins className="h-3.5 w-3.5 text-blue-400" />
                  <span>{walletBalance.toFixed(1)}</span>
                  <span className="text-slate-500">UGC</span>
                </div>

                {/* Gasless badge */}
                <div className="hidden sm:flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-[6px] text-[11px] font-semibold text-emerald-400">
                  <Zap className="h-3 w-3" />
                  <span>Gasless</span>
                </div>

                {/* Address dropdown trigger */}
                <button
                  onClick={() => setDropdownOpen((v) => !v)}
                  id="wallet-user-dropdown-btn"
                  className="
                    flex items-center gap-2 rounded-lg
                    border border-white/[0.08] bg-white/[0.05]
                    px-3 py-[6px] text-[12px] font-mono font-medium text-slate-200
                    hover:bg-white/[0.09] hover:border-white/[0.13]
                    transition-all duration-150 cursor-pointer
                  "
                >
                  {/* Avatar dot */}
                  <span className="h-5 w-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[9px] font-bold text-white select-none">
                    {walletAddress.slice(2, 4).toUpperCase()}
                  </span>
                  <span>{formatAddress(walletAddress)}</span>
                  <ChevronDown
                    className={`h-3 w-3 text-slate-500 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setDropdownOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className="
                          absolute right-0 top-[calc(100%+8px)] z-50
                          w-56 rounded-xl
                          bg-[#0d0d14] border border-white/[0.09]
                          shadow-[0_8px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)]
                          p-1.5 text-[12px]
                        "
                      >
                        {/* Header */}
                        <div className="px-3 py-2.5 border-b border-white/[0.06] mb-1">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
                            Connected
                          </p>
                          <p className="font-mono text-slate-200 truncate text-[11px]">
                            {walletAddress}
                          </p>
                        </div>

                        {/* Stats row */}
                        <div className="flex gap-2 px-3 py-2 mb-1">
                          <div className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2 text-center">
                            <p className="text-[10px] text-slate-500 mb-0.5">Balance</p>
                            <p className="text-blue-400 font-semibold font-mono">{walletBalance.toFixed(1)}</p>
                          </div>
                          <div className="flex-1 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-2.5 py-2 text-center">
                            <p className="text-[10px] text-slate-500 mb-0.5">Gas</p>
                            <p className="text-emerald-400 font-semibold">$0.00</p>
                          </div>
                        </div>

                        {/* Disconnect */}
                        <button
                          onClick={() => { setDropdownOpen(false); onDisconnectWallet(); }}
                          id="wallet-disconnect-btn"
                          className="
                            flex w-full items-center gap-2.5 rounded-lg
                            px-3 py-2.5 text-slate-400
                            hover:bg-red-500/10 hover:text-red-400
                            transition-colors duration-150 cursor-pointer
                          "
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Disconnect</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
