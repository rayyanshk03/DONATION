import { Campaign, Donation, Leader } from "./types";

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "1",
    title: "Amazon Rainforest Canopy Restoration",
    description: "Restoring critical corridors of primary canopy in the Amazon basin. Partnering with indigenous rangers to cultivate and transplant native seed stock.",
    category: "Environmental",
    icon: "🌳",
    currentAmount: 1900,
    targetAmount: 50000,
    donorsCount: 3,
    imageGradient: "from-emerald-500/20 via-emerald-950/20 to-slate-950",
    tagColor: "text-emerald-400 bg-emerald-950/40 border-emerald-500/20",
    badgeBorder: "border-emerald-500/30",
    wallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  },
  {
    id: "2",
    title: "Solar Aquifer Purification Kiosks",
    description: "Constructing solar-powered filtration hubs to extract and purify drinkable water from deep saline aquifers for off-grid communities.",
    category: "Humanitarian",
    icon: "💧",
    currentAmount: 900,
    targetAmount: 100000,
    donorsCount: 4,
    imageGradient: "from-blue-500/20 via-blue-950/20 to-slate-950",
    tagColor: "text-blue-400 bg-blue-950/40 border-blue-500/20",
    badgeBorder: "border-blue-500/30",
    wallet: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
  },
  {
    id: "3",
    title: "STEM Coding Labs & Satellite Hubs",
    description: "Installing solar-powered internet terminals and rugged laptops preloaded with offline curriculum in remote high-altitude schools.",
    category: "Education",
    icon: "📚",
    currentAmount: 750,
    targetAmount: 30000,
    donorsCount: 2,
    imageGradient: "from-purple-500/20 via-purple-950/20 to-slate-950",
    tagColor: "text-purple-400 bg-purple-950/40 border-purple-500/20",
    badgeBorder: "border-purple-500/30",
    wallet: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
  }
];

export const INITIAL_LEADERS: Leader[] = [
  { rank: 1, address: "0xdbFacE54A231C98721345E65C6543bAc542A1231", amount: 2000, donationsCount: 2, avatarSeed: "1" },
  { rank: 2, address: "0x3A21f8a8467DbcEe25464F898b9b8bC32a210f89", amount: 800, donationsCount: 2, avatarSeed: "2" },
  { rank: 3, address: "0x7C54E9f1234F3A54C6547DbcEe254eA888123C3", amount: 450, donationsCount: 2, avatarSeed: "3" },
  { rank: 4, address: "0x4E93cDe65a46Dbc21342bBc898b8bC32a210E912", amount: 150, donationsCount: 1, avatarSeed: "4" },
  { rank: 5, address: "0x8B12dD84e231C98721345E65CFcEe254fA723D19", amount: 100, donationsCount: 1, avatarSeed: "5" },
  { rank: 6, address: "0x9E21f8a8467DbcEe25464F898b9b8bC32a210f89", amount: 50, donationsCount: 1, avatarSeed: "6" }
];

export const INITIAL_DONATIONS: Donation[] = [
  {
    id: "tx-db-1",
    donor: "0xdbFacE54A231C98721345E65C6543bAc542A1231",
    amount: 500,
    campaignId: "2",
    campaignTitle: "Solar Aquifer Purification Kiosks",
    timestamp: "2 hours ago",
    hash: "0xbc532dfc3983a54d21e97678185a91a922aE77ECEc301c98dbe8bc15fa8b3a5d"
  },
  {
    id: "tx-db-2",
    donor: "0x3A21f8a8467DbcEe25464F898b9b8bC32a210f89",
    amount: 200,
    campaignId: "2",
    campaignTitle: "Solar Aquifer Purification Kiosks",
    timestamp: "4 hours ago",
    hash: "0xdbe8bc15fa8b3a5d21c9812484e231C98721345E65CFcEe254fA723D1989c32"
  },
  {
    id: "tx-db-3",
    donor: "0x4E93cDe65a46Dbc21342bBc898b8bC32a210E912",
    amount: 150,
    campaignId: "2",
    campaignTitle: "Solar Aquifer Purification Kiosks",
    timestamp: "8 hours ago",
    hash: "0xe23192bd3a1fb92b95fae21db7c82a210f89c32d56fa723d19bc53e8bc15fa8b"
  },
  {
    id: "tx-db-4",
    donor: "0x7C54E9f1234F3A54C6547DbcEe254eA888123C3",
    amount: 150,
    campaignId: "3",
    campaignTitle: "STEM Coding Labs & Satellite Hubs",
    timestamp: "12 hours ago",
    hash: "0x12484e231C98721345E65CFcEe254fA723D1989c32dbe8bc15fa8b3a5d21c98"
  },
  {
    id: "tx-db-5",
    donor: "0x8B12dD84e231C98721345E65CFcEe254fA723D19",
    amount: 100,
    campaignId: "1",
    campaignTitle: "Amazon Rainforest Canopy Restoration",
    timestamp: "14 hours ago",
    hash: "0x54e8bc1a8e23192bd3a1fb92b95fae21db7c82a210f89c32d56fa723d19bc53"
  }
];

export function generateRandomHash(): string {
  const chars = "abcdef0123456789";
  let hash = "0x";
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function formatAddress(address: string): string {
  if (!address) return "";
  return address.substring(0, 6) + "..." + address.substring(address.length - 4);
}
