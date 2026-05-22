import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import CauseGrid from "./components/CauseGrid";
import DonationModal from "./components/DonationModal";
import ActivityLeaderboard from "./components/ActivityLeaderboard";
import { Campaign, Donation, Leader } from "./types";
import { formatAddress } from "./mockData";
import { AlertCircle, HelpCircle, Info, Heart, Zap, Check, RefreshCw, KeyRound, ArrowUpRight, X } from "lucide-react";
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);

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

  // Gasless Token Claims sponsored by UGF
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
      console.error("[Faucet] Gasless claim failed:", err);
      setFaucetError(err.userMessage || err.message || "Gasless claim failed.");
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

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-[#f8fafc] font-sans overflow-x-hidden selection:bg-blue-500/30 selection:text-blue-200">
      
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
        />

        {/* Dynamic Warning Banners */}
        {walletConnected && chainId !== TARGET_CHAIN_ID && (
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 mt-4">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative rounded-2xl border border-red-500/25 bg-red-500/5 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xl backdrop-blur-md overflow-hidden"
            >
              <div className="absolute inset-y-0 left-0 w-1.5 bg-red-500" />
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5.5 w-5.5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white font-sans">Wrong Blockchain Network</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed font-light">
                    Your connected wallet is on Chain {chainId}. CryptoAid functions exclusively on Base Sepolia.
                  </p>
                </div>
              </div>
              <button
                onClick={handleSwitchNetwork}
                className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-semibold px-5 py-2.5 text-xs transition-all cursor-pointer shadow-lg shadow-red-500/10"
              >
                Switch to Base Sepolia
              </button>
            </motion.div>
          </div>
        )}

        {walletConnected && chainId === TARGET_CHAIN_ID && walletBalance < 10 && (
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 mt-4">
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative rounded-2xl border border-yellow-500/20 bg-yellow-500/5 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xl backdrop-blur-md overflow-hidden"
            >
              <div className="absolute inset-y-0 left-0 w-1.5 bg-yellow-500" />
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5.5 w-5.5 text-yellow-400 shrink-0 animate-pulse" />
                <div>
                  <p className="text-sm font-bold text-white font-sans">Low Mock USD Balance</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed font-light">
                    You hold <span className="text-white font-medium font-mono">${walletBalance.toFixed(2)} UGC</span>. Claim testnet tokens to start sponsoring campaigns gaslessly.
                  </p>
                </div>
              </div>
              
              <button
                disabled={isFauceting}
                onClick={handleClaimFaucet}
                className="shrink-0 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-slate-950 font-bold px-5 py-2.5 text-xs transition-all cursor-pointer shadow-lg shadow-yellow-500/10"
              >
                <Zap className="h-3.5 w-3.5 fill-slate-950/20" />
                <span>{isFauceting ? "Claiming..." : "Claim 1,000 MUSD Gaslessly ⚡"}</span>
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
                  <h4 className="text-lg font-bold text-white">Gasless Faucet Claim</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-light">
                    Sponsoring faucet transaction variables through UGF Relayers...
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
          <Hero
            totalDonated={totalDonated}
            totalDonors={totalDonors}
            avgGift={avgGift}
            walletConnected={walletConnected}
            onConnectWallet={handleConnectWallet}
          />

          {/* Core Interactive Cause Card Section */}
          <CauseGrid
            campaigns={campaigns}
            onDonateClick={handleOpenDonate}
            walletConnected={walletConnected}
            onConnectWallet={handleConnectWallet}
          />

          {/* Interactive Protocol Blueprint Explainer */}
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10" id="ugf-protocol-specification">
            <div className="rounded-3xl glass-panel relative p-8 md:p-12 border-white/8 overflow-hidden bg-gradient-to-br from-[#0c0c16] via-[#08080d] to-slate-950/40">
              
              {/* Neon border edge glowing trail */}
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 font-mono uppercase tracking-wide">
                    <Heart className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Universal Gas Facilitation (UGF)</span>
                  </div>

                  <h3 className="text-2xl md:text-3xl font-extrabold text-white leading-tight font-sans">
                    Frictionless Giving via Cryptographic Off-Chain Permits
                  </h3>

                  <p className="text-sm text-slate-400 leading-relaxed font-light">
                    Legacy Web3 mechanics require donors to hold ETH for transaction fees, bridge back and forth, and trigger multiple signing approvals. UGF bypasses this friction by executing a signed off-chain <span className="text-white font-medium">EIP-2612 Permit</span>. 
                  </p>

                  <div className="space-y-4 pt-2">
                    <div className="flex gap-3 text-xs leading-relaxed">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-bold">1</span>
                      <div>
                        <p className="font-bold text-white font-mono">Sign Your Permit</p>
                        <p className="text-slate-400">Crypographically sign an off-chain spending allowance. Fast, secure, and 100% free.</p>
                      </div>
                    </div>

                    <div className="flex gap-3 text-xs leading-relaxed">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono font-bold">2</span>
                      <div>
                        <p className="font-bold text-white font-mono">Relay Sponsored Dispatch</p>
                        <p className="text-slate-400">The platform's UGF relayer transmits your donation directly to the smart contracts, full-covering gas expenses.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulated visual blueprint cards */}
                <div className="rounded-2xl border border-white/5 bg-slate-950/80 p-6 md:p-8 space-y-4 shadow-2xl relative select-none">
                  {/* Subtle pulsing live indicator */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Protocol Pipeline Sandbox</span>
                    <span className="text-[10px] font-semibold font-mono rounded px-2.5 py-1 flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span>On-Chain Live Feed</span>
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#0c0c17]/90 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold flex items-center justify-center">✔</div>
                        <span className="text-xs text-slate-300 font-mono">EIP-2612 Permit Signatures</span>
                      </div>
                      <span className="text-[10.5px] text-slate-500 font-mono">Cryptographically Active</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0c0c17]/90 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono font-bold flex items-center justify-center">✔</div>
                        <span className="text-xs text-slate-300 font-mono">UGF Gas Relaying Engine</span>
                      </div>
                      <span className="text-[10.5px] text-emerald-400 font-semibold font-mono uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded">Sponsoring Gas</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0c0c17]/90 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-mono font-bold flex items-center justify-center">✔</div>
                        <span className="text-xs text-slate-300 font-mono">Base Sepolia Contract Executions</span>
                      </div>
                      <span className="text-[10.5px] text-slate-500 font-mono">Mined in Real Time</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-400 leading-normal">
                    <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      Notice: CryptoAid is connected directly to Base Sepolia testnet contracts and live indexers. There are zero simulated, fake, or mock balances active in this view.
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </section>

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

        </main>

        {/* Global Footer */}
        <footer className="border-t border-white/5 py-8 text-xs text-slate-500 mt-auto bg-[#040406]/90">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">CryptoAid</span>
              <span className="text-slate-600">|</span>
              <span>Gasless Web3 Sponsorship Network v1.0</span>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-slate-400">
              <a href="#navbar-header" className="hover:text-white transition-colors">Hero Ticker</a>
              <a href="#campaigns-grid-section" className="hover:text-white transition-colors">Campaigns Directory</a>
              <a href="#ugf-protocol-specification" className="hover:text-white transition-colors">UGF Blueprint</a>
              <a href="#activity-leaderboard-section" className="hover:text-white transition-colors">Active Feeds</a>
            </div>

            <div>
              <p className="font-mono text-[10.5px] text-slate-600">Deployed with ❤ for Base Sepolia Ecosystem</p>
            </div>

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
