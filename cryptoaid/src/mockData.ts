import { Campaign, Donation, Leader } from "./types";

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "amazon-trees",
    title: "Restore Amazonian Rainforests",
    description: "Support local indigenous communities in native seed propagation and replanting degraded areas of the Amazon rainforest.",
    category: "Environmental",
    icon: "🌳",
    currentAmount: 32450,
    targetAmount: 50000,
    donorsCount: 184,
    imageGradient: "from-emerald-500/20 via-emerald-950/20 to-slate-950",
    tagColor: "text-emerald-400 bg-emerald-950/40 border-emerald-500/20",
    badgeBorder: "border-emerald-500/30",
  },
  {
    id: "clean-water",
    title: "Solar Water Kiosks, East Africa",
    description: "Build clean solar-powered water purification kiosks delivering safe, reliable drinking water to off-grid rural communities.",
    category: "Humanitarian",
    icon: "💧",
    currentAmount: 48900,
    targetAmount: 75000,
    donorsCount: 312,
    imageGradient: "from-blue-500/20 via-blue-950/20 to-slate-950",
    tagColor: "text-blue-400 bg-blue-950/40 border-blue-500/20",
    badgeBorder: "border-blue-500/30",
  },
  {
    id: "stem-education",
    title: "STEM Laptops for Rural Schools",
    description: "Provide high-performance laptops and preloaded interactive curricula to empower students in tech-starved secondary schools.",
    category: "Education",
    icon: "📚",
    currentAmount: 18100,
    targetAmount: 40000,
    donorsCount: 96,
    imageGradient: "from-purple-500/20 via-purple-950/20 to-slate-950",
    tagColor: "text-purple-400 bg-purple-950/40 border-purple-500/20",
    badgeBorder: "border-purple-500/30",
  }
];

export const INITIAL_LEADERS: Leader[] = [
  { rank: 1, address: "0xdbFacE54A231C98721345E65C6543bAc542A1231", amount: 14500, donationsCount: 12, avatarSeed: "1" },
  { rank: 2, address: "0x3A21f8a8467DbcEe25464F898b9b8bC32a210f89", amount: 9200, donationsCount: 7, avatarSeed: "2" },
  { rank: 3, address: "0x7C54E9f1234F3A54C6547DbcEe2546eA888123C3", amount: 6800, donationsCount: 5, avatarSeed: "3" },
  { rank: 4, address: "0x4E93cDe65a46Dbc21342bBc898b8bC32a210E912", amount: 4100, donationsCount: 4, avatarSeed: "4" },
  { rank: 5, address: "0x8B12dD84e231C98721345E65CFcEe254fA723D19", amount: 2550, donationsCount: 3, avatarSeed: "5" }
];

export const INITIAL_DONATIONS: Donation[] = [
  {
    id: "tx-initial-1",
    donor: "0x9E21f8a8467DbcEe25464F898b9b8bC32a210f89",
    amount: 50,
    campaignId: "clean-water",
    campaignTitle: "Solar Water Kiosks, East Africa",
    timestamp: "2 mins ago",
    hash: "0x8fae32215c2d3a1fb...2381"
  },
  {
    id: "tx-initial-2",
    donor: "0xF3A1cDe65a46Dbc21342bBc898b8bC32a210E912",
    amount: 250,
    campaignId: "amazon-trees",
    campaignTitle: "Restore Amazonian Rainforests",
    timestamp: "14 mins ago",
    hash: "0xa21cf3e68bc5d2fa5...7c3d"
  },
  {
    id: "tx-initial-3",
    donor: "0x32D5eAa98721342bBc898b8bC32a210E912D84C2",
    amount: 100,
    campaignId: "stem-education",
    campaignTitle: "STEM Laptops for Rural Schools",
    timestamp: "35 mins ago",
    hash: "0xbc532dfc3983a54d2...d91e"
  },
  {
    id: "tx-initial-4",
    donor: "0x7C54E9f1234F3A54C6547DbcEe254eA888123C3",
    amount: 500,
    campaignId: "clean-water",
    campaignTitle: "Solar Water Kiosks, East Africa",
    timestamp: "1 hr ago",
    hash: "0xdbe8bc15fa8b3a5d2...1c98"
  },
  {
    id: "tx-initial-5",
    donor: "0x8B12dD84e231C98721345E65CFcEe254fA723D19",
    amount: 15,
    campaignId: "amazon-trees",
    campaignTitle: "Restore Amazonian Rainforests",
    timestamp: "2-hrs ago",
    hash: "0x54e8bc1a8e23192bd...c32d"
  }
];

export function generateRandomHash(): string {
  const chars = "abcdef0123456789";
  let hash = "0x";
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash.substring(0, 18) + "..." + hash.substring(34, 42);
}

export function formatAddress(address: string): string {
  if (!address) return "";
  return address.substring(0, 6) + "..." + address.substring(address.length - 4);
}
