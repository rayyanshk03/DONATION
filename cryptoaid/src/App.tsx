import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CauseGrid from "./components/CauseGrid";
import DonationModal from "./components/DonationModal";
import ActivityLeaderboard from "./components/ActivityLeaderboard";
import ProtocolDiagramView from "./components/ProtocolDiagramView";
import CreatorDashboard from "./components/CreatorDashboard";

import { Campaign, Donation, Leader } from "./types";
import { formatAddress, INITIAL_CAMPAIGNS, INITIAL_DONATIONS, INITIAL_LEADERS } from "./mockData";
import { AlertCircle, HelpCircle, Heart, Zap, Check, RefreshCw, KeyRound, ArrowUpRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ethers } from "ethers";
import {
  UGC_TOKEN_ADDRESS,
  DONATION_CONTRACT_ADDRESS,
  TARGET_CHAIN_ID,
  BACKEND_URL,
  WS_URL,
  UGC_TOKEN_ABI,
  sendUGFDonation,
} from "./web3Service";

export default function App() {
  // Navigation state
  const [currentView, setCurrentView] = useState<"home" | "protocol" | "creator">("home");

  // Wallet state
  const [walletConnected, setWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletAllowance, setWalletAllowance] = useState<bigint>(0n);
  const [walletDecimals, setWalletDecimals] = useState<number>(18);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  // Platform state
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [donations, setDonations] = useState<Donation[]>(INITIAL_DONATIONS);
  const [leaders, setLeaders] = useState<Leader[]>(INITIAL_LEADERS);

  // Faucet state
  const [isFauceting, setIsFauceting] = useState<boolean>(false);
  const [faucetError, setFaucetError] = useState<string | null>(null);
  const [faucetStatus, setFaucetStatus] = useState<string | null>(null);

  // Modal selector state
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Fetch campaigns from database
  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/causes`);
      const data = await res.json();
      if (data.causes) {
        const mapped: Campaign[] = data.causes.map((cause: any) => {
          let imageGradient = "from-blue-500/20 via-blue-950/20 to-slate-950";
          let tagColor = "text-blue-400 bg-blue-950/40 border-blue-500/20";
          let badgeBorder = "border-blue-500/30";

          if (cause.tag === "Environmental") {
            imageGradient = "from-emerald-500/20 via-emerald-950/20 to-slate-950";
            tagColor = "text-emerald-400 bg-emerald-950/40 border-emerald-500/20";
            badgeBorder = "border-emerald-500/30";
          } else if (cause.tag === "Humanitarian") {
            imageGradient = "from-blue-500/20 via-blue-950/20 to-slate-950";
            tagColor = "text-blue-400 bg-blue-950/40 border-blue-500/20";
            badgeBorder = "border-blue-500/30";
          } else if (cause.tag === "Education") {
            imageGradient = "from-purple-500/20 via-purple-950/20 to-slate-950";
            tagColor = "text-purple-400 bg-purple-950/40 border-purple-500/20";
            badgeBorder = "border-purple-500/30";
          }

          return {
            id: cause.id.toString(),
            title: cause.name,
            description: cause.description,
            category: cause.tag,
            icon: cause.icon,
            currentAmount: parseFloat(cause.totalDonated),
            targetAmount: parseFloat(cause.goalUsd),
            donorsCount: cause.donorCount,
            imageGradient,
            tagColor,
            badgeBorder,
            wallet: cause.wallet,
          };
        });
        setCampaigns(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    }
  };

  // Fetch leaderboard statistics
  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/leaderboard`);
      const data = await res.json();
      if (data.leaderboard) {
        const mapped: Leader[] = data.leaderboard.map((item: any, idx: number) => ({
          rank: idx + 1,
          address: item.wallet,
          amount: parseFloat(item.totalDonated),
          donationsCount: item.donationCount,
          avatarSeed: (idx + 1).toString(),
        }));
        setLeaders(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    }
  };

  // Fetch previous donations feed
  const fetchDonationsFeed = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/donations/feed`);
      const data = await res.json();
      if (data.donations) {
        const mapped: Donation[] = data.donations.map((tx: any) => ({
          id: tx.id,
          donor: tx.donor,
          amount: parseFloat(tx.amount),
          campaignId: tx.causeId.toString(),
          campaignTitle: tx.causeName,
          timestamp: new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hash: tx.txHash,
        }));
        setDonations(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch donations feed:", err);
    }
  };

  // Query balanceOf and allowance dynamically
  const fetchWalletData = async (providerObj: ethers.BrowserProvider, addressStr: string) => {
    try {
      const tokenContract = new ethers.Contract(UGC_TOKEN_ADDRESS, UGC_TOKEN_ABI, providerObj);
      const [rawBalance, decimals, rawAllowance] = await Promise.all([
        tokenContract.balanceOf(addressStr),
        tokenContract.decimals(),
        tokenContract.allowance(addressStr, DONATION_CONTRACT_ADDRESS),
      ]);

      const formattedDecimals = Number(decimals);
      const formattedBalance = parseFloat(ethers.formatUnits(rawBalance, formattedDecimals));

      setWalletBalance(formattedBalance);
      setWalletAllowance(rawAllowance);
      setWalletDecimals(formattedDecimals);
    } catch (err) {
      console.warn("Could not query token parameters:", err);
    }
  };

  // Hook for mounting all active database details
  useEffect(() => {
    fetchCampaigns();
    fetchLeaderboard();
    fetchDonationsFeed();
  }, []);

  // Hook for establishing real-time WebSocket communication
  useEffect(() => {
    const wsEndpoint = WS_URL.replace("http://", "ws://").replace("https://", "wss://");
    const ws = new WebSocket(wsEndpoint);

    ws.onopen = () => {
      console.log("[WebSocket] Connected to live transaction stream.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_donation") {
          // Prepend to donations list
          setDonations((prev) => {
            const exists = prev.some((d) => d.hash === data.txHash);
            if (exists) return prev;
            return [
              {
                id: data.id || `tx-${Date.now()}`,
                donor: data.donor,
                amount: parseFloat(data.amount),
                campaignId: data.causeId.toString(),
                campaignTitle: data.causeName,
                timestamp: "Just now",
                hash: data.txHash,
              },
              ...prev,
            ].slice(0, 15);
          });

          // Refresh current wallet context if we completed it
          if (walletAddress && data.donor.toLowerCase() === walletAddress.toLowerCase()) {
            if (provider) {
              fetchWalletData(provider, walletAddress);
            }
          }
        } else if (data.type === "cause_update") {
          setCampaigns((prev) =>
            prev.map((c) => {
              if (c.id === data.causeId.toString()) {
                return {
                  ...c,
                  currentAmount: parseFloat(data.totalDonated),
                  donorsCount: data.donorCount,
                };
              }
              return c;
            })
          );
        } else if (data.type === "leaderboard_invalidate") {
          fetchLeaderboard();
        }
      } catch (err) {
        console.warn("[WebSocket] Error processing server broadcast:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("[WebSocket] Connection error:", err);
    };

    ws.onclose = () => {
      console.log("[WebSocket] Connection closed. Re-syncing on next active cycle.");
    };

    return () => {
      ws.close();
    };
  }, [walletAddress, provider]);

  // Handler for Injected MetaMask Connections
  const handleConnectWallet = async () => {
    if (!(window as any).ethereum) {
      alert("Browser wallet not detected. Please install the MetaMask extension.");
      return;
    }
    try {
      const providerObj = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      const signerObj = await providerObj.getSigner();
      const network = await providerObj.getNetwork();
      const userAddr = accounts[0];

      setProvider(providerObj);
      setSigner(signerObj);
      setWalletAddress(userAddr);
      setChainId(Number(network.chainId));
      setWalletConnected(true);

      await fetchWalletData(providerObj, userAddr);

      // Bind dynamic chain & account change triggers
      (window as any).ethereum.on("accountsChanged", async (accs: string[]) => {
        if (!accs || accs.length === 0) {
          handleDisconnectWallet();
        } else {
          setWalletAddress(accs[0]);
          await fetchWalletData(providerObj, accs[0]);
        }
      });

      (window as any).ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    } catch (err) {
      console.error("[WalletContext] Secure injected link failed:", err);
    }
  };

  const handleDisconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress("");
    setWalletBalance(0);
    setWalletAllowance(0n);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  };

  // Switch network helper
  const handleSwitchNetwork = async () => {
    if (!(window as any).ethereum) return;
    const targetHex = "0x" + TARGET_CHAIN_ID.toString(16);
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetHex }],
      });
    } catch (err: any) {
      if (err.code === 4902 || err.message?.includes("4902")) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetHex,
                chainName: "Base Sepolia",
                nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://sepolia.base.org"],
                blockExplorerUrls: ["https://sepolia.basescan.org"],
              },
            ],
          });
        } catch (addErr) {
          console.error("Failed to add network:", addErr);
        }
      } else {
        console.error("Failed to switch network:", err);
      }
    }
  };

  // ETH-Free Token Claims sponsored by UGF
  const handleClaimFaucet = async () => {
    if (!signer || !provider || !walletAddress) return;
    setIsFauceting(true);
    setFaucetError(null);
    setFaucetStatus("quoting");

    try {
      const tokenIface = new ethers.Interface(["function faucet(address to, uint256 amount)"]);
      const amountWei = ethers.parseUnits("1000", walletDecimals);
      const calldata = tokenIface.encodeFunctionData("faucet", [walletAddress, amountWei]);

      await sendUGFDonation({
        signer,
        provider,
        chainId: TARGET_CHAIN_ID,
        to: UGC_TOKEN_ADDRESS,
        data: calldata,
        onQuote: () => setFaucetStatus("quoting"),
        onSettle: () => setFaucetStatus("settling"),
        onExecute: () => setFaucetStatus("executing"),
      });

      setFaucetStatus("confirmed");
      await new Promise((r) => setTimeout(r, 1800));
      setFaucetStatus(null);
      setIsFauceting(false);

      // Refresh balance
      await fetchWalletData(provider, walletAddress);
    } catch (err: any) {
      console.error("[Faucet] ETH-Free claim failed:", err);
      setFaucetError(err.userMessage || err.message || "ETH-Free claim failed.");
      setIsFauceting(false);
      setFaucetStatus(null);
    }
  };

  // Handler for opening donation panel
  const handleOpenDonate = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
  };

  // Post donation refresh triggers
  const handleDonationComplete = async (amount: number, hash: string) => {
    setSelectedCampaign(null);
    if (provider && walletAddress) {
      await fetchWalletData(provider, walletAddress);
    }
    // API lists will be automatically updated by WebSocket events!
    await Promise.all([fetchCampaigns(), fetchLeaderboard(), fetchDonationsFeed()]);
  };

  // Computed metrics
  const totalDonated = campaigns.reduce((acc, c) => acc + c.currentAmount, 0);
  const totalDonors = campaigns.reduce((acc, c) => acc + c.donorsCount, 0);
  const avgGift = totalDonated / totalDonors || 0;

  if (currentView === "protocol") {
    return <ProtocolDiagramView onBack={() => setCurrentView("home")} />;
  }

  return (
    <div className="min-h-screen bg-[#050508] font-sans selection:bg-blue-500/30 selection:text-blue-200">

      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#3b82f6]/15 rounded-full blur-[120px] pointer-events-none -z-10 animate-float-slow"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-[#8b5cf6]/20 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse-glow"></div>
      <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-[#3b82f6]/10 rounded-full blur-[80px] pointer-events-none -z-10"></div>

      {/* Styled Grid Backdrop */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,0.015)_1.5px,transparent_1.5px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none -z-10" />

      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Navbar */}
        <Navbar
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          walletBalance={walletBalance}
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={handleDisconnectWallet}
          onNavigate={(view) => setCurrentView(view)}
          currentView={currentView}
        />

        {/* Wrong network banner */}
        {walletConnected && chainId !== TARGET_CHAIN_ID && (
          <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-16 mt-3">
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-4 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-[13px] text-slate-300">
                  Wrong network — you're on chain <span className="text-white font-medium">{chainId}</span>. Switch to Base Sepolia to continue.
                </p>
              </div>
              <button
                onClick={handleSwitchNetwork}
                className="shrink-0 rounded-md border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-[12px] font-medium text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer whitespace-nowrap"
              >
                Switch network
              </button>
            </motion.div>
          </div>
        )}

        {/* Low balance banner */}
        {walletConnected && chainId === TARGET_CHAIN_ID && walletBalance < 10 && (
          <div className="mx-auto w-full max-w-[1440px] px-6 lg:px-16 mt-3">
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.07] bg-white/[0.03] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                <p className="text-[13px] text-slate-400">
                  Your balance is <span className="text-white font-medium">${walletBalance.toFixed(2)} UGC</span> — claim testnet tokens to donate ETH-Free (gas paid in Mock USD).
                </p>
              </div>
              <button
                disabled={isFauceting}
                onClick={handleClaimFaucet}
                className="shrink-0 rounded-md border border-white/[0.08] bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-slate-300 hover:bg-white/[0.09] hover:text-white disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
              >
                {isFauceting ? "Claiming..." : "Claim test tokens"}
              </button>
            </motion.div>
          </div>
        )}

        {/* Global Faucet sponsored overlay */}
        <AnimatePresence>
          {faucetStatus && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            >
              <div className="glass-panel w-full max-w-sm rounded-2xl border-white/10 overflow-hidden shadow-2xl relative p-8 text-center space-y-6 bg-[#0c0c15]">
                <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-white/5" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-2 border-t-yellow-500 border-r-amber-500 border-b-emerald-500 border-l-transparent"
                  />
                  {faucetStatus === "quoting" ? (
                     <KeyRound className="h-7 w-7 text-yellow-400 animate-float" />
                  ) : (
                    <Zap className="h-7 w-7 text-emerald-400 fill-emerald-400/20 animate-neon-pulse" />
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-white">ETH-Free Faucet Claim</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-light">
                    Processing faucet claim through UGF Relayers with UGC Gas...
                  </p>
                </div>

                <div className="space-y-3 max-w-xs mx-auto text-xs text-left">
                  <div className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all ${
                    faucetStatus === "quoting" ? "bg-yellow-500/5 border-yellow-500/20 text-white" : "bg-white/[0.01] border-white/5 text-slate-500"
                  }`}>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      faucetStatus !== "quoting" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : "bg-yellow-500 text-slate-950"
                    }`}>
                      {faucetStatus !== "quoting" ? <Check className="h-3 w-3" /> : "1"}
                    </div>
                    <span>Quoting Gas Fees...</span>
                  </div>

                  <div className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all ${
                    faucetStatus === "settling" ? "bg-amber-500/5 border-amber-500/20 text-white" : "bg-white/[0.01] border-white/5 text-slate-500"
                  }`}>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      faucetStatus === "executing" || faucetStatus === "confirmed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : faucetStatus === "settling" ? "bg-amber-500 text-slate-950" : "bg-white/5 border border-white/5"
                    }`}>
                      {faucetStatus === "executing" || faucetStatus === "confirmed" ? <Check className="h-3 w-3" /> : "2"}
                    </div>
                    <span>Signing Relayer Settlement...</span>
                  </div>

                  <div className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all ${
                    faucetStatus === "executing" ? "bg-purple-500/5 border-purple-500/20 text-white" : "bg-white/[0.01] border-white/5 text-slate-500"
                  }`}>
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      faucetStatus === "confirmed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" : faucetStatus === "executing" ? "bg-purple-500 text-white" : "bg-white/5 border border-white/5"
                    }`}>
                      {faucetStatus === "confirmed" ? <Check className="h-3 w-3" /> : "3"}
                    </div>
                    <span>Minting on Base Sepolia...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cinematic Hero */}
        <main className="flex-1">
          {currentView === "creator" ? (
            <CreatorDashboard
              walletConnected={walletConnected}
              walletAddress={walletAddress}
              walletBalance={walletBalance}
              onConnectWallet={handleConnectWallet}
              campaigns={campaigns}
              onRefreshCampaigns={fetchCampaigns}
              donations={donations}
            />
          ) : (
            <>
              {/* Hero Banner */}
              <Hero
                totalDonated={totalDonated}
                totalDonors={totalDonors}
                avgGift={avgGift}
                walletConnected={walletConnected}
                onConnectWallet={handleConnectWallet}
                onViewProtocol={() => setCurrentView("protocol")}
              />

              {/* Core Interactive Cause Card Section */}
              <CauseGrid
                campaigns={campaigns}
                onDonateClick={handleOpenDonate}
                walletConnected={walletConnected}
                onConnectWallet={handleConnectWallet}
              />

              {/* Activity Logs & Leaderboards */}
              <ActivityLeaderboard
                donations={donations}
                leaders={leaders}
                onDonorClick={(addr) => {
                  // Quick mock address select for convenience
                  setWalletAddress(addr);
                  setWalletConnected(true);
                }}
              />
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/[0.05] mt-auto">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-16 py-8 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.1] shadow backdrop-blur-sm overflow-hidden group">
                <svg
                  viewBox="0 0 32 32"
                  fill="none"
                  className="relative h-[16px] w-[16px] z-10"
                >
                  <defs>
                    <linearGradient id="footer-logo-hex-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="50%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#EC4899" />
                    </linearGradient>
                    <linearGradient id="footer-logo-heart-grad" x1="8" y1="8" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#EC4899" />
                      <stop offset="100%" stopColor="#F43F5E" />
                    </linearGradient>
                  </defs>

                  {/* Hexagonal Shield */}
                  <path
                    d="M16 3 L28.5 10.2 V24.8 L16 29 L3.5 24.8 V10.2 Z"
                    stroke="url(#footer-logo-hex-grad)"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    fill="rgba(5, 5, 8, 0.4)"
                  />

                  {/* Glowing Heart */}
                  <path
                    d="M16 12 C14.7 10 11.5 10 10.2 11.5 C8.8 13 8.8 15.8 11 18 L16 22.5 L21 18 C23.2 15.8 23.2 13 21.8 11.5 C20.5 10 17.3 10 16 12 Z"
                    fill="url(#footer-logo-heart-grad)"
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
              <span className="text-[13px] font-semibold text-white">CryptoAid</span>
              <span className="text-slate-700">·</span>
              <span className="text-[12px] text-slate-600">ETH-Free donations on Base (UGC Gas)</span>
            </div>
            <nav className="flex items-center gap-6 text-[12px] text-slate-500">
              <a href="#hero-section" className="hover:text-slate-300 transition-colors">Home</a>
              <a href="#campaigns-grid-section" className="hover:text-slate-300 transition-colors">Campaigns</a>
              <button
                onClick={() => setCurrentView("protocol")}
                className="hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-none p-0 text-[12px] font-normal font-sans"
              >
                How it works
              </button>
              <a href="#activity-leaderboard-section" className="hover:text-slate-300 transition-colors">Activity</a>
            </nav>
            <p className="text-[11px] text-slate-700">Built on Base Sepolia</p>
          </div>
        </footer>

        {/* Unified Donation Modals Overlay */}
        <AnimatePresence>
          {selectedCampaign && (
            <DonationModal
              campaign={selectedCampaign}
              walletConnected={walletConnected}
              walletBalance={walletBalance}
              provider={provider}
              signer={signer}
              onClose={() => setSelectedCampaign(null)}
              onDonationComplete={handleDonationComplete}
              onConnectWallet={handleConnectWallet}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
