import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const causes = [
    {
      id: 1,
      name: "Amazon Rainforest Canopy Restoration",
      description: "Restoring critical corridors of primary canopy in the Amazon basin. Partnering with indigenous rangers to cultivate and transplant native seed stock.",
      wallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      icon: "🌳",
      tag: "Environmental",
      goalUsd: new Prisma.Decimal("50000"),
      active: true,
    },
    {
      id: 2,
      name: "Solar Aquifer Purification Kiosks",
      description: "Constructing solar-powered filtration hubs to extract and purify drinkable water from deep saline aquifers for off-grid communities.",
      wallet: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
      icon: "💧",
      tag: "Humanitarian",
      goalUsd: new Prisma.Decimal("100000"),
      active: true,
    },
    {
      id: 3,
      name: "STEM Coding Labs & Satellite Hubs",
      description: "Installing solar-powered internet terminals and rugged laptops preloaded with offline curriculum in remote high-altitude schools.",
      wallet: "0xbDA5747bFD65F08deb54cb465eB87D40e51B197E",
      icon: "📚",
      tag: "Education",
      goalUsd: new Prisma.Decimal("30000"),
      active: true,
    },
  ];

  console.log("Upserting causes...");
  for (const cause of causes) {
    await prisma.cause.upsert({
      where: { id: cause.id },
      update: {
        name: cause.name,
        description: cause.description,
        wallet: cause.wallet,
        icon: cause.icon,
        tag: cause.tag,
        goalUsd: cause.goalUsd,
        active: cause.active,
      },
      create: cause,
    });
  }

  // Clear old donations and donors to remove dirty test data
  console.log("Cleaning old donations and donors...");
  await prisma.donation.deleteMany({});
  await prisma.donor.deleteMany({});

  // Seed Donors
  const donors = [
    {
      wallet: "0xdbFacE54A231C98721345E65C6543bAc542A1231",
      totalDonated: new Prisma.Decimal("2000"),
      donationCount: 2,
      firstDonation: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36h ago
      lastDonation: new Date(Date.now() - 2 * 60 * 60 * 1000),   // 2h ago
    },
    {
      wallet: "0x3A21f8a8467DbcEe25464F898b9b8bC32a210f89",
      totalDonated: new Prisma.Decimal("800"),
      donationCount: 2,
      firstDonation: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h ago
      lastDonation: new Date(Date.now() - 4 * 60 * 60 * 1000),   // 4h ago
    },
    {
      wallet: "0x7C54E9f1234F3A54C6547DbcEe254eA888123C3",
      totalDonated: new Prisma.Decimal("450"),
      donationCount: 2,
      firstDonation: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48h ago
      lastDonation: new Date(Date.now() - 12 * 60 * 60 * 1000),  // 12h ago
    },
    {
      wallet: "0x4E93cDe65a46Dbc21342bBc898b8bC32a210E912",
      totalDonated: new Prisma.Decimal("150"),
      donationCount: 1,
      firstDonation: new Date(Date.now() - 8 * 60 * 60 * 1000),  // 8h ago
      lastDonation: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
      wallet: "0x8B12dD84e231C98721345E65CFcEe254fA723D19",
      totalDonated: new Prisma.Decimal("100"),
      donationCount: 1,
      firstDonation: new Date(Date.now() - 14 * 60 * 60 * 1000), // 14h ago
      lastDonation: new Date(Date.now() - 14 * 60 * 60 * 1000),
    },
    {
      wallet: "0x9E21f8a8467DbcEe25464F898b9b8bC32a210f89",
      totalDonated: new Prisma.Decimal("50"),
      donationCount: 1,
      firstDonation: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30h ago
      lastDonation: new Date(Date.now() - 30 * 60 * 60 * 1000),
    },
  ];

  console.log("Creating donors...");
  for (const donor of donors) {
    await prisma.donor.create({ data: donor });
  }

  // Seed Donations
  const donations = [
    {
      donor: "0xdbFacE54A231C98721345E65C6543bAc542A1231",
      amount: new Prisma.Decimal("1500"),
      txHash: "0x8fae32215c2d3a1fb92b95fae21db7c82a210f892381e4b88b098defb751b74a",
      ugfStatus: "confirmed",
      causeId: 1,
      createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
    },
    {
      donor: "0x7C54E9f1234F3A54C6547DbcEe254eA888123C3",
      amount: new Prisma.Decimal("300"),
      txHash: "0xa21cf3e68bc5d2fa51542f898b9b8bc32a210f89e9127c3dbbc532dfc3983a54",
      ugfStatus: "confirmed",
      causeId: 1,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    },
    {
      donor: "0x8B12dD84e231C98721345E65CFcEe254fA723D19",
      amount: new Prisma.Decimal("100"),
      txHash: "0x54e8bc1a8e23192bd3a1fb92b95fae21db7c82a210f89c32d56fa723d19bc53",
      ugfStatus: "confirmed",
      causeId: 1,
      createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000),
    },
    {
      donor: "0xdbFacE54A231C98721345E65C6543bAc542A1231",
      amount: new Prisma.Decimal("500"),
      txHash: "0xbc532dfc3983a54d21e97678185a91a922aE77ECEc301c98dbe8bc15fa8b3a5d",
      ugfStatus: "confirmed",
      causeId: 2,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      donor: "0x3A21f8a8467DbcEe25464F898b9b8bC32a210f89",
      amount: new Prisma.Decimal("200"),
      txHash: "0xdbe8bc15fa8b3a5d21c9812484e231C98721345E65CFcEe254fA723D1989c32",
      ugfStatus: "confirmed",
      causeId: 2,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    },
    {
      donor: "0x4E93cDe65a46Dbc21342bBc898b8bC32a210E912",
      amount: new Prisma.Decimal("150"),
      txHash: "0xe23192bd3a1fb92b95fae21db7c82a210f89c32d56fa723d19bc53e8bc15fa8b",
      ugfStatus: "confirmed",
      causeId: 2,
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
      donor: "0x9E21f8a8467DbcEe25464F898b9b8bC32a210f89",
      amount: new Prisma.Decimal("50"),
      txHash: "0xf3a1cde65a46dbc21342bbc898b8bc32a210f89e9127c3dbbc532dfc3983a54a21c",
      ugfStatus: "confirmed",
      causeId: 2,
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
    },
    {
      donor: "0x3A21f8a8467DbcEe25464F898b9b8bC32a210f89",
      amount: new Prisma.Decimal("600"),
      txHash: "0x7c3d2dfc3983a54d21e97678185a91a922aE77ECEc301c98dbe8bc15fa8b3a5",
      ugfStatus: "confirmed",
      causeId: 3,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      donor: "0x7C54E9f1234F3A54C6547DbcEe254eA888123C3",
      amount: new Prisma.Decimal("150"),
      txHash: "0x12484e231C98721345E65CFcEe254fA723D1989c32dbe8bc15fa8b3a5d21c98",
      ugfStatus: "confirmed",
      causeId: 3,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  ];

  console.log("Creating donations...");
  for (const donation of donations) {
    await prisma.donation.create({ data: donation });
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
