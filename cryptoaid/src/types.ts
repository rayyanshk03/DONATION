export type CampaignCategory = "Environmental" | "Humanitarian" | "Education";

export interface Campaign {
  id: string;
  title: string;
  description: string;
  category: CampaignCategory;
  icon: string;
  currentAmount: number;
  targetAmount: number;
  donorsCount: number;
  imageGradient: string;
  tagColor: string;
  badgeBorder: string;
  wallet: string;
}

export interface Donation {
  id: string;
  donor: string;
  amount: number;
  campaignId: string;
  campaignTitle: string;
  timestamp: string;
  hash: string;
}

export interface Leader {
  rank: number;
  address: string;
  amount: number;
  donationsCount: number;
  avatarSeed: string;
}
